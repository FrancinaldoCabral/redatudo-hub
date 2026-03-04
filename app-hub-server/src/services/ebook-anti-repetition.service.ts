/**
 * Resultado de validação de repetição
 */
export interface RepetitionValidation {
  valid: boolean;
  issues: string[];
  similarityScore: number;
  repeatedPhrases: Array<{
    phrase: string;
    count: number;
  }>;
}

/**
 * Serviço para detecção de repetições em texto
 * NOTA: Por decisão do usuário, não fazemos validações obrigatórias,
 * mas mantemos a funcionalidade disponível para uso opcional
 */
export class EbookAntiRepetitionService {
  
  /**
   * Valida conteúdo gerado contra frases já usadas
   * 
   * @param generatedContent - Conteúdo recém-gerado
   * @param usedPhrases - Frases já utilizadas no contexto
   * @param threshold - Limiar de similaridade (0-1) para considerar repetição
   */
  async validateContent(
    generatedContent: string,
    usedPhrases: string[],
    threshold: number = 0.3
  ): Promise<RepetitionValidation> {
    if (!generatedContent || usedPhrases.length === 0) {
      return {
        valid: true,
        issues: [],
        similarityScore: 0,
        repeatedPhrases: []
      };
    }

    // Extrair frases do conteúdo gerado
    const generatedPhrases = this.extractNGrams(generatedContent);

    // Detectar repetições
    const repeatedPhrases: Array<{ phrase: string; count: number }> = [];
    const issues: string[] = [];

    for (const phrase of generatedPhrases) {
      const count = usedPhrases.filter(used => 
        this.calculateSimilarity(phrase, used) >= threshold
      ).length;

      if (count > 0) {
        repeatedPhrases.push({ phrase, count });
      }
    }

    // Calcular score de similaridade
    const similarityScore = repeatedPhrases.length / Math.max(generatedPhrases.length, 1);

    // Gerar issues se necessário
    if (repeatedPhrases.length > 0) {
      issues.push(`Detectadas ${repeatedPhrases.length} frases similares a conteúdo existente`);
    }

    return {
      valid: similarityScore < threshold,
      issues,
      similarityScore,
      repeatedPhrases: repeatedPhrases.slice(0, 10) // Top 10
    };
  }

  /**
   * Extrai n-grams de um texto (frases de 3-5 palavras)
   */
  private extractNGrams(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const phrases: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      
      // Extrair n-grams de 3 a 5 palavras
      for (let n = 3; n <= 5; n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const phrase = words.slice(i, i + n).join(' ').toLowerCase();
          if (phrase.length > 10) {
            phrases.push(phrase);
          }
        }
      }
    }

    return phrases;
  }

  /**
   * Calcula similaridade entre duas strings usando Levenshtein simplificado
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    // Distância de edição simples
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcula distância de Levenshtein entre duas strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substituição
            matrix[i][j - 1] + 1,     // inserção
            matrix[i - 1][j] + 1      // deleção
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Conta ocorrências de frases específicas em um texto
   */
  countPhraseOccurrences(text: string, phrases: string[]): Map<string, number> {
    const occurrences = new Map<string, number>();
    const lowerText = text.toLowerCase();

    for (const phrase of phrases) {
      const lowerPhrase = phrase.toLowerCase();
      const regex = new RegExp(this.escapeRegex(lowerPhrase), 'g');
      const matches = lowerText.match(regex);
      occurrences.set(phrase, matches ? matches.length : 0);
    }

    return occurrences;
  }

  /**
   * Escapa caracteres especiais de regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Gera relatório de repetições
   */
  generateReport(validation: RepetitionValidation): string {
    const lines: string[] = [
      '=== Relatório de Anti-Repetição ===',
      `Válido: ${validation.valid ? 'Sim' : 'Não'}`,
      `Score de Similaridade: ${(validation.similarityScore * 100).toFixed(2)}%`,
      `Frases Repetidas: ${validation.repeatedPhrases.length}`
    ];

    if (validation.issues.length > 0) {
      lines.push('\n### Issues:');
      validation.issues.forEach(issue => lines.push(`- ${issue}`));
    }

    if (validation.repeatedPhrases.length > 0) {
      lines.push('\n### Top Frases Repetidas:');
      validation.repeatedPhrases.slice(0, 5).forEach(({ phrase, count }) => {
        lines.push(`- "${phrase}" (${count}x)`);
      });
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const ebookAntiRepetitionService = new EbookAntiRepetitionService();
