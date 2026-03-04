/**
 * Amazon KDP Trim Sizes (Dimensões Finais do Livro)
 * Baseado em: https://kdp.amazon.com/pt_BR/help/topic/GVBQ3CMEQW3W2VL6
 * 
 * Inclui formatos para:
 * - kdp.amazon.com (mercado US/global)
 * - kdp.amazon.co.jp (mercado japonês)
 */

export interface KDPTrimSizeSpec {
  name: string;
  widthInch: number;
  heightInch: number;
  widthMM: number;
  heightMM: number;
  category: 'regular' | 'large' | 'hardcover' | 'square';
  market: 'us' | 'jp' | 'both';
  minPages: number;
  maxPages: {
    blackWhite: number;
    blackCream: number;
    colorStandard: number;
    colorPremium: number;
  };
}

export type KDPTrimSize =
  // ========== CAPA COMUM - REGULARES (US) ==========
  | '5x8'           // 12,7 x 20,32 cm
  | '5.06x7.81'     // 12,85 x 19,84 cm
  | '5.25x8'        // 13,34 x 20,32 cm
  | '5.5x8.5'       // 13,97 x 21,59 cm
  | '6x9'           // 15,24 x 22,86 cm (MAIS POPULAR)
  
  // ========== CAPA COMUM - GRANDES (US) ==========
  | '6.14x9.21'     // 15,6 x 23,39 cm
  | '6.69x9.61'     // 16,99 x 24,41 cm
  | '7x10'          // 17,78 x 25,4 cm
  | '7.44x9.69'     // 18,9 x 24,61 cm
  | '7.5x9.25'      // 19,05 x 23,5 cm
  | '8x10'          // 20,32 x 25,4 cm
  | '8.25x6'        // 20,96 x 15,24 cm (landscape)
  | '8.25x8.25'     // 20,96 x 20,96 cm (quadrado)
  | '8.5x8.5'       // 21,59 x 21,59 cm (quadrado)
  | '8.5x11'        // 21,59 x 27,94 cm
  | '8.27x11.69'    // 21 x 29,7 cm (próximo ao A4)
  
  // ========== CAPA DURA (US) ==========
  | '5.5x8.5-hc'    // 13,97 x 21,59 cm
  | '6x9-hc'        // 15,24 x 22,86 cm
  | '6.14x9.21-hc'  // 15,6 x 23,39 cm
  | '7x10-hc'       // 17,78 x 25,4 cm
  | '8.25x11-hc'    // 20,96 x 27,94 cm
  
  // ========== JAPÃO (kdp.amazon.co.jp) ==========
  | '4.06x7.17'     // 10,3 x 18,2 cm
  | '4.13x6.81'     // 10,5 x 17,3 cm
  | '4.41x6.85'     // 11,2 x 17,4 cm
  | '5x7.4'         // 12,7 x 18,8 cm
  | '5.04x7.17'     // 12,8 x 18,2 cm
  | '5.83x8.27'     // 14,8 x 21,0 cm
  | '5.98x8.58'     // 15,2 x 21,8 cm
  | '5.98x8.94'     // 15,2 x 22,7 cm
  | '7.17x10.12'    // 18,2 x 25,7 cm (grande)
  | '7.17x8.11'     // 18,2 x 20,6 cm (grande)
  | '8.27x10.12'    // 21,0 x 25,7 cm (grande)
  | '8.27x11.69-jp'; // 21,0 x 29,7 cm (grande)

