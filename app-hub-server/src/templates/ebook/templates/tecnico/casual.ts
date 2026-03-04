import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const tecnicoCasual: BaseTemplate = {
  genre: 'Técnico',
  tone: 'Casual',
  description: 'Layout leve e acolhedor que traduz o espírito casual de Técnico.',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#EF6C00',
    secondaryColor: '#FFA726',
    accentColor: '#FFE082',
    backgroundColor: '#FFF8E1',
    textColor: '#2E272B',
    fontPrimary: 'Nunito, "Helvetica Neue", sans-serif',
    fontHeadings: 'Nunito, sans-serif',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.7',
    paragraphMargin: '1.3em',
    headingMarginTop: '2.2em',
    headingMarginBottom: '0.8em',
    chapterDropCap: false,
    chapterDivider: '—',
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
