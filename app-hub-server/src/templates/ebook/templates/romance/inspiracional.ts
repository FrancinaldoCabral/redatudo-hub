import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const romanceInspiracional: BaseTemplate = {
  genre: 'Romance',
  tone: 'Inspiracional',
  description: 'Design edificante e aspiracional para romances inspiracionais',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#9B59B6',
      secondaryColor: '#C39BD3',
      accentColor: '#F1948A',
      backgroundColor: '#FFFFFF',
      textColor: '#2C2C2C',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", Courier, monospace',
      lineHeight: '1.9',
      paragraphMargin: '1.5em',
      headingMarginTop: '2.5em',
      headingMarginBottom: '1em',
      chapterDropCap: true,
      chapterDivider: '✿',
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
