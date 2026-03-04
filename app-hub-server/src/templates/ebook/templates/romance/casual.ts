import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const romanceCasual: BaseTemplate = {
  genre: 'Romance',
  tone: 'Casual',
  description: 'Design leve e acessível para romances casuais',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#FF6B9D',
      secondaryColor: '#FFB6C1',
      accentColor: '#FFA07A',
      backgroundColor: '#FFF9FC',
      textColor: '#333333',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.7',
      paragraphMargin: '1em',
      headingMarginTop: '1.5em',
      headingMarginBottom: '0.6em',
      chapterDropCap: false,
      chapterDivider: '♥',
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
