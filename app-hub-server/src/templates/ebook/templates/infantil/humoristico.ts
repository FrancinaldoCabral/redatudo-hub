import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const infantilHumoristico: BaseTemplate = {
  genre: 'Infantil',
  tone: 'Humorístico',
  description: 'Visual vibrante e brincalhão para Infantil com humor e leveza.',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#FDD835',
    secondaryColor: '#FFEB3B',
    accentColor: '#FF7043',
    backgroundColor: '#FFFDE7',
    textColor: '#422B0D',
    fontPrimary: 'Comic Neue, "Comic Sans MS", cursive',
    fontHeadings: 'Comic Neue, cursive',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.65',
    paragraphMargin: '1.4em',
    headingMarginTop: '2em',
    headingMarginBottom: '0.7em',
    chapterDropCap: false,
    chapterDivider: '☻',
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
