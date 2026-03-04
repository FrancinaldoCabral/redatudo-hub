/**
 * Template para exportação de ebooks em formato DOCX (Microsoft Word)
 * Usa biblioteca docx para gerar documentos Word editáveis
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  ImageRun
} from 'docx';
import { EbookProject, EbookSection } from './markdown-template';

export interface DOCXOptions {
  includeImages?: boolean;
  includeToc?: boolean;
  fontSize?: {
    title?: number;
    heading1?: number;
    heading2?: number;
    body?: number;
    caption?: number;
  };
  language?: string;
}

export class DOCXTemplate {
  private static defaultOptions: DOCXOptions = {
    includeImages: true,
    includeToc: true,
    fontSize: {
      title: 24,
      heading1: 18,
      heading2: 16,
      body: 12,
      caption: 10
    },
    language: 'pt-BR'
  };

  /**
   * Gera DOCX completo do ebook
   */
  static async generate(
    project: EbookProject,
    sections: EbookSection[],
    options: DOCXOptions = {}
  ): Promise<Buffer> {
    const opts = { ...this.defaultOptions, ...options };

    // Construir documento
    const children = await this.buildDocument(project, sections, opts);

    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: 'normal',
            name: 'Normal',
            run: {
              font: 'Times New Roman',
              size: opts.fontSize!.body! * 2, // DOCX usa half-points
            },
          },
          {
            id: 'heading1',
            name: 'Heading 1',
            run: {
              font: 'Times New Roman',
              size: opts.fontSize!.heading1! * 2,
              bold: true,
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
          {
            id: 'heading2',
            name: 'Heading 2',
            run: {
              font: 'Times New Roman',
              size: opts.fontSize!.heading2! * 2,
              bold: true,
            },
            paragraph: {
              spacing: {
                before: 180,
                after: 80,
              },
            },
          },
        ],
      },
      sections: [{
        children,
      }],
    });

    // Gerar buffer
    return Packer.toBuffer(doc);
  }

  /**
   * Constrói o conteúdo do documento
   */
  private static async buildDocument(
    project: EbookProject,
    sections: EbookSection[],
    options: DOCXOptions
  ): Promise<any[]> {
    const children: any[] = [];
    const sortedSections = sections.sort((a, b) => a.order - b.order);
    const contentSections = sortedSections.filter(s => s.content?.trim());

    // Página de título
    children.push(...this.createTitlePage(project, options));

    // Sumário
    if (options.includeToc) {
      children.push(...this.createTableOfContents(contentSections, options));
    }

    // Seções de conteúdo
    for (const section of contentSections) {
      children.push(...await this.createSection(section, options));
    }

    return children;
  }

  /**
   * Cria página de título
   */
  private static createTitlePage(project: EbookProject, options: DOCXOptions): any[] {
    const children: any[] = [];

    // Título principal
    children.push(
      new Paragraph({
        text: project.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 400,
        },
        children: [
          new TextRun({
            text: project.title,
            font: 'Times New Roman',
            size: options.fontSize!.title! * 2,
            bold: true,
          }),
        ],
      })
    );

    // Autor
    if (project.dna?.author) {
      children.push(
        new Paragraph({
          text: project.dna.author,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 200,
          },
          children: [
            new TextRun({
              text: project.dna.author,
              font: 'Times New Roman',
              size: options.fontSize!.heading1! * 2,
            }),
          ],
        })
      );
    }

    // Gênero
    if (project.dna?.genre) {
      children.push(
        new Paragraph({
          text: project.dna.genre,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 200,
          },
          children: [
            new TextRun({
              text: project.dna.genre,
              font: 'Times New Roman',
              size: options.fontSize!.body! * 2,
            }),
          ],
        })
      );
    }

    // Descrição
    if (project.dna?.idea) {
      children.push(
        new Paragraph({
          text: project.dna.idea,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 400,
          },
          children: [
            new TextRun({
              text: project.dna.idea,
              font: 'Times New Roman',
              size: options.fontSize!.body! * 2,
            }),
          ],
        })
      );
    }

    // Metadados
    const metadata: string[] = [];
    if (project.metadata?.isbn) metadata.push(`ISBN: ${project.metadata.isbn}`);
    if (project.metadata?.publisher) metadata.push(`Editora: ${project.metadata.publisher}`);
    if (project.metadata?.language) metadata.push(`Idioma: ${project.metadata.language}`);

    if (metadata.length > 0) {
      children.push(
        new Paragraph({
          text: metadata.join(' | '),
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 200,
          },
          children: [
            new TextRun({
              text: metadata.join(' | '),
              font: 'Times New Roman',
              size: options.fontSize!.caption! * 2,
            }),
          ],
        })
      );
    }

    // Data de geração
    children.push(
      new Paragraph({
        text: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 600,
        },
        children: [
          new TextRun({
            text: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
            font: 'Times New Roman',
            size: options.fontSize!.caption! * 2,
          }),
        ],
      })
    );

    // Quebra de página
    children.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    );

    return children;
  }

  /**
   * Cria sumário
   */
  private static createTableOfContents(sections: EbookSection[], options: DOCXOptions): any[] {
    const children: any[] = [];

    children.push(
      new Paragraph({
        text: 'Sumário',
        heading: HeadingLevel.HEADING_1,
        spacing: {
          after: 200,
        },
      })
    );

    sections.forEach((section, index) => {
      const title = section.title || `Seção ${index + 1}`;
      const pageNumber = (index + 3).toString(); // Estimativa

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              font: 'Times New Roman',
              size: options.fontSize!.body! * 2,
            }),
            new TextRun({
              text: '\t'.repeat(10), // Tabulação para alinhar à direita
            }),
            new TextRun({
              text: pageNumber,
              font: 'Times New Roman',
              size: options.fontSize!.body! * 2,
            }),
          ],
          spacing: {
            after: 100,
          },
        })
      );
    });

    // Quebra de página
    children.push(
      new Paragraph({
        text: '',
        pageBreakBefore: true,
      })
    );

    return children;
  }

  /**
   * Cria uma seção
   */
  private static async createSection(section: EbookSection, options: DOCXOptions): Promise<any[]> {
    const children: any[] = [];

    // Título da seção
    if (section.title) {
      const level = this.getHeadingLevel(section.type);
      children.push(
        new Paragraph({
          text: section.title,
          heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
          spacing: {
            after: 200,
          },
        })
      );
    }

    // Conteúdo da seção
    if (section.content) {
      const paragraphs = this.processContent(section.content);
      paragraphs.forEach(paragraph => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph,
                font: 'Times New Roman',
                size: options.fontSize!.body! * 2,
              }),
            ],
            spacing: {
              after: 120,
            },
          })
        );
      });
    }

    // Imagens da seção
    if (options.includeImages && section.images && section.images.length > 0) {
      for (const image of section.images) {
        try {
          // Placeholder para imagem
          // TODO: Implementar download e embedding real de imagens
          children.push(
            new Paragraph({
              text: `[Imagem: ${image.alt || 'Imagem da seção'}]`,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 100,
              },
              children: [
                new TextRun({
                  text: `[Imagem: ${image.alt || 'Imagem da seção'}]`,
                  font: 'Times New Roman',
                  size: options.fontSize!.caption! * 2,
                  italics: true,
                }),
              ],
            })
          );

          if (image.caption) {
            children.push(
              new Paragraph({
                text: image.caption,
                alignment: AlignmentType.CENTER,
                spacing: {
                  after: 200,
                },
                children: [
                  new TextRun({
                    text: image.caption,
                    font: 'Times New Roman',
                    size: options.fontSize!.caption! * 2,
                    italics: true,
                  }),
                ],
              })
            );
          }
        } catch (error) {
          console.warn('Erro ao processar imagem:', error);
        }
      }
    }

    return children;
  }

  /**
   * Processa conteúdo markdown para texto simples
   */
  private static processContent(content: string): string[] {
    // Se o conteúdo tiver tags HTML, convertê-lo para texto limpo primeiro
    const looksLikeHtml = /<[^>]+>/i.test(content);
    let plain = content;

    if (looksLikeHtml) {
      try {
        const htmlToText = require('html-to-text');
        plain = htmlToText.htmlToText(content, {
          wordwrap: false,
          // Preserva listas e quebra de linhas de forma legível
          selectors: [
            { selector: 'a', options: { hideLinkHrefIfSameAsText: true } }
          ]
        });
      } catch (err) {
        // Fallback simples: remover tags
        plain = content.replace(/<[^>]*>/g, '');
      }
    }

    // Dividir em parágrafos
    const paragraphs = plain
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return paragraphs.map(paragraph => {
      return paragraph
        // Remover marcação markdown residual
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/^\* (.*$)/gim, '• $1')
        .replace(/^\d+\. (.*$)/gim, '$1')
        .trim();
    });
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
   * Valida se o projeto pode ser exportado para DOCX
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
