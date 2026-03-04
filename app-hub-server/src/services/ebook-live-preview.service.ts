/**
 * Serviço para gerar preview dinâmico de ebook com configurações de design e exportação
 * Permite visualizar em tempo real como as configurações afetam o layout
 */

import { EbookProject, EbookSection } from '../templates/ebook/markdown-template';
import { EbookContentWrapperService } from './ebook-content-wrapper.service';
import { MongoDbService } from './mongodb.service';
import { ObjectId } from 'mongodb';

interface LivePreviewOptions {
  // Configurações de design
  design?: {
    baseTemplateKey?: string;
    visualIdentity?: any;
  };
  // Configurações de layout/exportação
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
    lineHeight?: string;
    fontSize?: string;
  };
  // Configurações de conteúdo
  content?: {
    includeCover?: boolean;
    includeTableOfContents?: boolean;
    includeImages?: boolean;
    maxSections?: number;
  };
  // Formato para otimização
  format?: 'pdf' | 'docx' | 'epub' | 'html';
}

interface PreviewGenerationConfig {
  projectId: string;
  userId: string;
  sections: EbookSection[];
  project: EbookProject;
  options: LivePreviewOptions;
}

export class EbookLivePreviewService {
  private mongoDbService = new MongoDbService();

  /**
   * Gera HTML de preview dinâmico com configurações temporárias
   * Não modifica o projeto salvo no banco de dados
   * 
   * @param config Configuração com projeto, seções e opções
   * @returns HTML de preview
   */
  async generateLivePreview(config: PreviewGenerationConfig): Promise<string> {
    const {
      projectId,
      userId,
      sections,
      project,
      options
    } = config;

    try {
      // Validar que o projeto pertence ao usuário
      const projects = await this.mongoDbService.get('ebookProjects', {
        _id: new ObjectId(projectId),
        userId
      });

      if (!projects || projects.length === 0) {
        throw new Error('Projeto não encontrado ou acesso negado');
      }

      // Se não tem design, não pode gerar preview
      if (!project.design) {
        throw new Error('Projeto não possui design. Gere o design primeiro.');
      }

      // Preparar seções filtradas conforme opções
      let filteredSections = [...sections];

      // Filtrar por número máximo de seções
      if (options.content?.maxSections) {
        filteredSections = filteredSections.slice(0, options.content.maxSections);
      }

      // Excluir capa se solicitado
      if (options.content?.includeCover === false) {
        filteredSections = filteredSections.filter(s => s.type !== 'cover');
      }

      // Excluir TOC se solicitado
      if (options.content?.includeTableOfContents === false) {
        filteredSections = filteredSections.filter(s => s.type !== 'toc');
      }

      // Excluir imagens se solicitado
      if (options.content?.includeImages === false) {
        filteredSections.forEach(section => {
          section.images = [];
        });
      }

      // Construir conceito de design com opções customizadas
      const designConcept = {
        baseTemplateKey: options.design?.baseTemplateKey || project.design.baseTemplateKey,
        visualIdentity: {
          ...project.design.visualIdentity,
          ...(options.design?.visualIdentity || {})
        },
        reasoning: project.design.reasoning,
        designNotes: project.design.reasoning,
        customInstructions: project.design.customInstruction,
        globalCSS: project.design.globalCSS || '',
        containerStructure: project.design.containerStructure || '',
        wrapperClasses: project.design.wrapperClasses || '',
        fonts: project.design.fonts || [],
        colorPalette: project.design.colorPalette || [],
        images: project.design.images || [],
        needsBackgroundImage: project.design.needsBackgroundImage || false,
        backgroundImagePrompt: project.design.backgroundImagePrompt || ''
      };

      // Gerar HTML base com design
      let html = EbookContentWrapperService.wrapContent(
        filteredSections,
        designConcept,
        project.title
      );

      // Adicionar metadata
      html = EbookContentWrapperService.addMetadata(html, {
        author: project.dna?.author,
        description: project.dna?.idea,
        keywords: project.dna?.keywords,
        language: 'pt-BR'
      });

      // Injetar CSS customizado para layout se fornecido
      if (options.layout) {
        html = this.injectLayoutCSS(html, options.layout, options.format);
      }

      // Otimizar para print se PDF
      if (options.format === 'pdf') {
        html = EbookContentWrapperService.optimizeForPrint(html);
      }

      // Adicionar metadados de preview
      html = this.addPreviewMetadata(html, {
        format: options.format || 'html',
        layout: options.layout,
        timestamp: new Date().toISOString()
      });

      return html;

    } catch (error: any) {
      throw new Error(`Erro ao gerar preview: ${error.message}`);
    }
  }

