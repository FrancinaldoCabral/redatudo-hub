const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'src', 'templates', 'ebook', 'templates');

const genreDisplayNames = {
  autoajuda: 'Autoajuda',
  aventura: 'Aventura',
  biografia: 'Biografia',
  drama: 'Drama',
  fantasia: 'Fantasia',
  'ficcao-cientifica': 'Ficção Científica',
  historia: 'História',
  horror: 'Horror',
  infantil: 'Infantil',
  misterio: 'Mistério',
  negocios: 'Negócios',
  outro: 'Outro',
  poesia: 'Poesia',
  romance: 'Romance',
  tecnico: 'Técnico',
  thriller: 'Thriller'
};

const missingTemplates = {
  autoajuda: ['casual','conversacional','formal','humoristico','serio'],
  aventura: ['academico','casual','conversacional','formal','inspiracional','profissional','serio'],
  biografia: ['academico','casual','conversacional','formal','humoristico','inspiracional','serio'],
  drama: ['casual','conversacional','formal','humoristico','inspiracional','profissional','serio'],
  fantasia: ['academico','conversacional','formal','humoristico','serio'],
  'ficcao-cientifica': ['academico','conversacional','formal','humoristico','inspiracional','serio'],
  historia: ['academico','conversacional','formal','humoristico','inspiracional','profissional','serio'],
  horror: ['academico','casual','conversacional','humoristico','inspiracional','profissional','serio'],
  infantil: ['academico','casual','formal','humoristico','inspiracional','profissional','serio'],
  misterio: ['academico','casual','formal','humoristico','inspiracional','profissional','serio'],
  negocios: ['academico','casual','conversacional','formal','humoristico','inspiracional','profissional'],
  outro: ['academico','casual','conversacional','humoristico','inspiracional','profissional','serio'],
  poesia: ['academico','casual','conversacional','formal','humoristico','profissional','serio'],
  tecnico: ['academico','casual','conversacional','formal','inspiracional','serio'],
  thriller: ['academico','casual','conversacional','formal','humoristico','inspiracional']
};

const toneConfigs = {
  academico: {
    display: 'Acadêmico',
    description: (genre) => `Design erudito e fundamentado para ${genre} com tom acadêmico.`,
    defaultVars: {
      primaryColor: '#4A148C',
      secondaryColor: '#6A1B9A',
      accentColor: '#00695C',
      backgroundColor: '#F9F6FF',
      textColor: '#1F1B24',
      fontPrimary: 'Merriweather, "Times New Roman", serif',
      fontHeadings: 'Merriweather, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.55',
      paragraphMargin: '1.2em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.7em',
      chapterDropCap: true,
      chapterDivider: '◆',
      pageNumbersStyle: 'classic'
    }
  },
  casual: {
    display: 'Casual',
    description: (genre) => `Layout leve e acolhedor que traduz o espírito casual de ${genre}.`,
    defaultVars: {
      primaryColor: '#EF6C00',
      secondaryColor: '#FFA726',
      accentColor: '#FFE082',
      backgroundColor: '#FFF8E1',
      textColor: '#2E272B',
      fontPrimary: 'Nunito, "Helvetica Neue", sans-serif',
      fontHeadings: 'Nunito, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.7',
      paragraphMargin: '1.3em',
      headingMarginTop: '2.2em',
      headingMarginBottom: '0.8em',
      chapterDropCap: false,
      chapterDivider: '—',
      pageNumbersStyle: 'modern'
    }
  },
  conversacional: {
    display: 'Conversacional',
    description: (genre) => `Estilo próximo e pessoal, pensado para ${genre} com tom conversacional.`,
    defaultVars: {
      primaryColor: '#AD1457',
      secondaryColor: '#EC407A',
      accentColor: '#F48FB1',
      backgroundColor: '#FFF1F5',
      textColor: '#2B021F',
      fontPrimary: 'Open Sans, "Helvetica Neue", sans-serif',
      fontHeadings: 'Open Sans Condensed, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.7',
      paragraphMargin: '1.25em',
      headingMarginTop: '2.1em',
      headingMarginBottom: '0.6em',
      chapterDropCap: false,
      chapterDivider: '≈',
      pageNumbersStyle: 'modern'
    }
  },
  formal: {
    display: 'Formal',
    description: (genre) => `Apresentação refinada e composta para ${genre} em tom formal.`,
    defaultVars: {
      primaryColor: '#4E342E',
      secondaryColor: '#6D4C41',
      accentColor: '#BF360C',
      backgroundColor: '#FCF7F3',
      textColor: '#2B1A17',
      fontPrimary: 'Playfair Display, "Times New Roman", serif',
      fontHeadings: 'Playfair Display, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.6',
      paragraphMargin: '1.15em',
      headingMarginTop: '2.4em',
      headingMarginBottom: '0.5em',
      chapterDropCap: true,
      chapterDivider: '•',
      pageNumbersStyle: 'classic'
    }
  },
  humoristico: {
    display: 'Humorístico',
    description: (genre) => `Visual vibrante e brincalhão para ${genre} com humor e leveza.`,
    defaultVars: {
      primaryColor: '#FDD835',
      secondaryColor: '#FFEB3B',
      accentColor: '#FF7043',
      backgroundColor: '#FFFDE7',
      textColor: '#422B0D',
      fontPrimary: 'Comic Neue, "Comic Sans MS", cursive',
      fontHeadings: 'Comic Neue, cursive',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.65',
      paragraphMargin: '1.4em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.7em',
      chapterDropCap: false,
      chapterDivider: '☻',
      pageNumbersStyle: 'minimal'
    }
  },
  inspiracional: {
    display: 'Inspiracional',
    description: (genre) => `Páginas arejadas e luminosas para ${genre} em tom inspiracional.`,
    defaultVars: {
      primaryColor: '#2E7D32',
      secondaryColor: '#66BB6A',
      accentColor: '#00ACC1',
      backgroundColor: '#F1F8E9',
      textColor: '#20322B',
      fontPrimary: 'Poppins, "Segoe UI", sans-serif',
      fontHeadings: 'Poppins, sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.75',
      paragraphMargin: '1.35em',
      headingMarginTop: '2.3em',
      headingMarginBottom: '0.8em',
      chapterDropCap: false,
      chapterDivider: '✦',
      pageNumbersStyle: 'modern'
    }
  },
  profissional: {
    display: 'Profissional',
    description: (genre) => `Estrutura corporativa e objetiva para ${genre} profissional.`,
    defaultVars: {
      primaryColor: '#1565C0',
      secondaryColor: '#1E88E5',
      accentColor: '#FFC107',
      backgroundColor: '#F4F7FB',
      textColor: '#1B2A43',
      fontPrimary: 'Segoe UI, "Helvetica Neue", sans-serif',
      fontHeadings: 'Segoe UI Semibold, "Helvetica Neue", sans-serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.6',
      paragraphMargin: '1.15em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.7em',
      chapterDropCap: false,
      chapterDivider: '★',
      pageNumbersStyle: 'modern'
    }
  },
  serio: {
    display: 'Sério',
    description: (genre) => `Atmosfera sóbria e direta, ideal para ${genre} de tom sério.`,
    defaultVars: {
      primaryColor: '#212121',
      secondaryColor: '#424242',
      accentColor: '#9E9E9E',
      backgroundColor: '#F5F5F5',
      textColor: '#121212',
      fontPrimary: 'Lora, "Times New Roman", serif',
      fontHeadings: 'Lora, serif',
      fontCode: '"Courier New", monospace',
      lineHeight: '1.7',
      paragraphMargin: '1.3em',
      headingMarginTop: '2.2em',
      headingMarginBottom: '0.6em',
      chapterDropCap: false,
      chapterDivider: '—',
      pageNumbersStyle: 'classic'
    }
  }
};

