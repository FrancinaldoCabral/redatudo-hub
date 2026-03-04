import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const romanceSerio: BaseTemplate = {
  genre: 'Romance',
  tone: 'Sério',
  description: 'Design grave e impactante para romances sérios',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Drop cap sério para romance */
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
    primaryColor: '#4A4A4A',
      secondaryColor: '#757575',
      accentColor: '#8E24AA',
      backgroundColor: '#FFFFFF',
      textColor: '#212121',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.6',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.6em',
      chapterDropCap: true,
      chapterDivider: '~',
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
