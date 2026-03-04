import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const negociosAcademico: BaseTemplate = {
  genre: 'Negócios',
  tone: 'Acadêmico',
  description: 'Design erudito e fundamentado para Negócios com tom acadêmico.',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#4A148C',
    secondaryColor: '#6A1B9A',
    accentColor: '#00695C',
    backgroundColor: '#F9F6FF',
    textColor: '#1F1B24',
    fontPrimary: 'Merriweather, "Times New Roman", serif',
    fontHeadings: 'Merriweather, serif',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.55',
    paragraphMargin: '1.2em',
    headingMarginTop: '2em',
    headingMarginBottom: '0.7em',
    chapterDropCap: true,
    chapterDivider: '◆',
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
