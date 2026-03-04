/**
 * KDP Margin Calculator Service
 * 
 * Calcula margens assimétricas para livros KDP conforme especificações da Amazon:
 * - Margem interna (binding/gutter): Maior que a externa para acomodar encadernação
 * - Páginas ímpares (direita): margem interna à ESQUERDA
 * - Páginas pares (esquerda): margem interna à DIREITA
 * - Capa: sem margens (bleed completo)
 * 
 * Referências:
 * - https://kdp.amazon.com/pt_BR/help/topic/G201834180 (Interior Guidelines)
 * - https://kdp.amazon.com/pt_BR/help/topic/GVBQ3CMEQW3W2VL6 (Trim Sizes)
 */

import { KDPTrimSize, KDP_TRIM_SIZES } from '../constants/kdp-trim-sizes';

export interface KDPMargins {
  /** Margem superior */
  top: number;
  /** Margem inferior */
  bottom: number;
  /** Margem interna (próxima à lombada/encadernação) */
  inside: number;
  /** Margem externa (borda livre do livro) */
  outside: number;
}

export interface KDPMarginsResult {
  /** Margens em milímetros */
  mm: KDPMargins;
  /** Margens em polegadas */
  inch: KDPMargins;
  /** Margens em pontos (para Puppeteer) */
  pt: KDPMargins;
  /** Margem de sangria (bleed) em mm - apenas para capas */
  bleedMM?: number;
}

export interface PageLayoutMargins {
  /** Margens para páginas ímpares (direita) */
  odd: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  /** Margens para páginas pares (esquerda) */
  even: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  /** Margens para capa (sem margem) */
  cover: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

/**
 * Tipo de interior do livro (afeta espessura e margem interna necessária)
 */
export type InteriorType = 'black-white' | 'black-cream' | 'color-standard' | 'color-premium';

/**
 * Configuração de margens customizadas
 */
export interface CustomMarginConfig {
  /** Margem superior customizada (mm) */
  top?: number;
  /** Margem inferior customizada (mm) */
  bottom?: number;
  /** Margem interna customizada (mm) */
  inside?: number;
  /** Margem externa customizada (mm) */
  outside?: number;
}

export class KDPMarginCalculatorService {
  /**
   * Margens mínimas recomendadas pela Amazon KDP (em mm)
   * 
   * Baseado em:
   * - Margin Guide: https://kdp.amazon.com/pt_BR/help/topic/G201834180
   * - Best Practices: Margem interna deve ser maior para acomodar a encadernação
   */
  private static readonly MIN_MARGINS_MM = {
    top: 12.7,      // 0.5" mínimo
    bottom: 12.7,   // 0.5" mínimo
    outside: 12.7,  // 0.5" mínimo
    inside: 15.875  // 0.625" mínimo (maior para acomodar binding)
  };

  /**
   * Margens recomendadas (maiores que o mínimo para melhor legibilidade)
   */
  private static readonly RECOMMENDED_MARGINS_MM = {
    top: 19.05,     // 0.75"
    bottom: 19.05,  // 0.75"
    outside: 15.875, // 0.625"
    inside: 22.225  // 0.875" (margem generosa para evitar perda de texto na dobra)
  };

  /**
   * Margem de sangria (bleed) para capas
   * KDP exige 3mm (0.125") de sangria em todos os lados da capa
   */
  private static readonly COVER_BLEED_MM = 3.175; // 0.125"

  /**
   * Fator de conversão
   */
  private static readonly MM_TO_INCH = 0.0393701;
  private static readonly MM_TO_PT = 2.83465;
  private static readonly INCH_TO_PT = 72;

