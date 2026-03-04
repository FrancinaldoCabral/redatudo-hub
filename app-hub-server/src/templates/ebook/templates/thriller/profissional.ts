import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const thrillerProfissional: BaseTemplate = {
  genre: 'Thriller',
  tone: 'Profissional',
  description: 'Design dark e impactante para thrillers',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Atmosfera dark para thrillers */
body {
  background: linear-gradient(to bottom, #1a1a1a 0%, #2d2d2d 100%);
}
`,
  defaultVars: {
    primaryColor: '#8B0000',
      secondaryColor: '#4A0000',
      accentColor: '#DC143C',
      backgroundColor: '#1A1A1A',
      textColor: '#E0E0E0',
      fontPrimary: '"Crimson Text", Georgia, serif',
      fontHeadings: '"Bebas Neue", Impact, sans-serif',
      fontCode: '"Courier New", monospace',
      googleFontsImport: 'https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;700&family=Bebas+Neue&display=swap',
      lineHeight: '1.7',
      paragraphMargin: '1em',
      headingMarginTop: '2.5em',
      headingMarginBottom: '0.7em',
      chapterDropCap: true,
      chapterDivider: '***',
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
      embedFonts: true
  }
};
