import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const aventuraConversacional: BaseTemplate = {
  genre: 'Aventura',
  tone: 'Conversacional',
  description: 'Estilo próximo e pessoal, pensado para Aventura com tom conversacional.',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#AD1457',
    secondaryColor: '#EC407A',
    accentColor: '#F48FB1',
    backgroundColor: '#FFF1F5',
    textColor: '#2B021F',
    fontPrimary: 'Open Sans, "Helvetica Neue", sans-serif',
    fontHeadings: 'Open Sans Condensed, sans-serif',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.7',
    paragraphMargin: '1.25em',
    headingMarginTop: '2.1em',
    headingMarginBottom: '0.6em',
    chapterDropCap: false,
    chapterDivider: '≈',
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
