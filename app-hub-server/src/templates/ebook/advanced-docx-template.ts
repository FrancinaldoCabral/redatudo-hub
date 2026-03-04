/**
 * Template avançado para exportação DOCX com suporte a design e layout
 * Integra o design do projeto na exportação Word
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
  ImageRun,
  convertInchesToTwip,
  ShadingType,
  PageBreak,
  UnderlineType
} from 'docx';
import { EbookProject, EbookSection } from './markdown-template';

export interface AdvancedDOCXOptions {
  // Design options
  design?: {
    visualIdentity?: {
      fontPrimary?: string;
      fontHeadings?: string;
      fontCode?: string;
      colorPrimary?: string;
      colorSecondary?: string;
      colorAccent?: string;
    };
  };

  // Layout options
  layout?: {
    contentPadding?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    margins?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    pageSize?: 'A4' | 'Letter';
    lineHeight?: number;
    fontSize?: {
      title?: number;
      heading1?: number;
      heading2?: number;
      heading3?: number;
      body?: number;
      caption?: number;
    };
  };

  // Content options
  content?: {
    includeCover?: boolean;
    includeTableOfContents?: boolean;
    includeImages?: boolean;
  };

  // Export metadata
  language?: string;
}

export class AdvancedDOCXTemplate {
  private static defaultOptions: AdvancedDOCXOptions = {
    design: {
      visualIdentity: {
        fontPrimary: 'Calibri',
        fontHeadings: 'Calibri',
        fontCode: 'Courier New',
        colorPrimary: '#000000',
        colorSecondary: '#666666',
        colorAccent: '#0070C0'
      }
    },
    layout: {
      contentPadding: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      margins: { top: '2.5cm', right: '2cm', bottom: '2.5cm', left: '2cm' },
      pageSize: 'A4',
      lineHeight: 1.5,
      fontSize: {
        title: 24,
        heading1: 18,
        heading2: 16,
        heading3: 14,
        body: 12,
        caption: 10
      }
    },
    content: {
      includeCover: true,
      includeTableOfContents: true,
      includeImages: true
    },
    language: 'pt-BR'
  };

  /**
   * Gera DOCX com design e layout customizado
   */
  static async generate(
    project: EbookProject,
    sections: EbookSection[],
    options: AdvancedDOCXOptions = {}
  ): Promise<Buffer> {
    const opts = this.mergeOptions(options);

    // Preparar seções
    let filteredSections = sections.sort((a, b) => a.order - b.order);

    if (opts.content?.includeCover === false) {
      filteredSections = filteredSections.filter(s => s.type !== 'cover');
    }

    if (opts.content?.includeImages === false) {
      filteredSections = filteredSections.map(s => ({
        ...s,
        images: []
      }));
    }

    // Construir documento
    const children = await this.buildDocument(project, filteredSections, opts);

    // Configurar documento com estilos
    const doc = new Document({
      styles: {
        paragraphStyles: [
          this.createNormalStyle(opts),
          this.createHeading1Style(opts),
          this.createHeading2Style(opts),
          this.createHeading3Style(opts)
        ]
      },
      sections: [{
        properties: {
          page: {
            margin: this.parseMargins(opts.layout?.margins)
          }
        },
        children
      }]
    });

    return Packer.toBuffer(doc);
  }

  /**
   * Constrói o conteúdo do documento
   */
  private static async buildDocument(
    project: EbookProject,
    sections: EbookSection[],
    options: AdvancedDOCXOptions
  ): Promise<any[]> {
    const children: any[] = [];

    // Capa (se tiver e incluida)
    if (options.content?.includeCover !== false && (project.metadata as any)?.currentCover?.url) {
      children.push(...await this.createCover(project, options));
      children.push(new PageBreak());
    }

    // Página de título
    children.push(...this.createTitlePage(project, options));
    children.push(new PageBreak());

    // Sumário
    if (options.content?.includeTableOfContents !== false) {
      children.push(...this.createTableOfContents(sections, options));
      children.push(new PageBreak());
    }

    // Seções de conteúdo
    const contentSections = sections.filter(s => s.content?.trim());
    for (let i = 0; i < contentSections.length; i++) {
      const section = contentSections[i];
      const sectionContent = await this.createSection(section, options);
      children.push(...sectionContent);

      // Quebra de página entre seções (exceto a última)
      if (i < contentSections.length - 1) {
        children.push(new PageBreak());
      }
    }

    return children;
  }

  /**
   * Cria página de capa
   */
  private static async createCover(
    project: EbookProject,
    options: AdvancedDOCXOptions
  ): Promise<any[]> {
    const children: any[] = [];
    const coverUrl = (project.metadata as any)?.currentCover?.url;

    if (coverUrl) {
      try {
        // Tentar adicionar imagem da capa (requer acesso à URL)
        // Por segurança, apenas registrar que temos capa
        children.push(
          new Paragraph({
            text: '[Capa do livro]',
            alignment: AlignmentType.CENTER,
            spacing: { line: convertInchesToTwip(2) }
          })
        );
      } catch (err) {
        // Se falhar ao carregar imagem, apenas prosseguir
        console.warn('⚠️ Falha ao carregar imagem de capa:', err?.message);
      }
    }

    return children;
  }

  /**
   * Cria página de título
   */
  private static createTitlePage(
    project: EbookProject,
    options: AdvancedDOCXOptions
  ): any[] {
    const children: any[] = [];
    const fontSize = options.layout?.fontSize || this.defaultOptions.layout?.fontSize;
    const fontPrimary = options.design?.visualIdentity?.fontPrimary || 'Calibri';

    // Espaçamento superior
    children.push(
      new Paragraph({
        text: '',
        spacing: { line: convertInchesToTwip(3) }
      })
    );

    // Título
    children.push(
      new Paragraph({
        text: project.title || 'Untitled',
        style: 'Heading 1',
        alignment: AlignmentType.CENTER,
        spacing: {
          line: convertInchesToTwip(0.5),
          after: 300
        }
      })
    );

    // Autor
    if (project.dna?.author) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            line: convertInchesToTwip(0.3),
            after: 200
          },
          children: [new TextRun({
            text: `por ${project.dna.author}`,
            font: fontPrimary,
            size: (fontSize?.body || 12) * 2
          })]
        })
      );
    }

    // Descrição
    if (project.dna?.idea) {
      children.push(
        new Paragraph({
          text: '',
          spacing: { line: convertInchesToTwip(0.5) }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            line: convertInchesToTwip(0.3),
            after: 200
          },
          children: [new TextRun({
            text: project.dna.idea,
            font: fontPrimary,
            size: (fontSize?.body || 12) * 2,
            italics: true
          })]
        })
      );
    }

    return children;
  }

  /**
   * Cria sumário
   */
  private static createTableOfContents(
    sections: EbookSection[],
    options: AdvancedDOCXOptions
  ): any[] {
    const children: any[] = [];
    const fontSize = options.layout?.fontSize || this.defaultOptions.layout?.fontSize;

    children.push(
      new Paragraph({
        text: 'Sumário',
        style: 'Heading 1',
        spacing: { after: 300 }
      })
    );

    const contentSections = sections.filter(s => s.content?.trim());
    contentSections.forEach((section, index) => {
      const indent = (section as any).level ? (section as any).level * 400 : 0;

      children.push(
        new Paragraph({
          text: `${index + 1}. ${section.title || `Seção ${index + 1}`}`,
          spacing: { line: convertInchesToTwip(0.3), after: 100 },
          indent: { left: indent },
          children: [new TextRun({
            text: `${index + 1}. ${section.title || `Seção ${index + 1}`}`,
            font: 'Calibri',
            size: (fontSize?.body || 12) * 2
          })]
        })
      );
    });

    return children;
  }

  /**
   * Cria conteúdo de seção
   */
  private static async createSection(
    section: EbookSection,
    options: AdvancedDOCXOptions
  ): Promise<any[]> {
    const children: any[] = [];
    const fontSize = options.layout?.fontSize || this.defaultOptions.layout?.fontSize;
    const fontHeadings = options.design?.visualIdentity?.fontHeadings || 'Calibri';
    const fontBody = options.design?.visualIdentity?.fontPrimary || 'Calibri';

    // Título da seção
    if (section.title) {
      children.push(
        new Paragraph({
          text: section.title,
          style: (section as any).level === 2 ? 'Heading 2' : 'Heading 1',
          spacing: {
            before: 300,
            after: 200,
            line: convertInchesToTwip(1.5)
          }
        })
      );
    }

    // Conteúdo (converter markdown básico para DOCX)
    if (section.content) {
      const contentLines = section.content.split('\n');

      for (const line of contentLines) {
        const trimmed = line.trim();

        if (!trimmed) {
          // Parágrafo vazio
          children.push(new Paragraph({ text: '' }));
        } else if (trimmed.startsWith('# ')) {
          // Heading 1
          children.push(
            new Paragraph({
              text: trimmed.substring(2),
              style: 'Heading 1',
              spacing: { before: 300, after: 200 }
            })
          );
        } else if (trimmed.startsWith('## ')) {
          // Heading 2
          children.push(
            new Paragraph({
              text: trimmed.substring(3),
              style: 'Heading 2',
              spacing: { before: 200, after: 100 }
            })
          );
        } else if (trimmed.startsWith('### ')) {
          // Heading 3
          children.push(
            new Paragraph({
              text: trimmed.substring(4),
              style: 'Heading 3',
              spacing: { before: 150, after: 80 }
            })
          );
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          // List item
          children.push(
            new Paragraph({
              text: trimmed.substring(2),
              bullet: { level: 0 },
              spacing: { after: 100 }
            })
          );
        } else {
          // Parágrafo normal
          children.push(
            new Paragraph({
              spacing: {
                line: convertInchesToTwip(options.layout?.lineHeight || 1.5),
                after: 100
              },
              children: [new TextRun({
                text: trimmed,
                font: fontBody,
                size: (fontSize?.body || 12) * 2
              })]
            })
          );
        }
      }
    }

    // Imagens (se incluídas)
    if (options.content?.includeImages !== false && section.images && section.images.length > 0) {
      children.push(new Paragraph({ text: '' }));

      for (const img of section.images) {
        try {
          // Adicionar placeholder para imagens (não carregamos binários)
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 },
              children: [new TextRun({
                text: `[Imagem: ${img.alt || 'sem descrição'}]`,
                italics: true,
                size: (fontSize?.caption || 10) * 2
              })]
            })
          );
        } catch (err) {
          console.warn('⚠️ Falha ao processar imagem:', err?.message);
        }
      }
    }

    return children;
  }

  /**
   * Cria estilo Normal
   */
  private static createNormalStyle(options: AdvancedDOCXOptions): any {
    const fontSize = options.layout?.fontSize || this.defaultOptions.layout?.fontSize;
    const fontPrimary = options.design?.visualIdentity?.fontPrimary || 'Calibri';

    return {
      id: 'normal',
      name: 'Normal',
      run: {
        font: fontPrimary,
        size: (fontSize?.body || 12) * 2
      },
      paragraph: {
        spacing: {
          line: convertInchesToTwip(options.layout?.lineHeight || 1.5)
        }
      }
    };
  }

  /**
   * Cria estilo Heading 1
   */
  private static createHeading1Style(options: AdvancedDOCXOptions): any {
    const fontSize = options.layout?.fontSize || this.defaultOptions.layout?.fontSize;
    const fontHeadings = options.design?.visualIdentity?.fontHeadings || 'Calibri';
    const colorAccent = options.design?.visualIdentity?.colorAccent || '#000000';

    return {
      id: 'Heading1',
      name: 'Heading 1',
      run: {
        font: fontHeadings,
        size: (fontSize?.heading1 || 18) * 2,
        bold: true,
        color: colorAccent.replace('#', '')
      },
      paragraph: {
        spacing: {
          before: 300,
          after: 200,
          line: convertInchesToTwip(1.5)
        }
      }
    };
  }

  /**
   * Cria estilo Heading 2
   */
  private static createHeading2Style(options: AdvancedDOCXOptions): any {
    const fontSize = options.layout?.fontSize || this.defaultOptions.layout?.fontSize;
    const fontHeadings = options.design?.visualIdentity?.fontHeadings || 'Calibri';

    return {
      id: 'Heading2',
      name: 'Heading 2',
      run: {
        font: fontHeadings,
        size: (fontSize?.heading2 || 16) * 2,
        bold: true
      },
      paragraph: {
        spacing: {
          before: 200,
          after: 100,
          line: convertInchesToTwip(1.3)
        }
      }
    };
  }

  /**
   * Cria estilo Heading 3
   */
  private static createHeading3Style(options: AdvancedDOCXOptions): any {
    const fontSize = options.layout?.fontSize || this.defaultOptions.layout?.fontSize;
    const fontHeadings = options.design?.visualIdentity?.fontHeadings || 'Calibri';

    return {
      id: 'Heading3',
      name: 'Heading 3',
      run: {
        font: fontHeadings,
        size: (fontSize?.heading3 || 14) * 2,
        bold: true
      },
      paragraph: {
        spacing: {
          before: 150,
          after: 80
        }
      }
    };
  }

  /**
   * Converte margens de string para TWIPs
   */
  private static parseMargins(margins?: { top?: string; right?: string; bottom?: string; left?: string }) {
    if (!margins) {
      return {
        top: convertInchesToTwip(1),
        right: convertInchesToTwip(0.75),
        bottom: convertInchesToTwip(1),
        left: convertInchesToTwip(0.75)
      };
    }

    return {
      top: this.parseMeasure(margins.top || '2.5cm'),
      right: this.parseMeasure(margins.right || '2cm'),
      bottom: this.parseMeasure(margins.bottom || '2.5cm'),
      left: this.parseMeasure(margins.left || '2cm')
    };
  }

  /**
   * Converte medida em string para TWIPs
   */
  private static parseMeasure(measure: string): number {
    const val = parseFloat(measure);
    if (measure.endsWith('cm')) {
      return convertInchesToTwip(val / 2.54);
    } else if (measure.endsWith('in')) {
      return convertInchesToTwip(val);
    } else if (measure.endsWith('mm')) {
      return convertInchesToTwip(val / 25.4);
    } else if (measure.endsWith('pt')) {
      return val * 20;
    }
    return convertInchesToTwip(val / 2.54); // assume cm por padrão
  }

  /**
   * Mescla opções com defaults
   */
  private static mergeOptions(options: AdvancedDOCXOptions): AdvancedDOCXOptions {
    return {
      design: {
        visualIdentity: {
          ...this.defaultOptions.design?.visualIdentity,
          ...(options.design?.visualIdentity || {})
        }
      },
      layout: {
        ...this.defaultOptions.layout,
        ...(options.layout || {}),
        fontSize: {
          ...this.defaultOptions.layout?.fontSize,
          ...(options.layout?.fontSize || {})
        }
      },
      content: {
        ...this.defaultOptions.content,
        ...(options.content || {})
      },
      language: options.language || this.defaultOptions.language
    };
  }
}