  /**
   * Injeta CSS customizado para layout no HTML
   */
  private injectLayoutCSS(
    html: string,
    layout: LivePreviewOptions['layout'],
    format?: string
  ): string {
    const cssVariables = this.generateLayoutVariables(layout);
    const additionalCSS = this.generateLayoutCSS(layout, format);

    let injectedHtml = html;

    // Encontrar </head> para injetar CSS
    if (injectedHtml.includes('</head>')) {
      injectedHtml = injectedHtml.replace(
        '</head>',
        `<style>${cssVariables}${additionalCSS}</style></head>`
      );
    } else if (injectedHtml.includes('<head>')) {
      injectedHtml = injectedHtml.replace(
        '<head>',
        `<head><style>${cssVariables}${additionalCSS}</style>`
      );
    } else {
      injectedHtml = `<style>${cssVariables}${additionalCSS}</style>${injectedHtml}`;
    }

    return injectedHtml;
  }

  /**
   * Gera variáveis CSS para layout
   */
  private generateLayoutVariables(layout: LivePreviewOptions['layout']): string {
    const padding = layout?.contentPadding || {};
    const margins = layout?.margins || {};

    return `
:root {
  /* Content Padding */
  --content-padding-top: ${padding.top || '2rem'};
  --content-padding-right: ${padding.right || '2rem'};
  --content-padding-bottom: ${padding.bottom || '2rem'};
  --content-padding-left: ${padding.left || '2rem'};

  /* Page Margins */
  --page-margin-top: ${margins.top || '1.5in'};
  --page-margin-right: ${margins.right || '1in'};
  --page-margin-bottom: ${margins.bottom || '1.5in'};
  --page-margin-left: ${margins.left || '1in'};

  /* Typography */
  --base-font-size: ${layout?.fontSize || '16px'};
  --base-line-height: ${layout?.lineHeight || '1.6'};

  /* Page Size */
  --page-size: ${layout?.pageSize || 'A4'};
}
`;
  }

  /**
   * Gera CSS adicional para layout conforme formato
   */
  private generateLayoutCSS(
    layout: LivePreviewOptions['layout'],
    format?: string
  ): string {
    const baseCSS = `
html, body {
  font-size: var(--base-font-size);
  line-height: var(--base-line-height);
  margin: 0;
  padding: 0;
}

.content {
  padding: var(--content-padding-top) var(--content-padding-right) var(--content-padding-bottom) var(--content-padding-left);
}

@media print {
  @page {
    margin: var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left);
    size: var(--page-size);
  }

  html, body {
    margin: 0;
    padding: 0;
  }
}
`;

    // Adicionar CSS específico por formato
    if (format === 'pdf' || format === 'docx') {
      return baseCSS + `
/* Otimizações para PDF/DOCX */
* {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

h1, h2, h3 {
  page-break-after: avoid;
}

p, li {
  orphans: 3;
  widows: 3;
}
`;
    }

    return baseCSS;
  }

  /**
   * Adiciona metadados de preview ao HTML
   */
  private addPreviewMetadata(
    html: string,
    metadata: {
      format: string;
      layout?: any;
      timestamp: string;
    }
  ): string {
    const metadataScript = `
<script type="application/json" id="preview-metadata">
${JSON.stringify(metadata, null, 2)}
</script>
`;

    if (html.includes('</head>')) {
      return html.replace('</head>', metadataScript + '</head>');
    }

    return metadataScript + html;
  }

  /**
   * Valida se as opções de preview são válidas
   */
  validatePreviewOptions(options: LivePreviewOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.layout?.pageSize) {
      const validSizes = ['A4', 'Letter'];
      if (!validSizes.includes(options.layout.pageSize)) {
        errors.push(`Page size inválido: ${options.layout.pageSize}. Use: ${validSizes.join(', ')}`);
      }
    }

    if (options.format) {
      const validFormats = ['pdf', 'docx', 'epub', 'html'];
      if (!validFormats.includes(options.format)) {
        errors.push(`Formato inválido: ${options.format}. Use: ${validFormats.join(', ')}`);
      }
    }

    if (options.content?.maxSections && options.content.maxSections < 1) {
      errors.push('maxSections deve ser maior que 0');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
