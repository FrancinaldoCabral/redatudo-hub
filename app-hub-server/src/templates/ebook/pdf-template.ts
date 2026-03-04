/**
 * Template para exportação de ebooks em formato PDF
 * Usa PDFKit para gerar PDFs profissionais com layout adequado
 */

import PDFDocument from 'pdfkit';
import { EbookProject, EbookSection } from './markdown-template';

export interface PDFOptions {
  fontSize?: {
    title?: number;
    heading1?: number;
    heading2?: number;
    body?: number;
    caption?: number;
  };
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  lineHeight?: number;
  includeToc?: boolean;
  includePageNumbers?: boolean;
}

export class PDFTemplate {
  private static defaultOptions: PDFOptions = {
    fontSize: {
      title: 24,
      heading1: 18,
      heading2: 16,
      body: 12,
      caption: 10
    },
    margins: {
      top: 72,    // 1 inch
      bottom: 72,
      left: 72,
      right: 72
    },
    lineHeight: 1.4,
    includeToc: true,
    includePageNumbers: true
  };

  /**
   * Gera PDF completo do ebook
   */
  static async generate(
    project: EbookProject,
    sections: EbookSection[],
    options: PDFOptions = {}
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const opts = { ...this.defaultOptions, ...options };
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: opts.margins!.top!,
            bottom: opts.margins!.bottom!,
            left: opts.margins!.left!,
            right: opts.margins!.right!
          }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        this.buildPDF(doc, project, sections, opts);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Constrói o conteúdo do PDF
   */
  private static buildPDF(
    doc: PDFKit.PDFDocument,
    project: EbookProject,
    sections: EbookSection[],
    options: PDFOptions
  ): void {
    // Configurar fonte e estilos
    this.registerFonts(doc);

    // Página de título
    this.addTitlePage(doc, project, options);

    // Sumário (se solicitado)
    if (options.includeToc) {
      doc.addPage();
      this.addTableOfContents(doc, sections, options);
    }

    // Conteúdo das seções
    const sortedSections = sections.sort((a, b) => a.order - b.order);
    sortedSections.forEach(section => {
      if (section.content?.trim()) {
        doc.addPage();
        this.addSection(doc, section, options);
      }
    });

    // Finalizar documento primeiro
    // Números de página serão adicionados após todas as páginas
  }

  /**
   * Registra fontes no documento
   */
  private static registerFonts(doc: PDFKit.PDFDocument): void {
    // Por enquanto usa fontes padrão
    // TODO: Registrar fontes customizadas se necessário
  }

