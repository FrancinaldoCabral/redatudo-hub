import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { PromptService } from '../services/prompt.service';
import { Section } from './protocols/ebook-tools.protocols';
import { extractValidJson } from '../services/extract-valid-json.service';
import { MongoDbService } from '../services/mongodb.service';
import { ObjectId } from 'mongodb';
import { getModelCost } from '../config/ebook-llm.config';
import SectionImageGenerationService from '../services/section-image-generation.service';

const promptService = new PromptService();
const mongoDbService = new MongoDbService();
const imageGenerationService = new SectionImageGenerationService();

const ebookGenerateSectionTool: Tool = {
  title: 'Ebook Generate Section',
  description: 'Gera o conteúdo de uma seção específica de um ebook usando synopsis como guia narrativo.',
  costPreview: 100, // Custo inicial de placeholder, será ajustado
  schema: {
    type: 'function',
    function: {
      name: 'ebook_generate_section',
      description: 'Gera o conteúdo de uma seção específica de um ebook.',
      parameters: {
        type: 'object',
        properties: {
          bookMetadata: {
            type: 'object',
            description: 'Metadados completos do ebook (título, descrição, nicho, etc.)',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              niche: { type: 'string' },
              tone: { type: 'string' },
              language: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              audience: { type: 'string' },
            },
            required: ['title', 'description', 'niche', 'tone', 'language', 'keywords', 'audience'],
          },
          chapterTitle: {
            type: 'string',
            description: 'Título do capítulo ao qual a seção pertence.',
          },
          section: {
            type: 'object',
            description: 'Dados da seção a ser gerada (título, palavras-chave).',
            properties: {
              title: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
            },
            required: ['title'],
          },
          customInstructions: {
            type: 'string',
            description: 'Instruções adicionais fornecidas pelo usuário para esta seção.'
          }
        },
        required: ['bookMetadata', 'chapterTitle', 'section'],
      },
    },
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Buscar seção do banco para obter synopsis e contexto completo
    let synopsis = '';
    let previousSynopses: Array<{ title: string; synopsis: string }> = [];
    
    try {
      if (args.sectionId) {
        const section = await mongoDbService.getOne('ebookSections', { 
          _id: new ObjectId(args.sectionId) 
        });
        
        if (section) {
          synopsis = section.synopsis || '';
          
          // Buscar seções anteriores para contexto narrativo
          if (args.projectId) {
            const allSections = await mongoDbService.get('ebookSections', { 
              projectId: args.projectId 
            });
            
            const sortedSections = allSections.sort((a: any, b: any) => a.order - b.order);
            const currentOrder = section.order || 0;
            
            previousSynopses = sortedSections
              .filter((s: any) => (s.order || 0) < currentOrder && s.synopsis)
              .slice(-3) // Últimas 3 seções anteriores
              .map((s: any) => ({
                title: s.title,
                synopsis: s.synopsis
              }));
          }
        }
      }
    } catch (error) {
      console.error('⚠️ Erro ao buscar synopsis, continuando sem ela:', error);
    }

    // Construir prompt melhorado com synopsis
    let fullPrompt = '';
    
    // Calcular contagem de palavras esperada
    const targetWords = args.wordCount || 900;
    const minWords = Math.floor(targetWords * 0.95);
    const maxWords = Math.ceil(targetWords * 1.05);
    
    // Construir instruções de imagens se solicitado
    const buildImageInstructions = (args: any): string => {
      if (!args.generateImages) return '';
      const isAutoCount = args.imageCountMode === 'auto' || args.imageCount === undefined;
      const requested = isAutoCount ? 'modo livre' : `${args.imageCount} imagens`;
      const maxAuto = 5;
      
      let instructions = `\n## INSTRUÇÕES DE IMAGENS (${requested})`;

      if (isAutoCount) {
        instructions += `\nVocê deve decidir se imagens ajudam a comunicação desta seção. Só inclua imagens quando forem realmente úteis para ilustrar ou demonstrar (especialmente em manuais). Use no máximo ${maxAuto} imagens. Se não fizer sentido, não inclua IMAGE_DESCRIPTION.`;
      } else {
        instructions += `\nVocê DEVE incluir ${args.imageCount} descrições de imagens naturalmente distribuídas no texto.`;
      }

      instructions += `\nPara cada imagem, use o seguinte formato EXATAMENTE:
IMAGE_DESCRIPTION[detailed description in English]

IMPORTANTE:
- Cada descrição deve ser clara, descritiva e em INGLÊS
- Coloque os marcadores em locais estratégicos do texto (após parágrafos importantes)
- As imagens devem ser RELEVANTES ao conteúdo da seção
- Distribua as imagens naturalmente ao longo do texto
- Mantenha as descrições detalhadas (50-200 caracteres)

Exemplo de formato correto:
"...parágrafo de conteúdo..."

IMAGE_DESCRIPTION[A serene mountain landscape with morning mist and pine trees, cinematic lighting, professional photography]

"...próximo parágrafo..."

IMAGE_DESCRIPTION[A close-up of dew drops on vibrant green leaves with soft bokeh background, macro photography, high detail]

...`;

      // Se há opções avançadas, adicionar instruções contextuais
      if (args.imageAspectRatio || args.imageQuality || args.imagePromptEnhancements || args.imagePromptInstructions) {
        instructions += `\n\n## OPÇÕES AVANÇADAS PARA GERAÇÃO DE IMAGENS`;
        
        if (args.imageAspectRatio) {
          instructions += `\n- Proporção de tela: ${args.imageAspectRatio} (as imagens serão geradas nesta proporção)`;
        }
        
        if (args.imageQuality) {
          const qualityLabels: Record<string, string> = {
            'basico': 'Básico (geração mais rápida, resolução padrão)',
            'medio': 'Médio (balanceado, boa qualidade)',
            'avancado': 'Avançado (máxima qualidade, processamento mais longo)'
          };
          instructions += `\n- Qualidade desejada: ${qualityLabels[args.imageQuality] || args.imageQuality}`;
        }
        
        if (args.imagePromptEnhancements && args.imagePromptEnhancements.length > 0) {
          instructions += `\n- Enhancements adicionais para os prompts:\n`;
          args.imagePromptEnhancements.forEach((enhancement: string, idx: number) => {
            instructions += `  ${idx + 1}. "${enhancement}"\n`;
          });
          instructions += `Incorpore naturalmente esses detalhes nas descrições de imagens para melhorar a qualidade visual gerada.`;
        }

        if (args.imagePromptInstructions) {
          instructions += `\n\n## INSTRUÇÕES CUSTOMIZADAS DO USUÁRIO PARA PROMPTS DE IMAGEM\n${args.imagePromptInstructions}\n\nAplique essas instruções ao gerar as descrições de imagens, mantendo a relevância ao conteúdo da seção.`;
        }
      }

      instructions += `\n\nExemplo de formato:
"...parágrafo de conteúdo..."
IMAGE_DESCRIPTION: "A serene mountain landscape with morning mist and pine trees, professional photography" (posição: top)
"...próximo parágrafo..."
IMAGE_DESCRIPTION: "A close-up of dew drops on green leaves, macro photography" (posição: middle)
...`;

      return instructions;
    };

    const imageInstructions = buildImageInstructions(args);

    if (synopsis && synopsis.trim().length > 0) {
      // MODO PLANEJADO: Usar synopsis como guia
      fullPrompt = `Você é um escritor profissional especializado em criar conteúdo coerente e envolvente para ebooks.

DNA DO LIVRO:
- Título: ${args.bookDNA?.title || 'Não especificado'}
- Gênero: ${args.bookDNA?.genre || 'Não especificado'}
- Tom: ${args.bookDNA?.tone || 'Não especificado'}
- Ideia Central: ${args.bookDNA?.idea || 'Não especificado'}
${args.bookDNA?.keywords?.length > 0 ? `- Palavras-chave: ${args.bookDNA.keywords.join(', ')}` : ''}

${previousSynopses.length > 0 ? `CONTEXTO NARRATIVO (capítulos anteriores):
${previousSynopses.map((s, i) => `${i + 1}. ${s.title}: ${s.synopsis}`).join('\n')}

` : ''}SYNOPSIS DESTA SEÇÃO (O QUE DEVE ACONTECER):
${synopsis}

TAREFA:
Escreva o conteúdo completo desta seção "${args.sectionTitle}" seguindo a synopsis acima.

⚠️ REQUISITO CRÍTICO DE COMPRIMENTO:
- Quantidade de palavras: ${targetWords} palavras (margem: ${minWords}-${maxWords})
- Este é um requisito OBRIGATÓRIO. Conte as palavras antes de finalizar.
- Desenvolva o conteúdo completo até atingir essa quantidade exata.

DIRETRIZES:
- Desenvolva todos os pontos mencionados na synopsis
- Mantenha coerência com o DNA do livro e capítulos anteriores
- Use tom ${args.bookDNA?.tone || 'adequado'} e linguagem clara
- Crie um texto envolvente e bem estruturado
- IMPORTANTE: Garanta ${targetWords} palavras no texto final

${args.customInstructions ? `INSTRUÇÕES ADICIONAIS DO USUÁRIO:
${args.customInstructions}
` : ''}${imageInstructions}

Gere o conteúdo completo agora:`;
      
      console.log(`✅ Gerando seção "${args.sectionTitle}" COM SYNOPSIS (modo planejado) - ${targetWords} palavras${args.generateImages ? ` + ${args.imageCount} imagens` : ''}`);
    } else {
      // MODO LIVRE: Gerar sem synopsis (fallback)
      fullPrompt = promptService.generatePromptForSection(
        args.bookMetadata || args.bookDNA, 
        { title: args.sectionTitle, keywords: [], content: '' } as Section, 
        args.chapterTitle || args.sectionTitle,
        targetWords
      );

      if (args.customInstructions) {
        fullPrompt += `\n\nINSTRUÇÕES ADICIONAIS DO USUÁRIO:\n${args.customInstructions}`;
      }

      fullPrompt += imageInstructions;
      
      console.log(`⚠️ Gerando seção "${args.sectionTitle}" SEM SYNOPSIS (modo livre - menos coerente) - ${targetWords} palavras${args.generateImages ? ` + ${args.imageCount} imagens` : ''}`);
    }

    const tools = [{
        type: 'function',
        function: {
          name: 'ebook_section_result',
          description: 'Conteúdo da seção do ebook gerado.',
          parameters: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'O conteúdo completo da seção do ebook.' },
            },
            required: ['content'],
          },
        },
      }];

    const response = await openai.createCompletion({
      model: metadata.model || getModelCost('medium').id,
      max_tokens: 64000,
      messages: [{ role: 'user', content: fullPrompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'ebook_section_result' } },
      toolName: 'ebook-generate-section'
    });

    const message = response.choices[0].message as any;
    const toolCall = message?.tool_calls?.[0];

    if (!toolCall) {
        throw new Error('INVALID_TOOL_RESPONSE_FORMAT: No tool call generated');
    }

    const { content } = extractValidJson(toolCall.function.arguments);

    // Extrair e processar imagens se solicitado
    let finalContent = content;
    let imageData: any = null;

    const isAutoImageCount = args.imageCountMode === 'auto' || args.imageCount === undefined;

    if (args.generateImages && (isAutoImageCount || args.imageCount > 0)) {
      try {
        console.log(`🖼️ Extraindo descrições de imagens do conteúdo gerado...`);
        
        const imageDescriptions = imageGenerationService.extractImageDescriptions(
          finalContent,
          isAutoImageCount ? undefined : args.imageCount
        );
        
        if (imageDescriptions.length > 0) {
          console.log(`📸 Encontradas ${imageDescriptions.length} descrições de imagens`);
          
          // 🔄 SUBSTITUIR marcadores IMAGE_DESCRIPTION[...] por placeholders {{img1}}, {{img2}}
          console.log(`🔄 [EbookGenerateSection] Substituindo marcadores por placeholders...`);
          finalContent = imageGenerationService.replaceDescriptionsWithPlaceholders(finalContent, imageDescriptions);
          
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

          console.log(`✅ Imagens processadas: ${imageResult.generatedImages.length} geradas com sucesso`);
        } else {
          console.warn(`⚠️ Nenhuma descrição de imagem encontrada no conteúdo, mas geração foi solicitada`);
          imageData = { success: false, generatedCount: 0, totalRequested: args.imageCount, error: 'Nenhuma descrição de imagem no conteúdo' };
        }
      } catch (error) {
        console.error('❌ Erro ao processar imagens:', error);
        // Continuar mesmo se imagens falharem - o conteúdo é o mais importante
        imageData = { success: false, generatedCount: 0, totalRequested: args.imageCount, error: String(error) };
      }
    }

    // Limpar marcadores IMAGE_DESCRIPTION do conteúdo final se ainda existirem
    finalContent = imageGenerationService.cleanImageDescriptions(finalContent);

    // 🔍 Log diagnóstico: verificar conteúdo antes de salvar
    const hasImages = finalContent.includes('!['); // Markdown images
    console.log(`🔍 [DIAGNÓSTICO] Conteúdo final:`);
    console.log(`   - Tem Markdown images? ${hasImages}`);
    console.log(`   - Imagens geradas: ${imageData.generatedCount}`);
    console.log(`   - Tamanho do conteúdo: ${finalContent.length} caracteres`);
    if (hasImages) {
      const firstImg = finalContent.match(/!\[[^\]]*\]\([^)]+\)/)?.[0] || 'N/A';
      console.log(`   - Primeira imagem Markdown: ${firstImg.substring(0, 80)}...`);
    } else {
      console.log(`   ❌ Nenhuma imagem Markdown encontrada!`);
    }

    // ✅ SALVAR conteúdo com imagens integradas no banco de dados
    if (args.sectionId) {
      try {
        const updateData: any = {
          content: finalContent,
          'contentMetadata.generatedAt': new Date(),
          'contentMetadata.withImages': imageData.generatedCount > 0,
          'contentMetadata.hasMarkdownImages': hasImages
        };

        // Se imagens foram geradas, salvar array de informações delas
        if (imageData.generatedCount > 0) {
          // Criar array de imagens para compatibilidade com ebook-content-sampler
          updateData['images'] = Array(imageData.generatedCount).fill({
            success: imageData.success,
            generatedAt: new Date()
          });
          // Também salvar os metadados completos
          updateData['imagesMetadata'] = imageData;
        }

        // Marcar synopsis como usada se foi utilizada
        if (synopsis) {
          updateData['synopsisMetadata.usedForContentGeneration'] = true;
          updateData['synopsisMetadata.lastUsedAt'] = new Date();
        }

        await mongoDbService.updateOne('ebookSections',
          { _id: new ObjectId(args.sectionId) },
          { $set: updateData }
        );
        console.log(`✅ Seção ${args.sectionId} atualizada com conteúdo gerado (${imageData.generatedCount} imagens, ${hasImages ? 'COM' : 'SEM'} tags <img>)`);
      } catch (error) {
        console.error('❌ Erro ao salvar conteúdo gerado no banco:', error);
        // Não falha a operação, apenas loga o erro
      }
    }

    // TODO: Implementar cálculo de créditos dinâmico baseado no uso real (tokens, etc.)
    const creditsCharged = 100; // Placeholder

    // Preparar array de imagens para o frontend (compatível com ebook-content-sampler)
    const imagesArray = imageData.generatedCount > 0 
      ? Array(imageData.generatedCount).fill({
          success: imageData.success,
          generatedAt: new Date()
        })
      : [];

    return {
      role: 'tool',
      content: { 
        generatedContent: finalContent,
        images: imagesArray,
        metadata: {
          imagesMetadata: imageData // Manter metadados completos também
        }
      },
      tool_call_id: tool_call_id,
      credits: creditsCharged,
    };
  },
  icon: 'bi-book',
  provider: 'llm',
};

export default ebookGenerateSectionTool;
