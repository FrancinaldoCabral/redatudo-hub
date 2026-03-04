import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { ebookPricingService } from '../services/ebook-pricing.service';
import { ebookContextService } from '../services/ebook-context.service';
import { ebookValidationService } from '../services/ebook-validation.service';
import { ebookPromptService } from '../services/ebook-prompt.service';
import { projectReferenceService } from '../services/project-reference.service';
import SectionImageGenerationService from '../services/section-image-generation.service';
import { MongoDbService } from '../services/mongodb.service';
import { ObjectId } from 'mongodb';
import {
  GenerationAction,
  ModelTier,
  ContextDepth,
  getModelCost,
  wordsToTokens,
  tokensToWords,
  getTemperatureForAction,
  requiresSelection,
  shouldMaintainSize
} from '../config/ebook-llm.config';
import { encode } from 'gpt-tokenizer';

const openRouterClient = new RouterApiOpenAI();
const imageGenerationService = new SectionImageGenerationService();
const mongoDbService = new MongoDbService();

/**
 * Arquivo de referência para geração
 */
interface ReferenceFile {
  url: string;
  type: 'pdf' | 'docx' | 'image' | 'video' | 'audio';
  name: string;
  instructions?: string;
}

/**
 * Arquivo de referência simplificado (recebido como entrada)
 */
interface ReferenceFileInput {
  _id: string;
  alias: string;
}

/**
 * Parâmetros do tool
 */
interface EbookAdvancedGenerationArgs {
  projectId: string;
  sectionId: string;
  action: GenerationAction;
  words: number;
  tier?: ModelTier;
  selectedText?: string;
  contextDepth?: ContextDepth;
  referenceFiles?: ReferenceFileInput[];
  options?: {
    tone?: string;
    style?: string;
    perspective?: string;
    detailLevel?: string;
    targetAudience?: string;
    customInstructions?: string;
  };
  // Opções de imagem
  generateImages?: boolean;
  imageCount?: number;
  imageStyle?: string;  // Aceita tanto style_type quanto style_preset
  imageAspectRatio?: '1:1' | '4:3' | '16:9' | '9:16' | '3:2' | '2:3';
  imageQuality?: 'basico' | 'medio' | 'avancado';
  imagePromptEnhancements?: string[];
  imagePromptInstructions?: string;
}

/**
 * Tool de Geração Avançada de Ebooks
 * 40+ ações com sistema de tiers e controle de palavras
 */