  /**
   * Adiciona página de título
   */
  private static addTitlePage(
    doc: PDFKit.PDFDocument,
    project: EbookProject,
    options: PDFOptions
  ): void {
    const centerX = doc.page.width / 2;
    const centerY = doc.page.height / 2;
    const fontSize = options.fontSize!;

    // Título principal
    doc.fontSize(fontSize.title!)
      .text(project.title, 0, centerY - 100, {
        align: 'center',
        width: doc.page.width
      });

    // Autor
    if (project.dna?.author) {
      doc.moveDown(2);
      doc.fontSize(fontSize.heading1!)
        .text(project.dna.author, {
          align: 'center',
          width: doc.page.width
        });
    }

    // Gênero
    if (project.dna?.genre) {
      doc.moveDown(1);
      doc.fontSize(fontSize.body!)
        .text(project.dna.genre, {
          align: 'center',
          width: doc.page.width
        });
    }

    // Descrição
    if (project.dna?.idea) {
      doc.moveDown(2);
      doc.fontSize(fontSize.body!)
        .text(project.dna.idea, {
          align: 'center',
          width: doc.page.width
        });
    }

    // Metadados adicionais
    const metadata: string[] = [];
    if (project.metadata?.isbn) metadata.push(`ISBN: ${project.metadata.isbn}`);
    if (project.metadata?.publisher) metadata.push(`Editora: ${project.metadata.publisher}`);
    if (project.metadata?.language) metadata.push(`Idioma: ${project.metadata.language}`);

    if (metadata.length > 0) {
      doc.moveDown(3);
      doc.fontSize(fontSize.caption!)
        .text(metadata.join(' | '), {
          align: 'center',
          width: doc.page.width
        });
    }

    // Data de geração
    doc.moveDown(2);
    doc.fontSize(fontSize.caption!)
      .text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, {
        align: 'center',
        width: doc.page.width
      });
  }

  /**
   * Adiciona sumário
   */
  private static addTableOfContents(
    doc: PDFKit.PDFDocument,
    sections: EbookSection[],
    options: PDFOptions
  ): void {
    const fontSize = options.fontSize!;

    doc.fontSize(fontSize.heading1!)
      .text('Sumário', { align: 'center' });

    doc.moveDown(2);

    const contentSections = sections.filter(s => s.content?.trim());
    contentSections.forEach((section, index) => {
      const title = section.title || `Seção ${index + 1}`;
      const pageNumber = index + 3; // Ajustar baseado na estrutura

      doc.fontSize(fontSize.body!)
        .text(title, 72, doc.y, {
          continued: true,
          width: doc.page.width - 144
        })
        .text(pageNumber.toString(), {
          align: 'right',
          width: 72
        });
    });
  }

  /**
   * Adiciona uma seção ao PDF
   */
  private static addSection(
    doc: PDFKit.PDFDocument,
    section: EbookSection,
    options: PDFOptions
  ): void {
    const fontSize = options.fontSize!;

    // Título da seção
    if (section.title) {
      const level = this.getHeadingLevel(section.type);
      const size = level === 1 ? fontSize.heading1! : fontSize.heading2!;

      doc.fontSize(size)
        .text(section.title);

      doc.moveDown(1);
    }

    // Conteúdo da seção
    if (section.content) {
      // Processar markdown básico para PDF
      const processedContent = this.processMarkdownContent(section.content);

      doc.fontSize(fontSize.body!)
        .text(processedContent, {
          lineGap: (options.lineHeight! - 1) * fontSize.body!,
          width: doc.page.width - 144, // Considerando margens
          align: 'justify'
        });
    }

    // Imagens da seção
    if (section.images && section.images.length > 0) {
      section.images.forEach(image => {
        doc.moveDown(1);

        // Placeholder para imagem
        // TODO: Implementar download e inserção real de imagens
        doc.fontSize(fontSize.caption!)
          .text(`[Imagem: ${image.alt || 'Imagem da seção'}]`, {
            align: 'center'
          });

        if (image.caption) {
          doc.moveDown(0.5);
          doc.fontSize(fontSize.caption!)
            .text(image.caption, { align: 'center' });
        }

        doc.moveDown(1);
      });
    }
  }

  /**
   * Processa conteúdo Markdown básico para texto simples
   */
  private static processMarkdownContent(content: string): string {
    return content
      // Headers
      .replace(/^### (.*$)/gim, '$1') // ### Header -> Header
      .replace(/^## (.*$)/gim, '$1')  // ## Header -> Header
      .replace(/^# (.*$)/gim, '$1')   // # Header -> Header
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Italic
      .replace(/\*(.*?)\*/g, '$1')
      // Links
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove markdown link syntax
      .replace(/^\* /gm, '• ') // Unordered lists
      .replace(/^\d+\. /gm, '') // Ordered lists (remove numbers)
      .trim();
  }

  /**
   * Define nível de heading baseado no tipo de seção
   */
  private static getHeadingLevel(type: string): number {
    const levelMap: Record<string, number> = {
      'cover': 1,
      'title-page': 1,
      'copyright': 2,
      'dedication': 2,
      'acknowledgments': 2,
      'epigraph': 2,
      'preface': 2,
      'foreword': 2,
      'introduction': 1,
      'chapter': 1,
      'conclusion': 1,
      'afterword': 2,
      'appendix': 1,
      'glossary': 1,
      'bibliography': 1,
      'author-bio': 1,
      'back-cover': 1,
      'table-of-contents': 1
    };

    return levelMap[type] || 2;
  }

  /**
   * Adiciona números de página (desabilitado por enquanto)
   * TODO: Implementar numeração de páginas após todas as páginas serem criadas
   */
  private static addPageNumbers(doc: PDFKit.PDFDocument): void {
    // Implementação futura - requer reestruturação do PDFKit
//    console.log('📄 Numeração de páginas será implementada em versão futura');
  }

  /**
   * Valida se o projeto pode ser exportado para PDF
   */
  static validateForExport(project: EbookProject, sections: EbookSection[]): { valid: boolean; reason?: string } {
    // Mesmo critério do Markdown
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