const puppeteerConfig = `{
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  margin: { top: '2.5cm', bottom: '2.5cm', left: '2cm', right: '2cm' }
}`;

const epubConfig = `{
  tocDepth: 2,
  chapterLevel: 2,
  embedFonts: false
}`;

const pascalCase = (value) =>
  value
    .split(/[-_]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const created = [];
const skipped = [];

Object.entries(missingTemplates).forEach(([genre, tones]) => {
  const genreDir = path.join(baseDir, genre);
  ensureDir(genreDir);
  const genreCamel = genre.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const genreDisplay = genreDisplayNames[genre] || genre;

  tones.forEach((tone) => {
    const toneConfig = toneConfigs[tone];
    if (!toneConfig) {
      throw new Error(`Configuração ausente para o tom ${tone}`);
    }

    const filePath = path.join(genreDir, `${tone}.ts`);
    if (fs.existsSync(filePath)) {
      skipped.push(filePath);
      return;
    }

    const constName = `${genreCamel}${pascalCase(tone)}`;
    const description = toneConfig.description(genreDisplay);
    const defaultVars = toneConfig.defaultVars;

    const defaultVarsLines = [
      `    primaryColor: '${defaultVars.primaryColor}',`,
      `    secondaryColor: '${defaultVars.secondaryColor}',`,
      `    accentColor: '${defaultVars.accentColor}',`,
      `    backgroundColor: '${defaultVars.backgroundColor}',`,
      `    textColor: '${defaultVars.textColor}',`,
      `    fontPrimary: '${defaultVars.fontPrimary}',`,
      `    fontHeadings: '${defaultVars.fontHeadings}',`,
      `    fontCode: '${defaultVars.fontCode}',`,
      `    lineHeight: '${defaultVars.lineHeight}',`,
      `    paragraphMargin: '${defaultVars.paragraphMargin}',`,
      `    headingMarginTop: '${defaultVars.headingMarginTop}',`,
      `    headingMarginBottom: '${defaultVars.headingMarginBottom}',`,
      `    chapterDropCap: ${defaultVars.chapterDropCap},`,
      `    chapterDivider: '${defaultVars.chapterDivider}',`,
      `    pageNumbersStyle: '${defaultVars.pageNumbersStyle}'`
    ].join('\n');

    const content = `import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const ${constName}: BaseTemplate = {
  genre: '${genreDisplay}',
  tone: '${toneConfig.display}',
  description: '${description}',
  baseCSS: UNIVERSAL_BASE_CSS,
  defaultVars: {
${defaultVarsLines}
  },
  puppeteerConfig: ${puppeteerConfig},
  epubConfig: ${epubConfig}
};
`;

    fs.writeFileSync(filePath, content, 'utf8');
    created.push(filePath);
  });
});

console.log(`Templates criados: ${created.length}. Templates existentes ignorados: ${skipped.length}.`);