export const KDP_TRIM_SIZES: Record<KDPTrimSize, KDPTrimSizeSpec> = {
  // ========== CAPA COMUM - REGULARES (US) ==========
  '5x8': {
    name: '5" × 8" (12,7 × 20,32 cm)',
    widthInch: 5,
    heightInch: 8,
    widthMM: 127,
    heightMM: 203.2,
    category: 'regular',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '5.06x7.81': {
    name: '5.06" × 7.81" (12,85 × 19,84 cm)',
    widthInch: 5.06,
    heightInch: 7.81,
    widthMM: 128.5,
    heightMM: 198.4,
    category: 'regular',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '5.25x8': {
    name: '5.25" × 8" (13,34 × 20,32 cm)',
    widthInch: 5.25,
    heightInch: 8,
    widthMM: 133.4,
    heightMM: 203.2,
    category: 'regular',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '5.5x8.5': {
    name: '5.5" × 8.5" (13,97 × 21,59 cm)',
    widthInch: 5.5,
    heightInch: 8.5,
    widthMM: 139.7,
    heightMM: 215.9,
    category: 'regular',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '6x9': {
    name: '6" × 9" (15,24 × 22,86 cm) ⭐ MAIS POPULAR',
    widthInch: 6,
    heightInch: 9,
    widthMM: 152.4,
    heightMM: 228.6,
    category: 'regular',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },

  // ========== CAPA COMUM - GRANDES (US) ==========
  '6.14x9.21': {
    name: '6.14" × 9.21" (15,6 × 23,39 cm) - Grande',
    widthInch: 6.14,
    heightInch: 9.21,
    widthMM: 156,
    heightMM: 233.9,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '6.69x9.61': {
    name: '6.69" × 9.61" (16,99 × 24,41 cm) - Grande',
    widthInch: 6.69,
    heightInch: 9.61,
    widthMM: 169.9,
    heightMM: 244.1,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '7x10': {
    name: '7" × 10" (17,78 × 25,4 cm) - Grande',
    widthInch: 7,
    heightInch: 10,
    widthMM: 177.8,
    heightMM: 254,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '7.44x9.69': {
    name: '7.44" × 9.69" (18,9 × 24,61 cm) - Grande',
    widthInch: 7.44,
    heightInch: 9.69,
    widthMM: 189,
    heightMM: 246.1,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '7.5x9.25': {
    name: '7.5" × 9.25" (19,05 × 23,5 cm) - Grande',
    widthInch: 7.5,
    heightInch: 9.25,
    widthMM: 190.5,
    heightMM: 235,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '8x10': {
    name: '8" × 10" (20,32 × 25,4 cm) - Grande',
    widthInch: 8,
    heightInch: 10,
    widthMM: 203.2,
    heightMM: 254,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '8.25x6': {
    name: '8.25" × 6" (20,96 × 15,24 cm) - Grande Paisagem',
    widthInch: 8.25,
    heightInch: 6,
    widthMM: 209.6,
    heightMM: 152.4,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 800, blackCream: 750, colorStandard: 600, colorPremium: 800 }
  },
  '8.25x8.25': {
    name: '8.25" × 8.25" (20,96 × 20,96 cm) - Quadrado Grande',
    widthInch: 8.25,
    heightInch: 8.25,
    widthMM: 209.6,
    heightMM: 209.6,
    category: 'square',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 800, blackCream: 750, colorStandard: 600, colorPremium: 800 }
  },
  '8.5x8.5': {
    name: '8.5" × 8.5" (21,59 × 21,59 cm) - Quadrado Grande',
    widthInch: 8.5,
    heightInch: 8.5,
    widthMM: 215.9,
    heightMM: 215.9,
    category: 'square',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 590, blackCream: 550, colorStandard: 600, colorPremium: 590 }
  },
  '8.5x11': {
    name: '8.5" × 11" (21,59 × 27,94 cm) - Letter',
    widthInch: 8.5,
    heightInch: 11,
    widthMM: 215.9,
    heightMM: 279.4,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 590, blackCream: 550, colorStandard: 600, colorPremium: 590 }
  },
  '8.27x11.69': {
    name: '8.27" × 11.69" (21 × 29,7 cm) - Próximo ao A4',
    widthInch: 8.27,
    heightInch: 11.69,
    widthMM: 210,
    heightMM: 297,
    category: 'large',
    market: 'us',
    minPages: 24,
    maxPages: { blackWhite: 780, blackCream: 730, colorStandard: 0, colorPremium: 590 }
  },

  // ========== CAPA DURA (US) ==========
  '5.5x8.5-hc': {
    name: '5.5" × 8.5" (13,97 × 21,59 cm) - Capa Dura',
    widthInch: 5.5,
    heightInch: 8.5,
    widthMM: 139.7,
    heightMM: 215.9,
    category: 'hardcover',
    market: 'us',
    minPages: 75,
    maxPages: { blackWhite: 550, blackCream: 550, colorStandard: 0, colorPremium: 550 }
  },
  '6x9-hc': {
    name: '6" × 9" (15,24 × 22,86 cm) - Capa Dura',
    widthInch: 6,
    heightInch: 9,
    widthMM: 152.4,
    heightMM: 228.6,
    category: 'hardcover',
    market: 'us',
    minPages: 75,
    maxPages: { blackWhite: 550, blackCream: 550, colorStandard: 0, colorPremium: 550 }
  },
  '6.14x9.21-hc': {
    name: '6.14" × 9.21" (15,6 × 23,39 cm) - Capa Dura Grande',
    widthInch: 6.14,
    heightInch: 9.21,
    widthMM: 156,
    heightMM: 233.9,
    category: 'hardcover',
    market: 'us',
    minPages: 75,
    maxPages: { blackWhite: 550, blackCream: 550, colorStandard: 0, colorPremium: 550 }
  },
  '7x10-hc': {
    name: '7" × 10" (17,78 × 25,4 cm) - Capa Dura Grande',
    widthInch: 7,
    heightInch: 10,
    widthMM: 177.8,
    heightMM: 254,
    category: 'hardcover',
    market: 'us',
    minPages: 75,
    maxPages: { blackWhite: 550, blackCream: 550, colorStandard: 0, colorPremium: 550 }
  },
  '8.25x11-hc': {
    name: '8.25" × 11" (20,96 × 27,94 cm) - Capa Dura Grande',
    widthInch: 8.25,
    heightInch: 11,
    widthMM: 209.6,
    heightMM: 279.4,
    category: 'hardcover',
    market: 'us',
    minPages: 75,
    maxPages: { blackWhite: 550, blackCream: 550, colorStandard: 0, colorPremium: 550 }
  },

  // ========== JAPÃO - REGULARES ==========
  '4.06x7.17': {
    name: '4.06" × 7.17" (10,3 × 18,2 cm) - JP',
    widthInch: 4.06,
    heightInch: 7.17,
    widthMM: 103,
    heightMM: 182,
    category: 'regular',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '4.13x6.81': {
    name: '4.13" × 6.81" (10,5 × 17,3 cm) - JP',
    widthInch: 4.13,
    heightInch: 6.81,
    widthMM: 105,
    heightMM: 173,
    category: 'regular',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '4.41x6.85': {
    name: '4.41" × 6.85" (11,2 × 17,4 cm) - JP',
    widthInch: 4.41,
    heightInch: 6.85,
    widthMM: 112,
    heightMM: 174,
    category: 'regular',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '5x7.4': {
    name: '5" × 7.4" (12,7 × 18,8 cm) - JP',
    widthInch: 5,
    heightInch: 7.4,
    widthMM: 127,
    heightMM: 188,
    category: 'regular',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '5.04x7.17': {
    name: '5.04" × 7.17" (12,8 × 18,2 cm) - JP',
    widthInch: 5.04,
    heightInch: 7.17,
    widthMM: 128,
    heightMM: 182,
    category: 'regular',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '5.83x8.27': {
    name: '5.83" × 8.27" (14,8 × 21,0 cm) - JP',
    widthInch: 5.83,
    heightInch: 8.27,
    widthMM: 148,
    heightMM: 210,
    category: 'regular',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '5.98x8.58': {
    name: '5.98" × 8.58" (15,2 × 21,8 cm) - JP',
    widthInch: 5.98,
    heightInch: 8.58,
    widthMM: 152,
    heightMM: 218,
    category: 'regular',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '5.98x8.94': {
    name: '5.98" × 8.94" (15,2 × 22,7 cm) - JP',
    widthInch: 5.98,
    heightInch: 8.94,
    widthMM: 152,
    heightMM: 227,
    category: 'regular',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },

  // ========== JAPÃO - GRANDES ==========
  '7.17x10.12': {
    name: '7.17" × 10.12" (18,2 × 25,7 cm) - JP Grande',
    widthInch: 7.17,
    heightInch: 10.12,
    widthMM: 182,
    heightMM: 257,
    category: 'large',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '7.17x8.11': {
    name: '7.17" × 8.11" (18,2 × 20,6 cm) - JP Grande',
    widthInch: 7.17,
    heightInch: 8.11,
    widthMM: 182,
    heightMM: 206,
    category: 'large',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 828, blackCream: 776, colorStandard: 600, colorPremium: 828 }
  },
  '8.27x10.12': {
    name: '8.27" × 10.12" (21,0 × 25,7 cm) - JP Grande',
    widthInch: 8.27,
    heightInch: 10.12,
    widthMM: 210,
    heightMM: 257,
    category: 'large',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 780, blackCream: 730, colorStandard: 600, colorPremium: 780 }
  },
  '8.27x11.69-jp': {
    name: '8.27" × 11.69" (21,0 × 29,7 cm) - JP Grande',
    widthInch: 8.27,
    heightInch: 11.69,
    widthMM: 210,
    heightMM: 297,
    category: 'large',
    market: 'jp',
    minPages: 24,
    maxPages: { blackWhite: 780, blackCream: 730, colorStandard: 0, colorPremium: 780 }
  }
};

/**
 * Helper para obter lista de formatos por categoria
 */
export function getKDPFormatsByCategory(category?: 'regular' | 'large' | 'hardcover' | 'square'): KDPTrimSize[] {
  const entries = Object.entries(KDP_TRIM_SIZES) as [KDPTrimSize, KDPTrimSizeSpec][];
  
  if (!category) {
    return entries.map(([key]) => key);
  }
  
  return entries
    .filter(([_, spec]) => spec.category === category)
    .map(([key]) => key);
}

/**
 * Helper para obter formatos mais populares
 */
export function getPopularKDPFormats(): KDPTrimSize[] {
  return ['6x9', '5.5x8.5', '8.5x11', '5x8', '7x10'];
}

/**
 * Helper para validar se formato existe
 */
export function isValidKDPTrimSize(size: string): size is KDPTrimSize {
  return size in KDP_TRIM_SIZES;
}
