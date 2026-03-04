import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const ficcaoCientificaCasual: BaseTemplate = {
  genre: 'Ficção Científica',
  tone: 'Casual',
  description: 'Design acessível e moderno para ficção científica casual',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#3498DB',
      secondaryColor: '#5DADE2',
      accentColor: '#1ABC9C',
      backgroundColor: '#FFFFFF',
      textColor: '#2C3E50',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", Courier, monospace',
      lineHeight: '1.7',
      paragraphMargin: '1.2em',
      headingMarginTop: '1.8em',
      headingMarginBottom: '0.7em',
      chapterDropCap: false,
      chapterDivider: '★',
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
