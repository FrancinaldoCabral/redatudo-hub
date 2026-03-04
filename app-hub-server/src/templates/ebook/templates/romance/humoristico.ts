import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const romanceHumoristico: BaseTemplate = {
  genre: 'Romance',
  tone: 'Humorístico',
  description: 'Design divertido e acolhedor para romances com humor leve',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#FF6B9D',
      secondaryColor: '#FFD1DC',
      accentColor: '#FFC107',
      backgroundColor: '#FFF6F9',
      textColor: '#2C2C2C',
      fontPrimary: 'Trebuchet MS, "Segoe UI", sans-serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.8',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.6em',
      chapterDropCap: false,
      chapterDivider: '💌',
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
