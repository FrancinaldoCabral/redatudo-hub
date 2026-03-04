/**
 * KDP Cover Adapter Service
 * 
 * Adapta e redimensiona capas de ebooks para formatos KDP compatíveis.
 * Gerencia dimensões corretas incluindo bleed (sangria) e spine (lombada).
 * 
 * Funções:
 * - Redimensionar capas existentes para formatos KDP específicos
 * - Adicionar bleed (3.175mm) em todos os lados
 * - Calcular dimensões de capas completas (frente + lombada + verso)
 * - Validar compatibilidade de imagens de capa
 * 
 * Referências:
 * - https://kdp.amazon.com/pt_BR/help/topic/G201953020 (Cover Guidelines)
 */

import { KDPTrimSize, KDP_TRIM_SIZES } from '../constants/kdp-trim-sizes';
import { KDPMarginCalculatorService, InteriorType } from './kdp-margin-calculator.service';

export interface CoverDimensions {
  /** Largura total da capa em mm */
  widthMM: number;
  /** Altura total da capa em mm */
  heightMM: number;
  /** Largura em pixels (300 DPI) */
  widthPx: number;
  /** Altura em pixels (300 DPI) */
  heightPx: number;
  /** Largura da lombada em mm */
  spineWidthMM: number;
  /** Largura da lombada em pixels */
  spineWidthPx: number;
  /** Bleed em mm */
  bleedMM: number;
  /** Bleed em pixels */
  bleedPx: number;
}

export interface CoverLayout {
  /** Área completa da capa */
  total: CoverDimensions;
  /** Área da frente (sem bleed) */
  front: {
    widthMM: number;
    heightMM: number;
    widthPx: number;
    heightPx: number;
    offsetXPx: number; // Posição X onde inicia a frente
  };
  /** Área da lombada (sem bleed) */
  spine: {
    widthMM: number;
    heightMM: number;
    widthPx: number;
    heightPx: number;
    offsetXPx: number; // Posição X onde inicia a lombada
  };
  /** Área do verso (sem bleed) */
  back: {
    widthMM: number;
    heightMM: number;
    widthPx: number;
    heightPx: number;
    offsetXPx: number; // Posição X onde inicia o verso
  };
}

export interface CoverValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export class KDPCoverAdapterService {
  /**
   * DPI padrão KDP para capas
   * Mínimo: 72 DPI | Recomendado: 300 DPI
   */
  private static readonly KDP_COVER_DPI = 300;
  private static readonly KDP_MIN_DPI = 72;

  /**
   * Bleed padrão KDP (em mm)
   */
  private static readonly BLEED_MM = 3.175; // 0.125"

  /**
   * Fator de conversão MM → PX @ 300 DPI
   */
  private static readonly MM_TO_PX_300DPI = 11.811; // 300 DPI ≈ 11.811 px/mm

  /**
   * Calcula dimensões completas da capa para um formato KDP
   * 
   * @param trimSize - Formato KDP (ex: '6x9')
   * @param pageCount - Número de páginas do livro
   * @param interiorType - Tipo de interior (afeta espessura da lombada)
   * @returns Dimensões completas da capa
   */
  static calculateCoverDimensions(
    trimSize: KDPTrimSize,
    pageCount: number,
    interiorType: InteriorType = 'black-white'
  ): CoverDimensions {
    const spec = KDP_TRIM_SIZES[trimSize];
    
    if (!spec) {
      throw new Error(`Invalid KDP trim size: ${trimSize}`);
    }

    // Calcula dimensões via margin calculator (que já tem a lógica de spine)
    const coverDims = KDPMarginCalculatorService.calculateCoverDimensions(
      trimSize,
      pageCount,
      interiorType
    );

    // Converte para pixels @ 300 DPI
    const widthPx = Math.ceil(coverDims.width * this.MM_TO_PX_300DPI);
    const heightPx = Math.ceil(coverDims.height * this.MM_TO_PX_300DPI);
    const spineWidthPx = Math.ceil(coverDims.spineWidth * this.MM_TO_PX_300DPI);
    const bleedPx = Math.ceil(this.BLEED_MM * this.MM_TO_PX_300DPI);

    return {
      widthMM: coverDims.width,
      heightMM: coverDims.height,
      widthPx,
      heightPx,
      spineWidthMM: coverDims.spineWidth,
      spineWidthPx,
      bleedMM: this.BLEED_MM,
      bleedPx
    };
  }

