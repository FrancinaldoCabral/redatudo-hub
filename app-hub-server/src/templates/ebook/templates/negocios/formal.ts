import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const negociosFormal: BaseTemplate = {
  genre: 'Negócios',
  tone: 'Formal',
  description: 'Apresentação refinada e composta para Negócios em tom formal.',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#4E342E',
    secondaryColor: '#6D4C41',
    accentColor: '#BF360C',
    backgroundColor: '#FCF7F3',
    textColor: '#2B1A17',
    fontPrimary: 'Playfair Display, "Times New Roman", serif',
    fontHeadings: 'Playfair Display, serif',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.6',
    paragraphMargin: '1.15em',
    headingMarginTop: '2.4em',
    headingMarginBottom: '0.5em',
    chapterDropCap: true,
    chapterDivider: '•',
    pageNumbersStyle: 'classic'
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
