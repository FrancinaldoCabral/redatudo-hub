import { ContextDepth } from '../config/ebook-llm.config';
import { MongoDbService } from './mongodb.service';
import { ObjectId } from 'mongodb';

/**
 * Informações de contexto de um projeto/seção
 */
export interface EbookContext {
  // Informações do projeto
  projectId: string;
  projectTitle?: string;
  projectDescription?: string;
  projectGenre?: string;
  
  // Informações da seção atual
  sectionId: string;
  sectionTitle?: string;
  sectionContent?: string;
  sectionType?: string;
  
  // Contexto de seções adjacentes
  previousSections?: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
  }>;
  
  nextSections?: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
  }>;
  
  // Frases usadas (para anti-repetição)
  usedPhrases: string[];
  
  // Metadados
  totalSections?: number;
  currentSectionOrder?: number;
  contextDepth: ContextDepth;
}

/**
 * Serviço para construção de contexto para geração de ebooks
 */
export class EbookContextService {
  private mongoService: MongoDbService;

  constructor() {
    this.mongoService = new MongoDbService();
  }
  
  /**
   * Constrói contexto completo para geração
   * 
   * @param projectId - ID do projeto
   * @param sectionId - ID da seção
   * @param depth - Profundidade do contexto (minimal, moderate, full)
   * @param collectPhrases - Se deve coletar frases para anti-repetição
   */
  async buildContext(
    projectId: string,
    sectionId: string,
    depth: ContextDepth = 'moderate',
    collectPhrases: boolean = true
  ): Promise<EbookContext> {
    const context: EbookContext = {
      projectId,
      sectionId,
      usedPhrases: [],
      contextDepth: depth
    };

    try {
      // Buscar informações do projeto e seção
      // NOTA: Por enquanto, retornando estrutura básica
      // Em produção, isso faria queries ao banco de dados MongoDB
      
      switch (depth) {
        case 'minimal':
          // Apenas informações da seção atual
          await this.loadMinimalContext(context);
          break;
          
        case 'moderate':
          // Seção atual + adjacentes + projeto básico
          await this.loadModerateContext(context);
          break;
          
        case 'full':
          // Todo o projeto + histórico completo
          await this.loadFullContext(context);
          break;
      }

      // Coletar frases se solicitado
      if (collectPhrases) {
        context.usedPhrases = this.extractPhrases(context);
      }

      return context;
    } catch (error) {
      console.error('❌ Erro ao construir contexto:', error);
      // Retornar contexto mínimo em caso de erro
      return context;
    }
  }

  /**
   * Carrega contexto mínimo (apenas seção atual)
   */
  private async loadMinimalContext(context: EbookContext): Promise<void> {
    try {
      // Buscar projeto
      const project = await this.mongoService.getOne('ebookProjects', {
        _id: new ObjectId(context.projectId)
      });

      if (project) {
        context.projectTitle = project.title || project.name || '';
        context.projectDescription = project.description || project.synopsis || '';
        context.projectGenre = project.genre || '';
      }

      // Buscar seção atual
      const section = await this.mongoService.getOne('ebookSections', {
        _id: new ObjectId(context.sectionId)
      });

      if (section) {
        context.sectionTitle = section.title || '';
        context.sectionContent = section.content || '';
        context.sectionType = section.type || '';
        context.currentSectionOrder = section.order || 0;
      }

  //    console.log(`📚 [ContextService] Projeto: "${context.projectTitle}" | Seção: "${context.sectionTitle}"`);
    } catch (error) {
      console.error('❌ [ContextService] Erro ao carregar contexto mínimo:', error);
      // Manter estrutura vazia em caso de erro
      context.sectionTitle = '';
      context.sectionContent = '';
      context.projectTitle = '';
    }
  }

  /**
   * Carrega contexto moderado (seção + adjacentes + projeto)
   */
  private async loadModerateContext(context: EbookContext): Promise<void> {
    await this.loadMinimalContext(context);
    
    try {
      // Buscar todas as seções do projeto
      const allSections = await this.mongoService.get('ebookSections', {
        projectId: context.projectId
      });

      if (allSections && allSections.length > 0) {
        // Ordenar por ordem
        const sortedSections = allSections.sort((a, b) => (a.order || 0) - (b.order || 0));
        const currentOrder = context.currentSectionOrder || 0;

        // Seções anteriores (até 2 seções antes)
        context.previousSections = sortedSections
          .filter(s => (s.order || 0) < currentOrder)
          .slice(-2)
          .map(s => ({
            id: s._id.toString(),
            title: s.title || '',
            content: s.content || '',
            order: s.order || 0
          }));

        // Próximas seções (até 2 seções depois)
        context.nextSections = sortedSections
          .filter(s => (s.order || 0) > currentOrder)
          .slice(0, 2)
          .map(s => ({
            id: s._id.toString(),
            title: s.title || '',
            content: s.content || '',
            order: s.order || 0
          }));

        context.totalSections = sortedSections.length;

    //    console.log(`📖 [ContextService] Contexto moderado: ${context.previousSections.length} anteriores, ${context.nextSections.length} seguintes`);
      } else {
        context.previousSections = [];
        context.nextSections = [];
      }
    } catch (error) {
      console.error('❌ [ContextService] Erro ao carregar contexto moderado:', error);
      context.previousSections = [];
      context.nextSections = [];
    }
  }

