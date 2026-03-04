import { GenerationAction, getActionCategory } from '../config/ebook-llm.config';
import { EbookContext } from './ebook-context.service';

/**
 * Arquivo de referência para geração
 */
export interface ReferenceFile {
  url: string;
  type: 'pdf' | 'docx' | 'image' | 'video' | 'audio';
  name: string;
  instructions?: string;
}

/**
 * Opções para geração de prompt
 */
export interface PromptOptions {
  tone?: string;
  style?: string;
  perspective?: string;
  detailLevel?: string;
  targetAudience?: string;
  customInstructions?: string;
}

/**
 * Prompt construído (system + user)
 */
export interface BuiltPrompt {
  system: string;
  user: string;
}

/**
 * Serviço avançado de construção de prompts para geração de ebooks
 * Suporta 40+ ações diferentes
 */
export class EbookPromptService {
  
  /**
   * Constrói prompt completo para uma ação específica
   */
  buildPrompt(
    action: GenerationAction,
    context: EbookContext,
    selectedText: string | undefined,
    words: number,
    options?: PromptOptions,
    referenceFiles?: ReferenceFile[],
    generateImages?: boolean,
    imageCount?: number
  ): BuiltPrompt {
    // System prompt base
    const systemPrompt = this.buildSystemPrompt(action, context, words, options, referenceFiles, generateImages, imageCount);

    // User prompt específico da ação
    const userPrompt = this.buildUserPrompt(action, selectedText, words, options, generateImages, imageCount);

    return {
      system: systemPrompt,
      user: userPrompt
    };
  }

