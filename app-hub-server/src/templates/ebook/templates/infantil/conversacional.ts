import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const infantilConversacional: BaseTemplate = {
  genre: 'Infantil',
  tone: 'Conversacional',
  description: 'Design caloroso e envolvente para infantil conversacional',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
    primaryColor: '#EC407A',
      secondaryColor: '#F48FB1',
      accentColor: '#42A5F5',
      backgroundColor: '#FFFFFF',
      textColor: '#212121',
      fontPrimary: 'Arial, Helvetica, sans-serif',
      fontHeadings: 'Arial, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.8',
      paragraphMargin: '1.3em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.8em',
      chapterDropCap: false,
      chapterDivider: '♥',
      pageNumbersStyle: 'modern'
  },
  puppeteerConfig: {
    printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' }
  },
  epubConfig: {
    tocDepth: 2,
      chapterLevel: 2,
      embedFonts: false
  }
};
