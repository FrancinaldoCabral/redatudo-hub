import { CreditsService } from '../../domain/services/CreditsService';
import { WordPressUserService } from '../../domain/services/WordPressUserService';
import { sendStatus } from '../../services/system.service';
import { getTools } from '../../services/tools.service';
import { addHistoric } from '../../services/historic.service';
import { MongoDbService } from '../../services/mongodb.service';
import { Tool } from '../../tools/protocols/tools.protocols';
import { CreditsService as CreditsLib } from '../../services/credits.service';
import { SYSTEM_LLM_MODEL } from '../../infra/db/globals.db';

export class ToolController {
  private readonly creditsLib = new CreditsLib();
  private readonly mongoDbService = new MongoDbService();

  constructor(
    private readonly creditsService: CreditsService,
    private readonly wordpressService: WordPressUserService
  ) {}

  async execute(form: any, metadata: any): Promise<any> {
    // 1. Buscar tool específica pelo app name
    const tool = await this.getToolByAppName(metadata.app);
    if (!tool) {
      throw new Error(`Tool not found: ${metadata.app}`);
    }
    // 2. Preparar args e estimar custo (para suportar preços dinâmicos como qualidade de imagem)
    let args: any;
    // Handle special tools that receive structured data directly
    if (metadata.app.startsWith('ebook-') || metadata.app === 'image-editor') {
      // For image-editor, parse the JSON content from messages
      if (metadata.app === 'image-editor') {
        const userMessage = form.messages[form.messages.length - 1].content;
        args = JSON.parse(userMessage); // Parse JSON directly
      } else {
        args = form; // Pass the entire form object as args for ebook tools
      }
    } else {
      // For other tools, extract from messages as before
      const userMessage = form.messages[form.messages.length - 1].content;
      args = this.extractArgsFromPrompt(userMessage, tool);
    }

    // 3. Verificar créditos mínimos (1 crédito para executar)
    const userBalance = await this.creditsService.checkBalance(parseInt(metadata.userId));
    const balanceFloat = parseFloat(`${userBalance}`);
    if (balanceFloat < 1) {
      throw new Error(`no credit - Saldo insuficiente. Necessário: 1 crédito mínimo, Disponível: ${balanceFloat.toFixed(2)} créditos`);
    }

    // 4. Enviar status ao frontend
    await sendStatus(metadata.userId, `${tool.title}...`);

    // 5. Executar tool diretamente
//    console.log('FORM.MESSAGES: ', form, form.messages)

    // Corrigir modelo se for 'auto'
    const model = metadata.model === 'auto' ? SYSTEM_LLM_MODEL : metadata.model;
    const toolMetadata = { ...metadata, model };

//    console.log('ToolController - args:', args);
//    console.log('ToolController - toolMetadata:', toolMetadata);

    const result = await tool.action(
      args,
      tool.schema.function.name,
      toolMetadata,
      'tool_direct_call' // tool_call_id
    );

    // Se não há credits retornado, assume custo mínimo de 1
    const creditsCost = result.credits || 1;
    const roundedCost = Math.ceil(creditsCost);

    // If this is a cover generation, persist cover metadata to the project so frontend can consume print-ready URL
    try {
      if ((metadata.app === 'ebook-generate-cover' || metadata.app === 'ebook-generate-image') && result?.content) {
        const projectId = toolMetadata.projectId || metadata.projectId;
        if (projectId && result.content.imageId) {
          // Push to coverHistory and set metadata.cover
          const coverEntry = {
            imageId: result.content.imageId,
            imageUrl: result.content.imageUrl,
            printUrl: result.content.printUrl || null,
            previewUrl: result.content.previewUrl || null,
            prompt: result.content.prompt || null,
            createdAt: new Date()
          };

          await this.mongoDbService.updateOne('ebookProjects', { _id: new (require('mongodb').ObjectId)(projectId) }, {
            $push: { coverHistory: coverEntry },
            $set: { 'metadata.currentCover': coverEntry, updatedAt: new Date() }
          });
        }
      }
    } catch (err) {
      // Non-fatal: log and continue
      console.error('Erro ao salvar metadata da capa no projeto:', err);
    }

    // 6. Registrar histórico com custo real arredondado pra cima
    await addHistoric({
      userId: metadata.userId,
      operation: 'debit',
      description: tool.title,
      total: -roundedCost,
      createdAt: new Date(),
    });

    await this.creditsLib.subtractCredit(parseInt(metadata.userId), `${roundedCost}`);

    // 7. Retornar resultado (objeto JSON já validado pela tool)
    const finalResult = {
      content: result.content,
      toolUsed: tool.title,
      creditsCharged: roundedCost
    };

//    console.log('🔄 ToolController retornando:', finalResult);
    return finalResult;
  }

