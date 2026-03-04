/**
 * Serviço para converter HTML em diferentes formatos de ebook
 * Suporta: PDF (Puppeteer), EPUB, DOCX, HTML
 */

import axios from 'axios';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import FormData from 'form-data';
import { EbookProject } from '../templates/ebook/markdown-template';
import { DOCXTemplate } from '../templates/ebook/docx-template';
import { AdvancedDOCXTemplate } from '../templates/ebook/advanced-docx-template';

export interface ConversionResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

export interface PDFHeaderFooterStyle {
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
}

export interface PDFHeaderFooterConfig {
  enabled: boolean;
  content?: string; // HTML content or template string
  style?: PDFHeaderFooterStyle;
  showPageNumber?: boolean; // Para rodapé
  pageNumberFormat?: string; // ex: "Página {pageNumber} de {totalPages}"
}

export interface PDFPageMargins {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  // Suporte para estrutura com margens diferentes para primeira página
  standard?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  first?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export interface PDFPageConfig {
  size?: 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal';
  margins?: PDFPageMargins;
  orientation?: 'portrait' | 'landscape';
}

export interface PDFContentConfig {
  padding?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export interface PDFExportOptions {
  header?: PDFHeaderFooterConfig;
  footer?: PDFHeaderFooterConfig;
  includeCover?: boolean;
  page?: PDFPageConfig;
  content?: PDFContentConfig;
  // Ajustes avançados de compatibilidade
  advanced?: {
    // Quando true, respeita @page do CSS (paridade com testes existentes)
    preferCSSPageSize?: boolean;
    // Quando true, não injeta CSS de normalização (evita alterar layout)
    disablePrintOverrides?: boolean;
  };
}

export class EbookFormatConverterService {
  /**
   * Converte HTML para PDF usando Puppeteer
   */
  static async toPDF(html: string, projectTitle: string, options: PDFExportOptions): Promise<Buffer> {
    let browser;
    
    try {
      // Lançar navegador headless com configurações otimizadas
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--font-render-hinting=medium'
        ]
      });


      // CSS minimalista para normalização básica (desativável via options.advanced.disablePrintOverrides)
      if (!options?.advanced?.disablePrintOverrides) {
        const printOverrides = `
          /* Injected by EbookFormatConverterService: basic normalization only */
          html, body { height: auto !important; margin: 0 !important; padding: 0 !important; }
          * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; }
          .book, .chapter { height: auto !important; }
          img.cover-print { width: 210mm !important; height: 297mm !important; object-fit: fill !important; }
        `;

        if (html.includes('</style>')) {
          html = html.replace('</style>', `${printOverrides}\n</style>`);
        } else if (html.includes('<head>')) {
          html = html.replace('<head>', `<head><style>${printOverrides}</style>`);
        } else {
          html = `<style>${printOverrides}</style>` + html;
        }
      }

      const page = await browser.newPage();

      // Carregar conteúdo e aguardar carregamento de rede razoável
      await page.setContent(html, {
        waitUntil: ['domcontentloaded', 'networkidle2'],
        timeout: 60000 // 60 segundos timeout
      });

      // Aguardar adicional para fontes externas e scripts aplicarem estilos
      await page.waitForTimeout(4000);

      // Garantir que fontes foram carregadas (evita renderizar sem fontes causando quebras)
      try {
        await page.evaluate(() => (document as any).fonts ? (document as any).fonts.ready : Promise.resolve());
      } catch (err) {
        // não fatal
      }

