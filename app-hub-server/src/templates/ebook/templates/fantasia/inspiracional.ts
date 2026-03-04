import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const fantasiaInspiracional: BaseTemplate = {
  genre: 'Fantasia',
  tone: 'Inspiracional',
  description: 'Design épico e motivador para fantasia inspiracional',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Drop cap épica para fantasia */
[data-section-type="chapter"] .content > p:first-of-type::first-letter {
  font-size: 4em;
  line-height: 0.8;
  float: left;
  margin: 0.1em 0.2em 0 0;
  font-weight: bold;
  font-family: var(--font-headings);
  color: var(--color-primary);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}
`,
  defaultVars: {
    primaryColor: '#9C27B0',
      secondaryColor: '#BA68C8',
      accentColor: '#FFD700',
      backgroundColor: '#FFFFFF',
      textColor: '#2C2C2C',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.9',
      paragraphMargin: '1.4em',
      headingMarginTop: '2.5em',
      headingMarginBottom: '1em',
      chapterDropCap: true,
      chapterDivider: '✦',
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
