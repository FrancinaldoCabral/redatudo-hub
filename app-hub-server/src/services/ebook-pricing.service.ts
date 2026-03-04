import {
  ModelTier,
  ContextDepth,
  GenerationAction,
  getModelCost,
  wordsToTokens,
  costToCredits,
  CONTEXT_SIZE_ESTIMATES,
  MINIMUM_COSTS,
  getImageCost,
  calculateInputTokens
} from '../config/ebook-llm.config';
import { WORD_RANGES, WordRange } from '../constants/ebook-word-ranges';

/**
 * Breakdown detalhado do cálculo de custo
 */
export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCostUSD: number;
  outputCostUSD: number;
  totalCostUSD: number;
  credits: number;
  tier: ModelTier;
  modelId: string;
  modelName: string;
  words: number;
}

/**
 * Parâmetros para cálculo de custo de geração
 */
export interface GenerationCostParams {
  words: number;
  tier: ModelTier;
  contextDepth?: ContextDepth;
  action?: GenerationAction;
}

/**
 * Informações de precificação por faixa de palavras
 */
export interface WordRangePricing {
  range: WordRange;
  minCredits: number;
  maxCredits: number;
  recommendedCredits: number;
}

/**
 * Serviço de precificação para geração de ebooks
 */
export class EbookPricingService {
  
  /**
   * Calcula o custo fixo de uma geração de texto
   * 
   * Fórmula:
   * - Output tokens = palavras × 4 (conversão padrão pt-BR)
   * - Input tokens = contexto base + sistema (350) + contexto adicional
   * - Custo USD = (input_tokens / 1M × custo_input) + (output_tokens / 1M × custo_output)
   * - Créditos = custo USD / 0.001
   * - Mínimo: 2 créditos
   */
  calculateGenerationCost(params: GenerationCostParams): CostBreakdown {
    const {
      words,
      tier,
      contextDepth = 'moderate',
      action
    } = params;

    // 1. Converter palavras para tokens de output (1 palavra = 4 tokens)
    const outputTokens = wordsToTokens(words);

    // 2. Calcular tokens de input incluindo sistema e contexto dinâmico
    // Input = contexto base + 350 tokens de sistema + contexto adicional (se houver)
    const inputTokens = calculateInputTokens(contextDepth, 0);

    // 3. Obter custos do modelo por tier
    const modelCost = getModelCost(tier);

    // 4. Calcular custo em USD
    const inputCostUSD = (inputTokens / 1_000_000) * modelCost.inputCostPerMillionTokens;
    const outputCostUSD = (outputTokens / 1_000_000) * modelCost.outputCostPerMillionTokens;
    const totalCostUSD = inputCostUSD + outputCostUSD;

    // 5. Converter para créditos (1 crédito = $0.001)
    let credits = costToCredits(totalCostUSD);
    
    // 6. Aplicar custo mínimo de 2 créditos para geração de texto
    if (credits < MINIMUM_COSTS.textGeneration) {
      credits = MINIMUM_COSTS.textGeneration;
    }

    return {
      inputTokens,
      outputTokens,
      inputCostUSD,
      outputCostUSD,
      totalCostUSD,
      credits,
      tier,
      modelId: modelCost.id,
      modelName: modelCost.name,
      words
    };
  }

  /**
   * Calcula precificação para todas as faixas de palavras de um tier
   */
  calculateWordRangePricing(
    tier: ModelTier,
    contextDepth: ContextDepth = 'moderate'
  ): WordRangePricing[] {
    return WORD_RANGES.map(range => {
      const minCost = this.calculateGenerationCost({
        words: range.min,
        tier,
        contextDepth
      });

      const maxCost = this.calculateGenerationCost({
        words: range.max,
        tier,
        contextDepth
      });

      const recommendedCost = this.calculateGenerationCost({
        words: range.recommended,
        tier,
        contextDepth
      });

      return {
        range,
        minCredits: minCost.credits,
        maxCredits: maxCost.credits,
        recommendedCredits: recommendedCost.credits
      };
    });
  }

  /**
   * Calcula tabela completa de preços para todos os tiers
   */
  calculatePricingTable(contextDepth: ContextDepth = 'moderate'): {
    basic: WordRangePricing[];
    medium: WordRangePricing[];
    advanced: WordRangePricing[];
  } {
    return {
      basic: this.calculateWordRangePricing('basic', contextDepth),
      medium: this.calculateWordRangePricing('medium', contextDepth),
      advanced: this.calculateWordRangePricing('advanced', contextDepth)
    };
  }

  /**
   * Compara custos entre diferentes tiers para um número de palavras
   */
  compareTierCosts(
    words: number,
    contextDepth: ContextDepth = 'moderate'
  ): Record<ModelTier, CostBreakdown> {
    const tiers: ModelTier[] = ['basic', 'medium', 'advanced'];

    return tiers.reduce((acc, tier) => {
      acc[tier] = this.calculateGenerationCost({
        words,
        tier,
        contextDepth
      });
      return acc;
    }, {} as Record<ModelTier, CostBreakdown>);
  }

