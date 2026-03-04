import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const outroSerio: BaseTemplate = {
  genre: 'Outro',
  tone: 'Sério',
  description: 'Atmosfera sóbria e direta, ideal para Outro de tom sério.',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#212121',
    secondaryColor: '#424242',
    accentColor: '#9E9E9E',
    backgroundColor: '#F5F5F5',
    textColor: '#121212',
    fontPrimary: 'Lora, "Times New Roman", serif',
    fontHeadings: 'Lora, serif',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.7',
    paragraphMargin: '1.3em',
    headingMarginTop: '2.2em',
    headingMarginBottom: '0.6em',
    chapterDropCap: false,
    chapterDivider: '—',
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
