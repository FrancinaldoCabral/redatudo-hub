# Tabelas de Preços - Sistema de Créditos

## 📊 Visão Geral

Este documento detalha todas as tabelas de preços do sistema, incluindo custos mínimos, preços por tier de modelo e qualidade de imagem.

**Conversão fundamental**: `1 crédito = $0.001 USD`

---

## 💰 Custos Mínimos

Todos os custos são aplicados APÓS o cálculo baseado em consumo real, garantindo previsibilidade.

| Operação | Custo Mínimo | Descrição |
|----------|--------------|-----------|
| **Geração de Texto** | 2 créditos | Qualquer geração de conteúdo textual |
| **Geração de Imagem Interna** | 5 créditos | Imagens de seções/capítulos |
| **Geração de Capa** | 10 créditos | Capas de ebook (maior qualidade) |

---

## 📝 Preços de Geração de Texto

### Fórmula de Cálculo

```
Input Tokens = Contexto Base + 350 (sistema) + Contexto Adicional
Output Tokens = Palavras × 4 (conversão pt-BR padrão)

Custo USD = (Input Tokens / 1M × Custo Input) + (Output Tokens / 1M × Custo Output)
Créditos = Custo USD / 0.001
Créditos Finais = max(Créditos Calculados, 2)
```

### Tabela de Modelos por Tier

| Tier | Modelo | Input ($/1M tokens) | Output ($/1M tokens) | Uso Recomendado |
|------|--------|---------------------|----------------------|-----------------|
| **Básico** | Google Gemini 2.5 Flash Lite | $0.10 | $0.40 | Rascunhos, testes rápidos, conteúdo simples |
| **Médio** | Google Gemini 2.5 Flash | $0.30 | $2.50 | Produção padrão, balanceado custo/qualidade |
| **Avançado** | Google Gemini 2.5 Pro | $1.25 | $10.00 | Conteúdo premium, análise profunda, imagens de entrada |

### Contexto e Tokens de Sistema

| Profundidade | Tokens Base | + Sistema | Total Input Base |
|--------------|-------------|-----------|------------------|
| **Minimal** | 500 | 350 | 850 tokens |
| **Moderate** | 2.000 | 350 | 2.350 tokens |
| **Full** | 5.000 | 350 | 5.350 tokens |

**Nota**: O sistema adiciona automaticamente 350 tokens para instruções de sistema em todas as gerações.

### Exemplos de Cálculo (Tier Médio, Contexto Moderate)

| Palavras | Output Tokens | Input Tokens | Custo USD | Créditos |
|----------|---------------|--------------|-----------|----------|
| 100 | 400 | 2.350 | $0.00171 | **2** (mínimo) |
| 500 | 2.000 | 2.350 | $0.00571 | **6** |
| 1.000 | 4.000 | 2.350 | $0.01071 | **11** |
| 2.000 | 8.000 | 2.350 | $0.02071 | **21** |
| 5.000 | 20.000 | 2.350 | $0.05071 | **51** |

---

## 🖼️ Preços de Geração de Imagens

### Tabela de Qualidades (Ideogram v3 Turbo)

| Qualidade | Custo USD | Créditos | Velocidade | Descrição |
|-----------|-----------|----------|------------|-----------|
| **Básico** | $0.006 | **6** | ⚡ Rápido | Geração rápida, qualidade padrão, ideal para protótipos e testes |
| **Médio** | $0.008 | **8** | ⚡ Rápido | Balanceado entre qualidade e custo, recomendado para produção |
| **Avançado** | $0.012 | **12** | ⏱️ Médio | Máxima qualidade, processamento otimizado, ideal para destaques |

### Multiplicadores por Tipo

| Tipo de Imagem | Multiplicador | Mínimo Aplicado |
|----------------|---------------|-----------------|
| **Imagens Internas** | 1.0× | 5 créditos |
| **Capas** | 1.5× | 10 créditos |

### Exemplos de Custo de Imagens

#### Imagens Internas (seções/capítulos)

| Qualidade | Custo Base | Custo Final |
|-----------|------------|-------------|
| Básico | 6 créditos | **6 créditos** |
| Médio | 8 créditos | **8 créditos** |
| Avançado | 12 créditos | **12 créditos** |

#### Capas (multiplicador 1.5×)

| Qualidade | Custo Base | × 1.5 | Custo Final |
|-----------|------------|-------|-------------|
| Básico | 6 créditos | 9 | **10 créditos** (mínimo) |
| Médio | 8 créditos | 12 | **12 créditos** |
| Avançado | 12 créditos | 18 | **18 créditos** |

---

## 📦 Exemplos de Custo de Projetos Completos

### Projeto Pequeno (10 seções, 500 palavras/seção, tier médio)