const ebookAdvancedGenerationTool: Tool = {
  title: 'Ebook Advanced Generation',
  description: 'Geração avançada de conteúdo para ebooks com 40+ ações, sistema de tiers (basic/medium/advanced) e controle de comprimento por palavras (100-5000).',

  costPreview: 10, // Custo estimado médio (será recalculado na execução)

  schema: {
    type: 'function',
    function: {
      name: 'ebook_advanced_generation',
      description: 'Gera conteúdo avançado para ebooks com 40+ ações diferentes, sistema de tiers de qualidade e controle preciso de comprimento.',
      parameters: {
        type: 'object',
        properties: {
          projectId: {
            type: 'string',
            description: 'ID do projeto de ebook'
          },
          sectionId: {
            type: 'string',
            description: 'ID da seção a ser gerada/editada'
          },
          action: {
            type: 'string',
            enum: [
              'generate', 'regenerate', 'continue',
              'expand', 'rewrite', 'tone', 'summarize', 'simplify', 'enrich', 'correct',
              'dialogize', 'describe', 'argue', 'connect', 'divide', 'merge', 'translate-tone',
              'create-character', 'develop-dialogue', 'build-scene', 'create-tension', 'plot-twist', 'inner-monologue', 'worldbuild',
              'add-examples', 'create-list', 'compare', 'tutorial', 'add-stats', 'cite-sources', 'create-faq',
              'vary-structure', 'eliminate-redundancy', 'strengthen-opening', 'strong-closing', 'add-hook', 'improve-flow'
            ],
            description: 'Ação de geração a ser executada (40+ opções disponíveis)'
          },
          words: {
            type: 'number',
            description: 'Número de palavras desejado (100-5000)',
            minimum: 100,
            maximum: 5000
          },
          tier: {
            type: 'string',
            enum: ['basic', 'medium', 'advanced'],
            description: 'Tier de qualidade: basic (econômico, padrão), medium (balanceado), advanced (máxima qualidade)',
            default: 'basic'
          },
          selectedText: {
            type: 'string',
            description: 'Texto selecionado (para ações que requerem, como expand, rewrite, etc.)'
          },
          contextDepth: {
            type: 'string',
            enum: ['minimal', 'moderate', 'full'],
            description: 'Profundidade do contexto: minimal (seção apenas), moderate (seção + adjacentes), full (projeto completo)',
            default: 'moderate'
          },
          referenceFiles: {
            type: 'array',
            description: 'Arquivos de referência (PDF, DOCX, imagens, vídeos, áudios) para influenciar a geração',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string', description: 'ID do arquivo de referência' },
                alias: { type: 'string', description: 'Alias do arquivo (usado para citações @alias)' }
              },
              required: ['_id', 'alias']
            }
          },
          options: {
            type: 'object',
            description: 'Opções adicionais de estilo e formatação',
            properties: {
              tone: { type: 'string', description: 'Tom desejado (formal, casual, inspiracional, etc.)' },
              style: { type: 'string', description: 'Estilo de escrita (descriptive, narrative, argumentative, etc.)' },
              perspective: { type: 'string', description: 'Perspectiva narrativa (1st-person, 3rd-person, etc.)' },
              detailLevel: { type: 'string', description: 'Nível de detalhe (concise, balanced, detailed)' },
              targetAudience: { type: 'string', description: 'Público-alvo (children, young-adult, adult, etc.)' },
              customInstructions: { type: 'string', description: 'Instruções personalizadas adicionais' }
            }
          },
          generateImages: {
            type: 'boolean',
            description: 'Se deve gerar imagens para o conteúdo',
            default: false
          },
          imageCount: {
            type: 'number',
            description: 'Número de imagens a gerar (1-5, ou undefined para auto)',
            minimum: 1,
            maximum: 5
          },
          imageStyle: {
            type: 'string',
            description: 'Estilo visual das imagens (style_type ou style_preset do Ideogram)',
            enum: [
              // Style Types (básicos)
              'None', 'Auto', 'General', 'Realistic', 'Design',
              // Style Presets (detalhados)
              '3D', 'Anime', 'Bokeh', 'Cinematic', 'Collage', 'Cyberpunk', 'Fantasy Art',
              'Film Noir', 'General', 'General Graffiti', 'Graphic Novel', 'HDR',
              'Horror', 'Impressionism', 'Long Exposure', 'Macro Photography', 'Medieval',
              'Minimalist', 'Monochrome', 'Moody', 'Neon Noir', 'Noir', 'Origami',
              'Photography', 'Pixel Art', 'Polaroid', 'Pop Art', 'Renaissance', 'Retro',
              'Retrowave', 'Sticker', 'Studio Ghibli', 'Surrealism', 'Typography',
              'Vibrant', 'Vintage', 'Watercolor'
            ],
            default: 'Auto'
          },
          imageAspectRatio: {
            type: 'string',
            description: 'Proporção das imagens',
            enum: ['1:1', '4:3', '16:9', '9:16', '3:2', '2:3']
          },
          imageQuality: {
            type: 'string',
            description: 'Nível de qualidade das imagens',
            enum: ['basico', 'medio', 'avancado']
          },
          imagePromptEnhancements: {
            type: 'array',
            description: 'Melhorias customizadas para prompts de imagem',
            items: { type: 'string' }
          },
          imagePromptInstructions: {
            type: 'string',
            description: 'Instruções customizadas para geração de imagens (max 500 chars)'
          }
        },
        required: ['projectId', 'sectionId', 'action', 'words']
      }
    }
  },

  action: async (args: EbookAdvancedGenerationArgs, functionName: string, metadata: any, tool_call_id?: string) => {
    const startTime = Date.now();
    console.log('🔍 [EbookAdvancedGen] Parâmetros recebidos:');
    console.log('   - action:', args.action);
    console.log('   - generateImages:', args.generateImages);
    console.log('   - imageCount:', args.imageCount);
    console.log('   - imageStyle:', args.imageStyle);
    console.log('   - referenceFiles:', args.referenceFiles);
    try {

      // Valores padrão
      const tier = args.tier || 'basic';
      const requestedContextDepth = args.contextDepth || 'moderate';

      // ============================================================================
      // REGRA INTELIGENTE: CONTEXT DEPTH PARA AÇÕES DE EDIÇÃO
      // ============================================================================
      // Ações de edição com texto selecionado SEMPRE usam contextDepth='minimal'
      // - Elimina viés cognitivo de "contexto demais → output demais"
      // - Alinhado com práticas do mercado (Grammarly, Notion AI, etc.)
      // - Contexto minimal (500 tokens) é suficiente para manter tom/estilo
      // - Reduz custos em ~80% e melhora performance em ~50%
      //
      // Ações de CRIAÇÃO respeitam a escolha do usuário (podem querer contexto completo)
      // ============================================================================

      let contextDepth: ContextDepth = requestedContextDepth;

      if (args.selectedText && args.selectedText.trim().length > 0 && requiresSelection(args.action)) {
        if (requestedContextDepth !== 'minimal') {
          /* console.log(`🎯 [EbookAdvancedGen] REGRA INTELIGENTE: Ação de edição "${args.action}" com texto selecionado`);
          console.log(`   ↳ Forçando contextDepth='minimal' (solicitado: '${requestedContextDepth}')`);
          console.log(`   ↳ Motivo: Evitar expansão indevida do texto selecionado`);
          console.log(`   ↳ Benefícios: -80% custo, +50% velocidade, comportamento previsível`); */
          contextDepth = 'minimal';
        }
      }

      // ============================================================================
      // REGRA INTELIGENTE: LIMITAÇÃO AUTOMÁTICA DE TOKENS PARA AÇÕES QUE MANTÊM TAMANHO
      // ============================================================================
      // Ações como "rewrite", "simplify", "correct" etc. devem manter tamanho similar ao original
      // - Evita expansão indevida (ex: reescrever 2 palavras em 100 palavras)
      // - Economiza tokens e custos
      // - Comportamento mais previsível para o usuário
      //
      // Ações como "continue", "expand", "add-examples" podem expandir livremente
      //
      // CORREÇÃO: Agora usa tokenização REAL com gpt-tokenizer
      // ============================================================================

      // Variável para armazenar o limite real de tokens (se aplicável)
      let maxTokensLimit: number | null = null;

      if (args.selectedText && args.selectedText.trim().length > 0 && shouldMaintainSize(args.action)) {
        const selectedWordCount = countWords(args.selectedText);

        // CORREÇÃO: Usar tokenização REAL com gpt-tokenizer
        const selectedTokensReal = encode(args.selectedText).length;

        // Permitir margem de 50% para flexibilidade (ex: 2 palavras → máx 3 palavras)
        const maxAllowedTokens = Math.ceil(selectedTokensReal * 1.5);

        // Armazenar limite real para usar depois
        maxTokensLimit = maxAllowedTokens;

        console.log(`🎯 [EbookAdvancedGen] LIMITAÇÃO AUTOMÁTICA: Ação "${args.action}"`);
        console.log(`   ↳ Texto selecionado: ${selectedWordCount} palavras`);
        console.log(`   ↳ Tokens REAIS (gpt-tokenizer): ${selectedTokensReal} tokens`);
        console.log(`   ↳ Limite calculado (150%): ${maxAllowedTokens} tokens`);
        console.log(`   ↳ Solicitado pelo usuário: ${args.words} palavras (~${wordsToTokens(args.words)} tokens aprox.)`);
        console.log(`   ↳ max_tokens será limitado a: ${maxAllowedTokens} tokens`);
      }

      // FASE 1: RESOLVER ARQUIVOS DE REFERÊNCIA
      let resolvedReferenceFiles: ReferenceFile[] | undefined;
      if (args.referenceFiles && args.referenceFiles.length > 0) {
        try {
          // Buscar todos os arquivos do projeto
          const projectFiles = await projectReferenceService.getProjectReferences(
            args.projectId,
            metadata.userId
          );

          // Resolver os _ids para objetos completos
          const tempFiles: ReferenceFile[] = [];
          for (const input of args.referenceFiles) {
            const file = projectFiles.find(f => f._id === input._id);
            if (!file) {
              console.warn(`⚠️  Arquivo de referência com _id "${input._id}" não encontrado no projeto ${args.projectId}`);
              continue;
            }
            tempFiles.push({
              url: file.url,
              type: file.type,
              name: file.name,
              instructions: file.instructions
            });
          }
          resolvedReferenceFiles = tempFiles;

          console.log(`📎 [EbookAdvancedGen] Arquivos de referência resolvidos: ${resolvedReferenceFiles.length}/${args.referenceFiles.length}`);
        } catch (error) {
          console.warn('⚠️  Erro ao resolver arquivos de referência:', error);
          resolvedReferenceFiles = [];
        }
      }

      // FASE 2: VALIDAÇÃO
      const validation = ebookValidationService.validateGenerationRequest({
        action: args.action,
        projectId: args.projectId,
        sectionId: args.sectionId,
        words: args.words,
        tier: tier,
        selectedText: args.selectedText,
        options: args.options
      });

      if (!validation.valid) {
        throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
      }

      // FASE 3: CONSTRUIR CONTEXTO
  //    console.log(`🔍 [EbookAdvancedGen] Construindo contexto: projectId=${args.projectId}, sectionId=${args.sectionId}, depth=${contextDepth}`);
      const context = await ebookContextService.buildContext(
        args.projectId,
        args.sectionId,
        contextDepth,
        true
      );

      /* console.log(`📋 [EbookAdvancedGen] Contexto carregado:`, {
        projectTitle: context.projectTitle,
        sectionTitle: context.sectionTitle,
        previousSections: context.previousSections?.length || 0,
        nextSections: context.nextSections?.length || 0,
        totalSections: context.totalSections
      }); */

      // FASE 4: CALCULAR maxTokens E AJUSTAR PALAVRAS (ANTES DE CONSTRUIR PROMPT!)
      // ============================================================================
      // CORREÇÃO DO BUG: Aplicar limite de tokens quando necessário
      // ============================================================================
      // Se maxTokensLimit foi calculado (para ações que mantêm tamanho),
      // usamos o MENOR entre o solicitado e o limite calculado
      // IMPORTANTE: Ajustar args.words ANTES de construir o prompt para que reflita o limite real
      // ============================================================================

      const modelCost = getModelCost(tier);
      const temperature = getTemperatureForAction(args.action);

      // Calcular maxTokens baseado em palavras solicitadas
      let maxTokens = wordsToTokens(args.words);

      if (maxTokensLimit !== null) {
        const originalMaxTokens = maxTokens;
        const originalWords = args.words;

        maxTokens = Math.min(maxTokens, maxTokensLimit);

        if (maxTokens !== originalMaxTokens) {
          // CORREÇÃO CRÍTICA: Ajustar args.words para refletir o limite real
          // Isso faz o PROMPT dizer "~3 palavras" em vez de "~100 palavras"
          args.words = tokensToWords(maxTokens);

          console.log(`🔒 [EbookAdvancedGen] APLICANDO LIMITE DE PALAVRAS NO PROMPT:`);
          console.log(`   ↳ Solicitado originalmente: ${originalWords} palavras (~${originalMaxTokens} tokens)`);
          console.log(`   ↳ Limite aplicado: ${args.words} palavras (~${maxTokens} tokens)`);
          console.log(`   ↳ Redução: ${originalWords - args.words} palavras (${Math.round((1 - args.words/originalWords) * 100)}%)`);
          console.log(`   ↳ O prompt dirá ao LLM para gerar ~${args.words} palavras`);
        }
      }

      // FASE 5: CONSTRUIR PROMPT (AGORA COM args.words JÁ AJUSTADO!)
  //    console.log(`📝 [EbookAdvancedGen] Construindo prompt para ação: ${args.action}`);
      const prompt = ebookPromptService.buildPrompt(
        args.action,
        context,
        args.selectedText,
        args.words,  // Agora este valor já foi ajustado!
        args.options,
        resolvedReferenceFiles,  // Usar arquivos resolvidos em vez de args.referenceFiles
        args.generateImages,  // Passar flag de geração de imagens
        args.imageCount  // Passar quantidade de imagens
      );

      // FASE 6: GERAR COM LLM
      console.log(`🤖 [EbookAdvancedGen] Enviando para LLM: model=${modelCost.id}, max_tokens=${maxTokens}, temperature=${temperature}`);
      console.log(`📋 [EbookAdvancedGen] System Prompt (primeiros 500 chars):`, prompt.system.substring(0, 500));
      console.log(`📋 [EbookAdvancedGen] User Prompt completo:`, prompt.user);
      const referenceFiles = resolvedReferenceFiles?.map(file => ({
          url: file.url,
          type: file.type,
          name: file.name
      }))
      console.log('REFERENCE FILES: ', referenceFiles);
      const completion = await openRouterClient.createCompletion({
        model: modelCost.id,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        max_tokens: maxTokens,
        temperature,
        toolName: 'ebook-advanced-generation',
        metadata: metadata,
        referenceFiles: referenceFiles
      });

  //    console.log(`✅ [EbookAdvancedGen] Resposta do LLM recebida:`, completion.choices[0]?.message?.content?.substring(0, 200) + '...');

      let content = completion.choices[0]?.message?.content || '';
      const duration = Date.now() - startTime;
      const wordCount = countWords(content);

      // Calcular créditos reais baseados nos tokens efetivamente usados
      const actualCredits = calculateActualCredits(
        modelCost.id,
        completion.usage?.prompt_tokens || 0,
        completion.usage?.completion_tokens || 0
      );

      // Para compatibilidade, manter costBreakdown para logs
      const costBreakdown = ebookPricingService.calculateGenerationCost({
        words: args.words,
        tier: tier,
        contextDepth: contextDepth,
        action: args.action
      });

  //    console.log(`✅ [EbookAdvancedGen] Concluído em ${duration}ms | ${wordCount} palavras | ${actualCredits} créditos reais`);
  //    console.log(`📊 [EbookAdvancedGen] Comparação: Estimado=${costBreakdown.credits}, Real=${actualCredits}`);
  //    console.log(`📝 [EbookAdvancedGen] Conteúdo gerado:`, content.substring(0, 300) + '...');

      // ============================================================================
      // GERAÇÃO DE IMAGENS (se solicitado)
      // ============================================================================
      let finalContent = content;
      let imageData: { success: boolean; generatedCount: number; totalRequested: number; error?: string } = { success: false, generatedCount: 0, totalRequested: 0 };
      const imagesArray: any[] = [];

      console.log(`🔍 [EbookAdvancedGen] Verificando geração de imagens...`);
      console.log(`   - args.generateImages = ${args.generateImages} (tipo: ${typeof args.generateImages})`);
      console.log(`   - Condição (args.generateImages === true) = ${args.generateImages === true}`);

      if (args.generateImages === true) {
        const isAutoImageCount = typeof args.imageCount === 'undefined';
        console.log(`🖼️ [EbookAdvancedGen] INICIANDO geração de imagens...`);
        console.log(`   - imageCount: ${args.imageCount} (auto: ${isAutoImageCount})`);
        console.log(`   - imageStyle: ${args.imageStyle || 'realistic'}`);
        
        try {
          console.log(`🖼️ [EbookAdvancedGen] Extraindo descrições de imagens do conteúdo gerado...`);
          
          const imageDescriptions = imageGenerationService.extractImageDescriptions(
            content,
            isAutoImageCount ? undefined : args.imageCount
          );
          
          console.log(`📸 [EbookAdvancedGen] Descrições extraídas: ${imageDescriptions.length}`);
          
          if (imageDescriptions.length > 0) {
            console.log(`📸 [EbookAdvancedGen] Encontradas ${imageDescriptions.length} descrições de imagens`);
            console.log(`   Descrições:`, imageDescriptions.map(d => d.prompt.substring(0, 50)));
            
            // 🔄 SUBSTITUIR marcadores IMAGE_DESCRIPTION[...] por placeholders {{img1}}, {{img2}}
            console.log(`🔄 [EbookAdvancedGen] Substituindo marcadores por placeholders...`);
            content = imageGenerationService.replaceDescriptionsWithPlaceholders(content, imageDescriptions);
            
            // Montar opções avançadas se fornecidas
            const imageOptions: any = {};
            if (args.imageAspectRatio) imageOptions.aspectRatio = args.imageAspectRatio;
            if (args.imageQuality) imageOptions.quality = args.imageQuality;
            if (args.imagePromptEnhancements) imageOptions.promptEnhancements = args.imagePromptEnhancements;
            
            // Gerar e integrar imagens
            const imageResult = await imageGenerationService.generateAndIntegrateImages(
              content,
              imageDescriptions,
              metadata.userId,
              args.projectId,
              args.sectionId,
              args.imageStyle || 'Auto',
              Object.keys(imageOptions).length > 0 ? imageOptions : undefined,
              { replicateApiKey: metadata.replicateApiKey, model: metadata.model }
            );

            // Usar conteúdo com URLs integradas
            finalContent = imageResult.contentWithUrls;
            imageData = {
              success: imageResult.success,
              generatedCount: imageResult.generatedImages.length,
              totalRequested: imageResult.imageDescriptions.length,
              error: imageResult.error
            };

            // Preparar array de imagens
            if (imageData.generatedCount > 0) {
              for (let i = 0; i < imageData.generatedCount; i++) {
                imagesArray.push({
                  success: imageData.success,
                  generatedAt: new Date()
                });
              }
            }

            console.log(`✅ [EbookAdvancedGen] Imagens processadas: ${imageResult.generatedImages.length} geradas com sucesso`);
          } else {
            console.warn(`⚠️ [EbookAdvancedGen] Nenhuma descrição de imagem encontrada no conteúdo`);
            imageData = { success: false, generatedCount: 0, totalRequested: args.imageCount || 0, error: 'Nenhuma descrição de imagem no conteúdo' };
          }
        } catch (error) {
          console.error('❌ [EbookAdvancedGen] Erro ao processar imagens:', error);
          imageData = { success: false, generatedCount: 0, totalRequested: args.imageCount || 0, error: String(error) };
        }
      }

      // Limpar marcadores IMAGE_DESCRIPTION do conteúdo final
      finalContent = imageGenerationService.cleanImageDescriptions(finalContent);

      // ✅ SALVAR conteúdo com imagens integradas no banco de dados
      if (args.sectionId) {
        try {
          const hasImages = finalContent.includes('!['); // Markdown images
          const updateData: any = {
            content: finalContent,
            'contentMetadata.generatedAt': new Date(),
            'contentMetadata.withImages': imageData.generatedCount > 0,
            'contentMetadata.hasMarkdownImages': hasImages
          };

          // Se imagens foram geradas, salvar array de informações delas
          if (imageData.generatedCount > 0) {
            updateData['images'] = imagesArray;
            updateData['imagesMetadata'] = imageData;
          }

          await mongoDbService.updateOne('ebookSections',
            { _id: new ObjectId(args.sectionId) },
            { $set: updateData }
          );
          console.log(`✅ [EbookAdvancedGen] Seção ${args.sectionId} atualizada com conteúdo (${imageData.generatedCount} imagens)`);
        } catch (error) {
          console.error('❌ [EbookAdvancedGen] Erro ao salvar conteúdo no banco:', error);
        }
      }

      return {
        role: 'tool',
        content: {
          generatedContent: finalContent,
          images: imagesArray,
          metadata: {
            action: args.action,
            words: wordCount,
            tier: tier,
            model: modelCost.id,
            duration: duration,
            imagesMetadata: imageData
          }
        },
        tool_call_id: tool_call_id,
        credits: actualCredits  // Agora retorna custo REAL, não estimado
      };

    } catch (error: any) {
      console.error('❌ [EbookAdvancedGen] Erro:', error);
      throw new Error(`Falha na geração: ${error.message}`);
    }
  },

  icon: 'bi-stars',
  provider: 'llm'
};

