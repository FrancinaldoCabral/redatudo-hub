import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const dramaAcademico: BaseTemplate = {
  genre: 'Drama',
  tone: 'Acadêmico',
  description: 'Design analítico e crítico para drama acadêmico',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#455A64',
      secondaryColor: '#78909C',
      accentColor: '#7B1FA2',
      backgroundColor: '#FFFFFF',
      textColor: '#263238',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.5',
      paragraphMargin: '1em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.6em',
      chapterDropCap: false,
      chapterDivider: '◆',
      pageNumbersStyle: 'classic'
  },
  puppeteerConfig: {
    printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      margin: { top: '3cm', bottom: '3cm', left: '2.5cm', right: '2.5cm' }
  },
  epubConfig: {
    tocDepth: 3,
      chapterLevel: 2,
      embedFonts: false
  }
};
