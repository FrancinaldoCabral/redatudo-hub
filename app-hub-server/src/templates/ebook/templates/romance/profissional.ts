import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const romanceProfissional: BaseTemplate = {
  genre: 'Romance',
  tone: 'Profissional',
  description: 'Design elegante e sofisticado para romances profissionais',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Drop cap especial para romances */
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
    primaryColor: '#8B4789',
    secondaryColor: '#D4A5D4',
    accentColor: '#FF69B4',
    backgroundColor: '#FFFFFF',
    textColor: '#2C2C2C',
    fontPrimary: 'Georgia, "Times New Roman", serif',
    fontHeadings: 'Georgia, serif',
    fontCode: '"Courier New", Courier, monospace',
    lineHeight: '1.8',
    paragraphMargin: '1.2em',
    headingMarginTop: '2em',
    headingMarginBottom: '0.8em',
    chapterDropCap: true,
    chapterDivider: '❤',
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
