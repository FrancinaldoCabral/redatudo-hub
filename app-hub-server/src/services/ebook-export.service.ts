import { MongoDbService } from './mongodb.service';
import { MarkdownTemplate, EbookProject, EbookSection } from '../templates/ebook/markdown-template';
import { PDFTemplate, PDFOptions } from '../templates/ebook/pdf-template';
import { EPUBTemplate, EPUBOptions } from '../templates/ebook/epub-template';

import { EbookContentSamplerService } from './ebook-content-sampler.service';
import { EbookDesignGeneratorService } from './ebook-design-generator.service';
import { EbookContentWrapperService } from './ebook-content-wrapper.service';
import { EbookFormatConverterService } from './ebook-format-converter.service';
import { addJob } from './jobs.service';
import { ObjectId } from 'mongodb';
import { uploadFile } from './local-bucket-upload.service';
import path from 'path';
import fs from 'fs';

const mongoDbService = new MongoDbService();

/**
 * Serviço principal para exportação de ebooks em múltiplos formatos
 */
export class EbookExportService {
  /**
   * Inicia processo de exportação assíncrona
   */
  async exportEbook(
    projectId: string,
    userId: string,
    format: 'markdown' | 'pdf' | 'epub' | 'mobi' = 'markdown',
    options: ExportOptions = {}
  ): Promise<{ jobId: string; estimatedCredits: number }> {
    // Buscar projeto e validar
    const project = await this.getProject(projectId, userId);
    const sections = await this.getProjectSections(projectId);

    // Validar conteúdo
    const validation = MarkdownTemplate.validateForExport(project, sections);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Calcular custo estimado
    const estimatedCredits = this.calculateCredits(format, sections);

    // Verificar se usuário tem créditos suficientes (implementar depois)

    // Criar job de exportação
    const job = await addJob({
      form: {
        projectId,
        format,
        options: {
          includeImages: options.includeImages ?? true,
          includeToc: options.includeToc ?? true,
          ...options
        }
      },
      metadata: {
        userId,
        app: 'ebook-export',
        projectId,
        format,
        estimatedCredits
      }
    });

//    console.log(`✅ Job de exportação criado: ${job.id} (formato: ${format})`);

    return {
      jobId: job.id,
      estimatedCredits
    };
  }

