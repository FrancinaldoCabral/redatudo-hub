import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const biografiaProfissional: BaseTemplate = {
  genre: 'Biografia',
  tone: 'Profissional',
  description: 'Design clássico e respeitoso para biografias profissionais',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#795548',
      secondaryColor: '#A1887F',
      accentColor: '#5D4037',
      backgroundColor: '#FFFEF7',
      textColor: '#3E2723',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.6',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.7em',
      chapterDropCap: true,
      chapterDivider: '※',
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