  /**
   * Calcula layout detalhado da capa (frente, lombada, verso)
   * 
   * @param trimSize - Formato KDP
   * @param pageCount - Número de páginas
   * @param interiorType - Tipo de interior
   * @returns Layout completo com posições de cada seção
   */
  static calculateCoverLayout(
    trimSize: KDPTrimSize,
    pageCount: number,
    interiorType: InteriorType = 'black-white'
  ): CoverLayout {
    const total = this.calculateCoverDimensions(trimSize, pageCount, interiorType);
    const spec = KDP_TRIM_SIZES[trimSize];

    // Dimensões de cada seção (sem bleed)
    const trimWidthMM = spec.widthMM;
    const trimHeightMM = spec.heightMM;
    const trimWidthPx = Math.ceil(trimWidthMM * this.MM_TO_PX_300DPI);
    const trimHeightPx = Math.ceil(trimHeightMM * this.MM_TO_PX_300DPI);

    // Layout: [bleed] [VERSO] [LOMBADA] [FRENTE] [bleed]
    const bleedPx = total.bleedPx;
    const backOffsetX = bleedPx;
    const spineOffsetX = backOffsetX + trimWidthPx;
    const frontOffsetX = spineOffsetX + total.spineWidthPx;

    return {
      total,
      back: {
        widthMM: trimWidthMM,
        heightMM: trimHeightMM,
        widthPx: trimWidthPx,
        heightPx: trimHeightPx,
        offsetXPx: backOffsetX
      },
      spine: {
        widthMM: total.spineWidthMM,
        heightMM: trimHeightMM,
        widthPx: total.spineWidthPx,
        heightPx: trimHeightPx,
        offsetXPx: spineOffsetX
      },
      front: {
        widthMM: trimWidthMM,
        heightMM: trimHeightMM,
        widthPx: trimWidthPx,
        heightPx: trimHeightPx,
        offsetXPx: frontOffsetX
      }
    };
  }

  /**
   * Gera CSS para renderizar capa com dimensões corretas
   * 
   * @param trimSize - Formato KDP
   * @param pageCount - Número de páginas
   * @param interiorType - Tipo de interior
   * @returns CSS para aplicar na capa
   */
  static generateCoverCSS(
    trimSize: KDPTrimSize,
    pageCount: number,
    interiorType: InteriorType = 'black-white'
  ): string {
    const dims = this.calculateCoverDimensions(trimSize, pageCount, interiorType);
    const spec = KDP_TRIM_SIZES[trimSize];

    return `
/* ============================================
   KDP Cover - ${spec.name}
   ${pageCount} páginas, ${interiorType}
   ============================================ */

/* Página de capa - dimensões exatas com bleed */
@page :first {
  size: ${dims.widthMM}mm ${dims.heightMM}mm;
  margin: 0;
}

/* Container da capa */
.cover-page,
.ebook-cover-page {
  width: ${dims.widthMM}mm;
  height: ${dims.heightMM}mm;
  margin: 0;
  padding: 0;
  position: relative;
  overflow: hidden;
  page-break-after: always;
}

/* Imagem de capa - preenche toda a área incluindo bleed */
.cover-page img,
.ebook-cover-page img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Área segura da capa (sem bleed) - para textos importantes */
.cover-safe-area {
  position: absolute;
  top: ${dims.bleedMM}mm;
  left: ${dims.bleedMM}mm;
  right: ${dims.bleedMM}mm;
  bottom: ${dims.bleedMM}mm;
  pointer-events: none;
}

/* Área da frente (para capas completas com lombada) */
.cover-front-area {
  position: absolute;
  top: ${dims.bleedMM}mm;
  right: ${dims.bleedMM}mm;
  width: ${spec.widthMM}mm;
  height: ${spec.heightMM}mm;
}

/* Área da lombada (apenas para livros com páginas suficientes) */
.cover-spine-area {
  position: absolute;
  top: ${dims.bleedMM}mm;
  left: 50%;
  transform: translateX(-50%);
  width: ${dims.spineWidthMM}mm;
  height: ${spec.heightMM}mm;
  display: ${dims.spineWidthMM > 3 ? 'block' : 'none'}; /* Oculta se lombada muito fina */
}

/* Área do verso */
.cover-back-area {
  position: absolute;
  top: ${dims.bleedMM}mm;
  left: ${dims.bleedMM}mm;
  width: ${spec.widthMM}mm;
  height: ${spec.heightMM}mm;
}
`.trim();
  }

