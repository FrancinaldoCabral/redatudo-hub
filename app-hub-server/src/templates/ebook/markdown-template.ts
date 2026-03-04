/**
 * Template para exportação de ebooks em formato Markdown
 * Formato simples e editável, compatível com GitHub, Notion, etc.
 */

export interface EbookProject {
  _id: string;
  userId?: string;
  title: string;
  dna: {
    author?: string;
    genre?: string;
    tone?: string;
    idea?: string;
    keywords?: string[];
  };
  metadata?: {
    isbn?: string;
    publisher?: string;
    language?: string;
  };
  design?: any; // Campo para armazenar o design personalizado
  createdAt: Date;
  updatedAt: Date;
}

export interface EbookSection {
  _id: string;
  type: string;
  title: string;
  content: string;
  order: number;
  images?: Array<{
    url: string;
    alt?: string;
    caption?: string;
  }>;
}

export class MarkdownTemplate {
  /**
   * Gera conteúdo Markdown completo do ebook
   */
  static generate(project: EbookProject, sections: EbookSection[]): string {
    const header = this.generateHeader(project);
    const toc = this.generateTableOfContents(sections);
    const content = this.generateContent(sections);
    const footer = this.generateFooter(project);

    return [header, toc, content, footer].join('\n\n---\n\n');
  }

  /**
   * Gera cabeçalho com metadados do ebook
   */
  private static generateHeader(project: EbookProject): string {
    const lines = [
      `# ${project.title}`,
      '',
      '**Metadados do Ebook**',
      ''
    ];

    if (project.dna?.author) {
      lines.push(`**Autor:** ${project.dna.author}`);
    }

    if (project.dna?.genre) {
      lines.push(`**Gênero:** ${project.dna.genre}`);
    }

    if (project.dna?.idea) {
      lines.push(`**Descrição:** ${project.dna.idea}`);
    }

    if (project.metadata?.isbn) {
      lines.push(`**ISBN:** ${project.metadata.isbn}`);
    }

    if (project.metadata?.publisher) {
      lines.push(`**Editora:** ${project.metadata.publisher}`);
    }

    if (project.metadata?.language) {
      lines.push(`**Idioma:** ${project.metadata.language}`);
    }

    if (project.dna?.keywords && project.dna.keywords.length > 0) {
      lines.push(`**Palavras-chave:** ${project.dna.keywords.join(', ')}`);
    }

    lines.push('', `**Gerado em:** ${new Date().toLocaleDateString('pt-BR')}`);

    return lines.join('\n');
  }

  /**
   * Gera sumário navegável
   */
  private static generateTableOfContents(sections: EbookSection[]): string {
    const contentSections = sections.filter(s => s.type !== 'cover' && s.content?.trim());

    if (contentSections.length === 0) return '';

    const tocLines = [
      '## Sumário',
      ''
    ];

    contentSections.forEach((section, index) => {
      const anchor = this.generateAnchor(section.title);
      const title = section.title || `Seção ${index + 1}`;
      tocLines.push(`- [${title}](#${anchor})`);
    });

    return tocLines.join('\n');
  }

  /**
   * Gera conteúdo principal do ebook
   */
  private static generateContent(sections: EbookSection[]): string {
    const sortedSections = sections.sort((a, b) => a.order - b.order);
    const contentParts: string[] = [];

    sortedSections.forEach(section => {
      if (!section.content?.trim() && section.type !== 'cover') return;

      const sectionContent = this.generateSectionContent(section);
      contentParts.push(sectionContent);
    });

    return contentParts.join('\n\n---\n\n');
  }

  /**
   * Gera conteúdo de uma seção específica
   */
  private static generateSectionContent(section: EbookSection): string {
    const lines: string[] = [];

    // Título da seção
    if (section.title) {
      const level = this.getHeadingLevel(section.type);
      const anchor = this.generateAnchor(section.title);
      lines.push(`${level} ${section.title} {#${anchor}}`);
      lines.push('');
    }

    // Conteúdo especial para capa
    if (section.type === 'cover') {
      lines.push('![Capa do Ebook](cover-image-url)');
      lines.push('');
      if (section.content?.trim()) {
        lines.push(section.content);
        lines.push('');
      }
      return lines.join('\n');
    }

    // Conteúdo da seção
    if (section.content?.trim()) {
      lines.push(section.content);
      lines.push('');
    }

    // Imagens da seção
    if (section.images && section.images.length > 0) {
      section.images.forEach(image => {
        const alt = image.alt || 'Imagem da seção';
        lines.push(`![${alt}](${image.url})`);
        if (image.caption) {
          lines.push(`*${image.caption}*`);
        }
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  /**
   * Gera rodapé com informações finais
   */
  private static generateFooter(project: EbookProject): string {
    const lines = [
      '---',
      '',
      '*Ebook gerado automaticamente pela plataforma de criação de conteúdo.*',
      `*Projeto criado em: ${new Date(project.createdAt).toLocaleDateString('pt-BR')}*`,
      `*Última atualização: ${new Date(project.updatedAt).toLocaleDateString('pt-BR')}*`
    ];

    return lines.join('\n');
  }

  /**
   * Define nível de heading baseado no tipo de seção
   */
  private static getHeadingLevel(type: string): string {
    const levelMap: Record<string, string> = {
      'cover': '#',
      'title-page': '#',
      'copyright': '##',
      'dedication': '##',
      'acknowledgments': '##',
      'epigraph': '##',
      'preface': '##',
      'foreword': '##',
      'introduction': '##',
      'chapter': '##',
      'conclusion': '##',
      'afterword': '##',
      'appendix': '##',
      'glossary': '##',
      'bibliography': '##',
      'author-bio': '##',
      'back-cover': '##',
      'table-of-contents': '##'
    };

    return levelMap[type] || '##';
  }

  /**
   * Gera âncora para links internos (remove acentos, espaços, etc.)
   */
  private static generateAnchor(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens múltiplos
      .trim();
  }

  /**
   * Valida se o projeto tem conteúdo suficiente para exportação
   */
  static validateForExport(project: EbookProject, sections: EbookSection[]): { valid: boolean; reason?: string } {
    if (!project.title?.trim()) {
      return { valid: false, reason: 'Projeto deve ter um título' };
    }

    const contentSections = sections.filter(s => s.content?.trim().length > 10);
    if (contentSections.length === 0) {
      return { valid: false, reason: 'Projeto deve ter pelo menos uma seção com conteúdo substancial' };
    }

    return { valid: true };
  }
}
