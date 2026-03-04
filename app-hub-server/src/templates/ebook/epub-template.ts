/**
 * Template para exportação de ebooks em formato EPUB
 * Usa epub-gen para gerar arquivos EPUB compatíveis com e-readers
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EbookProject, EbookSection } from './markdown-template';
const Epub = require('epub-gen');

export interface EPUBOptions {
  includeImages?: boolean;
  includeToc?: boolean;
  language?: string;
  publisher?: string;
  coverImage?: string;
  css?: string;
}

export class EPUBTemplate {
  private static defaultOptions: EPUBOptions = {
    includeImages: true,
    includeToc: true,
    language: 'pt-BR',
    publisher: 'App Hub Server'
  };

  /**
   * Gera EPUB completo do ebook usando epub-gen
   */
  static async generate(
    project: EbookProject,
    sections: EbookSection[],
    options: EPUBOptions = {}
  ): Promise<Buffer> {
    const opts = { ...this.defaultOptions, ...options };

    // Preparar dados para o epub-gen
    const epubData = this.prepareEPUBData(project, sections, opts);

    // Criar arquivo temporário para o EPUB
    const tempFilePath = path.join(os.tmpdir(), `ebook-${Date.now()}.epub`);

    try {
      // Gerar EPUB
      const epub = new Epub(epubData, tempFilePath);
      await epub.promise;

      // Ler arquivo gerado
      const buffer = fs.readFileSync(tempFilePath);

      // Limpar arquivo temporário
      fs.unlinkSync(tempFilePath);

      return buffer;
    } catch (error) {
      // Tentar limpar arquivo temporário em caso de erro
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }
  }

  /**
   * Gera HTML completo do ebook
   */
  private static generateHTML(
    project: EbookProject,
    sections: EbookSection[],
    options: EPUBOptions
  ): string {
    const sortedSections = sections.sort((a, b) => a.order - b.order);
    const contentSections = sortedSections.filter(s => s.content?.trim());

    let html = `<!DOCTYPE html>
<html lang="${options.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.title}</title>
    <meta name="author" content="${project.dna?.author || 'Autor Desconhecido'}">
    <meta name="publisher" content="${options.publisher}">
    <style>
    ${options.css || this.getDefaultCSS()}
    </style>
</head>
<body>
`;

    // Título
    html += `<h1 style="text-align: center; margin: 2em 0;">${project.title}</h1>\n`;
    if (project.dna?.author) {
      html += `<h2 style="text-align: center; margin-bottom: 3em;">${project.dna.author}</h2>\n`;
    }

    // Sumário
    if (options.includeToc) {
      html += `<h2>Sumário</h2>\n<ul>\n`;
      contentSections.forEach((section, index) => {
        const title = section.title || `Seção ${index + 1}`;
        const anchor = `section-${index}`;
        html += `  <li><a href="#${anchor}">${title}</a></li>\n`;
      });
      html += `</ul>\n\n<hr>\n\n`;
    }

    // Seções de conteúdo
    contentSections.forEach((section, index) => {
      const anchor = `section-${index}`;
      html += `<div id="${anchor}">\n`;
      html += this.generateSectionHTML(section, options);
      html += `</div>\n\n<hr>\n\n`;
    });

    // Rodapé
    html += `<footer style="text-align: center; margin-top: 3em; font-size: 0.8em; color: #666;">
      <p>Ebook gerado automaticamente pela plataforma de criação de conteúdo</p>
      <p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    </footer>

</body>
</html>`;

    return html;
  }

  /**
   * Prepara dados no formato esperado pelo epub-gen
   */
  private static prepareEPUBData(
    project: EbookProject,
    sections: EbookSection[],
    options: EPUBOptions
  ): any {
    const sortedSections = sections.sort((a, b) => a.order - b.order);
    const contentSections = sortedSections.filter(s => s.content?.trim());

    // Metadados básicos
    const epubData: any = {
      title: project.title,
      author: project.dna?.author || 'Autor Desconhecido',
      publisher: options.publisher || this.defaultOptions.publisher,
      language: options.language || this.defaultOptions.language,
      tocTitle: 'Sumário',
      content: [],
      css: options.css || this.getDefaultCSS(),
      verbose: false
    };

    // Adicionar metadados adicionais se disponíveis
    if (project.metadata?.isbn) {
      epubData.isbn = project.metadata.isbn;
    }

    if (project.dna?.idea) {
      epubData.description = project.dna.idea;
    }

    // Adicionar capa como URL se existir
    if (options.coverImage) {
      epubData.cover = options.coverImage;
    }

    // Adicionar seções de conteúdo
    contentSections.forEach((section, index) => {
      const sectionData = {
        title: section.title || `Seção ${index + 1}`,
        data: this.generateSectionHTML(section, options),
        excludeFromToc: section.type === 'cover' || section.type === 'title-page',
        beforeToc: section.type === 'cover' || section.type === 'title-page' || 
                   section.type === 'dedication' || section.type === 'copyright'
      };

      epubData.content.push(sectionData);
    });

    return epubData;
  }

  /**
   * Gera HTML para a capa
   */
  private static generateCoverHTML(section: EbookSection): string {
    return `
      <div style="text-align: center; padding: 50px;">
        <h1 style="font-size: 2em; margin-bottom: 20px;">${section.title || 'Capa'}</h1>
        ${section.content ? `<div>${this.markdownToHTML(section.content)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Gera HTML para uma seção
   */
  private static generateSectionHTML(section: EbookSection, options: EPUBOptions): string {
    const headingTag = this.getHeadingTag(section.type);

    let html = `<${headingTag}>${section.title || 'Sem Título'}</${headingTag}>\n\n`;

    if (section.content) {
      html += this.markdownToHTML(section.content);
    }

    // Adicionar imagens
    if (options.includeImages && section.images && section.images.length > 0) {
      section.images.forEach(image => {
        html += `\n\n<div class="image-container">
          <img src="${image.url}" alt="${image.alt || 'Imagem'}" style="max-width: 100%; height: auto;" />
          ${image.caption ? `<p class="caption">${image.caption}</p>` : ''}
        </div>\n\n`;
      });
    }

    return html;
  }

  /**
   * Converte Markdown básico para HTML
   */
  private static markdownToHTML(markdown: string): string {
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Wrap consecutive list items
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      // Clean up
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<ul>)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1')
      .trim();
  }

  /**
   * Define tag de heading baseado no tipo de seção
   */
  private static getHeadingTag(type: string): string {
    const tagMap: Record<string, string> = {
      'cover': 'h1',
      'title-page': 'h1',
      'copyright': 'h2',
      'dedication': 'h2',
      'acknowledgments': 'h2',
      'epigraph': 'h2',
      'preface': 'h2',
      'foreword': 'h2',
      'introduction': 'h1',
      'chapter': 'h1',
      'conclusion': 'h1',
      'afterword': 'h2',
      'appendix': 'h1',
      'glossary': 'h1',
      'bibliography': 'h1',
      'author-bio': 'h1',
      'back-cover': 'h1',
      'table-of-contents': 'h1'
    };

    return tagMap[type] || 'h2';
  }

  /**
   * CSS padrão para o EPUB
   */
  private static getDefaultCSS(): string {
    return `
      body {
        font-family: 'Times New Roman', serif;
        font-size: 1em;
        line-height: 1.4;
        margin: 0;
        padding: 20px;
        text-align: justify;
      }

      h1, h2, h3, h4, h5, h6 {
        font-weight: bold;
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        page-break-after: avoid;
      }

      h1 { font-size: 1.5em; }
      h2 { font-size: 1.3em; }
      h3 { font-size: 1.1em; }

      p {
        margin: 0 0 1em 0;
        text-indent: 1.5em;
      }

      p:first-child {
        text-indent: 0;
      }

      .image-container {
        text-align: center;
        margin: 1em 0;
        page-break-inside: avoid;
      }

      .caption {
        font-size: 0.9em;
        font-style: italic;
        margin-top: 0.5em;
        color: #666;
      }

      ul, ol {
        margin: 1em 0;
        padding-left: 2em;
      }

      li {
        margin-bottom: 0.5em;
      }

      strong {
        font-weight: bold;
      }

      em {
        font-style: italic;
      }

      a {
        color: #0066cc;
        text-decoration: underline;
      }

      /* Evitar quebras de página ruins */
      h1, h2, h3 {
        page-break-after: avoid;
      }

      .image-container {
        page-break-inside: avoid;
      }
    `;
  }

  /**
   * Valida se o projeto pode ser exportado para EPUB
   */
  static validateForExport(project: EbookProject, sections: EbookSection[]): { valid: boolean; reason?: string } {
    if (!project.title?.trim()) {
      return { valid: false, reason: 'Projeto deve ter um título' };
    }

    if (!project.dna?.author?.trim()) {
      return { valid: false, reason: 'Projeto deve ter um autor definido' };
    }

    const contentSections = sections.filter(s => s.content?.trim().length > 10);
    if (contentSections.length === 0) {
      return { valid: false, reason: 'Projeto deve ter pelo menos uma seção com conteúdo substancial' };
    }

    return { valid: true };
  }
}
