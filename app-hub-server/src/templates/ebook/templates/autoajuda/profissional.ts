import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const autoajudaProfissional: BaseTemplate = {
  genre: 'Autoajuda',
  tone: 'Profissional',
  description: 'Design confiável e motivador para autoajuda profissional',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#1565C0',
      secondaryColor: '#1976D2',
      accentColor: '#FF9800',
      backgroundColor: '#FFFFFF',
      textColor: '#263238',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.6',
      paragraphMargin: '1.2em',
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