  /**
   * Valida se uma imagem de capa está compatível com KDP
   * 
   * @param imageWidthPx - Largura da imagem em pixels
   * @param imageHeightPx - Altura da imagem em pixels
   * @param trimSize - Formato KDP desejado
   * @param pageCount - Número de páginas
   * @param interiorType - Tipo de interior
   * @returns Resultado da validação com warnings/errors
   */
  static validateCoverImage(
    imageWidthPx: number,
    imageHeightPx: number,
    trimSize: KDPTrimSize,
    pageCount: number,
    interiorType: InteriorType = 'black-white'
  ): CoverValidation {
    const requiredDims = this.calculateCoverDimensions(trimSize, pageCount, interiorType);
    const spec = KDP_TRIM_SIZES[trimSize];

    const validation: CoverValidation = {
      isValid: true,
      warnings: [],
      errors: [],
      recommendations: []
    };

    // Calcula DPI da imagem fornecida
    const imageDPI = Math.round((imageWidthPx / requiredDims.widthMM) * 25.4);

    // Verifica DPI mínimo
    if (imageDPI < this.KDP_MIN_DPI) {
      validation.isValid = false;
      validation.errors.push(
        `DPI muito baixo (${imageDPI} DPI). Mínimo KDP: ${this.KDP_MIN_DPI} DPI. ` +
        `Imagem deveria ter pelo menos ${Math.ceil(requiredDims.widthMM * this.KDP_MIN_DPI / 25.4)}x${Math.ceil(requiredDims.heightMM * this.KDP_MIN_DPI / 25.4)}px`
      );
    } else if (imageDPI < this.KDP_COVER_DPI) {
      validation.warnings.push(
        `DPI abaixo do recomendado (${imageDPI} DPI). Recomendado: ${this.KDP_COVER_DPI} DPI. ` +
        `Para melhor qualidade, use ${requiredDims.widthPx}x${requiredDims.heightPx}px`
      );
    }

    // Verifica proporções (aspect ratio)
    const requiredRatio = requiredDims.widthPx / requiredDims.heightPx;
    const imageRatio = imageWidthPx / imageHeightPx;
    const ratioDiff = Math.abs(requiredRatio - imageRatio) / requiredRatio;

    if (ratioDiff > 0.1) { // Mais de 10% de diferença
      validation.warnings.push(
        `Proporção da imagem (${imageRatio.toFixed(2)}) não corresponde ao formato KDP ` +
        `${spec.name} (${requiredRatio.toFixed(2)}). A imagem será redimensionada/cortada.`
      );
    }

    // Verifica dimensões exatas
    if (imageWidthPx !== requiredDims.widthPx || imageHeightPx !== requiredDims.heightPx) {
      validation.recommendations.push(
        `Dimensões ideais para ${spec.name} com ${pageCount} páginas: ` +
        `${requiredDims.widthPx}x${requiredDims.heightPx}px @ ${this.KDP_COVER_DPI} DPI`
      );
    }

    // Verifica se imagem é muito pequena
    if (imageWidthPx < requiredDims.widthPx * 0.8 || imageHeightPx < requiredDims.heightPx * 0.8) {
      validation.warnings.push(
        `Imagem menor que o recomendado. Ao escalar pode perder qualidade. ` +
        `Tamanho atual: ${imageWidthPx}x${imageHeightPx}px. ` +
        `Recomendado: ${requiredDims.widthPx}x${requiredDims.heightPx}px`
      );
    }

    // Recomendações de melhoria
    if (validation.warnings.length === 0 && validation.errors.length === 0) {
      validation.recommendations.push('✅ Imagem de capa compatível com os padrões KDP!');
    } else {
      validation.recommendations.push(
        `Considere usar uma ferramenta como Canva ou GIMP para criar uma capa de ` +
        `${requiredDims.widthPx}x${requiredDims.heightPx}px @ ${this.KDP_COVER_DPI} DPI`
      );
    }

    return validation;
  }

