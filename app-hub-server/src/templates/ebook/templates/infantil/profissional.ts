import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const infantilProfissional: BaseTemplate = {
  genre: 'Infantil',
  tone: 'Profissional',
  description: 'Estrutura corporativa e objetiva para Infantil profissional.',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#1565C0',
    secondaryColor: '#1E88E5',
    accentColor: '#FFC107',
    backgroundColor: '#F4F7FB',
    textColor: '#1B2A43',
    fontPrimary: 'Segoe UI, "Helvetica Neue", sans-serif',
    fontHeadings: 'Segoe UI Semibold, "Helvetica Neue", sans-serif',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.6',
    paragraphMargin: '1.15em',
    headingMarginTop: '2em',
    headingMarginBottom: '0.7em',
    chapterDropCap: false,
    chapterDivider: '★',
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
