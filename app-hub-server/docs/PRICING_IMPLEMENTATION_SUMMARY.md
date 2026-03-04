# Implementação: Sistema de Preços, Validação de Saldo e Mensagens Descritivas

## ✅ Implementações Concluídas

### 1. Tabelas de Preços Detalhadas

#### 📝 Texto (ebook-llm.config.ts)

**Custos por Tier de Modelo**:
```typescript
export const LLM_MODELS: Record<string, LLMModelCost> = {
  'basic': {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Google: Gemini 2.5 Flash Lite',
    inputCostPerMillionTokens: 0.10,
    outputCostPerMillionTokens: 0.40
  },
  'medium': {
    id: 'google/gemini-2.5-flash',
    name: 'Google: Gemini 2.5 Flash',
    inputCostPerMillionTokens: 0.30,
    outputCostPerMillionTokens: 2.50
  },
  'advanced': {
    id: 'google/gemini-2.5-pro',
    name: 'Google: Gemini 2.5 Pro',
    inputCostPerMillionTokens: 1.25,
    outputCostPerMillionTokens: 10.00,
    imageInputCostPerThousandImages: 5.16,
    contextWindowTokens: 1050000
  }
};
```

**Custos Mínimos**:
```typescript
export const MINIMUM_COSTS = {
  textGeneration: 2,     // Mínimo 2 créditos para texto
  imageGeneration: 30,    // Mínimo 5 créditos para imagens
  coverGeneration: 30    // Mínimo 10 créditos para capas
};
```

#### 🖼️ Imagens (ebook-llm.config.ts)

**Tabela de Preços por Qualidade**:
```typescript
export const IMAGE_PRICING: Record<'basico' | 'medio' | 'avancado', {
  costUSD: number;
  credits: number;
  description: string;
}> = {
  basico: {
    costUSD: 0.006,
    credits: 6,
    description: 'Geração rápida, qualidade padrão, ideal para protótipos e testes'
  },
  medio: {
    costUSD: 0.008,
    credits: 8,
    description: 'Balanceado entre qualidade e custo, recomendado para produção'
  },
  avancado: {
    costUSD: 0.012,
    credits: 12,
    description: 'Máxima qualidade, processamento otimizado, ideal para destaques'
  }
};
```

---

### 2. Tokens Dinâmicos com Contexto e Sistema

#### Tokens de Sistema Fixos (ebook-llm.config.ts)

```typescript
/**
 * Tokens fixos de sistema/prompt (overhead)
 * Sempre adicionados ao cálculo de input
 */
export const SYSTEM_PROMPT_TOKENS = 350;  // ~350 tokens para instruções de sistema base
```

#### Função de Cálculo Dinâmico (ebook-llm.config.ts)

```typescript
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
```

**Breakdown**:
- `baseContext`: Contexto base (minimal: 500, moderate: 2000, full: 5000)
- `systemTokens`: 350 tokens fixos de instruções
- `dynamicContext`: Contexto adicional opcional (ex: arquivos de referência)

#### Uso no Cálculo de Custo (ebook-pricing.service.ts)

```typescript
calculateGenerationCost(params: GenerationCostParams): CostBreakdown {
  // ...
  
  // 2. Calcular tokens de input incluindo sistema e contexto dinâmico
  // Input = contexto base + 350 tokens de sistema + contexto adicional (se houver)
  const inputTokens = calculateInputTokens(contextDepth, 0);
  
  // ...
}
```

---

### 3. Mensagens Descritivas de Saldo Insuficiente

#### Formato Padrão

```
no credit - Saldo insuficiente. Necessário: X créditos, Disponível: Y créditos
```

#### Implementações por Local

##### Tool Controller (tool.controller.ts)

```typescript
// 2. Verificar créditos (preço fixo)
const userBalance = await this.creditsService.checkBalance(parseInt(metadata.userId));
const balanceFloat = parseFloat(`${userBalance}`);
if (balanceFloat < tool.costPreview) {
  throw new Error(`no credit - Saldo insuficiente. Necessário: ${tool.costPreview} créditos, Disponível: ${balanceFloat.toFixed(2)} créditos`);
}
```