  /**
   * Gera template HTML/CSS para capa simples (apenas frente)
   * Útil para gerar PDFs de capa que serão mesclados com o interior
   */
  static generateSimpleCoverHTML(
    trimSize: KDPTrimSize,
    coverImageUrl: string,
    title: string,
    author?: string
  ): string {
    const spec = KDP_TRIM_SIZES[trimSize];
    
    // Para capa simples (apenas frente), usamos dimensões do trim sem lombada
    const widthMM = spec.widthMM + (this.BLEED_MM * 2);
    const heightMM = spec.heightMM + (this.BLEED_MM * 2);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Capa - ${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: ${widthMM}mm ${heightMM}mm;
      margin: 0;
    }

    body {
      width: ${widthMM}mm;
      height: ${heightMM}mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    .cover-container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #000;
    }

    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .cover-overlay {
      position: absolute;
      top: ${this.BLEED_MM}mm;
      left: ${this.BLEED_MM}mm;
      right: ${this.BLEED_MM}mm;
      bottom: ${this.BLEED_MM}mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      color: white;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      padding: 20mm;
    }

    .cover-title {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 10mm;
      font-family: 'Georgia', serif;
    }

    .cover-author {
      font-size: 16pt;
      font-family: 'Georgia', serif;
    }
  </style>
</head>
<body>
  <div class="cover-container">
    <img src="${coverImageUrl}" alt="${title}" class="cover-image" />
    <div class="cover-overlay">
      <h1 class="cover-title">${this.escapeHtml(title)}</h1>
      ${author ? `<p class="cover-author">${this.escapeHtml(author)}</p>` : ''}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Calcula dimensões de capa simplificada (apenas frente, sem lombada)
   * Útil quando a capa é gerada separadamente do interior
   */
  static calculateSimpleCoverDimensions(trimSize: KDPTrimSize): CoverDimensions {
    const spec = KDP_TRIM_SIZES[trimSize];
    
    // Dimensões com bleed (sem lombada)
    const widthMM = spec.widthMM + (this.BLEED_MM * 2);
    const heightMM = spec.heightMM + (this.BLEED_MM * 2);
    
    const widthPx = Math.ceil(widthMM * this.MM_TO_PX_300DPI);
    const heightPx = Math.ceil(heightMM * this.MM_TO_PX_300DPI);
    const bleedPx = Math.ceil(this.BLEED_MM * this.MM_TO_PX_300DPI);

    return {
      widthMM,
      heightMM,
      widthPx,
      heightPx,
      spineWidthMM: 0,
      spineWidthPx: 0,
      bleedMM: this.BLEED_MM,
      bleedPx
    };
  }

  /**
   * Helper para escapar HTML
   */
  private static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Gera informações resumidas sobre os requisitos da capa
   */
  static getCoverRequirements(
    trimSize: KDPTrimSize,
    pageCount: number,
    interiorType: InteriorType = 'black-white'
  ): string {
    const dims = this.calculateCoverDimensions(trimSize, pageCount, interiorType);
    const spec = KDP_TRIM_SIZES[trimSize];

    return `
📐 REQUISITOS DE CAPA KDP - ${spec.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 Formato do Livro:
   • Tamanho: ${spec.name}
   • Páginas: ${pageCount}
   • Tipo: ${interiorType}

📏 Dimensões da Capa (com bleed):
   • Largura: ${dims.widthMM.toFixed(1)} mm (${dims.widthPx} px)
   • Altura: ${dims.heightMM.toFixed(1)} mm (${dims.heightPx} px)
   • Lombada: ${dims.spineWidthMM.toFixed(2)} mm (${dims.spineWidthPx} px)
   • Bleed: ${dims.bleedMM} mm (${dims.bleedPx} px)

📐 Dimensões sem Bleed:
   • Frente/Verso: ${spec.widthMM} × ${spec.heightMM} mm
   • Pixels: ${Math.ceil(spec.widthMM * this.MM_TO_PX_300DPI)} × ${Math.ceil(spec.heightMM * this.MM_TO_PX_300DPI)} px

🎨 Especificações Técnicas:
   • Resolução: ${this.KDP_COVER_DPI} DPI (recomendado)
   • Mínimo: ${this.KDP_MIN_DPI} DPI
   • Modo de cor: RGB para eBooks, CMYK para impressão
   • Formato: JPG, PNG ou TIFF

⚠️ Notas Importantes:
   • Textos/logos importantes devem ficar a pelo menos ${dims.bleedMM}mm das bordas
   • A lombada só é visível para livros com 48+ páginas
   • Certifique-se de que a imagem cobre toda a área incluindo bleed
   • Evite textos críticos muito próximos à borda de corte

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  }
}
