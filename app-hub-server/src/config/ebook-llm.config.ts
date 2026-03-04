// ============================================
// CONFIGURAÇÃO DE MODELOS LLM PARA EBOOKS
// ============================================

/**
 * Interface de configuração de custo de modelo LLM
 */
export interface LLMModelCost {
  id: string;
  name: string;
  inputCostPerMillionTokens: number;  // USD
  outputCostPerMillionTokens: number; // USD
  imageInputCostPerThousandImages?: number; // USD, custo por 1000 imagens de entrada
  contextWindowTokens?: number; // Número de tokens no contexto
}

/**
 * Modelos LLM disponíveis organizados por tier
 * CUSTOS FACILMENTE CONFIGURÁVEIS AQUI
 */
export const LLM_MODELS: Record<string, LLMModelCost> = {
  'advanced': {
    id: 'google/gemini-2.5-pro',
    name: 'Google: Gemini 2.5 Pro',
    inputCostPerMillionTokens: 1.25,   // $1.25/M tokens
    outputCostPerMillionTokens: 10.00,  // $10/M tokens
    imageInputCostPerThousandImages: 5.16, // $5.16/K imagens de entrada
    contextWindowTokens: 1050000 // 1.05M tokens de contexto
  },
  'medium': {
    id: 'google/gemini-2.5-flash',
    name: 'Google: Gemini 2.5 Flash',
    inputCostPerMillionTokens: 0.30,   // $0.30/M tokens
    outputCostPerMillionTokens: 2.50   // $2.50/M tokens
  },
  'basic': {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Google: Gemini 2.5 Flash Lite',
    inputCostPerMillionTokens: 0.10,   // $0.10/M tokens
    outputCostPerMillionTokens: 0.40   // $0.40/M tokens
  }
};

// ============================================
// CONVERSÕES E CONSTANTES
// ============================================

/**
 * Conversão de palavras para tokens
 * 1 palavra ≈ 4 tokens (média em português)
 */
export const WORDS_TO_TOKENS_RATIO = 4;

/**
 * Conversão de custo USD para créditos
 * 1 crédito = $0.001 USD
 */
export const CREDITS_TO_USD_RATIO = 0.001;

/**
 * Custos mínimos para diferentes operações (em créditos)
 */
export const MINIMUM_COSTS = {
  textGeneration: 2,     // Mínimo 2 créditos para qualquer geração de texto
  imageGeneration: 5,    // Mínimo 5 créditos para qualquer geração de imagem
  coverGeneration: 10    // Mínimo 10 créditos para capas (maior qualidade)
};

/**
 * Tabela de preços de imagens por qualidade
 * Baseado em custos reais do Ideogram v3 Turbo via Replicate
 */
export const IMAGE_PRICING: Record<'basico' | 'medio' | 'avancado', {
  costUSD: number;
  credits: number;
  description: string;
}> = {
  basico: {
    costUSD: 0.006,      // $0.006 por imagem
    credits: 6,          // 6 créditos
    description: 'Geração rápida, qualidade padrão, ideal para protótipos e testes'
  },
  medio: {
    costUSD: 0.008,      // $0.008 por imagem
    credits: 8,          // 8 créditos
    description: 'Balanceado entre qualidade e custo, recomendado para produção'
  },
  avancado: {
    costUSD: 0.012,      // $0.012 por imagem
    credits: 12,         // 12 créditos
    description: 'Máxima qualidade, processamento otimizado, ideal para destaques'
  }
};

/**
 * Estimativas de tamanho de contexto (input tokens)
 * baseado na profundidade do contexto solicitado
 */
export const CONTEXT_SIZE_ESTIMATES = {
  minimal: 500,    // Apenas conteúdo da seção atual
  moderate: 2000,  // Seção + capítulos adjacentes + projeto
  full: 5000       // Todo o projeto + histórico
};

/**
 * Tokens fixos de sistema/prompt (overhead)
 * Sempre adicionados ao cálculo de input
 */
export const SYSTEM_PROMPT_TOKENS = 350;  // ~350 tokens para instruções de sistema base

// ============================================
// TIPOS
// ============================================

