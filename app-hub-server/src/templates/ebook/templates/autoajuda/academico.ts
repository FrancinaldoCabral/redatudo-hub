import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const autoajudaAcademico: BaseTemplate = {
  genre: 'Autoajuda',
  tone: 'Acadêmico',
  description: 'Design erudito e fundamentado para autoajuda acadêmica',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#2E7D32',
      secondaryColor: '#66BB6A',
      accentColor: '#1565C0',
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