  private async getToolByAppName(appName: string): Promise<Tool | null> {
    const allTools = await getTools();

    // Mapeamento entre nomes de app (frontend) e nomes de função (backend)
    const appToFunctionMap: { [key: string]: string } = {
      'abnt-corrector': 'abnt_corrector',
      'academic-assistant': 'academic_assistant',
      'academic-conclusion': 'academic_conclusion',
      'ai-humanizer': 'ai_humanizer',
      'book-names': 'book_names',
      'copy-aida': 'copy_aida',
      'hashtag-generator': 'hashtag_generator',
      'image-editor': 'image_editor',
      'instagram-captions': 'instagram_captions',
      'motivational-quotes': 'motivational_quotes',
      'product-descriptions': 'product_descriptions',
      'tcc-themes': 'tcc_themes',
      'text-rewriter': 'text_rewriter',
      'title-generator': 'title_generator',
      'username-generator': 'username_generator',
      'ebook-generate-section': 'ebook_generate_section',
      'ebook-expand-text': 'ebook_expand_text',
      'ebook-rewrite-text': 'ebook_rewrite_text',
      'ebook-generate-cover': 'ebook_generate_cover',
      'ebook-generate-image': 'ebook_generate_image'
    };

    const functionName = appToFunctionMap[appName] || appName;
    return allTools.find(t => {
      // Validação segura para schema.function.name
      if (!t.schema || !t.schema.function || !t.schema.function.name) {
        console.warn(`⚠️ Tool ${t.title || 'unknown'} has invalid schema structure:`, { schema: t.schema });
        return false;
      }
      return t.schema.function.name === functionName;
    }) || null;
  }



  private extractArgsFromPrompt(userMessage: string, tool: Tool): any {
    // Para ferramentas simples que usam apenas texto, retorna o texto
    // Para ferramentas mais complexas, pode ser necessário parsing mais sofisticado
    const args: any = {};

    // Mapeamento básico baseado no nome da função
    switch (tool.schema.function.name) {
      case 'tcc_themes':
        args.area = this.extractAreaFromPrompt(userMessage);
        args.level = this.extractLevelFromPrompt(userMessage);
        args.number = this.extractNumberFromPrompt(userMessage);
        break;
      case 'text_rewriter':
        args.text = userMessage;
        args.objective = this.extractObjectiveFromPrompt(userMessage);
        args.level = this.extractRewriteLevelFromPrompt(userMessage);
        break;
      case 'abnt_corrector':
        args.text = userMessage;
        args.mode = this.extractModeFromPrompt(userMessage);
        break;
      case 'title_generator':
        args.theme = userMessage;
        args.type = this.extractTypeFromPrompt(userMessage);
        args.tone = this.extractToneFromPrompt(userMessage);
        args.number = this.extractNumberFromPrompt(userMessage);
        break;
      case 'username_generator':
        args.keywords = userMessage;
        args.style = this.extractStyleFromPrompt(userMessage);
        args.includeNumbers = this.extractIncludeNumbersFromPrompt(userMessage);
        args.platform = this.extractPlatformFromPrompt(userMessage);
        break;
      case 'hashtag_generator':
        args.theme = userMessage;
        args.platform = this.extractPlatformFromPrompt(userMessage);
        args.number = this.extractNumberFromPrompt(userMessage);
        break;
      case 'book_names':
        args.theme = userMessage;
        args.genre = this.extractGenreFromPrompt(userMessage);
        args.tone = this.extractToneFromPrompt(userMessage);
        args.number = this.extractNumberFromPrompt(userMessage);
        break;
      case 'copy_aida':
        args.product = userMessage;
        break;
      case 'instagram_captions':
        args.theme = userMessage;
        args.tone = this.extractToneFromPrompt(userMessage);
        args.emojis = this.extractEmojisFromPrompt(userMessage);
        args.number = this.extractNumberFromPrompt(userMessage);
        break;
      case 'motivational_quotes':
        args.theme = userMessage;
        args.tone = this.extractToneFromPrompt(userMessage);
        args.number = this.extractNumberFromPrompt(userMessage);
        break;
      case 'product_descriptions':
        args.product = userMessage;
        args.features = this.extractFeaturesFromPrompt(userMessage);
        args.tone = this.extractToneFromPrompt(userMessage);
        args.platform = this.extractPlatformFromPrompt(userMessage);
        break;
      case 'academic_assistant':
        args.type = this.extractAssistantTypeFromPrompt(userMessage);
        args.theme = userMessage;
        args.context = this.extractContextFromPrompt(userMessage);
        args.keywords = this.extractKeywordsFromPrompt(userMessage);
        break;
      case 'academic_conclusion':
        args.mainPoints = userMessage;
        args.conclusionType = this.extractConclusionTypeFromPrompt(userMessage);
        args.contribution = this.extractContributionFromPrompt(userMessage);
        break;
      case 'ai_humanizer':
        args.text = userMessage;
        args.level = this.extractHumanizerLevelFromPrompt(userMessage);
        args.keepTechnicalTerms = this.extractKeepTechnicalTermsFromPrompt(userMessage);
        break;
      default:
        // Para ferramentas simples, usa o texto como argumento principal
        args.text = userMessage;
    }

    return args;
  }

