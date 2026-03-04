import { GenerationAction, requiresSelection } from '../config/ebook-llm.config';
import { isValidWordCount } from '../constants/ebook-word-ranges';

/**
 * Resultado de validação
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parâmetros de requisição de geração para validação
 */
export interface GenerationRequestParams {
  action: GenerationAction;
  projectId: string;
  sectionId: string;
  words: number;
  tier: string;
  selectedText?: string;
  options?: Record<string, any>;
}

/**
 * Serviço de validação para requisições de geração de ebooks
 */
export class EbookValidationService {
  
  /**
   * Valida uma requisição de geração completa
   */
  validateGenerationRequest(params: GenerationRequestParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar campos obrigatórios
    if (!params.projectId || params.projectId.trim() === '') {
      errors.push('projectId é obrigatório');
    }

    if (!params.sectionId || params.sectionId.trim() === '') {
      errors.push('sectionId é obrigatório');
    }

    if (!params.action) {
      errors.push('action é obrigatório');
    }

    // Validar número de palavras
    if (!params.words || params.words <= 0) {
      errors.push('words deve ser maior que zero');
    } else if (!isValidWordCount(params.words)) {
      errors.push(`words deve estar entre 100 e 5000 (fornecido: ${params.words})`);
    }

    // Validar tier
    const validTiers = ['basic', 'medium', 'advanced'];
    if (!params.tier || !validTiers.includes(params.tier)) {
      errors.push(`tier deve ser 'basic', 'medium' ou 'advanced' (fornecido: ${params.tier})`);
    }

    // Validar se ação requer seleção
    if (params.action && requiresSelection(params.action)) {
      if (!params.selectedText || params.selectedText.trim() === '') {
        errors.push(`A ação '${params.action}' requer texto selecionado`);
      }
    }

    // Avisos para situações suspeitas
    if (params.words > 3000) {
      warnings.push('Gerações muito longas podem demorar e custar mais créditos');
    }

    if (params.selectedText && params.selectedText.length > 10000) {
      warnings.push('Texto selecionado muito longo pode aumentar o custo');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida apenas os campos mínimos necessários
   */
  validateMinimalRequest(params: Partial<GenerationRequestParams>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!params.projectId) {
      errors.push('projectId é obrigatório');
    }

    if (!params.sectionId) {
      errors.push('sectionId é obrigatório');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida formato de ID (MongoDB ObjectId)
   */
  validateObjectId(id: string): boolean {
    // Regex para validar ObjectId do MongoDB (24 caracteres hexadecimais)
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }

  /**
   * Valida múltiplos IDs
   */
  validateObjectIds(...ids: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const id of ids) {
      if (!id) {
        errors.push('ID não pode ser vazio');
      } else if (!this.validateObjectId(id)) {
        errors.push(`ID inválido: ${id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitiza parâmetros de entrada
   */
  sanitizeParams(params: any): any {
    const sanitized = { ...params };

    // Remover espaços em branco de strings
    if (typeof sanitized.projectId === 'string') {
      sanitized.projectId = sanitized.projectId.trim();
    }
    if (typeof sanitized.sectionId === 'string') {
      sanitized.sectionId = sanitized.sectionId.trim();
    }
    if (typeof sanitized.selectedText === 'string') {
      sanitized.selectedText = sanitized.selectedText.trim();
    }

    // Garantir que words é number
    if (sanitized.words) {
      sanitized.words = parseInt(sanitized.words, 10);
    }

    return sanitized;
  }
}

// Singleton instance
export const ebookValidationService = new EbookValidationService();