      // Aguardar imagens carregarem
      try {
        await page.evaluate(() => Promise.all(Array.from(document.images).map((img: HTMLImageElement) => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => { img.addEventListener('load', res); img.addEventListener('error', res); });
        })));
      } catch (err) {
        // não fatal
      }

      // Forçar media type 'print' para aplicar estilos de impressão (@media print)
      try {
        await page.emulateMediaType('print');
      } catch (err) {
        // ignore se não suportado
      }

      // After loading, detect if the body has no renderable content (height/text length zero)
      // Some templates set viewport-based CSS that can collapse the body when rendered headlessly.
      try {
        const metrics = await page.evaluate(() => {
          return {
            bodyTextLength: document.body ? document.body.innerText.length : 0,
            bodyClientHeight: document.body ? document.body.clientHeight : 0,
            htmlClientHeight: document.documentElement ? document.documentElement.clientHeight : 0
          };
        });

        if ((metrics.bodyTextLength || 0) === 0 || (metrics.bodyClientHeight || 0) === 0) {
          console.warn('⚠️ [PDF-FALLBACK] Detected zero-height or empty body in rendered HTML, applying simplified fallback.');

          // Try to extract the main .book div from the original HTML and re-render a minimal wrapper
          try {
            const originalHtml = html;
            // Robustly extract the full <div class="book"> ... </div> including nested divs
            const extractBookDiv = (src: string): string | null => {
              const classRegex = /<div[^>]*class=["'][^"']*\bbook\b[^"']*["'][^>]*>/i;
              const startMatch = src.match(classRegex);
              if (!startMatch || !startMatch.index) return null;
              const startIndex = startMatch.index;
              // Find the position of the '>' that closes the start tag
              const tagClose = src.indexOf('>', startIndex);
              if (tagClose === -1) return null;
              let idx = tagClose + 1;
              let depth = 1; // we are inside the opening <div class="book">
              while (idx < src.length) {
                const nextOpen = src.indexOf('<div', idx);
                const nextClose = src.indexOf('</div>', idx);
                if (nextClose === -1) break;
                if (nextOpen !== -1 && nextOpen < nextClose) {
                  depth++;
                  idx = nextOpen + 4;
                } else {
                  depth--;
                  idx = nextClose + 6;
                }
                if (depth === 0) {
                  const bookHtml = src.slice(startIndex, idx);
                  return bookHtml;
                }
              }
              return null;
            };

            const bookDiv = extractBookDiv(originalHtml);
            if (bookDiv) {
              // Try to preserve original <head> content (styles, links) so design is kept
              const headMatch = originalHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
              const originalHeadContent = headMatch ? headMatch[1] : '';
              const minimalCss = `@page{size:A4;margin:15mm}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#222} .content{padding:0 16px;max-width:100%;margin:0 auto} .chapter { page-break-after: always; }`;
              const combinedHead = `<meta charset="utf-8">${originalHeadContent}<style>${minimalCss}</style>`;
              const simplified = `<!doctype html><html><head>${combinedHead}</head><body>${bookDiv}</body></html>`;

              // Save fallback HTML for debugging so you can inspect what was rendered
              try {
                const fs = require('fs');
                const debugFile = `ebook-debug-fallback-${Date.now()}.html`;
                fs.writeFileSync(debugFile, simplified, 'utf8');
                console.log(`🔧 [DEBUG] Fallback HTML salvo como: ./${debugFile}`);
              } catch (writeErr) {
                // non-fatal
              }

              await page.setContent(simplified, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: 60000 });
              await page.waitForTimeout(2000);
              try {
                await page.evaluate(() => (document as any).fonts ? (document as any).fonts.ready : Promise.resolve());
              } catch (e) {}
            }
          } catch (fbErr) {
            console.warn('⚠️ [PDF-FALLBACK] Failed to apply simplified fallback:', fbErr);
          }
        }
      } catch (metricErr) {
        // non-fatal
      }

      // Configurar viewport para A4
      await page.setViewport({
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
        deviceScaleFactor: 1
      });

      // DEBUG: Log das opções recebidas
      console.log('🔍 [DEBUG] toPDF options recebidas:', JSON.stringify(options, null, 2));
      console.log('🔍 [DEBUG] header.enabled:', options.header?.enabled);
      console.log('🔍 [DEBUG] footer.enabled:', options.footer?.enabled);
      
      // Configurações padrão
      const defaultPageSize = 'A4' as const;
      const defaultMargins = {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      };

      // Aplicar configurações fornecidas ou defaults
      const pageSize = options.page?.size || defaultPageSize;
      const pageOrientation = options.page?.orientation || 'portrait';

      // Gerar PDF com configurações otimizadas
      const pdfOptions: any = {
        format: pageSize,
        printBackground: true,
        preferCSSPageSize: options?.advanced?.preferCSSPageSize === true ? true : false,
        scale: 1.0,
        landscape: pageOrientation === 'landscape'
      };

      // Verificar se header ou footer estão explicitamente habilitados
      const hasHeader = options.header?.enabled === true;
      const hasFooter = options.footer?.enabled === true;

      // IMPORTANTE: Só ativar displayHeaderFooter se pelo menos um estiver habilitado
      if (hasHeader || hasFooter) {
        console.log('✅ [DEBUG] Ativando sistema de header/footer');
        
        pdfOptions.displayHeaderFooter = true;

        // Configurar header
        if (hasHeader) {
          const headerStyle = options.header.style || {};
          const headerContent = options.header.content || projectTitle.replace(/[<>"']/g, '');
          const styleStr = [
            headerStyle.fontFamily ? `font-family: ${headerStyle.fontFamily};` : 'font-family: Arial, sans-serif;',
            headerStyle.fontSize ? `font-size: ${headerStyle.fontSize};` : 'font-size: 10pt;',
            headerStyle.fontWeight ? `font-weight: ${headerStyle.fontWeight};` : '',
            headerStyle.color ? `color: ${headerStyle.color};` : 'color: #333;',
            headerStyle.backgroundColor ? `background-color: ${headerStyle.backgroundColor};` : '',
            headerStyle.textAlign ? `text-align: ${headerStyle.textAlign};` : 'text-align: center;',
            headerStyle.padding ? `padding: ${headerStyle.padding};` : 'padding: 5px;',
            headerStyle.margin ? `margin: ${headerStyle.margin};` : 'margin: 0;',
            headerStyle.borderTop ? `border-top: ${headerStyle.borderTop};` : '',
            headerStyle.borderBottom ? `border-bottom: ${headerStyle.borderBottom};` : '',
            headerStyle.borderLeft ? `border-left: ${headerStyle.borderLeft};` : '',
            headerStyle.borderRight ? `border-right: ${headerStyle.borderRight};` : ''
          ].filter(s => s).join(' ');
          pdfOptions.headerTemplate = `<div style="${styleStr}width: 100%;">${headerContent}</div>`;
        } else {
          // Template vazio obrigatório quando displayHeaderFooter: true
          pdfOptions.headerTemplate = '<div></div>';
        }

        // Configurar footer
        if (hasFooter) {
          const footerStyle = options.footer.style || {};
          let footerContent = options.footer.content || '';
          if (options.footer.showPageNumber) {
            const pageNumberFormat = options.footer.pageNumberFormat || '{pageNumber}';
            const pageNumberHtml = pageNumberFormat
              .replace('{pageNumber}', '<span class="pageNumber"></span>')
              .replace('{totalPages}', '<span class="totalPages"></span>');
            footerContent = footerContent ? `${footerContent} ${pageNumberHtml}` : pageNumberHtml;
          }
          const styleStr = [
            footerStyle.fontFamily ? `font-family: ${footerStyle.fontFamily};` : 'font-family: Arial, sans-serif;',
            footerStyle.fontSize ? `font-size: ${footerStyle.fontSize};` : 'font-size: 10pt;',
            footerStyle.fontWeight ? `font-weight: ${footerStyle.fontWeight};` : '',
            footerStyle.color ? `color: ${footerStyle.color};` : 'color: #333;',
            footerStyle.backgroundColor ? `background-color: ${footerStyle.backgroundColor};` : '',
            footerStyle.textAlign ? `text-align: ${footerStyle.textAlign};` : 'text-align: center;',
            footerStyle.padding ? `padding: ${footerStyle.padding};` : 'padding: 5px;',
            footerStyle.margin ? `margin: ${footerStyle.margin};` : 'margin: 0;',
            footerStyle.borderTop ? `border-top: ${footerStyle.borderTop};` : '',
            footerStyle.borderBottom ? `border-bottom: ${footerStyle.borderBottom};` : '',
            footerStyle.borderLeft ? `border-left: ${footerStyle.borderLeft};` : '',
            footerStyle.borderRight ? `border-right: ${footerStyle.borderRight};` : ''
          ].filter(s => s).join(' ');
          pdfOptions.footerTemplate = `<div style="${styleStr}width: 100%;">${footerContent}</div>`;
        } else {
          // Template vazio obrigatório quando displayHeaderFooter: true
          pdfOptions.footerTemplate = '<div></div>';
        }

        // Ajustar margens com base no que está habilitado e nas opções fornecidas
        const customMargins = options.page?.margins || {};
        
        // Suporte para estrutura de margens com 'standard' e 'first'
        const margins = customMargins.standard || customMargins;
        
        pdfOptions.margin = {
          top: hasHeader ? (margins.top || '25mm') : (margins.top || '15mm'),
          right: margins.right || '15mm',
          bottom: hasFooter ? (margins.bottom || '25mm') : (margins.bottom || '15mm'),
          left: margins.left || '15mm'
        };
      } else {
        // Sem header/footer: não ativar displayHeaderFooter e usar margens customizadas ou padrão
        console.log('ℹ️ [DEBUG] Header e footer desabilitados - usando configuração padrão');
        pdfOptions.displayHeaderFooter = false;
        const customMargins = options.page?.margins || {};
        
        // Suporte para estrutura de margens com 'standard' e 'first'
        const margins = customMargins.standard || customMargins;
        
        pdfOptions.margin = {
          top: margins.top || defaultMargins.top,
          right: margins.right || defaultMargins.right,
          bottom: margins.bottom || defaultMargins.bottom,
          left: margins.left || defaultMargins.left
        };
      }

      // Log das margens aplicadas
      console.log('📐 [DEBUG] Margens aplicadas ao PDF:', JSON.stringify(pdfOptions.margin, null, 2));

      const pdfBuffer = await page.pdf(pdfOptions);

      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      throw new Error(`Falha na geração do PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Merge multiple PDF buffers into a single PDF buffer (preserves page order)
   */
  static async mergePDFBuffers(buffers: Buffer[]): Promise<Buffer> {
    try {
      const mergedPdf = await PDFDocument.create();

      for (const buf of buffers) {
        const srcPdf = await PDFDocument.load(buf as Uint8Array);
        const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save();
      return Buffer.from(mergedBytes);
    } catch (err) {
      console.error('❌ Erro ao mesclar PDFs:', err);
      throw err;
    }
  }

  /**
   * Converte HTML para EPUB
   * Nota: EPUB é basicamente HTML + metadados em formato ZIP
   */
  static async toEPUB(
    html: string,
    project: EbookProject,
    sections: any[]
  ): Promise<Buffer> {
    try {
      const Epub = require('epub-gen');
      const os = require('os');
      const fs = require('fs');

      const tmpFile = path.join(os.tmpdir(), `preview-${Date.now()}-${Math.random().toString(36).slice(2)}.epub`);

      // Extrair CSS do HTML para aplicar no EPUB
      const cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const css = cssMatch ? cssMatch[1] : '';

      const options = {
        title: project.title,
        author: project.dna?.author || 'Desconhecido',
        publisher: project.metadata?.publisher || 'Self-Published',
        description: project.dna?.idea || '',
        language: project.metadata?.language || 'pt',
        css: css, // Aplicar CSS extraído do HTML
        content: sections.map(section => ({
          title: section.title || 'Sem título',
          data: section.content || ''
        })),
        output: tmpFile
      };

      await new Epub(options).promise;
      const buffer = fs.readFileSync(tmpFile);
      fs.unlinkSync(tmpFile);
      return buffer;

    } catch (error) {
      console.error('❌ Erro ao gerar EPUB (usando fallback):', error);
      return Buffer.from(html, 'utf-8');
    }
  }

  /**
   * Retorna HTML como está (para formato HTML)
   */
  static toHTML(html: string): Buffer {
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Converte baseado no formato solicitado
   */
  static async convert(
    format: 'pdf' | 'epub' | 'docx' | 'html',
    html: string,
    project: EbookProject,
    sections: any[],
    options?: any
  ): Promise<ConversionResult> {
    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    console.log('OPTIONS EXPORTATION: ', JSON.stringify(options, null, 5));

    switch (format) {
      case 'pdf':
        buffer = await this.toPDF(html, project.title, options || {});
        mimeType = 'application/pdf';
        extension = 'pdf';
        break;

      case 'epub':
        buffer = await this.toEPUB(html, project, sections);
        mimeType = 'application/epub+zip';
        extension = 'epub';
        break;

      case 'docx':
        const pdfBuffer = await this.toPDF(html, project.title, options || {});
        buffer = await this.convertPdfBufferToDocx(pdfBuffer, this.getDocxConverterBaseUrl());
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'docx';
        break;

      case 'html':
        buffer = this.toHTML(html);
        mimeType = 'text/html';
        extension = 'html';
        break;

      default:
        throw new Error(`Formato não suportado: ${format}`);
    }

    return {
      buffer,
      mimeType,
      extension
    };
  }

  private static getDocxConverterBaseUrl(): string {
    const base = process.env.DOCX_CONVERTER_URL || 'http://localhost:8000';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }

  private static async ensureDocxConverterHealthy(baseUrl: string): Promise<void> {
    try {
      const health = await axios.get(`${baseUrl}/health`, { timeout: 4000 });
      if (health.status < 200 || health.status >= 300) {
        throw new Error(`Status HTTP ${health.status}`);
      }
      console.log(`✅ Serviço de conversão DOCX saudável: ${baseUrl}`);
    } catch (error) {
      const msg = `Serviço de conversão DOCX indisponível em ${baseUrl}/health - Verifique se o servidor Python está rodando. Erro: ${error.message || error}`;
      console.error(`❌ ${msg}`);
      throw new Error(msg);
    }
  }

  private static async convertPdfBufferToDocx(pdfBuffer: Buffer, baseUrl: string): Promise<Buffer> {
    try {
      console.log(`📤 Enviando PDF (${(pdfBuffer.length / 1024).toFixed(2)} KB) para ${baseUrl}/convert...`);
      const formData = new FormData();
      formData.append('file', pdfBuffer, {
        filename: 'input.pdf',
        contentType: 'application/pdf'
      });

      const startTime = Date.now();
      const response = await axios.post(`${baseUrl}/convert`, formData, {
        headers: {
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer',
        timeout: 120000
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (!response.data) {
        throw new Error('Resposta vazia do conversor DOCX');
      }

      console.log(`✅ DOCX recebido (${(response.data.length / 1024).toFixed(2)} KB) em ${duration}s`);
      return Buffer.from(response.data);
    } catch (error) {
      const msg = `Falha na conversão PDF→DOCX via ${baseUrl}/convert: ${error.message || error}`;
      console.error(`❌ ${msg}`);
      if (error.response) {
        console.error(`   Status HTTP: ${error.response.status}`);
        console.error(`   Headers: ${JSON.stringify(error.response.headers)}`);
      }
      throw new Error(msg);
    }
  }

  // Exposto para outros serviços: converte um PDF em memória para DOCX via serviço Python
  static async pdfToDOCX(pdfBuffer: Buffer): Promise<Buffer> {
    const converterBaseUrl = this.getDocxConverterBaseUrl();
    await this.ensureDocxConverterHealthy(converterBaseUrl);
    const buf = await this.convertPdfBufferToDocx(pdfBuffer, converterBaseUrl);
    return Buffer.from(buf);
  }

  /**
   * Valida se o formato é suportado
   */
  static isSupportedFormat(format: string): boolean {
    return ['pdf', 'epub', 'docx', 'html', 'markdown'].includes(format.toLowerCase());
  }


  /**
   * Retorna informações sobre o formato
   */
  static getFormatInfo(format: string): {
    name: string;
    mimeType: string;
    extension: string;
    description: string;
  } {
    const formats: Record<string, any> = {
      pdf: {
        name: 'PDF',
        mimeType: 'application/pdf',
        extension: 'pdf',
        description: 'Portable Document Format - ideal para impressão e leitura universal'
      },
      epub: {
        name: 'EPUB',
        mimeType: 'application/epub+zip',
        extension: 'epub',
        description: 'Electronic Publication - formato padrão para e-readers'
      },
      docx: {
        name: 'DOCX',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
        description: 'Microsoft Word Document - editável e amplamente compatível'
      },
      html: {
        name: 'HTML',
        mimeType: 'text/html',
        extension: 'html',
        description: 'HyperText Markup Language - visualizável em qualquer navegador'
      },
      markdown: {
        name: 'Markdown',
        mimeType: 'text/markdown',
        extension: 'md',
        description: 'Markdown - formato texto simples e editável'
      }
    };

    return formats[format.toLowerCase()] || formats.pdf;
  }
}