  /**
   * Carrega contexto completo (todo o projeto)
   */
  private async loadFullContext(context: EbookContext): Promise<void> {
    await this.loadMinimalContext(context);
    
    try {
      // Buscar TODAS as seções do projeto para contexto completo
      const allSections = await this.mongoService.get('ebookSections', {
        projectId: context.projectId
      });

      if (allSections && allSections.length > 0) {
        const sortedSections = allSections.sort((a, b) => (a.order || 0) - (b.order || 0));
        const currentOrder = context.currentSectionOrder || 0;

        // No modo full, pegar todas as seções anteriores
        context.previousSections = sortedSections
          .filter(s => (s.order || 0) < currentOrder)
          .map(s => ({
            id: s._id.toString(),
            title: s.title || '',
            content: s.content || '',
            order: s.order || 0
          }));

        // No modo full, pegar todas as seções seguintes
        context.nextSections = sortedSections
          .filter(s => (s.order || 0) > currentOrder)
          .map(s => ({
            id: s._id.toString(),
            title: s.title || '',
            content: s.content || '',
            order: s.order || 0
          }));

        context.totalSections = sortedSections.length;

    //    console.log(`📚 [ContextService] Contexto completo: ${context.previousSections.length} anteriores, ${context.nextSections.length} seguintes`);
      } else {
        context.totalSections = 0;
        context.previousSections = [];
        context.nextSections = [];
      }
    } catch (error) {
      console.error('❌ [ContextService] Erro ao carregar contexto completo:', error);
      context.totalSections = 0;
      context.previousSections = [];
      context.nextSections = [];
    }
  }

  /**
   * Extrai frases do contexto para anti-repetição
   */
  private extractPhrases(context: EbookContext): string[] {
    const phrases: string[] = [];
    const texts: string[] = [];

    // Coletar todos os textos disponíveis
    if (context.sectionContent) {
      texts.push(context.sectionContent);
    }

    if (context.previousSections) {
      texts.push(...context.previousSections.map(s => s.content));
    }

    if (context.nextSections) {
      texts.push(...context.nextSections.map(s => s.content));
    }

    // Extrair frases de cada texto
    for (const text of texts) {
      const extracted = this.extractPhrasesFromText(text);
      phrases.push(...extracted);
    }

    // Remover duplicatas e retornar
    return [...new Set(phrases)];
  }

  /**
   * Extrai frases significativas de um texto
   */
  private extractPhrasesFromText(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Dividir em sentenças
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const phrases: string[] = [];

    for (const sentence of sentences) {
      // Extrair n-grams (3 a 5 palavras)
      const words = sentence.trim().split(/\s+/);
      
      for (let n = 3; n <= 5; n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const phrase = words.slice(i, i + n).join(' ').toLowerCase();
          if (phrase.length > 10) { // Apenas frases com mais de 10 caracteres
            phrases.push(phrase);
          }
        }
      }
    }

    return phrases;
  }

  /**
   * Formata contexto para inclusão em prompt
   */
  formatContextForPrompt(context: EbookContext): string {
    const parts: string[] = [];

    // Informações do projeto
    if (context.projectTitle) {
      parts.push(`# Projeto: ${context.projectTitle}`);
    }
    if (context.projectDescription) {
      parts.push(`Descrição: ${context.projectDescription}`);
    }
    if (context.projectGenre) {
      parts.push(`Gênero: ${context.projectGenre}`);
    }

    // Seção atual
    if (context.sectionTitle) {
      parts.push(`\n## Seção Atual: ${context.sectionTitle}`);
    }
    if (context.currentSectionOrder !== undefined && context.totalSections) {
      parts.push(`Posição: ${context.currentSectionOrder + 1}/${context.totalSections}`);
    }

    // Seções anteriores
    if (context.previousSections && context.previousSections.length > 0) {
      parts.push('\n### Contexto das Seções Anteriores:');
      context.previousSections.forEach(section => {
        parts.push(`\n**${section.title}**`);
        parts.push(this.truncateText(section.content, 500));
      });
    }

    // Seções seguintes (se disponíveis)
    if (context.nextSections && context.nextSections.length > 0) {
      parts.push('\n### Contexto das Próximas Seções:');
      context.nextSections.forEach(section => {
        parts.push(`\n**${section.title}**`);
        parts.push(this.truncateText(section.content, 300));
      });
    }

    return parts.join('\n');
  }

  /**
   * Trunca texto para um tamanho máximo
   */
  private truncateText(text: string, maxChars: number): string {
    if (!text || text.length <= maxChars) {
      return text;
    }
    return text.substring(0, maxChars) + '...';
  }

  /**
   * Calcula estimativa de tokens do contexto formatado
   */
  estimateContextTokens(context: EbookContext): number {
    const formatted = this.formatContextForPrompt(context);
    // Aproximação: 1 palavra ≈ 4 tokens
    const words = formatted.split(/\s+/).length;
    return Math.ceil(words * 4);
  }
}

// Singleton instance
export const ebookContextService = new EbookContextService();
