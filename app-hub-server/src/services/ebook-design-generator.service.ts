/**
 * Serviço para geração de design CSS via LLM
 * Cria design personalizado baseado no conteúdo real do ebook
 */

import { EbookProject } from '../templates/ebook/markdown-template';
import { ContentSample } from './ebook-content-sampler.service';
import { EbookDesignPrompts } from '../prompts/ebook-design.prompts';
import { RouterApiOpenAI } from './openrouter.service';
import { extractValidJson } from './extract-valid-json.service';

export interface DesignConcept {
  globalCSS: string;
  containerStructure: string;
  wrapperClasses: {
    book: string;
    chapter: string;
    content: string;
  };
  fonts: {
    primary: string;
    headings: string;
    code: string;
  };
  needsBackgroundImage: boolean;
  backgroundImagePrompt: string | null;
  designNotes: string;
}

export class EbookDesignGeneratorService {
  /**
   * Gera conceito de design CSS baseado no projeto e amostras de conteúdo
   */
  static async generateDesign(
    project: EbookProject,
    contentSample: ContentSample,
    userId: string
  ): Promise<DesignConcept> {
    try {
      // Criar prompt completo
      const prompt = EbookDesignPrompts.generateDesignPrompt(project, contentSample);

      // Chamar LLM para gerar design - USANDO MELHOR MODELO DISPONÍVEL
      const openai = new RouterApiOpenAI();
      const response = await openai.createCompletion({
        model: 'anthropic/claude-sonnet-4.5',//'google/gemini-2.5-pro', // Modelo avançado para design profissional
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8, // Mais criatividade para design
        max_tokens: 12000, // Mais tokens para CSS complexo
        toolName: 'ebook-design-generation',
        metadata: {
          userId,
          app: 'ebook-design-generation',
          projectId: project._id,
          model: 'google/gemini-2.5-pro'
        }
      });

      const content = response.choices[0]?.message?.content || '';

      // Extrair JSON da resposta
      const designData = extractValidJson(content);

      if (!designData || !designData.globalCSS) {
        throw new Error('LLM não retornou design válido');
      }

      // Validar e retornar design
      return this.validateAndNormalize(designData);

    } catch (error) {
      console.error('❌ Erro ao gerar design:', error);
      
      // Fallback: retornar design básico
      return this.getFallbackDesign(project);
    }
  }

  /**
   * Valida e normaliza o design retornado pelo LLM
   */
  private static validateAndNormalize(designData: any): DesignConcept {
    return {
      globalCSS: designData.globalCSS || this.getDefaultCSS(),
      containerStructure: designData.containerStructure || '<div class="book"><div class="chapter"><div class="content">{{CONTENT}}</div></div></div>',
      wrapperClasses: {
        book: designData.wrapperClasses?.book || 'book',
        chapter: designData.wrapperClasses?.chapter || 'chapter',
        content: designData.wrapperClasses?.content || 'content'
      },
      fonts: {
        primary: designData.fonts?.primary || 'Georgia, serif',
        headings: designData.fonts?.headings || 'Georgia, serif',
        code: designData.fonts?.code || 'Courier New, monospace'
      },
      needsBackgroundImage: designData.needsBackgroundImage || false,
      backgroundImagePrompt: designData.backgroundImagePrompt || null,
      designNotes: designData.designNotes || 'Design gerado automaticamente'
    };
  }

  /**
   * Design de fallback caso o LLM falhe
   */
  private static getFallbackDesign(project: EbookProject): DesignConcept {
    const genre = project.dna?.genre?.toLowerCase() || '';
    
    // Escolher estilo base pelo gênero
    let css = this.getDefaultCSS();
    
    if (genre.includes('técnico') || genre.includes('acadêmico')) {
      css = this.getTechnicalCSS();
    } else if (genre.includes('romance') || genre.includes('poesia')) {
      css = this.getRomanticCSS();
    } else if (genre.includes('infantil')) {
      css = this.getChildrenCSS();
    }

    return {
      globalCSS: css,
      containerStructure: '<div class="book"><div class="chapter"><div class="content">{{CONTENT}}</div></div></div>',
      wrapperClasses: {
        book: 'book',
        chapter: 'chapter',
        content: 'content'
      },
      fonts: {
        primary: 'Georgia, serif',
        headings: 'Georgia, serif',
        code: 'Courier New, monospace'
      },
      needsBackgroundImage: false,
      backgroundImagePrompt: null,
      designNotes: 'Design fallback aplicado devido a erro na geração'
    };
  }

