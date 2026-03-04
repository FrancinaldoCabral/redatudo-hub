import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const autoajudaInspiracional: BaseTemplate = {
  genre: 'Autoajuda',
  tone: 'Inspiracional',
  description: 'Design edificante e energizante para autoajuda inspiracional',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#FFA000',
      secondaryColor: '#FFB74D',
      accentColor: '#7B1FA2',
      backgroundColor: '#FFFFFF',
      textColor: '#263238',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.8',
      paragraphMargin: '1.4em',
      headingMarginTop: '2.5em',
      headingMarginBottom: '0.9em',
      chapterDropCap: false,
      chapterDivider: '✓',
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
