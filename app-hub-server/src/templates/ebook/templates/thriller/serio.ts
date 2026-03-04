import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const thrillerSerio: BaseTemplate = {
  genre: 'Thriller',
  tone: 'Sério',
  description: 'Design grave e intenso para thriller sério',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#000000',
      secondaryColor: '#424242',
      accentColor: '#B71C1C',
      backgroundColor: '#FFFFFF',
      textColor: '#212121',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.6',
      paragraphMargin: '1em',
      headingMarginTop: '2.5em',
      headingMarginBottom: '0.6em',
      chapterDropCap: true,
      chapterDivider: '▬',
      pageNumbersStyle: 'minimal'
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
