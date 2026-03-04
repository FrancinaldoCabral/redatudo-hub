/**
 * Serviço para extrair amostras estratégicas do conteúdo
 * Envia amostras reais para o LLM ver o HTML completo
 */

import { EbookSection } from '../templates/ebook/markdown-template';

export interface ContentSample {
  totalSections: number;
  totalWords: number;
  hasImages: boolean;
  sectionTypes: string[];
  samples: SectionSample[];
  summary: string;
}

export interface SectionSample {
  type: string;
  title: string;
  contentPreview: string; // HTML real da seção
  position: 'first' | 'middle' | 'last';
}

export class EbookContentSamplerService {
  /**
   * Extrai amostras estratégicas do conteúdo
   * Pega primeira seção de cada tipo + algumas ao longo do livro
   */
  static extractSamples(sections: EbookSection[]): ContentSample {
    const sortedSections = sections
      .filter(s => s.content?.trim())
      .sort((a, b) => a.order - b.order);

    const totalWords = this.calculateTotalWords(sortedSections);
    const hasImages = sortedSections.some(s => s.images && s.images.length > 0);
    const sectionTypes = [...new Set(sortedSections.map(s => s.type || 'section'))];

    // Extrair amostras estratégicas
    const samples: SectionSample[] = [];
    const seenTypes = new Set<string>();

    // 1. Primeira seção de cada tipo (para o LLM ver variedade)
    for (const section of sortedSections) {
      const type = section.type || 'section';
      if (!seenTypes.has(type)) {
        samples.push({
          type,
          title: section.title || `Seção ${section.order}`,
          contentPreview: this.truncateContent(section.content!, 3000), // ~3000 chars por amostra
          position: 'first'
        });
        seenTypes.add(type);
      }
    }

    // 2. Algumas seções do meio (para ver padrões)
    const middleIndex = Math.floor(sortedSections.length / 2);
    if (sortedSections[middleIndex]) {
      samples.push({
        type: sortedSections[middleIndex].type || 'section',
        title: sortedSections[middleIndex].title || `Seção ${sortedSections[middleIndex].order}`,
        contentPreview: this.truncateContent(sortedSections[middleIndex].content!, 2000),
        position: 'middle'
      });
    }

    // 3. Última seção (para ver conclusões)
    const lastSection = sortedSections[sortedSections.length - 1];
    if (lastSection && !samples.find(s => s.type === lastSection.type && s.position === 'first')) {
      samples.push({
        type: lastSection.type || 'section',
        title: lastSection.title || `Seção ${lastSection.order}`,
        contentPreview: this.truncateContent(lastSection.content!, 2000),
        position: 'last'
      });
    }

    const summary = this.generateSummary(sortedSections.length, totalWords, sectionTypes, hasImages);

    return {
      totalSections: sortedSections.length,
      totalWords,
      hasImages,
      sectionTypes,
      samples,
      summary
    };
  }

  /**
   * Trunca conteúdo mantendo integridade do HTML
   */
  private static truncateContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) {
      return content;
    }

    // Truncar e tentar fechar tags abertas
    let truncated = content.substring(0, maxChars);
    
    // Contar tags abertas vs fechadas
    const openTags = (truncated.match(/<(\w+)(?:\s[^>]*)?\s*>/g) || [])
      .map(tag => tag.match(/<(\w+)/)?.[1])
      .filter(tag => !['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tag || ''));
    
    const closeTags = (truncated.match(/<\/(\w+)>/g) || [])
      .map(tag => tag.match(/<\/(\w+)>/)?.[1]);

    // Fechar tags que ficaram abertas (do mais interno para o mais externo)
    const unclosedTags: string[] = [];
    for (const tag of openTags) {
      if (tag && !closeTags.includes(tag)) {
        unclosedTags.push(tag);
      }
    }

    // Adicionar tags de fechamento
    for (const tag of unclosedTags.reverse()) {
      truncated += `</${tag}>`;
    }

    return truncated + '\n<!-- ... conteúdo truncado ... -->';
  }

  /**
   * Calcula total de palavras
   */
  private static calculateTotalWords(sections: EbookSection[]): number {
    return sections.reduce((total, section) => {
      if (!section.content) return total;
      
      const textOnly = section.content.replace(/<[^>]*>/g, ' ');
      const words = textOnly.trim().split(/\s+/).filter(w => w.length > 0);
      
      return total + words.length;
    }, 0);
  }

  /**
   * Gera resumo textual
   */
  private static generateSummary(
    totalSections: number,
    totalWords: number,
    types: string[],
    hasImages: boolean
  ): string {
    const parts = [
      `${totalSections} seção(ões)`,
      `${totalWords.toLocaleString('pt-BR')} palavras`,
      `Tipos: ${types.join(', ')}`,
      hasImages ? 'com imagens' : 'sem imagens'
    ];

    return parts.join(' | ');
  }

  /**
   * Formata amostras para envio ao LLM
   */
  static formatSamplesForLLM(sample: ContentSample): string {
    let formatted = `# ANÁLISE DO CONTEÚDO\n\n`;
    formatted += `${sample.summary}\n\n`;
    formatted += `## AMOSTRAS DE CONTEÚDO HTML REAL\n\n`;

    for (const s of sample.samples) {
      formatted += `### ${s.title} (${s.type}) - Posição: ${s.position}\n\n`;
      formatted += '```html\n';
      formatted += s.contentPreview;
      formatted += '\n```\n\n';
    }

    formatted += `\n**IMPORTANTE**: O CSS deve cobrir TODAS as tags HTML presentes nestas amostras e quaisquer outras tags HTML5 válidas que possam aparecer no restante do conteúdo.\n`;

    return formatted;
  }
}
