import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const tecnicoHumoristico: BaseTemplate = {
  genre: 'Técnico',
  tone: 'Humorístico',
  description: 'Design leve e divertido para conteúdo técnico com humor',
  baseCSS: UNIVERSAL_BASE_CSS + `
/* Blocos de código coloridos e amigáveis */
pre {
  background: #F1F8E9;
  color: #33691E;
  border-left: 4px solid var(--color-accent);
  border-radius: 8px;
}

pre code {
  color: #33691E;
}
`,
  defaultVars: {
    primaryColor: '#66BB6A',
      secondaryColor: '#81C784',
      accentColor: '#FF9800',
      backgroundColor: '#FFFFFF',
      textColor: '#263238',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", Courier, monospace',
      lineHeight: '1.8',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.7em',
      chapterDropCap: false,
      chapterDivider: '▪',
      pageNumbersStyle: 'modern'
  },
  puppeteerConfig: {
    printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '2.5cm', bottom: '2.5cm', left: '2.5cm', right: '2.5cm' }
  },
  epubConfig: {
    tocDepth: 3,
      chapterLevel: 2,
      embedFonts: false
  }
};
