/**
 * Interfaces e tipos para Templates de Ebooks
 */

export interface BaseTemplate {
  genre: string;
  tone: string;
  description: string;
  
  // CSS base com placeholders para variáveis
  baseCSS: string;
  
  // Variáveis customizáveis pelo LLM
  defaultVars: DesignVariables;
  
  // Configurações avançadas de exportação
  puppeteerConfig: PuppeteerConfig;
  epubConfig: EPUBConfig;
}

export interface DesignVariables {
  // Cores
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Tipografia
  fontPrimary: string;
  fontHeadings: string;
  fontCode: string;
  googleFontsImport?: string;
  
  // Espaçamento e ritmo
  lineHeight: string;
  paragraphMargin: string;
  headingMarginTop: string;
  headingMarginBottom: string;
  
  // Elementos decorativos
  chapterDropCap: boolean;
  chapterDivider: string;
  pageNumbersStyle: 'classic' | 'modern' | 'minimal' | 'none';
}

export interface PuppeteerConfig {
  printBackground: boolean;
  preferCSSPageSize: boolean;
  displayHeaderFooter: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  margin: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
}

export interface EPUBConfig {
  tocDepth: number;
  chapterLevel: number;
  embedFonts: boolean;
  css?: string;
}