  // Métodos auxiliares para extração de argumentos específicos
  private extractAreaFromPrompt(prompt: string): string {
    // Tenta extrair área de conhecimento do prompt
    const areas = ['Administração', 'Direito', 'Engenharia', 'Medicina', 'Psicologia', 'Educação'];
    return areas.find(area => prompt.toLowerCase().includes(area.toLowerCase())) || 'geral';
  }

  private extractLevelFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('mestrado') || prompt.toLowerCase().includes('dissertação')) return 'mestrado';
    if (prompt.toLowerCase().includes('doutorado') || prompt.toLowerCase().includes('tese')) return 'doutorado';
    return 'graduação';
  }

  private extractNumberFromPrompt(prompt: string): number {
    const match = prompt.match(/(\d+)/);
    return match ? parseInt(match[1]) : 5;
  }

  private extractObjectiveFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('parafrasear')) return 'parafrasear';
    if (prompt.toLowerCase().includes('formalizar')) return 'formalizar';
    if (prompt.toLowerCase().includes('simplificar')) return 'simplificar';
    if (prompt.toLowerCase().includes('humanizar')) return 'humanizar';
    return 'parafrasear';
  }

  private extractRewriteLevelFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('intenso') || prompt.toLowerCase().includes('completa')) return 'intenso';
    if (prompt.toLowerCase().includes('leve') || prompt.toLowerCase().includes('poucas')) return 'leve';
    return 'medio';
  }

  private extractModeFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('formal')) return 'formal';
    if (prompt.toLowerCase().includes('casual')) return 'casual';
    return 'academico';
  }

  private extractTypeFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('livro')) return 'livro';
    if (prompt.toLowerCase().includes('blog')) return 'blog';
    if (prompt.toLowerCase().includes('youtube')) return 'youtube';
    if (prompt.toLowerCase().includes('tcc')) return 'tcc';
    return 'blog';
  }

  private extractToneFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('formal')) return 'formal';
    if (prompt.toLowerCase().includes('casual')) return 'casual';
    if (prompt.toLowerCase().includes('profissional')) return 'profissional';
    return 'neutro';
  }

  private extractStyleFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('curto')) return 'short';
    if (prompt.toLowerCase().includes('criativo')) return 'creative';
    if (prompt.toLowerCase().includes('profissional')) return 'professional';
    if (prompt.toLowerCase().includes('engraçado') || prompt.toLowerCase().includes('divertido')) return 'funny';
    return 'creative';
  }

  private extractIncludeNumbersFromPrompt(prompt: string): boolean {
    return prompt.toLowerCase().includes('números') || prompt.toLowerCase().includes('numbers');
  }

  private extractPlatformFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('instagram')) return 'instagram';
    if (prompt.toLowerCase().includes('twitter')) return 'twitter';
    if (prompt.toLowerCase().includes('youtube')) return 'youtube';
    return 'instagram';
  }

  private extractGenreFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('romance')) return 'romance';
    if (prompt.toLowerCase().includes('fantasia')) return 'fantasia';
    if (prompt.toLowerCase().includes('suspense')) return 'suspense';
    return 'geral';
  }

  private extractEmojisFromPrompt(prompt: string): boolean {
    return prompt.toLowerCase().includes('emoji') || prompt.toLowerCase().includes('emojis');
  }

  private extractFeaturesFromPrompt(prompt: string): string {
    // Extrai características mencionadas no prompt
    return '';
  }

  private extractAssistantTypeFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('introdução')) return 'introducao';
    if (prompt.toLowerCase().includes('conclusão')) return 'conclusao';
    if (prompt.toLowerCase().includes('format')) return 'formatador';
    return 'introducao';
  }

  private extractContextFromPrompt(prompt: string): string {
    return '';
  }

  private extractKeywordsFromPrompt(prompt: string): string {
    return '';
  }

  private extractConclusionTypeFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('síntese')) return 'sintese';
    if (prompt.toLowerCase().includes('proposição')) return 'proposicao';
    return 'sintese';
  }

  private extractContributionFromPrompt(prompt: string): string {
    return '';
  }

  private extractHumanizerLevelFromPrompt(prompt: string): string {
    if (prompt.toLowerCase().includes('agressivo') || prompt.toLowerCase().includes('intenso')) return 'agressivo';
    if (prompt.toLowerCase().includes('leve') || prompt.toLowerCase().includes('sutil')) return 'leve';
    return 'medio';
  }

  private extractKeepTechnicalTermsFromPrompt(prompt: string): boolean {
    return prompt.toLowerCase().includes('técnico') || prompt.toLowerCase().includes('technical');
  }
}