  /**
   * Calcula margens baseadas no número de páginas (espessura do livro)
   * Livros mais grossos precisam de margem interna maior
   */
  private static calculateGutterAdjustment(pageCount: number, interiorType: InteriorType): number {
    // Espessura de página (mm) por tipo de papel
    const pageThickness: Record<InteriorType, number> = {
      'black-white': 0.0025 * 25.4,    // ~0.0025" por página
      'black-cream': 0.0027 * 25.4,    // Papel creme é ligeiramente mais grosso
      'color-standard': 0.0025 * 25.4,
      'color-premium': 0.0030 * 25.4   // Papel premium mais grosso
    };

    const spineThickness = pageCount * pageThickness[interiorType];

    // Ajuste adicional para livros mais grossos
    if (spineThickness > 12.7) { // > 0.5"
      return 3.175; // +0.125" adicional
    } else if (spineThickness > 6.35) { // > 0.25"
      return 1.5875; // +0.0625" adicional
    }
    
    return 0; // Livros finos não precisam de ajuste
  }

  /**
   * Calcula margens recomendadas para um formato KDP específico
   * 
   * @param trimSize - Formato KDP (ex: '6x9', '5.5x8.5')
   * @param pageCount - Número de páginas do livro
   * @param interiorType - Tipo de interior (preto/branco, cor, etc)
   * @param useMinimum - Se true, usa margens mínimas; se false, usa recomendadas
   * @param customMargins - Margens customizadas (sobrescreve recomendadas)
   * @returns Margens calculadas em diferentes unidades
   */
  static calculateMargins(
    trimSize: KDPTrimSize,
    pageCount: number = 100,
    interiorType: InteriorType = 'black-white',
    useMinimum: boolean = false,
    customMargins?: CustomMarginConfig
  ): KDPMarginsResult {
    const spec = KDP_TRIM_SIZES[trimSize];
    
    if (!spec) {
      throw new Error(`Invalid KDP trim size: ${trimSize}`);
    }

    // Margens base (mínimas ou recomendadas)
    const baseMargins = useMinimum 
      ? this.MIN_MARGINS_MM 
      : this.RECOMMENDED_MARGINS_MM;

    // Ajuste da margem interna baseado na espessura
    const gutterAdjustment = this.calculateGutterAdjustment(pageCount, interiorType);

    // Margens finais em mm
    const marginsInMM: KDPMargins = {
      top: customMargins?.top ?? baseMargins.top,
      bottom: customMargins?.bottom ?? baseMargins.bottom,
      outside: customMargins?.outside ?? baseMargins.outside,
      inside: customMargins?.inside ?? (baseMargins.inside + gutterAdjustment)
    };

    // Validar margens mínimas
    this.validateMargins(marginsInMM, spec.widthMM, spec.heightMM);

    // Converter para outras unidades
    const marginsInInch: KDPMargins = {
      top: marginsInMM.top * this.MM_TO_INCH,
      bottom: marginsInMM.bottom * this.MM_TO_INCH,
      outside: marginsInMM.outside * this.MM_TO_INCH,
      inside: marginsInMM.inside * this.MM_TO_INCH
    };

    const marginsInPt: KDPMargins = {
      top: marginsInMM.top * this.MM_TO_PT,
      bottom: marginsInMM.bottom * this.MM_TO_PT,
      outside: marginsInMM.outside * this.MM_TO_PT,
      inside: marginsInMM.inside * this.MM_TO_PT
    };

    return {
      mm: marginsInMM,
      inch: marginsInInch,
      pt: marginsInPt
    };
  }

  /**
   * Calcula margens para capa (sem margens, apenas bleed)
   */
  static calculateCoverMargins(trimSize: KDPTrimSize, pageCount: number, interiorType: InteriorType = 'black-white'): KDPMarginsResult {
    const spec = KDP_TRIM_SIZES[trimSize];
    
    if (!spec) {
      throw new Error(`Invalid KDP trim size: ${trimSize}`);
    }

    // Capa não tem margens, apenas bleed
    const marginsInMM: KDPMargins = {
      top: 0,
      bottom: 0,
      outside: 0,
      inside: 0
    };

    const marginsInInch: KDPMargins = {
      top: 0,
      bottom: 0,
      outside: 0,
      inside: 0
    };

    const marginsInPt: KDPMargins = {
      top: 0,
      bottom: 0,
      outside: 0,
      inside: 0
    };

    return {
      mm: marginsInMM,
      inch: marginsInInch,
      pt: marginsInPt,
      bleedMM: this.COVER_BLEED_MM
    };
  }