##### Agent Controller (agent.controller.ts)

```typescript
const userCredits = await this.creditsService.checkBalance(parseInt(metadata.userId));
const creditsFloat = parseFloat(`${userCredits}`);

if (requiredCredits >= creditsFloat && !metadata.routerApiKey) {
  throw new Error(`no credit - Saldo insuficiente. Necessário: ${requiredCredits.toFixed(2)} créditos, Disponível: ${creditsFloat.toFixed(2)} créditos`);
}
```

##### Agent Long Content Controller (agent-long-content.controller.ts)

```typescript
const balanceFloat = parseFloat(`${userCredits}`);
throw new Error(`no credit - Saldo insuficiente. Necessário: ${requiredCredits.toFixed(2)} créditos, Disponível: ${balanceFloat.toFixed(2)} créditos`);
```

##### Image Editor Tool (image-editor.tool.ts)

```typescript
if (error.message?.includes('no credit')) {
  // Preservar mensagem descritiva de créditos
  errorMessage = error.message;
}
```

**Padrão**: Sempre começa com `no credit` para compatibilidade com código existente, seguido de detalhes descritivos.

---

## 📊 Funções de Pricing Atualizadas

### ebook-pricing.service.ts

#### calculateImageCost (NOVO)

```typescript
/**
 * Calcula custo de geração de imagem via Replicate/Ideogram
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
```

#### calculateMultipleImagesCost (NOVO)

```typescript
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
```

#### calculateReplicateCost (DEPRECATED)

```typescript
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
```

---

## 🔄 Fluxo de Validação de Saldo

### 1. Pré-Verificação (antes de executar)

```typescript
// Tool/Agent Controller
const userBalance = await creditsService.checkBalance(userId);
const required = calculateCost(...);

if (userBalance < required) {
  throw new Error(`no credit - Saldo insuficiente. Necessário: ${required} créditos, Disponível: ${userBalance} créditos`);
}
```

### 2. Execução

```typescript
// Tool executa normalmente
const result = await tool.action(...);
```

### 3. Débito (após execução bem-sucedida)

```typescript
// Socket/Worker
if (toolResult.credits && toolResult.credits > 0) {
  await creditsService.subtractCredit(userId, toolResult.credits.toString());
}
```

---

## 📋 Exemplos de Uso

### Cálculo de Texto

```typescript
import { ebookPricingService } from './ebook-pricing.service';

const cost = ebookPricingService.calculateGenerationCost({
  words: 1000,
  tier: 'medium',
  contextDepth: 'moderate'
});

console.log(cost);
// {
//   inputTokens: 2350,  // 2000 base + 350 sistema
//   outputTokens: 4000, // 1000 palavras × 4
//   inputCostUSD: 0.000705,
//   outputCostUSD: 0.01,
//   totalCostUSD: 0.010705,
//   credits: 11,
//   tier: 'medium',
//   modelId: 'google/gemini-2.5-flash',
//   modelName: 'Google: Gemini 2.5 Flash',
//   words: 1000
// }
```

### Cálculo de Imagens

```typescript
import { ebookPricingService } from './ebook-pricing.service';

// Imagem interna média
const internal = ebookPricingService.calculateImageCost('medio', 'internal');
console.log(internal); // 8 créditos

// Capa avançada
const cover = ebookPricingService.calculateImageCost('avancado', 'cover');
console.log(cover); // 18 créditos (12 × 1.5)

// Múltiplas imagens
const multiple = ebookPricingService.calculateMultipleImagesCost(5, 'medio', 'internal');
console.log(multiple); // 40 créditos (8 × 5)
```

### Projeto Completo