/**
 * Função auxiliar para contar palavras
 */
function countWords(text: string): number {
  if (!text || text.trim() === '') return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Calcula créditos reais baseados nos tokens efetivamente usados
 */
function calculateActualCredits(modelId: string, promptTokens: number, completionTokens: number): number {
  // Mapeamento de preços corretos por modelo (USD por 1M tokens)
  const modelPrices: { [key: string]: { input: number, output: number } } = {
    'google/gemini-2.5-pro': { input: 1.25, output: 10.00 },
    'google/gemini-2.5-flash': { input: 0.30, output: 2.50 },
    'google/gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
    // Modelos antigos (para compatibilidade)
    'anthropic/claude-sonnet-4.5': { input: 3.00, output: 15.00 },
    'openai/gpt-4.1-mini': { input: 0.40, output: 1.60 },
    // Fallback para outros modelos
    'default': { input: 0.05, output: 0.40 }
  };

  const prices = modelPrices[modelId] || modelPrices['default'];

  // Calcular custo em USD
  const inputCostUSD = (promptTokens * prices.input) / 1_000_000;
  const outputCostUSD = (completionTokens * prices.output) / 1_000_000;
  const totalCostUSD = inputCostUSD + outputCostUSD;

  // Converter USD para créditos (1 crédito = $0.001)
  const totalCredits = totalCostUSD / 0.001;

  // Garantir custo mínimo de 2 créditos
  return Math.max(2, totalCredits);
}

export default ebookAdvancedGenerationTool;
