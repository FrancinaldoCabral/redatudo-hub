import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const romanceAcademico: BaseTemplate = {
  genre: 'Romance',
  tone: 'Acadêmico',
  description: 'Design sóbrio e refinado para romances acadêmicos',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Notas acadêmicas discretas */
.chapter .content {
  letter-spacing: 0.02em;
}
`,
  defaultVars: {
    primaryColor: '#5B2C6F',
      secondaryColor: '#8E44AD',
      accentColor: '#CB4335',
      backgroundColor: '#FAFAFA',
      textColor: '#2C2C2C',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.55',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.6em',
      chapterDropCap: true,
      chapterDivider: '◆',
      pageNumbersStyle: 'classic'
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
