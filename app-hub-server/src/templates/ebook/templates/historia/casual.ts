import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const historiaCasual: BaseTemplate = {
  genre: 'História',
  tone: 'Casual',
  description: 'Design acessível e envolvente para história casual',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#8D6E63',
      secondaryColor: '#BCAAA4',
      accentColor: '#6D4C41',
      backgroundColor: '#FFFFFF',
      textColor: '#3E2723',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.7',
      paragraphMargin: '1.2em',
      headingMarginTop: '1.8em',
      headingMarginBottom: '0.7em',
      chapterDropCap: false,
      chapterDivider: '◆',
      pageNumbersStyle: 'modern'
  },
  puppeteerConfig: {
    printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' }
  },
  epubConfig: {
    tocDepth: 2,
      chapterLevel: 2,
      embedFonts: false
  }
};
