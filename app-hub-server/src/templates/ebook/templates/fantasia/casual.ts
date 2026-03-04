import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const fantasiaCasual: BaseTemplate = {
  genre: 'Fantasia',
  tone: 'Casual',
  description: 'Design acessível e envolvente para fantasia casual',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#8E44AD',
      secondaryColor: '#9B59B6',
      accentColor: '#1ABC9C',
      backgroundColor: '#FFFFFF',
      textColor: '#2C2C2C',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.75',
      paragraphMargin: '1.2em',
      headingMarginTop: '1.8em',
      headingMarginBottom: '0.7em',
      chapterDropCap: false,
      chapterDivider: '※',
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
