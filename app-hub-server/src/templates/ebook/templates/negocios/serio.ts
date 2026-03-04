import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const negociosSerio: BaseTemplate = {
  genre: 'Negócios',
  tone: 'Sério',
  description: 'Design autoritário e impactante para negócios sérios',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#263238',
      secondaryColor: '#455A64',
      accentColor: '#1565C0',
      backgroundColor: '#FFFFFF',
      textColor: '#212121',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.5',
      paragraphMargin: '1em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.5em',
      chapterDropCap: false,
      chapterDivider: '■',
      pageNumbersStyle: 'minimal'
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
