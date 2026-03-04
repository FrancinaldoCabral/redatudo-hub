import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const ficcaoCientificaProfissional: BaseTemplate = {
  genre: 'Ficção Científica',
  tone: 'Profissional',
  description: 'Design sofisticado e futurista para ficção científica profissional',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#2C3E50',
      secondaryColor: '#34495E',
      accentColor: '#00BCD4',
      backgroundColor: '#FFFFFF',
      textColor: '#2C3E50',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.6',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.6em',
      chapterDropCap: false,
      chapterDivider: '★',
      pageNumbersStyle: 'modern'
  },
  puppeteerConfig: {
    printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '2.5cm', bottom: '2.5cm', left: '2cm', right: '2cm' }
  },
  epubConfig: {
    tocDepth: 2,
      chapterLevel: 2,
      embedFonts: false
  }
};
