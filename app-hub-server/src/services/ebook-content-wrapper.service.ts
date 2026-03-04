/**
 * Serviço para montar HTML final do ebook
 * Aplica design CSS ao conteúdo das seções
 */

import { EbookSection } from '../templates/ebook/markdown-template';
import { DesignConcept } from './ebook-design-generator.service';

export class EbookContentWrapperService {
    /**
     * Monta HTML bruto, sem design, apenas títulos e parágrafos alinhados à esquerda
     */
    static wrapRawContent(sections: EbookSection[], projectTitle: string): string {
      const html = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(projectTitle)}</title>
    <style>
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #fff; }
      .raw-section { page-break-before: always; text-align: left; margin: 2cm 2cm 0 2cm; }
      h1, h2, h3 { text-align: left; margin-bottom: 0.5em; }
      p { text-align: left; margin-bottom: 1em; }
    </style>
  </head>
  <body>
  ${sections.map((section, idx) => `
    <div class="raw-section">
      <h2>${this.escapeHtml(section.title || `Seção ${idx+1}`)}</h2>
      <div>${section.content || ''}</div>
    </div>
  `).join('')}
  </body>
  </html>`;
      return html;
    }
  /**
   * Monta HTML completo do ebook com design aplicado
   */
  static wrapContent(
    sections: EbookSection[],
    design: DesignConcept,
    projectTitle: string
  ): string {
    // Ordenar seções
    const sortedSections = sections
      .filter(s => s.content?.trim())
      .sort((a, b) => a.order - b.order);

    // Construir HTML
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(projectTitle)}</title>
  <style>
${design.globalCSS}
  </style>
</head>
<body>
  <div class="${design.wrapperClasses.book}">
${this.buildSections(sortedSections, design)}
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Constrói as seções do livro
   */
  private static buildSections(sections: EbookSection[], design: DesignConcept): string {
    return sections.map((section, index) => {
      const chapterClass = design.wrapperClasses.chapter;
      const contentClass = design.wrapperClasses.content;
      
      return `    <div class="${chapterClass}" data-section-type="${section.type}" data-order="${section.order}">
      <div class="${contentClass}">
${this.wrapSectionContent(section)}
      </div>
    </div>`;
    }).join('\n');
  }

  /**
   * Encapsula conteúdo de uma seção individual
   */
  private static wrapSectionContent(section: EbookSection): string {
    const parts: string[] = [];

    // Conteúdo HTML da seção (já vem pronto do banco)
    if (section.content?.trim()) {
      parts.push(section.content);
    }

    // Adicionar imagens se existirem
    if (section.images && section.images.length > 0) {
      section.images.forEach(image => {
        parts.push(this.buildImageHTML(image));
      });
    }

    return parts.join('\n');
  }

  /**
   * Constrói HTML para imagem
   */
  private static buildImageHTML(image: { url: string; alt?: string; caption?: string }): string {
    const alt = this.escapeHtml(image.alt || 'Imagem');
    const caption = image.caption ? this.escapeHtml(image.caption) : null;

    // Prefer print-ready variant when available (metadata.printUrl)
    // The image object may include metadata with printUrl/previewUrl when saved by the image service
    let imageUrl = (image as any).url;
    try {
      const meta = (image as any).metadata;
      if (meta && meta.printUrl) {
        imageUrl = meta.printUrl;
      }
    } catch (e) {
      // ignore
    }

    if (caption) {
      return `        <figure>
          <img src="${this.escapeHtml(imageUrl)}" alt="${alt}" />
          <figcaption>${caption}</figcaption>
        </figure>`;
    }

    return `        <img src="${this.escapeHtml(imageUrl)}" alt="${alt}" />`;
  }

  /**
   * Escape HTML para prevenir XSS
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Gera preview HTML (versão reduzida para pré-visualização)
   */
  static generatePreview(
    sections: EbookSection[],
    design: DesignConcept,
    projectTitle: string,
    maxSections: number = 3
  ): string {
    const previewSections = sections
      .filter(s => s.content?.trim())
      .sort((a, b) => a.order - b.order)
      .slice(0, maxSections);

    return this.wrapContent(previewSections, design, `${projectTitle} - Preview`);
  }

  /**
   * Valida HTML gerado
   */
  static validateHTML(html: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Verificar estrutura básica
    if (!html.includes('<!DOCTYPE html>')) {
      errors.push('Faltando DOCTYPE');
    }

    if (!html.includes('<html')) {
      errors.push('Faltando tag <html>');
    }

    if (!html.includes('<head>')) {
      errors.push('Faltando tag <head>');
    }

    if (!html.includes('<body>')) {
      errors.push('Faltando tag <body>');
    }

    if (!html.includes('</html>')) {
      errors.push('Faltando tag de fechamento </html>');
    }

    // Verificar se tem conteúdo
    if (html.length < 500) {
      errors.push('HTML muito curto, provavelmente vazio');
    }

    // Verificar tags não fechadas (simplificado)
    const openDivs = (html.match(/<div/g) || []).length;
    const closeDivs = (html.match(/<\/div>/g) || []).length;
    
    if (openDivs !== closeDivs) {
      errors.push(`Tags <div> não balanceadas: ${openDivs} abertas, ${closeDivs} fechadas`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Adiciona metadata ao HTML
   */
  static addMetadata(html: string, metadata: {
    author?: string;
    description?: string;
    keywords?: string[];
    language?: string;
  }): string {
    const metaTags: string[] = [];

    if (metadata.author) {
      metaTags.push(`  <meta name="author" content="${this.escapeHtml(metadata.author)}">`);
    }

    if (metadata.description) {
      metaTags.push(`  <meta name="description" content="${this.escapeHtml(metadata.description)}">`);
    }

    if (metadata.keywords && metadata.keywords.length > 0) {
      metaTags.push(`  <meta name="keywords" content="${metadata.keywords.map(k => this.escapeHtml(k)).join(', ')}">`);
    }

    if (metadata.language) {
      html = html.replace('<html lang="pt-BR">', `<html lang="${metadata.language}">`);
    }

    // Inserir meta tags após <head>
    if (metaTags.length > 0) {
      html = html.replace('<head>', `<head>\n${metaTags.join('\n')}`);
    }

    return html;
  }

  /**
   * Otimiza HTML para impressão
   */
  static optimizeForPrint(html: string): string {
    // Adicionar meta tag para viewport de impressão
    html = html.replace(
      '<meta name="viewport"',
      '<meta name="print-viewport" content="width=device-width">\n  <meta name="viewport"'
    );

    // Adicionar quebras de página antes de capítulos (se ainda não existir no CSS)
    if (!html.includes('page-break-before')) {
      html = html.replace(
        '</style>',
        `  .chapter { page-break-before: always; }
  h1, h2, h3 { page-break-after: avoid; }
</style>`
      );
    }

    return html;
  }

  /**
   * Minifica HTML (remove espaços desnecessários)
   */
  static minifyHTML(html: string): string {
    return html
      // Remove comentários HTML
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove espaços múltiplos
      .replace(/\s+/g, ' ')
      // Remove espaços entre tags
      .replace(/>\s+</g, '><')
      // Remove espaços no início e fim
      .trim();
  }
}