export type ModelTier = 'basic' | 'medium' | 'advanced';
export type ContextDepth = 'minimal' | 'moderate' | 'full';

/**
 * Ações de geração disponíveis (40+)
 */
export type GenerationAction = 
  // Criação (3)
  | 'generate' | 'regenerate' | 'continue'
  // Edição (7)
  | 'expand' | 'rewrite' | 'tone' | 'summarize' | 'simplify' | 'enrich' | 'correct'
  // Transformação (7)
  | 'dialogize' | 'describe' | 'argue' | 'connect' | 'divide' | 'merge' | 'translate-tone'
  // Narrativa (7)
  | 'create-character' | 'develop-dialogue' | 'build-scene' | 'create-tension' 
  | 'plot-twist' | 'inner-monologue' | 'worldbuild'
  // Técnico (7)
  | 'add-examples' | 'create-list' | 'compare' | 'tutorial' | 'add-stats' 
  | 'cite-sources' | 'create-faq'
  // Refinamento (6)
  | 'vary-structure' | 'eliminate-redundancy' | 'strengthen-opening' 
  | 'strong-closing' | 'add-hook' | 'improve-flow';

/**
 * Categorias de ações
 */
export type ActionCategory = 'creation' | 'editing' | 'transformation' | 'narrative' | 'technical' | 'refinement';

/**
 * Configuração de temperatura por ação
 */
export const ACTION_TEMPERATURES: Record<GenerationAction, number> = {
  // Criação - criatividade moderada a alta
  'generate': 0.7,
  'regenerate': 0.8,
  'continue': 0.7,
  
  // Edição - criatividade moderada a baixa
  'expand': 0.7,
  'rewrite': 0.6,
  'tone': 0.5,
  'summarize': 0.3,
  'simplify': 0.4,
  'enrich': 0.8,
  'correct': 0.2,
  
  // Transformação - criatividade moderada
  'dialogize': 0.7,
  'describe': 0.8,
  'argue': 0.7,
  'connect': 0.6,
  'divide': 0.5,
  'merge': 0.5,
  'translate-tone': 0.6,
  
  // Narrativa - criatividade alta
  'create-character': 0.8,
  'develop-dialogue': 0.7,
  'build-scene': 0.8,
  'create-tension': 0.7,
  'plot-twist': 0.9,
  'inner-monologue': 0.7,
  'worldbuild': 0.8,
  
  // Técnico - criatividade moderada a baixa
  'add-examples': 0.6,
  'create-list': 0.5,
  'compare': 0.6,
  'tutorial': 0.5,
  'add-stats': 0.4,
  'cite-sources': 0.3,
  'create-faq': 0.5,
  
  // Refinamento - criatividade moderada
  'vary-structure': 0.7,
  'eliminate-redundancy': 0.4,
  'strengthen-opening': 0.7,
  'strong-closing': 0.7,
  'add-hook': 0.8,
  'improve-flow': 0.6
};

/**
 * Mapeamento de ações para categorias
 */
export const ACTION_CATEGORIES: Record<GenerationAction, ActionCategory> = {
  'generate': 'creation',
  'regenerate': 'creation',
  'continue': 'creation',
  'expand': 'editing',
  'rewrite': 'editing',
  'tone': 'editing',
  'summarize': 'editing',
  'simplify': 'editing',
  'enrich': 'editing',
  'correct': 'editing',
  'dialogize': 'transformation',
  'describe': 'transformation',
  'argue': 'transformation',
  'connect': 'transformation',
  'divide': 'transformation',
  'merge': 'transformation',
  'translate-tone': 'transformation',
  'create-character': 'narrative',
  'develop-dialogue': 'narrative',
  'build-scene': 'narrative',
  'create-tension': 'narrative',
  'plot-twist': 'narrative',
  'inner-monologue': 'narrative',
  'worldbuild': 'narrative',
  'add-examples': 'technical',
  'create-list': 'technical',
  'compare': 'technical',
  'tutorial': 'technical',
  'add-stats': 'technical',
  'cite-sources': 'technical',
  'create-faq': 'technical',
  'vary-structure': 'refinement',
  'eliminate-redundancy': 'refinement',
  'strengthen-opening': 'refinement',
  'strong-closing': 'refinement',
  'add-hook': 'refinement',
  'improve-flow': 'refinement'
};

