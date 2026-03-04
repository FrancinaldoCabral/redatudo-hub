/**
 * Faixas de palavras disponíveis para geração de ebooks
 */

export interface WordRange {
  id: string;
  label: string;
  min: number;
  max: number;
  recommended: number;
  description: string;
  default?: boolean;
}

/**
 * Faixas predefinidas de palavras
 */
export const WORD_RANGES: WordRange[] = [
  {
    id: 'extra-short',
    label: 'Extra Curta',
    min: 100,
    max: 300,
    recommended: 200,
    description: 'Ideal para resumos e descrições breves'
  },
  {
    id: 'short',
    label: 'Curta',
    min: 300,
    max: 600,
    recommended: 450,
    description: 'Parágrafos e seções pequenas'
  },
  {
    id: 'medium',
    label: 'Média',
    min: 600,
    max: 1200,
    recommended: 900,
    description: 'Capítulos normais (padrão)',
    default: true
  },
  {
    id: 'long',
    label: 'Longa',
    min: 1200,
    max: 2500,
    recommended: 1850,
    description: 'Capítulos extensos e detalhados'
  },
  {
    id: 'extra-long',
    label: 'Extra Longa',
    min: 2500,
    max: 5000,
    recommended: 3750,
    description: 'Gerações massivas de conteúdo'
  }
];

/**
 * Limites globais de palavras
 */
export const WORD_LIMITS = {
  MIN: 100,
  MAX: 5000,
  DEFAULT: 900
};

/**
 * Obtém faixa padrão
 */
export function getDefaultWordRange(): WordRange {
  return WORD_RANGES.find(r => r.default) || WORD_RANGES[2];
}

/**
 * Obtém faixa por ID
 */
export function getWordRangeById(id: string): WordRange | undefined {
  return WORD_RANGES.find(r => r.id === id);
}

/**
 * Valida se um número de palavras está dentro dos limites
 */
export function isValidWordCount(words: number): boolean {
  return words >= WORD_LIMITS.MIN && words <= WORD_LIMITS.MAX;
}

/**
 * Encontra a faixa mais apropriada para um número de palavras
 */
export function findRangeForWordCount(words: number): WordRange | undefined {
  return WORD_RANGES.find(r => words >= r.min && words <= r.max);
}