  /**
   * Processa a exportação (chamado pelo worker)
   * NOVO: Usa design salvo no projeto (sem chamar LLM)
   */
  async processExport(jobData: any): Promise<any> {
    const { projectId, format, options } = jobData.form;
    const { userId } = jobData.metadata;

    // 🔍 LOG DETALHADO: Capturar tudo que chega do frontend
    console.log('\n========== 🔍 PAYLOAD RECEBIDO DO FRONTEND ==========');
    console.log(`📦 Format: ${format}`);
    console.log(`📋 Options recebidas (raw):`);
    console.log(JSON.stringify(options, null, 2));
    console.log('========== FIM PAYLOAD ==========\n');

    // 🔧 NORMALIZAÇÃO: Frontend envia estrutura plana, backend espera aninhada
    // Converter: layout.pageSize → layout.page.size
    //           layout.margins → layout.page.margins
    if (options.layout) {
      const layoutRaw = options.layout as any;
      
      // Se não existe layout.page mas existem pageSize/margins no nível de layout
      if (!layoutRaw.page && (layoutRaw.pageSize || layoutRaw.margins)) {
        console.log('🔄 [NORMALIZAÇÃO] Convertendo estrutura plana do frontend para estrutura aninhada do backend...');
        
        layoutRaw.page = {
          size: layoutRaw.pageSize || 'A4',
          orientation: 'portrait', // Frontend não está enviando, usar default
          margins: layoutRaw.margins || {}
        };
        
        // Limpar propriedades antigas
        delete layoutRaw.pageSize;
        delete layoutRaw.margins;
        
        console.log('✅ [NORMALIZAÇÃO] Estrutura convertida:');
        console.log(JSON.stringify({ layout: layoutRaw }, null, 2));
      }
    }

    try {
      // Buscar dados
      const project = await this.getProject(projectId, userId);
      const sections = await this.getProjectSections(projectId);

      let content: string | Buffer;
      let filename: string;
      let mimeType: string;

      // Markdown continua usando template antigo (sem design)
      if (format === 'markdown') {
        content = this.generateMarkdown(project, sections, options);
        filename = `${this.sanitizeFilename(project.title)}.md`;
        mimeType = 'text/markdown';
      } else {
        // NOVO FLUXO: Usa design salvo no projeto (sem chamar LLM!)
        
        // 1. Verificar se projeto tem design
        if (!project.design) {
          throw new Error('Projeto não possui design. Gere o design primeiro através do endpoint /api/ebook/project/:id/design/generate');
        }
        
        // 2. Converter design salvo para formato compatível com ContentWrapper

        // Garantir que, se o projeto possui uma capa gerada (metadata.currentCover.printUrl),
        // a seção de `cover` use a variante print-ready antes de montar o HTML.
        try {
          const coverMeta = (project.metadata as any) && (project.metadata as any).currentCover;
          if (coverMeta && coverMeta.printUrl) {
            const printUrl = coverMeta.printUrl;
            const coverSection = sections.find(s => s.type === 'cover' || Number(s.order) === 0);
            if (coverSection) {
              coverSection.images = coverSection.images || [];
              // Substitui a primeira imagem da capa pela versão print-ready
              coverSection.images[0] = {
                url: printUrl,
                alt: `Capa do livro ${project.title}`,
                metadata: { printUrl }
              } as any;
            } else {
              // Se não existir seção de capa, insere uma no início
              const coverSec: any = {
                type: 'cover',
                order: 0,
                content: '',
                images: [{ url: printUrl, alt: `Capa do livro ${project.title}`, metadata: { printUrl } }]
              };
              sections.unshift(coverSec);
            }
          }
        } catch (err) {
          // Não fatal: continuar mesmo se houver erro ao ajustar a capa
          console.warn('⚠️ Falha ao injetar printUrl da capa nas seções:', err?.message || err);
        }

        // Aplicar configurações de layout customizado se fornecido
        let finalCSS = project.design.finalCSS;
        if (options.layout) {
          const layoutVariables = this.generateLayoutVariables(options);
          // Injetar variáveis CSS no início do CSS (após comentários iniciais)
          const cssLines = finalCSS.split('\n');
          const insertIndex = cssLines.findIndex(line => !line.trim().startsWith('/*'));
          if (insertIndex !== -1) {
            cssLines.splice(insertIndex, 0, layoutVariables);
          } else {
            finalCSS = layoutVariables + finalCSS;
          }
          finalCSS = cssLines.join('\n');
        }

        const designConcept = {
          globalCSS: finalCSS,
          containerStructure: '<div class="book"><div class="chapter"><div class="content">{{CONTENT}}</div></div></div>',
          wrapperClasses: {
            book: 'book',
            chapter: 'chapter',
            content: 'content'
          },
          fonts: {
            primary: project.design.visualIdentity.fontPrimary,
            headings: project.design.visualIdentity.fontHeadings,
            code: project.design.visualIdentity.fontCode
          },
          needsBackgroundImage: false,
          backgroundImagePrompt: null,
          designNotes: project.design.reasoning
        };
        
        // 3. Montar HTML completo com design salvo
        // If there's a print-ready cover, render it separately and remove cover section from the main content
        const coverPrint = (project as any)?.metadata?.currentCover?.printUrl;
        let coverPdfBuffer: Buffer | null = null;
        const allSections = await this.getProjectSections(projectId);
        let sectionsForContent = allSections.filter(s => s.type !== 'cover');
        // Debug: detalhes das seções para depuração (imprime contagem, títulos e meta simples)
        try {
          console.log('🔧 [DEBUG] sectionsForContent count:', sectionsForContent.length);
          console.log('🔧 [DEBUG] sectionsForContent titles:', sectionsForContent.map(s => s.title || '(sem título)'));
          console.log('🔧 [DEBUG] sectionsForContent details:', JSON.stringify(sectionsForContent.map(s => ({ order: s.order, type: s.type, title: s.title })), null, 2));
        } catch (dbgErr) {
          console.log('⚠️ [DEBUG] erro ao serializar sectionsForContent:', dbgErr?.message || dbgErr);
        }

        if (format === 'pdf' && coverPrint && (options.includeCover ?? true)) {
          try {
            // Extrair configurações de página do usuário (mantendo A4 como padrão)
            const pageSize = options.layout?.page?.size || 'A4';
            const pageOrientation = options.layout?.page?.orientation || 'portrait';
            const coverMargins = options.layout?.page?.margins?.first || { 
              top: '0', right: '0', bottom: '0', left: '0' 
            };

            // Converter tamanho de página para dimensões em mm
            const pageDimensions = this.getPageDimensions(pageSize, pageOrientation);
            const { width, height } = pageDimensions;

            // Build cover HTML with dynamic dimensions (preservando estrutura que já funciona)
            // IMPORTANTE: Mantém object-fit: fill e estrutura exata que funcionou
            // Margens controladas 100% pelo Puppeteer via options (respeita configuração do usuário)
            const coverHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" /><style>
              /* Page size dynamic, margins controlled by Puppeteer */
              @page { size: ${width}mm ${height}mm }
              html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
              body { display: block; overflow: hidden; background: transparent; }
              img.cover-print { 
                width: 100%; 
                height: 100%; 
                object-fit: contain; 
                object-position: center center; 
                display: block; 
                margin: 0; 
                padding: 0; 
                border: none;
              }
            </style></head><body><img class="cover-print" src="${coverPrint}" alt="cover"/></body></html>`;
            
            // Passar opções corretas para toPDF (mesmo formato que conteúdo)
            coverPdfBuffer = await EbookFormatConverterService.toPDF(
              coverHtml, 
              project.title + ' - cover', 
              {
                page: {
                  size: pageSize,
                  orientation: pageOrientation,
                  margins: coverMargins
                }
              }
            );
            // Create a copy of sections without the cover section so content PDF doesn't duplicate it

          } catch (err) {
            console.warn('⚠️ Falha ao gerar PDF da capa separadamente:', err?.message || err);
            // fallback: keep sections as-is so export still proceeds
            sectionsForContent = allSections;
            coverPdfBuffer = null;
          }
        }

        // Sempre gerar o HTML de conteúdo respeitando o design salvo no projeto
        console.log('🔧 [INFO] Gerando conteúdo com design salvo no projeto (wrapContent)');
        let html = EbookContentWrapperService.wrapContent(
          sectionsForContent,
          designConcept,
          project.title
        );
        // NOTE: We no longer mutate the assembled HTML via regex removals.
        // The cover section is already removed earlier by filtering `sectionsForContent` when a separate cover PDF
        // is created. Mutating the HTML here caused content to be removed unintentionally. Keeping the original
        // HTML intact preserves content fidelity.

        // DEBUG: Salvar HTML na raiz para visualização independente
        try {
          const debugFilename = `ebook-debug-${this.sanitizeFilename(project.title)}.html`;
          require('fs').writeFileSync(debugFilename, html, 'utf8');
          console.log(`🔧 [DEBUG] HTML salvo como: ./${debugFilename} (${(html.length / 1024).toFixed(1)} KB)`);
        } catch (debugError) {
          console.log('⚠️ [DEBUG] Erro ao salvar HTML debug (não afeta exportação):', debugError.message);
        }

        // 4. Adicionar metadata
        html = EbookContentWrapperService.addMetadata(html, {
          author: project.dna?.author,
          description: project.dna?.idea,
          keywords: project.dna?.keywords,
          language: options.language || 'pt-BR'
        });

        // 5. Otimizar para impressão (se PDF)
        if (format === 'pdf') {
          html = EbookContentWrapperService.optimizeForPrint(html);
        }

        // 6. Converter para formato solicitado
        // TODO: Integrar puppeteerConfig e epubConfig no EbookFormatConverterService
        // For PDF exports, avoid altering the document structure (which caused layout regressions).
        // Instead inject a small, targeted print CSS that:
        // - hides any in-content cover section (we already have a separate cover PDF)
        // - forces html/body to compute natural height (avoids zero-height body caused by viewport CSS)
        // This is minimally invasive and preserves the original layout and styles.
        let conversionHtml = html;
        if (format === 'pdf') {
          try {
            // SOLUÇÃO DEFINITIVA: Remover regras @page conflitantes e injetar CSS limpo
            console.log('🔧 [PDF] Removendo regras @page do template e injetando CSS consolidado');
            conversionHtml = conversionHtml.replace(/@page[^}]*\{[^}]*\}/gi, '');
            
            // Remover page-break-after desnecessários que causam páginas em branco
            conversionHtml = conversionHtml.replace(/page-break-after:\s*always\s*;/gi, '');
            
            const injectCss = `
/* ========================================
   CSS de Impressão Consolidado - PDF Export
   ======================================== */

/* IMPORTANTE: Deixar Puppeteer controlar 100% das margens via page.pdf({ margin: ... })
   O conteúdo deve se adaptar automaticamente à área disponível definida pelas margens */

html, body { 
  width: auto !important;
  max-width: 100% !important;
  height: auto !important; 
  margin: 0 !important; 
  padding: 0 !important; 
  overflow-x: hidden !important;
}

* { 
  box-sizing: border-box !important; 
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

/* Containers estruturais sem padding/margin próprios (largura total e sem overflow lateral) */
.book, .chapter {
  max-width: 100% !important;
  overflow-x: hidden !important;
}

.chapter { 
  width: 100% !important;
  margin: 0 !important; 
  padding: 0 !important;
  page-break-after: always !important;
}

/* Padding interno do conteúdo controlado por variáveis de layout
   (layout.content.padding → generateLayoutVariables → --content-padding-*) */
.content {
  width: 100%;
  padding-top:    var(--content-padding-top, 0);
  padding-right:  var(--content-padding-right, 2rem);
  padding-bottom: var(--content-padding-bottom, 0);
  padding-left:   var(--content-padding-left, 2rem);
  box-sizing: border-box;
}

/* Capa sem padding: capa deve ocupar a área inteira permitida pela página */
[data-section-type="cover"] .content,
[data-section-type="cover"] {
  padding: 0 !important;
  margin: 0 !important;
}

/* Elementos de texto preservam espaçamento interno sem depender de margens da página */
.content p { 
  margin: 1em 0; 
  max-width: 100%;
}

.content ul, 
.content ol { 
  margin: 1em 0; 
  padding-left: 2em; 
  max-width: 100%;
}

.content h1, 
.content h2, 
.content h3, 
.content h4 { 
  margin-top: 1.5em; 
  margin-bottom: 0.5em; 
  max-width: 100%;
}

/* Imagens responsivas mas sem corte */
img { 
  max-width: 100%; 
  height: auto; 
  display: block;
}

/* Quebras de página otimizadas */
h1, h2, h3 { page-break-after: avoid; }
p, li { orphans: 3; widows: 3; }
blockquote, figure, table, pre { page-break-inside: avoid; }
`;
            
            // Injetar CSS no final do <head>
            if (conversionHtml.includes('</head>')) {
              conversionHtml = conversionHtml.replace(/<\/head>/i, `<style>${injectCss}</style></head>`);
            } else if (conversionHtml.includes('<head>')) {
              conversionHtml = conversionHtml.replace('<head>', `<head><style>${injectCss}</style>`);
            } else {
              conversionHtml = `<style>${injectCss}</style>` + conversionHtml;
            }
            
            console.log('✅ [PDF] CSS de impressão consolidado injetado com sucesso');
          } catch (e) {
            console.warn('⚠️ [PDF] Falha ao injetar CSS (continuando com HTML original):', e?.message || e);
          }
        }

        const conversionOptions: any = {};
        // Montar options para PDF
        if (format === 'pdf') {
          // Aplicar opções de header/footer apenas se fornecidas pelo usuário
          if (options.pdf?.header) {
            const h = options.pdf.header;
            conversionOptions.header = {
              enabled: h.enabled ?? false,
              content: h.content || project.title,
              style: {
                // Tipografia
                fontFamily: h.fontFamily,
                fontSize: h.fontSize || '10pt',
                fontWeight: h.fontWeight,
                color: h.color || '#333',
                backgroundColor: h.backgroundColor,
                // Layout
                textAlign: h.textAlign || 'center',
                padding: h.padding,
                margin: h.margin,
                // Bordas
                borderTop: h.borderTop,
                borderBottom: h.borderBottom,
                borderLeft: h.borderLeft,
                borderRight: h.borderRight
              }
            };
          }

          if (options.pdf?.footer) {
            const f = options.pdf.footer;
            conversionOptions.footer = {
              enabled: f.enabled ?? false,
              showPageNumber: f.showPageNumber ?? false,
              pageNumberFormat: f.pageNumberFormat || 'Página {pageNumber} de {totalPages}',
              style: {
                // Tipografia
                fontFamily: f.fontFamily,
                fontSize: f.fontSize || '10pt',
                fontWeight: f.fontWeight,
                color: f.color || '#333',
                backgroundColor: f.backgroundColor,
                // Layout
                textAlign: f.textAlign || 'center',
                padding: f.padding,
                margin: f.margin,
                // Bordas
                borderTop: f.borderTop,
                borderBottom: f.borderBottom,
                borderLeft: f.borderLeft,
                borderRight: f.borderRight
              },
              content: f.content || ''
            };
          }

          // Aplicar configurações de página/layout se fornecidas
          if (options.layout?.page) {
            conversionOptions.page = {
              size: options.layout.page.size || 'A4',
              orientation: options.layout.page.orientation || 'portrait',
              margins: options.layout.page.margins?.standard || {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
              }
            };
          }

          // Aplicar configurações de conteúdo se fornecidas
          if (options.layout?.content) {
            conversionOptions.content = {
              padding: options.layout.content.padding || {
                top: '0',
                right: '2rem',
                bottom: '0',
                left: '2rem'
              }
            };
          }

          conversionOptions.includeCover = options.includeCover ?? true;
        }

        const conversionResult = await EbookFormatConverterService.convert(
          format as any,
          conversionHtml,
          project,
          sectionsForContent,
          conversionOptions
        );

        // Debug: log conversion sizes to detect empty/very small PDFs
        try {
          console.log(`🔧 [DEBUG] conversionResult buffer size: ${conversionResult.buffer?.length || 0} bytes`);
          if (conversionResult.buffer && (conversionResult.buffer.length < 2000)) {
            console.warn('⚠️ [DEBUG] conversionResult buffer is very small — content PDF may be empty');
          }
        } catch (dbgErr) {
          // non-fatal
        }

        content = conversionResult.buffer;
        mimeType = conversionResult.mimeType;
        filename = `${this.sanitizeFilename(project.title)}.${conversionResult.extension}`;

        // If PDF and we have a print-ready cover, render the cover separately and merge PDFs
        try {
          if (format === 'pdf' && coverPdfBuffer) {
            console.log('\n========== MESCLANDO CAPA NO PDF NORMAL ==========');
            console.log(`📎 [PDF] Capa: ${(coverPdfBuffer.length / 1024).toFixed(2)} KB`);
            console.log(`📄 [PDF] Conteúdo: ${(content.length / 1024).toFixed(2)} KB`);
            // Merge cover first, then content PDF (use the cover we already generated)
            const merged = await EbookFormatConverterService.mergePDFBuffers([coverPdfBuffer, Buffer.from(content)]);
            content = merged;
            console.log(`✅ [PDF] PDF final mesclado: ${(content.length / 1024).toFixed(2)} KB`);
            console.log('========== FIM MESCLAGEM PDF ==========\n');
            mimeType = 'application/pdf';
            filename = `${this.sanitizeFilename(project.title)}.pdf`;
          }
        } catch (mergeErr) {
          console.warn('⚠️ Falha ao mesclar PDF da capa (continua com PDF original):', mergeErr?.message || mergeErr);
        }

      }

      if (!content) {
        throw new Error('Falha ao gerar conteúdo');
      }

      // Salvar arquivo
      const fileUrl = await this.saveExportedFile(content, filename, mimeType, userId);
      const fileSize = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : (content as Buffer).length;

      return {
        success: true,
        format,
        filename,
        fileUrl,
        fileSize,
        metadata: {
          projectTitle: project.title,
          sectionsCount: sections.length,
          wordCount: this.calculateTotalWords(sections),
          generatedAt: new Date()
        }
      };

    } catch (error) {
      console.error('❌ Erro no processamento da exportação:', error);
      throw error;
    }
  }

  /**
   * Gera conteúdo Markdown
   */
  private generateMarkdown(
    project: EbookProject,
    sections: EbookSection[],
    options: ExportOptions
  ): string {
    return MarkdownTemplate.generate(project, sections);
  }

  /**
   * Busca projeto do banco
   */
  private async getProject(projectId: string, userId: string): Promise<EbookProject> {
    const projects = await mongoDbService.get('ebookProjects', {
      _id: new ObjectId(projectId),
      userId: userId
    });

    if (!projects || projects.length === 0) {
      throw new Error('Projeto não encontrado ou acesso negado');
    }

    return projects[0] as EbookProject;
  }

  /**
   * Busca seções do projeto
   */
  private async getProjectSections(projectId: string): Promise<EbookSection[]> {
    const sections = await mongoDbService.get('ebookSections', { projectId });
    return sections as EbookSection[];
  }

  /**
   * Salva arquivo exportado no storage
   */
  private async saveExportedFile(
    content: string | Buffer,
    filename: string,
    mimeType: string,
    userId: string
  ): Promise<string> {
    const directory = `ebook-exports/${userId}`;
    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;

    // Criar arquivo temporário para upload
    const tempFile = {
      buffer,
      originalname: filename,
      mimetype: mimeType,
      size: buffer.length
    } as Express.Multer.File;

    const fileUrl = await uploadFile(tempFile, userId, directory);
    return fileUrl;
  }

  /**
   * Calcula custo estimado em créditos
   * ATUALIZADO: Inclui custo de geração de design para formatos visuais
   */
  private calculateCredits(format: string, sections: EbookSection[]): number {
    const wordCount = this.calculateTotalWords(sections);
    const imageCount = this.calculateTotalImages(sections);

    const baseCosts = {
      markdown: 1,      // Sem design
      pdf: 5,          // Com design
      epub: 3,         // Com design
      html: 2          // Com design
    };

    const baseCost = baseCosts[format as keyof typeof baseCosts] || 1;
    const wordCost = Math.ceil(wordCount / 1000) * 0.5; // 0.5 crédito por 1000 palavras
    const imageCost = imageCount * 0.2; // 0.2 crédito por imagem
    
    // NOVO: Custo de geração de design (apenas para formatos visuais)
    const designCost = (format !== 'markdown') ? 2 : 0; // 2 créditos para gerar design via LLM

    return Math.max(1, Math.ceil(baseCost + wordCost + imageCost + designCost));
  }

  /**
   * Calcula total de palavras
   */
  private calculateTotalWords(sections: EbookSection[]): number {
    return sections.reduce((total, section) => {
      if (section.content) {
        const words = section.content.trim().split(/\s+/).filter(word => word.length > 0);
        return total + words.length;
      }
      return total;
    }, 0);
  }

  /**
   * Calcula total de imagens
   */
  private calculateTotalImages(sections: EbookSection[]): number {
    return sections.reduce((total, section) => {
      return total + (section.images?.length || 0);
    }, 0);
  }

  /**
   * Sanitiza nome de arquivo
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens múltiplos
      .trim()
      .substring(0, 50); // Limita tamanho
  }

  /**
   * Calcula estimativa de custo para exportação
   * ATUALIZADO: Inclui custo de design
   */
  async estimateExportCost(projectId: string, userId: string, format: string) {
    // Buscar projeto e seções
    const project = await this.getProject(projectId, userId);
    const sections = await this.getProjectSections(projectId);

    // Validar conteúdo
    const validation = MarkdownTemplate.validateForExport(project, sections);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Calcular estatísticas
    const wordCount = this.calculateTotalWords(sections);
    const imageCount = this.calculateTotalImages(sections);
    const sectionsCount = sections.filter(s => s.content?.trim()).length;

    // Calcular custos
    const baseCosts: Record<string, number> = {
      markdown: 1,
      pdf: 5,
      epub: 3,
      html: 2
    };

    const baseCost = baseCosts[format] || 1;
    const contentCost = Math.ceil(wordCount / 1000) * 0.5;
    const imageCost = imageCount * 0.2;
    const designCost = (format !== 'markdown') ? 2 : 0; // Custo de geração de design
    const totalCredits = Math.max(1, Math.ceil(baseCost + contentCost + imageCost + designCost));

    return {
      totalCredits,
      baseCost,
      contentCost,
      imageCost,
      designCost,
      wordCount,
      imageCount,
      sectionsCount
    };
  }

  /**
   * [DEBUG TEMPORÁRIO] Gera HTML completo e salva na raiz para visualização
   */
  async debugGenerateHTML(projectId: string, userId: string, includeMetadata: boolean = true): Promise<string> {
    try {
      console.log('🔧 [DEBUG] Iniciando geração de HTML para projeto:', projectId);

      // Buscar dados
      const project = await this.getProject(projectId, userId);
      const sections = await this.getProjectSections(projectId);

      console.log('📚 Projeto encontrado:', project.title);
      console.log('📖 Seções encontradas:', sections.length);

      // Extrair amostras do conteúdo
      const contentSample = EbookContentSamplerService.extractSamples(sections);
      console.log('📊 Amostras extraídas:', JSON.stringify(contentSample.summary, null, 2));

      // Gerar design via LLM
      const designConcept = await EbookDesignGeneratorService.generateDesign(
        project,
        contentSample,
        userId
      );

      console.log('🎨 Design gerado:', {
        fonts: designConcept.fonts,
        needsBackgroundImage: designConcept.needsBackgroundImage,
        designNotes: designConcept.designNotes
      });

      // Montar HTML completo com design
      let html = EbookContentWrapperService.wrapContent(
        sections,
        designConcept,
        project.title
      );

      // Adicionar metadata (opcional)
      if (includeMetadata) {
        html = EbookContentWrapperService.addMetadata(html, {
          author: project.dna?.author,
          description: project.dna?.idea,
          keywords: project.dna?.keywords,
          language: 'pt-BR'
        });
      }

      // Otimizar para impressão
      html = EbookContentWrapperService.optimizeForPrint(html);

      // Salvar na raiz
      const filename = `ebook-debug-${this.sanitizeFilename(project.title)}.html`;
      fs.writeFileSync(filename, html, 'utf8');

      console.log(`✅ [DEBUG] HTML salvo como: ./${filename}`);
      console.log(`📊 Tamanho: ${(html.length / 1024).toFixed(2)} KB`);
      console.log(`🎨 Design notes: ${designConcept.designNotes || 'N/A'}`);

      return filename;

    } catch (error) {
      console.error('❌ [DEBUG] Erro na geração de HTML:', error);
      throw error;
    }
  }

  /**
   * Lista exportações recentes do usuário
   */
  async getUserExports(userId: string, limit: number = 10): Promise<any[]> {
    // Implementar busca de jobs de exportação completados
    // Por enquanto retorna array vazio
    return [];
  }

  /**
   * Remove arquivos exportados expirados (mais de 7 dias)
   */
  async cleanupExpiredExports(): Promise<void> {
    try {
      const expirationDays = 7;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - expirationDays);

      console.log(`🧹 Iniciando limpeza de exportações anteriores a ${expirationDate.toISOString()}`);

      // Buscar todos os jobs completados de exportação mais antigos que a data de expiração
      const { workQueue } = require('./jobs.service');
      const jobs = await workQueue.getJobs(['completed'], 0, 1000);

      let cleanedCount = 0;
      let errorCount = 0;

      for (const job of jobs) {
        // Verificar se é job de exportação
        if (job.data?.metadata?.app !== 'ebook-export') {
          continue;
        }

        // Verificar se está expirado
        const finishedDate = job.finishedOn ? new Date(job.finishedOn) : null;
        if (!finishedDate || finishedDate > expirationDate) {
          continue;
        }

        try {
          // Remover job do Redis
          await job.remove();
          cleanedCount++;

          // TODO: Remover arquivo do storage (MinIO/local)
          // Isso requer implementar função de remoção no local-bucket-upload.service
          // const fileUrl = job.returnvalue?.fileUrl;
          // if (fileUrl) {
          //   await deleteFile(fileUrl);
          // }

        } catch (err) {
          console.error(`Erro ao limpar job ${job.id}:`, err);
          errorCount++;
        }
      }

      console.log(`✅ Limpeza concluída: ${cleanedCount} jobs removidos, ${errorCount} erros`);

    } catch (error) {
      console.error('❌ Erro na limpeza de exportações:', error);
      throw error;
    }
  }

  /**
   * Agenda limpeza automática de exportações (deve ser chamado periodicamente)
   */
  static scheduleCleanup(): void {
    const service = new EbookExportService();
    
    // Executar a cada 24 horas
    const intervalHours = 24;
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Executar imediatamente na inicialização
    service.cleanupExpiredExports().catch(err => {
      console.error('Erro na limpeza inicial:', err);
    });

    // Agendar execuções periódicas
    setInterval(() => {
      service.cleanupExpiredExports().catch(err => {
        console.error('Erro na limpeza agendada:', err);
      });
    }, intervalMs);

    console.log(`📅 Limpeza automática de exportações agendada (a cada ${intervalHours}h)`);
  }

  /**
   * Retorna dimensões da página em mm com base no tamanho e orientação
   */
  private getPageDimensions(size: string, orientation: string = 'portrait'): { width: number; height: number } {
    // Dimensões padrão em mm (portrait)
    const dimensions: Record<string, { width: number; height: number }> = {
      'A3': { width: 297, height: 420 },
      'A4': { width: 210, height: 297 },
      'A5': { width: 148, height: 210 },
      'Letter': { width: 216, height: 279 }, // 8.5" x 11"
      'Legal': { width: 216, height: 356 },  // 8.5" x 14"
    };

    const dims = dimensions[size] || dimensions['A4']; // fallback para A4
    
    // Se landscape, inverter dimensões
    if (orientation === 'landscape') {
      return { width: dims.height, height: dims.width };
    }
    
    return dims;
  }

  /**
   * Gera bloco CSS com variáveis para layout customizado
   */
  private generateLayoutVariables(options: ExportOptions): string {

    const layout = options.layout;

    // Valores padrão (compatíveis com design atual)
    const defaults = {
      pageSize: 'A4',
      pageMargins: {
        standard: { top: '1.5cm', right: '1.5cm', bottom: '1.5cm', left: '1.5cm' },
        first: { top: '0', right: '0', bottom: '0', left: '0' }
      },
      contentPadding: { top: '0', right: '2rem', bottom: '0', left: '2rem' }
    };

    // Aplicar customizações com fallbacks
    const pageSize = layout?.page?.size || defaults.pageSize;
    const pageMargins = {
      standard: layout?.page?.margins?.standard || defaults.pageMargins.standard,
      first: layout?.page?.margins?.first || defaults.pageMargins.first
    };
    const contentPadding = layout?.content?.padding || defaults.contentPadding;

    // Construir bloco :root com variáveis
    return `
  :root {
    /* Page Size */
    --page-size: ${pageSize};

    /* Standard Page Margins */
    --page-standard-margin-top: ${pageMargins.standard.top};
    --page-standard-margin-right: ${pageMargins.standard.right};
    --page-standard-margin-bottom: ${pageMargins.standard.bottom};
    --page-standard-margin-left: ${pageMargins.standard.left};

    /* First Page Margins */
    --page-first-margin-top: ${pageMargins.first.top};
    --page-first-margin-right: ${pageMargins.first.right};
    --page-first-margin-bottom: ${pageMargins.first.bottom};
    --page-first-margin-left: ${pageMargins.first.left};

    /* Content Padding */
    --content-padding-top: ${contentPadding.top};
    --content-padding-right: ${contentPadding.right};
    --content-padding-bottom: ${contentPadding.bottom};
    --content-padding-left: ${contentPadding.left};
  }
  `;
  }
}

/**
 * Interfaces
 */
export interface ExportLayoutOptions {
  page?: {
    size?: string; // 'A4', 'A5', 'Letter', etc.
    margins?: {
      // Margens padrão para todas as páginas
      standard?: { top: string; right: string; bottom: string; left: string };
      // Margens para primeira página (capa) - geralmente 0
      first?: { top: string; right: string; bottom: string; left: string };
    };
  };
  content?: {
    padding?: { top: string; right: string; bottom: string; left: string };
  };
}

export interface ExportPDFOptions {
  header?: {
    enabled?: boolean;
    content?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    padding?: string;
    margin?: string;
    borderTop?: string;
    borderBottom?: string;
    borderLeft?: string;
    borderRight?: string;
  };
  footer?: {
    enabled?: boolean;
    content?: string;
    showPageNumber?: boolean;
    pageNumberFormat?: string; // ex: "Página {pageNumber} de {totalPages}"
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    padding?: string;
    margin?: string;
    borderTop?: string;
    borderBottom?: string;
    borderLeft?: string;
    borderRight?: string;
  };
}

export interface ExportOptions {
  includeImages?: boolean;
  includeToc?: boolean;
  includeCover?: boolean;
  customTitle?: string;
  author?: string;
  language?: string;
  layout?: ExportLayoutOptions;
  pdf?: ExportPDFOptions;
}