/**
 * Ações que requerem texto selecionado
 */
export const ACTIONS_REQUIRING_SELECTION: GenerationAction[] = [
  'rewrite', 'tone', 'summarize', 'simplify', 'enrich', 'correct',
  'dialogize', 'describe', 'argue', 'connect', 'divide', 'merge', 'translate-tone',
  'develop-dialogue', 'create-tension', 'inner-monologue',
  'add-examples', 'create-list', 'add-stats', 'cite-sources',
  'vary-structure', 'eliminate-redundancy', 'strengthen-opening', 'strong-closing', 'add-hook', 'improve-flow'
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Obtém configuração de custo do modelo
 */
export function getModelCost(tier: ModelTier): LLMModelCost {
  return LLM_MODELS[tier];
}

/**
 * Converte palavras para tokens
 */
export function wordsToTokens(words: number): number {
  return Math.ceil(words * WORDS_TO_TOKENS_RATIO);
}

/**
 * Converte tokens para palavras
 */
export function tokensToWords(tokens: number): number {
  return Math.floor(tokens / WORDS_TO_TOKENS_RATIO);
}

/**
 * Converte custo USD para créditos
 * 1 crédito = $0.001 USD
 */
export function costToCredits(costUSD: number): number {
  return Math.ceil(costUSD / CREDITS_TO_USD_RATIO);
}

/**
 * Obtém custo de imagem por qualidade
 */
export function getImageCost(quality: 'basico' | 'medio' | 'avancado'): number {
  return IMAGE_PRICING[quality].credits;
}

/**
 * Calcula tokens de input incluindo contexto dinâmico e sistema
 */
export function calculateInputTokens(
  contextDepth: ContextDepth,
  additionalContext?: number
): number {
  const baseContext = CONTEXT_SIZE_ESTIMATES[contextDepth];
  const systemTokens = SYSTEM_PROMPT_TOKENS;
  const dynamicContext = additionalContext || 0;
  
  return baseContext + systemTokens + dynamicContext;
}

/**
 * Obtém temperatura para uma ação específica
 */
export function getTemperatureForAction(action: GenerationAction): number {
  return ACTION_TEMPERATURES[action] || 0.7;
}

/**
 * Verifica se uma ação requer seleção de texto
 */
export function requiresSelection(action: GenerationAction): boolean {
  return ACTIONS_REQUIRING_SELECTION.includes(action);
}

/**
 * Obtém categoria de uma ação
 */
export function getActionCategory(action: GenerationAction): ActionCategory {
  return ACTION_CATEGORIES[action];
}

/**
 * Ações que PERMITEM expansão (não devem ser limitadas)
 * São ações que naturalmente criam mais conteúdo ou expandem o texto
 */
const ALLOW_EXPANSION_ACTIONS: GenerationAction[] = [
  'generate',        // Criação de novo conteúdo
  'regenerate',      // Recriação de conteúdo
  'continue',        // Adiciona mais texto (continuar escrevendo)
  'expand',          // Expande propositalmente
  'enrich',          // Enriquece (pode adicionar bastante)
  'describe',        // Adiciona descrições (pode expandir muito)
  'add-examples',    // Adiciona exemplos
  'add-stats',       // Adiciona estatísticas
  'create-character',// Cria perfis de personagens
  'develop-dialogue',// Desenvolve diálogos
  'build-scene',     // Constrói cenas
  'create-tension',  // Cria tensão narrativa
  'plot-twist',      // Adiciona reviravoltas
  'worldbuild',      // Constrói mundos
  'create-list',     // Cria listas
  'tutorial',        // Cria tutoriais
  'create-faq',      // Cria FAQs
  'argue',           // Argumentação (pode expandir)
  'add-hook'         // Adiciona ganchos
];

/**
 * Verifica se uma ação deve permitir expansão ilimitada
 * Retorna false para ações que devem manter tamanho similar ao original
 */
export function shouldMaintainSize(action: GenerationAction): boolean {
  return !ALLOW_EXPANSION_ACTIONS.includes(action);
}
