import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const horrorFormal: BaseTemplate = {
  genre: 'Horror',
  tone: 'Formal',
  description: 'Design tradicional e sombrio para horror formal',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Atmosfera fúnebre */
[data-section-type="chapter"] .content > p:first-of-type::first-letter {
  font-size: 3.5em;
  line-height: 0.85;
  float: left;
  margin: 0.1em 0.15em 0 0;
  font-weight: bold;
  font-family: var(--font-headings);
  color: var(--color-primary);
}
`,
  defaultVars: {
    primaryColor: '#4A0000',
      secondaryColor: '#6D1414',
      accentColor: '#8B0000',
      backgroundColor: '#FFFFFF',
      textColor: '#1C1C1C',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.5',
      paragraphMargin: '1em',
      headingMarginTop: '2.5em',
      headingMarginBottom: '0.6em',
      chapterDropCap: true,
      chapterDivider: '†',
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