  /**
   * CSS padrão genérico COM CONTROLE AVANÇADO DE PÁGINAS
   */
  private static getDefaultCSS(): string {
    return `
/* ============================================
   CONFIGURAÇÃO DE PÁGINAS PARA IMPRESSÃO
   Amazon KDP: 0.5" a 1" (1.27-2.54cm)
   ============================================ */
@page {
  size: var(--page-size);
  margin: var(--page-standard-margin);
}

@page :first {
  margin: var(--page-first-margin) !important; /* Capa sem margens */
}

/* ============================================
   RESET E BASE
   ============================================ */
* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
}

html { 
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.6;
  color: #333;
  background: #fff;
  hyphens: auto;
  -webkit-hyphens: auto;
  -ms-hyphens: auto;
}

/* ============================================
   CAPA - 100% LARGURA E ALTURA
   ============================================ */
[data-section-type="cover"] {
  page-break-after: always;
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw;
  height: 100vh;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

[data-section-type="cover"] img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
}

[data-section-type="cover"] .content {
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
}

/* ============================================
   QUEBRAS DE PÁGINA PARA SEÇÕES
   ============================================ */
[data-section-type="chapter"],
[data-section-type="introduction"],
[data-section-type="conclusion"],
[data-section-type="foreword"],
[data-section-type="preface"],
[data-section-type="appendix"],
[data-section-type="bibliography"] {
  page-break-before: always;
  page: chapter;
}

[data-section-type="title-page"],
[data-section-type="copyright"],
[data-section-type="dedication"],
[data-section-type="table-of-contents"] {
  page-break-after: always;
}

/* ============================================
   TIPOGRAFIA
   ============================================ */
h1, h2, h3, h4, h5, h6 {
  font-family: Georgia, 'Times New Roman', serif;
  font-weight: bold;
  margin-top: 2em;
  margin-bottom: 0.5em;
  line-height: 1.2;
  color: #222;
  page-break-after: avoid;
  page-break-inside: avoid;
}

h1 { 
  font-size: 2.2em; 
  text-align: center; 
  margin-bottom: 1em;
  margin-top: 0;
}

h2 { 
  font-size: 1.8em; 
  border-bottom: 2px solid #ddd; 
  padding-bottom: 0.3em; 
}

h3 { font-size: 1.4em; }
h4 { font-size: 1.2em; }
h5 { font-size: 1.05em; }
h6 { font-size: 0.95em; }

p {
  margin: 1em 0;
  text-align: justify;
  text-indent: 2em;
  orphans: 3;
  widows: 3;
}

/* Primeiro parágrafo sem indentação */
h1 + p, h2 + p, h3 + p, h4 + p,
.chapter > .content > p:first-of-type { 
  text-indent: 0; 
}

/* Drop cap para primeira letra de capítulos */
[data-section-type="chapter"] .content > p:first-of-type::first-letter {
  font-size: 3.5em;
  line-height: 0.85;
  float: left;
  margin: 0.1em 0.15em 0 0;
  font-weight: bold;
  font-family: Georgia, serif;
  color: #222;
}

/* ============================================
   ÊNFASE E FORMATAÇÃO
   ============================================ */
strong, b { font-weight: bold; }
em, i { font-style: italic; }
u { text-decoration: underline; }
s, del { text-decoration: line-through; }
mark { background-color: #fff3cd; padding: 0.1em 0.2em; }
small { font-size: 0.85em; }
sub { vertical-align: sub; font-size: 0.75em; }
sup { vertical-align: super; font-size: 0.75em; }

/* ============================================
   LISTAS
   ============================================ */
ul, ol {
  margin: 1em 0;
  padding-left: 2em;
  page-break-inside: avoid;
}

li { 
  margin: 0.5em 0;
  line-height: 1.5;
}

ul ul, ol ol, ul ol, ol ul {
  margin: 0.5em 0;
}

/* ============================================
   CITAÇÕES
   ============================================ */
blockquote {
  margin: 1.5em 2em;
  padding: 1em 1.5em;
  border-left: 4px solid #999;
  background: #f9f9f9;
  font-style: italic;
  page-break-inside: avoid;
}

blockquote p:first-child {
  text-indent: 0;
}

blockquote footer,
blockquote cite {
  display: block;
  margin-top: 0.5em;
  font-size: 0.9em;
  text-align: right;
  font-style: normal;
}

/* ============================================
   CÓDIGO
   ============================================ */
code {
  font-family: 'Courier New', 'Consolas', monospace;
  background: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  border: 1px solid #e0e0e0;
}

pre {
  margin: 1em 0;
  padding: 1em;
  background: #f4f4f4;
  border-radius: 5px;
  overflow-x: auto;
  page-break-inside: avoid;
  border: 1px solid #ddd;
}

pre code {
  background: none;
  padding: 0;
  border: none;
}

/* ============================================
   TABELAS
   ============================================ */
table {
  width: 100%;
  margin: 1.5em 0;
  border-collapse: collapse;
  page-break-inside: avoid;
}

th, td {
  padding: 0.75em;
  border: 1px solid #ddd;
  text-align: left;
  vertical-align: top;
}

th {
  background: #f0f0f0;
  font-weight: bold;
}

tr:nth-child(even) {
  background: #f9f9f9;
}

caption {
  margin-bottom: 0.5em;
  font-weight: bold;
  text-align: left;
}

/* ============================================
   IMAGENS E FIGURAS
   ============================================ */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5em auto;
}

figure {
  margin: 1.5em 0;
  text-align: center;
  page-break-inside: avoid;
}

figure img {
  margin: 0 auto 0.5em;
}

figcaption {
  font-style: italic;
  font-size: 0.9em;
  color: #666;
  margin-top: 0.5em;
}

/* ============================================
   LINKS
   ============================================ */
a {
  color: #0066cc;
  text-decoration: none;
}

a:hover { 
  text-decoration: underline; 
}

/* ============================================
   LINHA HORIZONTAL
   ============================================ */
hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
  page-break-after: avoid;
}

/* ============================================
   CONTAINERS DO LIVRO
   ============================================ */
.book {
  background: white;
}

.chapter {
  margin-bottom: 3em;
}

.content {
  padding: var(--content-padding-top) var(--content-padding-right) var(--content-padding-bottom) var(--content-padding-left);
  max-width: 800px;
  margin: 0 auto;
}

[data-section-type="cover"] .content {
  padding: 0;
  max-width: none;
}

/* ============================================
   ESTILOS DE IMPRESSÃO
   ============================================ */
@media print {
  html {
    font-size: 11pt;
  }
  
  body {
    max-width: 100%;
    padding: 0;
    margin: 0;
  }
  
  /* MANTÉM padding do conteúdo - NÃO remove */
  .content {
    max-width: 100%;
  }
  
  /* Capa explicitamente sem padding */
  [data-section-type="cover"] {
    page: :first;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  [data-section-type="cover"] .content {
    padding: 0 !important;
    margin: 0 !important;
  }
  
  /* Reduz fonte no print para evitar cortes */
  h1 { font-size: 2.2em; }
  h2 { font-size: 1.8em; }
  h3 { font-size: 1.4em; }
  h4 { font-size: 1.2em; }
  
  /* Quebras de página */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  
  p, li {
    orphans: 3;
    widows: 3;
  }
  
  blockquote, figure, table, pre {
    page-break-inside: avoid;
  }
  
  img {
    page-break-inside: avoid;
    page-break-after: avoid;
  }
  
  /* Links em impressão */
  a {
    color: #000;
    text-decoration: none;
  }
  
  a[href^="http"]:after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    font-style: italic;
  }
  
  /* Ocultar elementos não necessários na impressão */
  nav, .no-print {
    display: none;
  }
}

/* ============================================
   ESTILOS DE TELA
   ============================================ */
@media screen {
  body {
    padding: 2rem;
    max-width: 900px;
    margin: 0 auto;
  }
  
  [data-section-type="cover"] {
    min-height: 100vh;
  }
}
`;
  }

  /**
   * CSS para conteúdo técnico/acadêmico
   */
  private static getTechnicalCSS(): string {
    return this.getDefaultCSS().replace(
      'body {',
      `body {
  font-family: 'Times New Roman', Times, serif;`
    ).replace(
      'h1, h2, h3, h4, h5, h6 {',
      `h1, h2, h3, h4, h5, h6 {
  font-family: Arial, sans-serif;`
    );
  }

  /**
   * CSS para romance/poesia
   */
  private static getRomanticCSS(): string {
    return this.getDefaultCSS().replace(
      'text-indent: 2em;',
      'text-indent: 3em;'
    ).replace(
      'line-height: 1.6;',
      'line-height: 1.8;'
    );
  }

  /**
   * CSS para conteúdo infantil
   */
  private static getChildrenCSS(): string {
    return this.getDefaultCSS().replace(
      'font-size: 16px;',
      'font-size: 18px;'
    ).replace(
      'line-height: 1.6;',
      'line-height: 2;'
    ).replace(
      'color: #333;',
      'color: #222;'
    );
  }
}