```
Texto: 10 seções × 6 créditos = 60 créditos
Capa: 1 × 12 créditos (média) = 12 créditos
Imagens Internas: 0
─────────────────────────────
TOTAL: 72 créditos (~$0.072)
```

### Projeto Médio (30 seções, 1000 palavras/seção, tier médio, 1 imagem/seção)

```
Texto: 30 seções × 11 créditos = 330 créditos
Capa: 1 × 18 créditos (avançada) = 18 créditos
Imagens Internas: 30 × 8 créditos (média) = 240 créditos
─────────────────────────────
TOTAL: 588 créditos (~$0.588)
```

### Projeto Grande (100 seções, 2000 palavras/seção, tier avançado, 2 imagens/seção)

```
Texto: 100 seções × ~85 créditos* = 8.500 créditos
Capa: 1 × 18 créditos (avançada) = 18 créditos
Imagens Internas: 200 × 12 créditos (avançada) = 2.400 créditos
─────────────────────────────
TOTAL: 10.918 créditos (~$10.92)
```

*_Custo estimado para 2000 palavras no tier avançado com contexto moderate_

---

## 🔧 Funções de Cálculo Disponíveis

### No código (`ebook-llm.config.ts`)

```typescript
// Conversão de palavras
wordsToTokens(words: number): number  // palavras × 4

// Conversão de tokens
tokensToWords(tokens: number): number  // tokens / 4

// Custo USD → Créditos
costToCredits(costUSD: number): number  // USD / 0.001

// Obter custo de imagem
getImageCost(quality: 'basico' | 'medio' | 'avancado'): number

// Calcular tokens de input (incluindo sistema)
calculateInputTokens(
  contextDepth: ContextDepth,
  additionalContext?: number
): number
```

### No serviço (`ebook-pricing.service.ts`)

```typescript
// Calcular custo de geração de texto
calculateGenerationCost(params: {
  words: number;
  tier: ModelTier;
  contextDepth?: ContextDepth;
  action?: GenerationAction;
}): CostBreakdown

// Calcular custo de imagem
calculateImageCost(
  quality: 'basico' | 'medio' | 'avancado',
  imageType: 'cover' | 'internal'
): number

// Calcular custo de múltiplas imagens
calculateMultipleImagesCost(
  imageCount: number,
  quality: 'basico' | 'medio' | 'avancado',
  imageType: 'cover' | 'internal'
): number

// Estimar projeto completo
estimateProjectCost(params: {
  sections: number;
  wordsPerSection: number;
  tier: ModelTier;
  withCover?: boolean;
  coverQuality?: 'basico' | 'medio' | 'avancado';
  withInternalImages?: number;
  internalImageQuality?: 'basico' | 'medio' | 'avancado';
}): { textGeneration, coverGeneration, internalImages, total }
```

---

## 📋 Validação de Saldo

### Mensagens de Erro Descritivas

Quando o saldo é insuficiente, o sistema retorna mensagens detalhadas:

```
no credit - Saldo insuficiente. Necessário: 15 créditos, Disponível: 8.50 créditos
```

Formato: `no credit - Saldo insuficiente. Necessário: X créditos, Disponível: Y créditos`

### Pontos de Verificação

1. **Tool Controller**: Verifica antes de executar ferramentas
2. **Agent Controller**: Verifica antes de processar agentes
3. **Agent Long Content**: Verifica antes de processar conteúdo longo
4. **Image Editor**: Preserva mensagem descritiva em erros

---

## 🔄 Compatibilidade Reversa

### Função Deprecated (ainda suportada)

```typescript
calculateReplicateCost(
  imageType: 'cover' | 'internal',
  quality: 'standard' | 'high'
): number
```

**Mapeamento**:
- `standard` → `medio`
- `high` → `avancado`

**Recomendação**: Use `calculateImageCost()` para novos desenvolvimentos.

---

## 📊 Resumo das Constantes

```typescript
// ebook-llm.config.ts
export const CREDITS_TO_USD_RATIO = 0.001;  // 1 crédito = $0.001
export const WORDS_TO_TOKENS_RATIO = 4;     // 1 palavra = 4 tokens
export const SYSTEM_PROMPT_TOKENS = 350;     // Overhead fixo

export const MINIMUM_COSTS = {
  textGeneration: 2,
  imageGeneration: 5,
  coverGeneration: 10
};

export const IMAGE_PRICING = {
  basico: { costUSD: 0.006, credits: 6 },
  medio: { costUSD: 0.008, credits: 8 },
  avancado: { costUSD: 0.012, credits: 12 }
};

export const CONTEXT_SIZE_ESTIMATES = {
  minimal: 500,
  moderate: 2000,
  full: 5000
};
```

---

**Última atualização**: 9 de dezembro de 2025  
**Versão**: 2.0.0