  /**
   * Estima custo com base na faixa de palavras (usando valor recomendado)
   */
  estimateByWordRange(
    rangeId: string,
    tier: ModelTier,
    contextDepth: ContextDepth = 'moderate'
  ): CostBreakdown | null {
    const range = WORD_RANGES.find(r => r.id === rangeId);
    if (!range) return null;

    return this.calculateGenerationCost({
      words: range.recommended,
      tier,
      contextDepth
    });
  }

  /**
   * Formata breakdown de custo para exibição
   */
  formatCostBreakdown(breakdown: CostBreakdown): string {
    return [
      `Modelo: ${breakdown.modelName} (${breakdown.tier})`,
      `Palavras: ${breakdown.words}`,
      `Tokens: ${breakdown.inputTokens} input + ${breakdown.outputTokens} output = ${breakdown.inputTokens + breakdown.outputTokens} total`,
      `Custo: $${breakdown.totalCostUSD.toFixed(6)} USD`,
      `Créditos: ${breakdown.credits}`
    ].join('\n');
  }

  /**
   * Calcula economia comparando tiers
   */
  calculateSavings(
    words: number,
    fromTier: ModelTier,
    toTier: ModelTier,
    contextDepth: ContextDepth = 'moderate'
  ): {
    fromCredits: number;
    toCredits: number;
    savings: number;
    savingsPercent: number;
  } {
    const fromCost = this.calculateGenerationCost({ words, tier: fromTier, contextDepth });
    const toCost = this.calculateGenerationCost({ words, tier: toTier, contextDepth });

    const savings = fromCost.credits - toCost.credits;
    const savingsPercent = (savings / fromCost.credits) * 100;

    return {
      fromCredits: fromCost.credits,
      toCredits: toCost.credits,
      savings,
      savingsPercent
    };
  }

  // ============================================================================
  // MÉTODOS PARA IMAGENS (mantidos do código anterior)
  // ============================================================================

  /**
   * Calcula custo de geração de imagem via Replicate/Ideogram
   * Baseado em custos reais do Ideogram v3 Turbo
   * Usa tabela IMAGE_PRICING com qualidades: basico, medio, avancado
   * 1 crédito = $0.001 USD
   */
  calculateImageCost(
    quality: 'basico' | 'medio' | 'avancado' = 'medio',
    imageType: 'cover' | 'internal' = 'internal'
  ): number {
    // Obter custo base da tabela de preços
    let credits = getImageCost(quality);
    
    // Capas têm custo adicional (maior qualidade/detalhamento)
    if (imageType === 'cover') {
      credits = Math.ceil(credits * 1.5); // 50% a mais para capas
      
      // Aplicar mínimo específico para capas
      if (credits < MINIMUM_COSTS.coverGeneration) {
        credits = MINIMUM_COSTS.coverGeneration;
      }
    } else {
      // Aplicar mínimo para imagens internas
      if (credits < MINIMUM_COSTS.imageGeneration) {
        credits = MINIMUM_COSTS.imageGeneration;
      }
    }

    return credits;
  }

  /**
   * Calcula custo de múltiplas imagens
   */
  calculateMultipleImagesCost(
    imageCount: number,
    quality: 'basico' | 'medio' | 'avancado' = 'medio',
    imageType: 'cover' | 'internal' = 'internal'
  ): number {
    const costPerImage = this.calculateImageCost(quality, imageType);
    return costPerImage * imageCount;
  }

  /**
   * DEPRECATED: Manter para compatibilidade reversa
   * Use calculateImageCost() ao invés
   */
  calculateReplicateCost(
    imageType: 'cover' | 'internal',
    quality: 'standard' | 'high' = 'standard'
  ): number {
    // Mapear qualidades antigas para novas
    const qualityMap: Record<'standard' | 'high', 'basico' | 'medio' | 'avancado'> = {
      standard: 'medio',
      high: 'avancado'
    };
    
    return this.calculateImageCost(qualityMap[quality], imageType);
  }

  /**
   * Estima custo total de um projeto de ebook
   */
  estimateProjectCost(params: {
    sections: number;
    wordsPerSection: number;
    tier: ModelTier;
    withCover?: boolean;
    coverQuality?: 'basico' | 'medio' | 'avancado';
    withInternalImages?: number;
    internalImageQuality?: 'basico' | 'medio' | 'avancado';
  }): {
    textGeneration: number;
    coverGeneration: number;
    internalImages: number;
    total: number;
  } {
    const {
      sections,
      wordsPerSection,
      tier,
      withCover = true,
      coverQuality = 'avancado',
      withInternalImages = 0,
      internalImageQuality = 'medio'
    } = params;

    // Custo de geração de texto
    const textPerSection = this.calculateGenerationCost({
      words: wordsPerSection,
      tier,
      contextDepth: 'moderate'
    });
    const textGeneration = textPerSection.credits * sections;

    // Custo de capa (se solicitada)
    const coverGeneration = withCover 
      ? this.calculateImageCost(coverQuality, 'cover') 
      : 0;

    // Custo de imagens internas
    const internalImages = this.calculateMultipleImagesCost(
      withInternalImages, 
      internalImageQuality, 
      'internal'
    );

    // Total
    const total = textGeneration + coverGeneration + internalImages;

    return {
      textGeneration,
      coverGeneration,
      internalImages,
      total
    };
  }
}

// Singleton instance
export const ebookPricingService = new EbookPricingService();