  /**
   * Gera CSS @page com margens assimétricas para páginas ímpares e pares
   * 
   * IMPORTANTE: Puppeteer/Chrome suportam as pseudo-classes:
   * - @page :left (páginas pares - página da esquerda quando livro aberto)
   * - @page :right (páginas ímpares - página da direita quando livro aberto)
   * 
   * Numa encadernação:
   * - Página PAR (esquerda): margem interna fica à DIREITA
   * - Página ÍMPAR (direita): margem interna fica à ESQUERDA
   */
  static generatePageCSS(
    trimSize: KDPTrimSize,
    pageCount: number = 100,
    interiorType: InteriorType = 'black-white',
    customMargins?: CustomMarginConfig
  ): string {
    const margins = this.calculateMargins(trimSize, pageCount, interiorType, false, customMargins);
    const spec = KDP_TRIM_SIZES[trimSize];

    const { top, bottom, inside, outside } = margins.mm;

    return `
/* ============================================
   KDP Margins - ${spec.name}
   ${pageCount} páginas, ${interiorType}
   ============================================ */

/* Configuração de página padrão */
@page {
  size: ${spec.widthMM}mm ${spec.heightMM}mm;
  margin: ${top}mm ${outside}mm ${bottom}mm ${inside}mm;
}

/* Página DIREITA (ímpar) - margem interna à ESQUERDA */
@page :right {
  margin-top: ${top}mm;
  margin-right: ${outside}mm;     /* externa */
  margin-bottom: ${bottom}mm;
  margin-left: ${inside}mm;       /* interna - maior */
}

/* Página ESQUERDA (par) - margem interna à DIREITA */
@page :left {
  margin-top: ${top}mm;
  margin-right: ${inside}mm;      /* interna - maior */
  margin-bottom: ${bottom}mm;
  margin-left: ${outside}mm;      /* externa */
}

/* Primeira página (capa) - sem margens */
@page :first {
  size: ${spec.widthMM}mm ${spec.heightMM}mm;
  margin: 0;
}

/* Garantir que o conteúdo não ultrapassa a área segura */
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
`.trim();
  }

  /**
   * Gera objeto de margens no formato esperado pelo Puppeteer page.pdf()
   * 
   * NOTA: Puppeteer aceita margens simétricas no page.pdf(), mas podemos
   * usar @page CSS para margens assimétricas mais avançadas
   */
  static generatePuppeteerMargins(
    trimSize: KDPTrimSize,
    pageCount: number = 100,
    interiorType: InteriorType = 'black-white',
    forCover: boolean = false
  ): { top: string; right: string; bottom: string; left: string } {
    if (forCover) {
      // Capa sem margens
      return {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      };
    }

    const margins = this.calculateMargins(trimSize, pageCount, interiorType);
    const { top, bottom, inside, outside } = margins.mm;

    // Para Puppeteer, usamos uma margem média
    // As margens assimétricas serão aplicadas via CSS @page :left/:right
    return {
      top: `${top}mm`,
      right: `${outside}mm`,
      bottom: `${bottom}mm`,
      left: `${inside}mm`
    };
  }

  /**
   * Gera layout de margens para aplicar via JavaScript (páginas alternadas)
   * Retorna margens específicas para páginas ímpares, pares e capa
   */
  static generatePageLayoutMargins(
    trimSize: KDPTrimSize,
    pageCount: number = 100,
    interiorType: InteriorType = 'black-white'
  ): PageLayoutMargins {
    const margins = this.calculateMargins(trimSize, pageCount, interiorType);
    const { top, bottom, inside, outside } = margins.mm;

    return {
      // Páginas ÍMPARES (direita) - margem interna à ESQUERDA
      odd: {
        top: `${top}mm`,
        right: `${outside}mm`,
        bottom: `${bottom}mm`,
        left: `${inside}mm`
      },
      // Páginas PARES (esquerda) - margem interna à DIREITA
      even: {
        top: `${top}mm`,
        right: `${inside}mm`,
        bottom: `${bottom}mm`,
        left: `${outside}mm`
      },
      // Capa - sem margens
      cover: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    };
  }

