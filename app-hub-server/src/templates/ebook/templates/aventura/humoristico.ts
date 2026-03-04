import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const aventuraHumoristico: BaseTemplate = {
  genre: 'Aventura',
  tone: 'Humorístico',
  description: 'Design animado e divertido para aventura humorística',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#FF6F00',
      secondaryColor: '#FF8F00',
      accentColor: '#8BC34A',
      backgroundColor: '#FFFFFF',
      textColor: '#263238',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.8',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.7em',
      chapterDropCap: false,
      chapterDivider: '→',
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