  /**
   * Constrói system prompt (instruções gerais)
   */
  private buildSystemPrompt(
    action: GenerationAction,
    context: EbookContext,
    words: number,
    options?: PromptOptions,
    referenceFiles?: ReferenceFile[],
    generateImages?: boolean,
    imageCount?: number
  ): string {
    const parts: string[] = [];

    // Identidade do assistente
    parts.push('Você é um escritor profissional especializado em criação de conteúdo de alta qualidade para ebooks.');

    // Contexto do projeto (se disponível)
    if (context.projectTitle || context.projectDescription) {
      parts.push('\n# CONTEXTO DO PROJETO');
      if (context.projectTitle) parts.push(`Título: ${context.projectTitle}`);
      if (context.projectDescription) parts.push(`Descrição: ${context.projectDescription}`);
      if (context.projectGenre) parts.push(`Gênero: ${context.projectGenre}`);
    }

    // Contexto da seção atual
    if (context.sectionTitle) {
      parts.push('\n# SEÇÃO ATUAL');
      parts.push(`Título: ${context.sectionTitle}`);
      if (context.currentSectionOrder !== undefined && context.totalSections) {
        parts.push(`Posição: ${context.currentSectionOrder + 1}/${context.totalSections}`);
      }
    }

    // Contexto de seções anteriores (resumido)
    if (context.previousSections && context.previousSections.length > 0) {
      parts.push('\n# CONTEXTO ANTERIOR');
      parts.push('Conteúdo já escrito nas seções anteriores:');
      context.previousSections.forEach(section => {
        const preview = this.truncate(section.content, 200);
        parts.push(`- ${section.title}: ${preview}`);
      });
    }

    // Opções de estilo
    if (options) {
      parts.push('\n# DIRETRIZES DE ESTILO');
      if (options.tone) parts.push(`Tom: ${options.tone}`);
      if (options.style) parts.push(`Estilo: ${options.style}`);
      if (options.perspective) parts.push(`Perspectiva: ${options.perspective}`);
      if (options.targetAudience) parts.push(`Público-alvo: ${options.targetAudience}`);
      if (options.detailLevel) parts.push(`Nível de detalhe: ${options.detailLevel}`);
    }

    // Instruções de comprimento
    parts.push(`\n# COMPRIMENTO REQUERIDO`);
    parts.push(`Gere um texto com aproximadamente ${words} palavras.`);

    // Arquivos de referência
    if (referenceFiles && referenceFiles.length > 0) {
      parts.push('\n# ARQUIVOS DE REFERÊNCIA');
      parts.push('Você tem acesso aos seguintes arquivos para referência:');
      referenceFiles.forEach((file, index) => {
        const instruction = file.instructions ? ` - ${file.instructions}` : '';
        parts.push(`${index + 1}. ${file.name} (${file.type})${instruction}`);
      });
      parts.push('');
      parts.push('Utilize estes arquivos para informar e enriquecer sua geração de conteúdo. Analise os arquivos fornecidos e incorpore conceitos, estilos visuais, informações técnicas ou inspiração narrativa conforme apropriado para a tarefa.');
    }

    // Instruções customizadas
    if (options?.customInstructions) {
      parts.push('\n# INSTRUÇÕES ADICIONAIS');
      parts.push(options.customInstructions);
    }

    // Instruções de geração de imagens
    if (generateImages === true) {
      parts.push('\n═══════════════════════════════════════════════════════════');
      parts.push('# ⚠️ INSTRUÇÃO OBRIGATÓRIA DE IMAGENS ⚠️');
      parts.push('═══════════════════════════════════════════════════════════');
      parts.push('');
      parts.push('🚨 ATENÇÃO: Esta é uma INSTRUÇÃO OBRIGATÓRIA e NÃO OPCIONAL!');
      parts.push('');
      parts.push('Você DEVE incluir marcadores de imagem no texto que você gerar.');
      parts.push('Não ignore esta instrução. Não esqueça de incluir os marcadores.');
      parts.push('');
      parts.push('📌 FORMATO EXATO DO MARCADOR:');
      parts.push('IMAGE_DESCRIPTION[detailed description in English]');
      parts.push('');
      parts.push('📋 REGRAS OBRIGATÓRIAS:');
      if (imageCount && imageCount > 0) {
        parts.push(`1. ✅ Você DEVE incluir EXATAMENTE ${imageCount} marcador(es) IMAGE_DESCRIPTION`);
        parts.push(`2. ❌ Se você não incluir ${imageCount} marcador(es), sua resposta será REJEITADA`);
      } else {
        parts.push('1. ✅ Você DEVE incluir entre 1 e 5 marcadores IMAGE_DESCRIPTION');
        parts.push('2. ❌ Se você não incluir nenhum marcador, sua resposta será REJEITADA');
      }
      parts.push('3. 📍 Coloque os marcadores em locais estratégicos do texto (após parágrafos importantes)');
      parts.push('4. 🇬🇧 A descrição DEVE ser em INGLÊS, detalhada e com 50-200 caracteres');
      parts.push('5. 🎨 Descreva o que a imagem deve MOSTRAR visualmente, não apenas referencie');
      parts.push('');
      parts.push('✅ EXEMPLO CORRETO:');
      parts.push('');
      parts.push('A inteligência artificial está transformando a medicina moderna.');
      parts.push('');
      parts.push('IMAGE_DESCRIPTION[futuristic medical laboratory with AI robots assisting doctors, holographic displays showing patient data, clean white environment, high-tech equipment]');
      parts.push('');
      parts.push('Os médicos agora podem diagnosticar doenças com maior precisão...');
      parts.push('');
      parts.push('❌ EXEMPLO INCORRETO (não faça isso):');
      parts.push('- Sem nenhum marcador IMAGE_DESCRIPTION ❌');
      parts.push('- Descrição em português ❌');
      parts.push('- Descrição muito curta: "IMAGE_DESCRIPTION[hospital]" ❌');
      parts.push('');
      parts.push('═══════════════════════════════════════════════════════════');
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Constrói user prompt específico por ação
   */
  private buildUserPrompt(
    action: GenerationAction,
    selectedText: string | undefined,
    words: number,
    options?: PromptOptions,
    generateImages?: boolean,
    imageCount?: number
  ): string {
    // Delegar para método específico de cada ação
    switch (action) {
      // CRIAÇÃO
      case 'generate':
        return this.promptGenerate(words, generateImages, imageCount);
      case 'regenerate':
        return this.promptRegenerate(selectedText, words, generateImages, imageCount);
      case 'continue':
        return this.promptContinue(selectedText, words, generateImages, imageCount);
      
      // EDIÇÃO
      case 'expand':
        return this.promptExpand(selectedText, words, generateImages, imageCount);
      case 'rewrite':
        return this.promptRewrite(selectedText, words, generateImages, imageCount);
      case 'tone':
        return this.promptChangeTone(selectedText, options?.tone, words);
      case 'summarize':
        return this.promptSummarize(selectedText, words);
      case 'simplify':
        return this.promptSimplify(selectedText, words);
      case 'enrich':
        return this.promptEnrich(selectedText, words);
      case 'correct':
        return this.promptCorrect(selectedText, words);
      
      // TRANSFORMAÇÃO
      case 'dialogize':
        return this.promptDialogize(selectedText, words);
      case 'describe':
        return this.promptDescribe(selectedText, words);
      case 'argue':
        return this.promptArgue(selectedText, words);
      case 'connect':
        return this.promptConnect(selectedText, words);
      case 'divide':
        return this.promptDivide(selectedText, words);
      case 'merge':
        return this.promptMerge(selectedText, words);
      case 'translate-tone':
        return this.promptTranslateTone(selectedText, words);
      
      // NARRATIVA
      case 'create-character':
        return this.promptCreateCharacter(words);
      case 'develop-dialogue':
        return this.promptDevelopDialogue(selectedText, words);
      case 'build-scene':
        return this.promptBuildScene(words);
      case 'create-tension':
        return this.promptCreateTension(selectedText, words);
      case 'plot-twist':
        return this.promptPlotTwist(words);
      case 'inner-monologue':
        return this.promptInnerMonologue(selectedText, words);
      case 'worldbuild':
        return this.promptWorldbuild(words);
      
      // TÉCNICO
      case 'add-examples':
        return this.promptAddExamples(selectedText, words);
      case 'create-list':
        return this.promptCreateList(selectedText, words);
      case 'compare':
        return this.promptCompare(words);
      case 'tutorial':
        return this.promptTutorial(words);
      case 'add-stats':
        return this.promptAddStats(selectedText, words);
      case 'cite-sources':
        return this.promptCiteSources(selectedText, words);
      case 'create-faq':
        return this.promptCreateFAQ(words);
      
      // REFINAMENTO
      case 'vary-structure':
        return this.promptVaryStructure(selectedText, words);
      case 'eliminate-redundancy':
        return this.promptEliminateRedundancy(selectedText, words);
      case 'strengthen-opening':
        return this.promptStrengthenOpening(selectedText, words);
      case 'strong-closing':
        return this.promptStrongClosing(selectedText, words);
      case 'add-hook':
        return this.promptAddHook(selectedText, words);
      case 'improve-flow':
        return this.promptImproveFlow(selectedText, words);
      
      default:
        return `Execute a ação: ${action}`;
    }
  }

  // ============================================================================
  // PROMPTS DE CRIAÇÃO
  // ============================================================================

  private promptGenerate(words: number, generateImages?: boolean, imageCount?: number): string {
    let prompt = `Gere conteúdo original e completo para esta seção do ebook. Crie um texto substancial, informativo e envolvente com aproximadamente ${words} palavras.`;
    if (generateImages) {
      const count = imageCount || '1-5';
      prompt += `\n\n🚨🚨🚨 ATENÇÃO OBRIGATÓRIA 🚨🚨🚨`;
      prompt += `\nVocê DEVE incluir ${count} marcadores IMAGE_DESCRIPTION no formato:`;
      prompt += `\nIMAGE_DESCRIPTION[detailed description in English]`;
      prompt += `\nNÃO ESQUEÇA! Se não incluir os marcadores, sua resposta será REJEITADA!`;
    }
    return prompt;
  }

  private promptRegenerate(content: string | undefined, words: number, generateImages?: boolean, imageCount?: number): string {
    let prompt = `Regenere o conteúdo desta seção com uma abordagem completamente diferente. Mantenha o tema mas ofereça uma nova perspectiva. Aproximadamente ${words} palavras.${content ? `\n\nConteúdo atual:\n${content}` : ''}`;
    if (generateImages) {
      const count = imageCount || '1-5';
      prompt += `\n\n🚨🚨🚨 ATENÇÃO OBRIGATÓRIA 🚨🚨🚨`;
      prompt += `\nVocê DEVE incluir ${count} marcadores IMAGE_DESCRIPTION no formato:`;
      prompt += `\nIMAGE_DESCRIPTION[detailed description in English]`;
      prompt += `\nNÃO ESQUEÇA! Se não incluir os marcadores, sua resposta será REJEITADA!`;
    }
    return prompt;
  }

  private promptContinue(content: string | undefined, words: number, generateImages?: boolean, imageCount?: number): string {
    let prompt = `Continue escrevendo a partir de onde o texto parou. Mantenha o mesmo tom e estilo, garantindo transição suave. Adicione aproximadamente ${words} palavras.${content ? `\n\nTexto atual:\n${content}` : ''}`;
    if (generateImages) {
      const count = imageCount || '1-5';
      prompt += `\n\n🚨🚨🚨 ATENÇÃO OBRIGATÓRIA 🚨🚨🚨`;
      prompt += `\nVocê DEVE incluir ${count} marcadores IMAGE_DESCRIPTION no NOVO conteúdo no formato:`;
      prompt += `\nIMAGE_DESCRIPTION[detailed description in English]`;
      prompt += `\nNÃO ESQUEÇA! Se não incluir os marcadores, sua resposta será REJEITADA!`;
    }
    return prompt;
  }

  // ============================================================================
  // PROMPTS DE EDIÇÃO
  // ============================================================================

  private promptExpand(text: string | undefined, words: number, generateImages?: boolean, imageCount?: number): string {
    const wordCount = text?.split(/\s+/).filter(w => w.length > 0).length || 0;
    
    let prompt = `# INSTRUÇÃO CRÍTICA

Você tem acesso ao contexto do projeto para REFERÊNCIA de tom e estilo.
Porém, sua tarefa é trabalhar EXCLUSIVAMENTE no trecho específico delimitado abaixo.

⚠️ REGRAS OBRIGATÓRIAS:
1. O contexto do projeto serve APENAS para manter coerência de tom/estilo
2. Você deve expandir SOMENTE o texto entre os delimitadores
3. NÃO inclua parágrafos ou conteúdo adicional da seção
4. Expanda APENAS o texto fornecido, não o conteúdo geral da seção
5. Retorne APENAS a versão expandida do texto delimitado

TEXTO ORIGINAL: ${wordCount} palavras
TAMANHO ESPERADO DO RESULTADO: ~${words} palavras

========== INÍCIO DO TEXTO A EXPANDIR ==========
${text || '(nenhum texto fornecido)'}
========== FIM DO TEXTO A EXPANDIR ==========

Expanda este texto adicionando profundidade, detalhes e exemplos.
Mantenha a mensagem original mas enriqueça o conteúdo.

IMPORTANTE: Retorne SOMENTE o texto expandido, nada mais.`;
    
    if (generateImages) {
      const count = imageCount || '1-5';
      prompt += `\n\n🚨🚨🚨 ATENÇÃO OBRIGATÓRIA 🚨🚨🚨`;
      prompt += `\nVocê DEVE incluir ${count} marcadores IMAGE_DESCRIPTION no texto expandido no formato:`;
      prompt += `\nIMAGE_DESCRIPTION[detailed description in English]`;
      prompt += `\nNÃO ESQUEÇA! Se não incluir os marcadores, sua resposta será REJEITADA!`;
    }
    
    return prompt;
  }

  private promptRewrite(text: string | undefined, words: number, generateImages?: boolean, imageCount?: number): string {
    const wordCount = text?.split(/\s+/).filter(w => w.length > 0).length || 0;
    
    let basePrompt = `# INSTRUÇÃO CRÍTICA

Você tem acesso ao contexto do projeto para REFERÊNCIA de tom e estilo.
Porém, sua tarefa é trabalhar EXCLUSIVAMENTE no trecho específico delimitado abaixo.

⚠️ REGRAS OBRIGATÓRIAS:
1. O contexto do projeto serve APENAS para manter coerência de tom/estilo
2. Você deve reescrever SOMENTE o texto entre os delimitadores
3. NÃO inclua parágrafos ou conteúdo adicional da seção
4. NÃO expanda além do escopo do texto fornecido
5. Retorne APENAS a versão reescrita do texto delimitado

TEXTO ORIGINAL: ${wordCount} palavras
TAMANHO ESPERADO DO RESULTADO: ~${words} palavras

========== INÍCIO DO TEXTO A REESCREVER ==========
${text || '(nenhum texto fornecido)'}
========== FIM DO TEXTO A REESCREVER ==========

Reescreva este texto usando palavras e estruturas diferentes, mantendo o significado.

IMPORTANTE: Retorne SOMENTE o texto reescrito, nada mais.`;
    
    if (generateImages) {
      const count = imageCount || '1-5';
      basePrompt += `\n\n🚨🚨🚨 ATENÇÃO OBRIGATÓRIA 🚨🚨🚨`;
      basePrompt += `\nVocê DEVE incluir ${count} marcadores IMAGE_DESCRIPTION no texto reescrito no formato:`;
      basePrompt += `\nIMAGE_DESCRIPTION[detailed description in English]`;
      basePrompt += `\nNÃO ESQUEÇA! Se não incluir os marcadores, sua resposta será REJEITADA!`;
    }
    
    return basePrompt;
  }

  private promptChangeTone(text: string | undefined, tone: string | undefined, words: number): string {
    return `Altere o tom do texto para ${tone || 'profissional'}. Mantenha o conteúdo mas ajuste a linguagem e estilo. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptSummarize(text: string | undefined, words: number): string {
    return `Crie um resumo conciso capturando os pontos principais. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptSimplify(text: string | undefined, words: number): string {
    const wordCount = text?.split(/\s+/).filter(w => w.length > 0).length || 0;
    
    return `# INSTRUÇÃO CRÍTICA

Você tem acesso ao contexto do projeto para REFERÊNCIA de tom e estilo.
Porém, sua tarefa é trabalhar EXCLUSIVAMENTE no trecho específico delimitado abaixo.

⚠️ REGRAS OBRIGATÓRIAS:
1. O contexto do projeto serve APENAS para manter coerência de tom/estilo
2. Você deve simplificar SOMENTE o texto entre os delimitadores
3. NÃO inclua parágrafos ou conteúdo adicional da seção
4. NÃO expanda além do escopo do texto fornecido
5. Retorne APENAS a versão simplificada do texto delimitado

TEXTO ORIGINAL: ${wordCount} palavras
TAMANHO ESPERADO DO RESULTADO: ~${words} palavras

========== INÍCIO DO TEXTO A SIMPLIFICAR ==========
${text || '(nenhum texto fornecido)'}
========== FIM DO TEXTO A SIMPLIFICAR ==========

Simplifique este texto tornando-o mais claro e acessível.
Use linguagem direta e evite jargão.

IMPORTANTE: Retorne SOMENTE o texto simplificado, nada mais.`;
  }

  private promptEnrich(text: string | undefined, words: number): string {
    return `Enriqueça o texto com elementos literários, metáforas e linguagem mais sofisticada. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptCorrect(text: string | undefined, words: number): string {
    const wordCount = text?.split(/\s+/).filter(w => w.length > 0).length || 0;
    
    return `# INSTRUÇÃO CRÍTICA

Você tem acesso ao contexto do projeto para REFERÊNCIA de tom e estilo.
Porém, sua tarefa é trabalhar EXCLUSIVAMENTE no trecho específico delimitado abaixo.

⚠️ REGRAS OBRIGATÓRIAS:
1. O contexto do projeto serve APENAS para manter coerência de tom/estilo
2. Você deve corrigir SOMENTE o texto entre os delimitadores
3. NÃO inclua parágrafos ou conteúdo adicional da seção
4. NÃO expanda além do escopo do texto fornecido
5. Retorne APENAS a versão corrigida do texto delimitado

TEXTO ORIGINAL: ${wordCount} palavras
TAMANHO ESPERADO DO RESULTADO: ~${words} palavras

========== INÍCIO DO TEXTO A CORRIGIR ==========
${text || '(nenhum texto fornecido)'}
========== FIM DO TEXTO A CORRIGIR ==========

Corrija gramática, ortografia e fluidez do texto.
Mantenha o significado original.

IMPORTANTE: Retorne SOMENTE o texto corrigido, nada mais.`;
  }

  // ============================================================================
  // PROMPTS DE TRANSFORMAÇÃO
  // ============================================================================

  private promptDialogize(text: string | undefined, words: number): string {
    return `Transforme a narração em diálogo entre personagens. Mantenha o conteúdo informativo. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptDescribe(text: string | undefined, words: number): string {
    return `Adicione descrições sensoriais e ambientais detalhadas ao texto. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptArgue(text: string | undefined, words: number): string {
    return `Fortaleça com argumentos lógicos, evidências e raciocínio estruturado. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptConnect(text: string | undefined, words: number): string {
    return `Melhore as transições e conexões entre ideias. Crie um fluxo mais suave. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptDivide(text: string | undefined, words: number): string {
    return `Divida o texto em seções ou parágrafos menores e mais digeríveis. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptMerge(text: string | undefined, words: number): string {
    return `Combine parágrafos curtos em texto mais fluido e coeso. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptTranslateTone(text: string | undefined, words: number): string {
    return `Converta entre registros de linguagem diferentes mantendo o conteúdo. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  // ============================================================================
  // PROMPTS DE NARRATIVA
  // ============================================================================

  private promptCreateCharacter(words: number): string {
    return `Desenvolva um personagem completo com personalidade, motivações e história de fundo. Aproximadamente ${words} palavras.`;
  }

  private promptDevelopDialogue(text: string | undefined, words: number): string {
    return `Crie diálogo natural e autêntico entre personagens. Aproximadamente ${words} palavras.${text ? `\n\nContexto:\n${text}` : ''}`;
  }

  private promptBuildScene(words: number): string {
    return `Construa uma cena completa com ação, descrição e desenvolvimento. Aproximadamente ${words} palavras.`;
  }

  private promptCreateTension(text: string | undefined, words: number): string {
    return `Adicione elementos de suspense e tensão dramática. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptPlotTwist(words: number): string {
    return `Insira uma reviravolta surpreendente mas lógica na história. Aproximadamente ${words} palavras.`;
  }

  private promptInnerMonologue(text: string | undefined, words: number): string {
    return `Adicione pensamentos e reflexões internas do personagem. Aproximadamente ${words} palavras.${text ? `\n\nContexto:\n${text}` : ''}`;
  }

  private promptWorldbuild(words: number): string {
    return `Desenvolva aspectos do mundo, cultura, história ou sistema. Aproximadamente ${words} palavras.`;
  }

  // ============================================================================
  // PROMPTS TÉCNICOS
  // ============================================================================

  private promptAddExamples(text: string | undefined, words: number): string {
    return `Adicione exemplos práticos e casos de uso ao texto. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptCreateList(text: string | undefined, words: number): string {
    return `Organize as informações em lista estruturada e clara. Aproximadamente ${words} palavras.\n\nConteúdo:\n${text || ''}`;
  }

  private promptCompare(words: number): string {
    return `Crie uma comparação detalhada entre conceitos ou opções. Aproximadamente ${words} palavras.`;
  }

  private promptTutorial(words: number): string {
    return `Desenvolva um tutorial passo-a-passo claro e prático. Aproximadamente ${words} palavras.`;
  }

  private promptAddStats(text: string | undefined, words: number): string {
    return `Inclua dados, números e estatísticas relevantes. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptCiteSources(text: string | undefined, words: number): string {
    return `Adicione citações e referências apropriadas. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptCreateFAQ(words: number): string {
    return `Gere perguntas frequentes e respostas detalhadas. Aproximadamente ${words} palavras.`;
  }

  // ============================================================================
  // PROMPTS DE REFINAMENTO
  // ============================================================================

  private promptVaryStructure(text: string | undefined, words: number): string {
    return `Varie a estrutura das frases para melhor ritmo. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptEliminateRedundancy(text: string | undefined, words: number): string {
    return `Remova repetições e informações duplicadas. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptStrengthenOpening(text: string | undefined, words: number): string {
    return `Crie uma abertura mais impactante e envolvente. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptStrongClosing(text: string | undefined, words: number): string {
    return `Desenvolva uma conclusão memorável e satisfatória. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptAddHook(text: string | undefined, words: number): string {
    return `Insira um gancho para capturar a atenção do leitor. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  private promptImproveFlow(text: string | undefined, words: number): string {
    return `Melhore o ritmo e fluência do texto. Aproximadamente ${words} palavras.\n\nTexto original:\n${text || ''}`;
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  private truncate(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  }
}

// Singleton instance
export const ebookPromptService = new EbookPromptService();