  /**
   * Valida se as margens são compatíveis com as dimensões da página
   * KDP exige área de texto mínima
   */
  private static validateMargins(margins: KDPMargins, pageWidthMM: number, pageHeightMM: number): void {
    const textAreaWidth = pageWidthMM - margins.inside - margins.outside;
    const textAreaHeight = pageHeightMM - margins.top - margins.bottom;

    // Área de texto mínima: 50% da página
    const minTextAreaWidth = pageWidthMM * 0.5;
    const minTextAreaHeight = pageHeightMM * 0.5;

    if (textAreaWidth < minTextAreaWidth) {
      throw new Error(
        `Margens horizontais muito grandes! Largura de texto (${textAreaWidth.toFixed(1)}mm) ` +
        `é menor que o mínimo recomendado (${minTextAreaWidth.toFixed(1)}mm)`
      );
    }

    if (textAreaHeight < minTextAreaHeight) {
      throw new Error(
        `Margens verticais muito grandes! Altura de texto (${textAreaHeight.toFixed(1)}mm) ` +
        `é menor que o mínimo recomendado (${minTextAreaHeight.toFixed(1)}mm)`
      );
    }

    // Verificar margens mínimas KDP
    if (margins.top < this.MIN_MARGINS_MM.top - 0.1) {
      console.warn(`⚠️ Margem superior (${margins.top}mm) menor que o mínimo KDP (${this.MIN_MARGINS_MM.top}mm)`);
    }
    if (margins.bottom < this.MIN_MARGINS_MM.bottom - 0.1) {
      console.warn(`⚠️ Margem inferior (${margins.bottom}mm) menor que o mínimo KDP (${this.MIN_MARGINS_MM.bottom}mm)`);
    }
    if (margins.outside < this.MIN_MARGINS_MM.outside - 0.1) {
      console.warn(`⚠️ Margem externa (${margins.outside}mm) menor que o mínimo KDP (${this.MIN_MARGINS_MM.outside}mm)`);
    }
    if (margins.inside < this.MIN_MARGINS_MM.inside - 0.1) {
      console.warn(`⚠️ Margem interna (${margins.inside}mm) menor que o mínimo KDP (${this.MIN_MARGINS_MM.inside}mm)`);
    }
  }

  /**
   * Helper para calcular dimensões da capa completa (frente + lombada + verso + bleed)
   * 
   * @param trimSize - Formato do livro
   * @param pageCount - Número de páginas
   * @param interiorType - Tipo de papel/interior
   * @returns Dimensões da capa em mm
   */
  static calculateCoverDimensions(
    trimSize: KDPTrimSize,
    pageCount: number,
    interiorType: InteriorType = 'black-white'
  ): { width: number; height: number; spineWidth: number } {
    const spec = KDP_TRIM_SIZES[trimSize];
    
    // Espessura de página (mm)
    const pageThickness: Record<InteriorType, number> = {
      'black-white': 0.002252 * 25.4,
      'black-cream': 0.0025 * 25.4,
      'color-standard': 0.002161 * 25.4,
      'color-premium': 0.002252 * 25.4
    };

    const spineWidth = pageCount * pageThickness[interiorType];
    
    // Largura da capa = (frente + verso) + lombada + 2 × bleed
    const coverWidth = (spec.widthMM * 2) + spineWidth + (this.COVER_BLEED_MM * 2);
    
    // Altura da capa = altura do livro + 2 × bleed
    const coverHeight = spec.heightMM + (this.COVER_BLEED_MM * 2);

    return {
      width: coverWidth,
      height: coverHeight,
      spineWidth
    };
  }
}
