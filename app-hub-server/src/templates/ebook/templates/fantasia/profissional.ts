import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const fantasiaProfissional: BaseTemplate = {
  genre: 'Fantasia',
  tone: 'Profissional',
  description: 'Design sofisticado e profissional para fantasia épica',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Drop cap ornamentada para fantasia */
[data-section-type="chapter"] .content > p:first-of-type::first-letter {
  font-size: 3.8em;
  line-height: 0.85;
  float: left;
  margin: 0.1em 0.18em 0 0;
  font-weight: bold;
  font-family: var(--font-headings);
  color: var(--color-primary);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.08);
}
`,
  defaultVars: {
    primaryColor: '#4A148C',
      secondaryColor: '#7B1FA2',
      accentColor: '#D4AF37',
      backgroundColor: '#FFFFFF',
      textColor: '#2C2C2C',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.7',
      paragraphMargin: '1.3em',
      headingMarginTop: '2.2em',
      headingMarginBottom: '0.8em',
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
