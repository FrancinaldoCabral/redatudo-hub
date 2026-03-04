import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const tecnicoProfissional: BaseTemplate = {
  genre: 'Técnico',
  tone: 'Profissional',
  description: 'Design corporativo e clean para conteúdo técnico',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Melhorias para código em livros técnicos */
pre {
  background: #1e1e1e;
  color: #d4d4d4;
  border-left: 4px solid var(--color-accent);
}

pre code {
  color: #d4d4d4;
}
`,
  defaultVars: {
    primaryColor: '#2C3E50',
      secondaryColor: '#34495E',
      accentColor: '#3498DB',
      backgroundColor: '#FFFFFF',
      textColor: '#2C3E50',
      fontPrimary: '"Segoe UI", Arial, sans-serif',
      fontHeadings: '"Segoe UI", Arial, sans-serif',
      fontCode: '"Fira Code", "Courier New", monospace',
      lineHeight: '1.6',
      paragraphMargin: '1em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.5em',
      chapterDropCap: false,
      chapterDivider: '---',
      pageNumbersStyle: 'modern'
  },
  puppeteerConfig: {
    printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      margin: { top: '3cm', bottom: '3cm', left: '2.5cm', right: '2.5cm' }
  },
  epubConfig: {
    tocDepth: 3,
      chapterLevel: 2,
      embedFonts: false
  }
};
