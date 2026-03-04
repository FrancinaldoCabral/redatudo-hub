/**
 * CSS Base Universal - usado em TODOS os templates
 * Contém estrutura sólida de impressão, responsividade, etc.
 */

export const UNIVERSAL_BASE_CSS = `
/* ============================================
   CONFIGURAÇÃO DE PÁGINAS PARA IMPRESSÃO
   Amazon KDP recomenda margens de 1.27cm a 2.54cm (0.5" a 1")
   ============================================ */
@page {
  size: A4;
  margin: var(--page-margin-top, 1.5cm) var(--page-margin-right, 1.5cm) var(--page-margin-bottom, 1.5cm) var(--page-margin-left, 1.5cm);
}

@page :first {
  margin: 0 !important;
}

@page chapter {
  margin: var(--chapter-margin-top, 2cm) var(--chapter-margin-right, 1.8cm) var(--chapter-margin-bottom, 2cm) var(--chapter-margin-left, 1.8cm);
}

/* ============================================
   VARIÁVEIS CSS CUSTOMIZÁVEIS
   ============================================ */
:root {
  --color-primary: {{primaryColor}};
  --color-secondary: {{secondaryColor}};
  --color-accent: {{accentColor}};
  --color-background: {{backgroundColor}};
  --color-text: {{textColor}};
  
  --font-primary: {{fontPrimary}};
  --font-headings: {{fontHeadings}};
  --font-code: {{fontCode}};
  
  --line-height: {{lineHeight}};
  --paragraph-margin: {{paragraphMargin}};
  --heading-margin-top: {{headingMarginTop}};
  --heading-margin-bottom: {{headingMarginBottom}};
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
  font-family: var(--font-primary);
  line-height: var(--line-height);
  color: var(--color-text);
  background: var(--color-background);
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
  font-family: var(--font-headings);
  font-weight: bold;
  margin-top: var(--heading-margin-top);
  margin-bottom: var(--heading-margin-bottom);
  line-height: 1.2;
  color: var(--color-primary);
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
  border-bottom: 2px solid var(--color-secondary); 
  padding-bottom: 0.3em; 
}

h3 { font-size: 1.4em; }
h4 { font-size: 1.2em; }
h5 { font-size: 1.05em; }
h6 { font-size: 0.95em; }

p {
  margin: var(--paragraph-margin) 0;
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
  border-left: 4px solid var(--color-accent);
  background: rgba(0, 0, 0, 0.03);
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
  font-family: var(--font-code);
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
  background: var(--color-secondary);
  color: white;
  font-weight: bold;
}

tr:nth-child(even) {
  background: rgba(0, 0, 0, 0.02);
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
  color: var(--color-accent);
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
  border-top: 1px solid var(--color-secondary);
  margin: 2em 0;
  page-break-after: avoid;
}

/* ============================================
   CONTAINERS DO LIVRO
   ============================================ */
.book {
  background: var(--color-background);
}

.chapter {
  margin-bottom: 3em;
}

.content {
  padding: 0 2rem;
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
  
  /* NÃO remove padding - mantém espaçamento interno adequado */
  .content {
    max-width: 100%;
  }
  
  /* Capa deve ter margem 0 e padding 0 */
  [data-section-type="cover"] {
    page: :first;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  [data-section-type="cover"] .content {
    padding: 0 !important;
    margin: 0 !important;
  }
  
  /* Reduz tamanhos de fonte para evitar cortes */
  h1 {
    font-size: 2.2em;
  }
  
  h2 {
    font-size: 1.8em;
  }
  
  h3 {
    font-size: 1.4em;
  }
  
  h4 {
    font-size: 1.2em;
  }
  
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
  
  a {
    color: #000;
    text-decoration: none;
  }
  
  a[href^="http"]:after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    font-style: italic;
  }
  
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
