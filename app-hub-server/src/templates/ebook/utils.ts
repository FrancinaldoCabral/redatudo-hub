/**
 * Funções auxiliares para Templates de Ebooks
 */

import { BaseTemplate, DesignVariables } from './types';

/**
 * Normaliza chave de template (genre-tone)
 */
export function normalizeTemplateKey(genre: string, tone: string): string {
  const normalizeStr = (str: string) => str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  return `${normalizeStr(genre)}-${normalizeStr(tone)}`;
}

/**
 * Aplica variáveis personalizadas ao CSS base
 */
export function applyVariablesToCSS(baseCSS: string, vars: DesignVariables): string {
  let css = baseCSS;
  
  // Substituir placeholders
  css = css.replace(/\{\{primaryColor\}\}/g, vars.primaryColor);
  css = css.replace(/\{\{secondaryColor\}\}/g, vars.secondaryColor);
  css = css.replace(/\{\{accentColor\}\}/g, vars.accentColor);
  css = css.replace(/\{\{backgroundColor\}\}/g, vars.backgroundColor);
  css = css.replace(/\{\{textColor\}\}/g, vars.textColor);
  css = css.replace(/\{\{fontPrimary\}\}/g, vars.fontPrimary);
  css = css.replace(/\{\{fontHeadings\}\}/g, vars.fontHeadings);
  css = css.replace(/\{\{fontCode\}\}/g, vars.fontCode);
  css = css.replace(/\{\{lineHeight\}\}/g, vars.lineHeight);
  css = css.replace(/\{\{paragraphMargin\}\}/g, vars.paragraphMargin);
  css = css.replace(/\{\{headingMarginTop\}\}/g, vars.headingMarginTop);
  css = css.replace(/\{\{headingMarginBottom\}\}/g, vars.headingMarginBottom);
  
  // Adicionar Google Fonts se especificado (verificar duplicação)
  if (vars.googleFontsImport) {
    // Verificar se CSS já contém @import para evitar duplicação
    const hasImport = css.includes('@import');
    if (!hasImport) {
      css = `@import url('${vars.googleFontsImport}');\n\n` + css;
    }
  }
  
  // Adicionar drop cap se habilitado
  if (vars.chapterDropCap && !css.includes('first-letter')) {
    css += `\n\n/* Drop Cap */
[data-section-type="chapter"] .content > p:first-of-type::first-letter {
  font-size: 3.5em;
  line-height: 0.85;
  float: left;
  margin: 0.1em 0.15em 0 0;
  font-weight: bold;
  font-family: var(--font-headings);
  color: var(--color-primary);
}
`;
  }
  
  return css;
}

/**
 * Lista todos os templates disponíveis
 */
export function listAvailableTemplates(templates: Record<string, BaseTemplate>): Array<{ 
  key: string; 
  genre: string; 
  tone: string; 
  description: string 
}> {
  return Object.entries(templates).map(([key, template]) => ({
    key,
    genre: template.genre,
    tone: template.tone,
    description: template.description
  }));
}
