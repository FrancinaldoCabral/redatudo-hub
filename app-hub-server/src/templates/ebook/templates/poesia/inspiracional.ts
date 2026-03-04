import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const poesiaInspiracional: BaseTemplate = {
  genre: 'Poesia',
  tone: 'Inspiracional',
  description: 'Design lírico e edificante para poesia inspiracional',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Muito espaço em branco para poesia */
.content {
  max-width: 600px;
}
p {
  text-align: left;
  text-indent: 0;
}
`,
  defaultVars: {
    primaryColor: '#AB47BC',
      secondaryColor: '#CE93D8',
      accentColor: '#F48FB1',
      backgroundColor: '#FFFFFF',
      textColor: '#424242',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Georgia, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '2.0',
      paragraphMargin: '2em',
      headingMarginTop: '3em',
      headingMarginBottom: '1.5em',
      chapterDropCap: false,
      chapterDivider: '~',
      pageNumbersStyle: 'minimal'
  },
  puppeteerConfig: {
    printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '3cm', bottom: '3cm', left: '3cm', right: '3cm' }
  },
  epubConfig: {
    tocDepth: 2,
      chapterLevel: 2,
      embedFonts: false
  }
};