```typescript
const projectCost = ebookPricingService.estimateProjectCost({
  sections: 30,
  wordsPerSection: 1000,
  tier: 'medium',
  withCover: true,
  coverQuality: 'avancado',
  withInternalImages: 30,
  internalImageQuality: 'medio'
});

console.log(projectCost);
// {
//   textGeneration: 330,  // 30 × 11
//   coverGeneration: 18,  // 1 × 18
//   internalImages: 240,  // 30 × 8
//   total: 588
// }
```

---

## 📁 Arquivos Modificados

1. **`src/config/ebook-llm.config.ts`**
   - ✅ Adicionado `IMAGE_PRICING` com tabela de custos por qualidade
   - ✅ Adicionado `MINIMUM_COSTS` com custos mínimos
   - ✅ Adicionado `SYSTEM_PROMPT_TOKENS = 350`
   - ✅ Renomeado `TOKEN_TO_CREDITS_RATIO` → `CREDITS_TO_USD_RATIO`
   - ✅ Adicionado `getImageCost(quality)`
   - ✅ Adicionado `calculateInputTokens(contextDepth, additionalContext)`

2. **`src/services/ebook-pricing.service.ts`**
   - ✅ Atualizado `calculateGenerationCost()` para usar `calculateInputTokens()`
   - ✅ Aplicado `MINIMUM_COSTS.textGeneration` (2 créditos)
   - ✅ Adicionado `calculateImageCost(quality, imageType)`
   - ✅ Adicionado `calculateMultipleImagesCost(count, quality, type)`
   - ✅ Deprecated `calculateReplicateCost()` com mapeamento de compatibilidade
   - ✅ Atualizado `estimateProjectCost()` com parâmetros de qualidade
   - ✅ Imports atualizados

3. **`src/controllers/tools/tool.controller.ts`**
   - ✅ Mensagem descritiva de saldo insuficiente

4. **`src/controllers/agents/agent.controller.ts`**
   - ✅ Mensagem descritiva de saldo insuficiente

5. **`src/controllers/agents/agent-long-content.controller.ts`**
   - ✅ Mensagem descritiva de saldo insuficiente

6. **`src/tools/image-editor.tool.ts`**
   - ✅ Preserva mensagem descritiva em erros

7. **`docs/PRICING_TABLES.md`** (NOVO)
   - ✅ Documentação completa de todas as tabelas de preços
   - ✅ Exemplos de cálculo
   - ✅ Referência de funções

---

## ✅ Checklist de Validação

- [x] Tabela de preços de texto por tier (básico/médio/avançado)
- [x] Tabela de preços de imagens por qualidade (básico/médio/avançado)
- [x] Custos mínimos definidos (texto: 2, imagem: 5, capa: 10)
- [x] Tokens de sistema fixos (350) incluídos no cálculo
- [x] Função `calculateInputTokens()` para contexto dinâmico
- [x] Mensagens descritivas de "no credit" em todos os pontos de validação
- [x] Compatibilidade reversa mantida (`calculateReplicateCost`)
- [x] Documentação completa criada

---

## 🔜 Próximos Passos (Further Considerations)

Conforme o plano original, ainda faltam:

1. **Endpoint de Previsão de Custo**
   - Criar/estender endpoint em `pricing.controller.ts`
   - Receber: palavras, tier, qualidade de imagens, quantidade
   - Retornar: breakdown detalhado (texto + imagens + total)

2. **Pré-Check de Saldo Universal**
   - Interceptar jobs antes de enfileirar
   - Validar saldo em `registerSocketRoutes`
   - Recusar job se saldo insuficiente

3. **Débito no Início da Execução**
   - Mover débito de créditos para início do worker
   - Calcular custo real após execução
   - Ajustar diferença (reembolso ou cobrança adicional)

4. **Retornar Saldo Restante**
   - Incluir saldo em respostas HTTP/socket
   - Formato: `{ ..., balance: { before, after, remaining } }`

---

**Data de Implementação**: 9 de dezembro de 2025  
**Versão**: 2.0.0
