import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const aventuraInspiracional: BaseTemplate = {
  genre: 'Aventura',
  tone: 'Inspiracional',
  description: 'Páginas arejadas e luminosas para Aventura em tom inspiracional.',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#2E7D32',
    secondaryColor: '#66BB6A',
    accentColor: '#00ACC1',
    backgroundColor: '#F1F8E9',
    textColor: '#20322B',
    fontPrimary: 'Poppins, "Segoe UI", sans-serif',
    fontHeadings: 'Poppins, sans-serif',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.75',
    paragraphMargin: '1.35em',
    headingMarginTop: '2.3em',
    headingMarginBottom: '0.8em',
    chapterDropCap: false,
    chapterDivider: '✦',
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
