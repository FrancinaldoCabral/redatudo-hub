import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const misterioConversacional: BaseTemplate = {
  genre: 'Mistério',
  tone: 'Conversacional',
  description: 'Design envolvente e pessoal para mistério conversacional',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#546E7A',
      secondaryColor: '#78909C',
      accentColor: '#FF8F00',
      backgroundColor: '#FFFFFF',
      textColor: '#263238',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.75',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.7em',
      chapterDropCap: true,
      chapterDivider: '◇',
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
