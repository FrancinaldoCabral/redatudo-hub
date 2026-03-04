/**
 * Templates CSS Base para Ebooks - Arquivo Index
 * Exporta todos os templates organizados por gênero e tom
 */

// Exportar tipos e utilidades
export * from './types';
export * from './utils';

// Importar todos os templates
// Romance
export { romanceProfissional } from './templates/romance/profissional';
export { romanceCasual } from './templates/romance/casual';
export { romanceInspiracional } from './templates/romance/inspiracional';
export { romanceAcademico } from './templates/romance/academico';
export { romanceSerio } from './templates/romance/serio';
export { romanceFormal } from './templates/romance/formal';
export { romanceHumoristico } from './templates/romance/humoristico';
export { romanceConversacional } from './templates/romance/conversacional';

// Ficção Científica
export { ficcaoCientificaProfissional } from './templates/ficcao-cientifica/profissional';
export { ficcaoCientificaCasual } from './templates/ficcao-cientifica/casual';

// Fantasia
export { fantasiaProfissional } from './templates/fantasia/profissional';
export { fantasiaInspiracional } from './templates/fantasia/inspiracional';
export { fantasiaCasual } from './templates/fantasia/casual';

// Autoajuda
export { autoajudaProfissional } from './templates/autoajuda/profissional';
export { autoajudaInspiracional } from './templates/autoajuda/inspiracional';
export { autoajudaAcademico } from './templates/autoajuda/academico';

// Técnico
export { tecnicoProfissional } from './templates/tecnico/profissional';
export { tecnicoHumoristico } from './templates/tecnico/humoristico';

// Negócios
export { negociosSerio } from './templates/negocios/serio';

// Mistério
export { misterioConversacional } from './templates/misterio/conversacional';

// Horror
export { horrorFormal } from './templates/horror/formal';

// Biografia
export { biografiaProfissional } from './templates/biografia/profissional';

// História
export { historiaCasual } from './templates/historia/casual';

// Poesia
export { poesiaInspiracional } from './templates/poesia/inspiracional';

// Drama
export { dramaAcademico } from './templates/drama/academico';

// Aventura
export { aventuraHumoristico } from './templates/aventura/humoristico';

// Thriller
export { thrillerProfissional } from './templates/thriller/profissional';
export { thrillerSerio } from './templates/thriller/serio';

// Infantil
export { infantilConversacional } from './templates/infantil/conversacional';

// Outro
export { outroFormal } from './templates/outro/formal';

// Importar tudo novamente para criar o objeto consolidado
import { BaseTemplate } from './types';
import { romanceProfissional } from './templates/romance/profissional';
import { romanceCasual } from './templates/romance/casual';
import { romanceInspiracional } from './templates/romance/inspiracional';
import { romanceAcademico } from './templates/romance/academico';
import { romanceSerio } from './templates/romance/serio';
import { romanceFormal } from './templates/romance/formal';
import { romanceHumoristico } from './templates/romance/humoristico';
import { romanceConversacional } from './templates/romance/conversacional';
import { ficcaoCientificaProfissional } from './templates/ficcao-cientifica/profissional';
import { ficcaoCientificaCasual } from './templates/ficcao-cientifica/casual';
import { fantasiaProfissional } from './templates/fantasia/profissional';
import { fantasiaInspiracional } from './templates/fantasia/inspiracional';
import { fantasiaCasual } from './templates/fantasia/casual';
import { autoajudaProfissional } from './templates/autoajuda/profissional';
import { autoajudaInspiracional } from './templates/autoajuda/inspiracional';
import { autoajudaAcademico } from './templates/autoajuda/academico';
import { tecnicoProfissional } from './templates/tecnico/profissional';
import { tecnicoHumoristico } from './templates/tecnico/humoristico';
import { negociosSerio } from './templates/negocios/serio';
import { misterioConversacional } from './templates/misterio/conversacional';
import { horrorFormal } from './templates/horror/formal';
import { biografiaProfissional } from './templates/biografia/profissional';
import { historiaCasual } from './templates/historia/casual';
import { poesiaInspiracional } from './templates/poesia/inspiracional';
import { dramaAcademico } from './templates/drama/academico';
import { aventuraHumoristico } from './templates/aventura/humoristico';
import { thrillerProfissional } from './templates/thriller/profissional';
import { thrillerSerio } from './templates/thriller/serio';
import { infantilConversacional } from './templates/infantil/conversacional';
import { outroFormal } from './templates/outro/formal';

/**
 * Objeto consolidado com todos os templates
 * Chave: 'genero-tom' (normalizado)
 */
export const BASE_TEMPLATES: Record<string, BaseTemplate> = {
  'romance-profissional': romanceProfissional,
  'romance-casual': romanceCasual,
  'romance-inspiracional': romanceInspiracional,
  'romance-academico': romanceAcademico,
  'romance-serio': romanceSerio,
  'romance-formal': romanceFormal,
  'romance-humoristico': romanceHumoristico,
  'romance-conversacional': romanceConversacional,
  'ficcao-cientifica-profissional': ficcaoCientificaProfissional,
  'ficcao-cientifica-casual': ficcaoCientificaCasual,
  'fantasia-profissional': fantasiaProfissional,
  'fantasia-inspiracional': fantasiaInspiracional,
  'fantasia-casual': fantasiaCasual,
  'autoajuda-profissional': autoajudaProfissional,
  'autoajuda-inspiracional': autoajudaInspiracional,
  'autoajuda-academico': autoajudaAcademico,
  'tecnico-profissional': tecnicoProfissional,
  'tecnico-humoristico': tecnicoHumoristico,
  'negocios-serio': negociosSerio,
  'misterio-conversacional': misterioConversacional,
  'horror-formal': horrorFormal,
  'biografia-profissional': biografiaProfissional,
  'historia-casual': historiaCasual,
  'poesia-inspiracional': poesiaInspiracional,
  'drama-academico': dramaAcademico,
  'aventura-humoristico': aventuraHumoristico,
  'thriller-profissional': thrillerProfissional,
  'thriller-serio': thrillerSerio,
  'infantil-conversacional': infantilConversacional,
  'outro-formal': outroFormal
};

/**
 * Obtém template base por gênero e tom
 */
export function getBaseTemplate(genre: string, tone: string): BaseTemplate | null {
  const { normalizeTemplateKey } = require('./utils');
  const key = normalizeTemplateKey(genre, tone);
  return BASE_TEMPLATES[key] || null;
}

/**
 * Obtém template base ou fallback genérico
 */
export function getBaseTemplateOrFallback(genre: string, tone: string): BaseTemplate {
  const template = getBaseTemplate(genre, tone);
  
  if (template) {
    return template;
  }
  
  // Fallback genérico usando UNIVERSAL_BASE_CSS
  const { UNIVERSAL_BASE_CSS } = require('./universal-base.css');
  
  return {
    genre: 'Outro',
    tone: 'Profissional',
    description: 'Design genérico padrão',
    baseCSS: UNIVERSAL_BASE_CSS,
    defaultVars: {
      primaryColor: '#2C3E50',
      secondaryColor: '#7F8C8D',
      accentColor: '#3498DB',
      backgroundColor: '#FFFFFF',
      textColor: '#333333',
      fontPrimary: 'Georgia, "Times New Roman", serif',
      fontHeadings: 'Arial, Helvetica, sans-serif',
      fontCode: '"Courier New", Courier, monospace',
      lineHeight: '1.6',
      paragraphMargin: '1em',
      headingMarginTop: '2em',
      headingMarginBottom: '0.6em',
      chapterDropCap: false,
      chapterDivider: '***',
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
}
