import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const outroFormal: BaseTemplate = {
  genre: 'Outro',
  tone: 'Formal',
  description: 'Design tradicional e respeitoso para documentos formais',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#263238',
      secondaryColor: '#455A64',
      accentColor: '#1565C0',
      backgroundColor: '#FFFFFF',
      textColor: '#212121',
      fontPrimary: '"Times New Roman", Times, serif',
      fontHeadings: '"Times New Roman", serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.5',
      paragraphMargin: '1em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.5em',
      chapterDropCap: false,
      chapterDivider: '***',
      pageNumbersStyle: 'classic'
  },
  puppeteerConfig: {
    printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      margin: { top: '2.5cm', bottom: '2.5cm', left: '2cm', right: '2cm' }
  },
  epubConfig: {
    tocDepth: 2,
      chapterLevel: 2,
      embedFonts: false
  }
};
