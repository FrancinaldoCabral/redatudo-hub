import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const romanceConversacional: BaseTemplate = {
  genre: 'Romance',
  tone: 'Conversacional',
  description: 'Design caloroso e íntimo para romances conversacionais',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#E91E63',
      secondaryColor: '#F8BBD0',
      accentColor: '#00BCD4',
      backgroundColor: '#FFF9FB',
      textColor: '#2C2C2C',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.75',
      paragraphMargin: '1.3em',
      headingMarginTop: '2.2em',
      headingMarginBottom: '0.7em',
      chapterDropCap: false,
      chapterDivider: '☆',
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
