# Sistema de Limitação Automática de Tokens

## 📋 Resumo

Sistema inteligente que limita automaticamente o número de tokens/palavras para ações de edição que trabalham com texto selecionado, evitando expansão indevida e melhorando a experiência do usuário.

## 🚨 Problema Identificado

### Caso Real
```javascript
// Entrada do usuário
{
  action: "rewrite",
  contextDepth: "minimal",
  selectedText: "notável metamorfose", // 2 palavras
  words: 100,  // ← CONFLITO: Reescrever 2 palavras em 100?
  customInstructions: "Troque por palavras sofisticadas..."
}

// Resultado anterior (PROBLEMA):
// → 46 palavras geradas (expandiu de 2 para 46)
```

### Análise do Problema
- **Inconsistência semântica**: Como "reescrever" 2 palavras em 100?
- **Expectativa do usuário**: Reescrever deveria manter tamanho similar
- **Desperdício de recursos**: Tokens e créditos gastos desnecessariamente
- **UX ruim**: Comportamento imprevisível

## 🎯 Solução Implementada

### Conceito
Validação/limitação automática de tamanho baseada em:
1. **Tipo de ação** (mantém tamanho vs permite expansão)
2. **Texto selecionado** (tamanho original)
3. **Margem de flexibilidade** (150% do original)

### Interface vs Backend
- ✅ **Interface (UX)**: Usuário continua vendo/digitando "palavras"
- ✅ **Backend (Precisão)**: Internamente usa "tokens" (mais preciso)

## 📊 Categorização de Ações

### Ações que PERMITEM Expansão (Não limitadas)
```typescript
const ALLOW_EXPANSION_ACTIONS = [
  'generate',        // Criar novo conteúdo
  'regenerate',      // Recriar conteúdo
  'continue',        // Continuar escrevendo (adiciona mais)
  'expand',          // Expandir propositalmente
  'enrich',          // Enriquecer (adiciona muito conteúdo)
  'describe',        // Adicionar descrições
  'add-examples',    // Adicionar exemplos
  'add-stats',       // Adicionar estatísticas
  'create-character',// Criar perfis
  'develop-dialogue',// Desenvolver diálogos
  'build-scene',     // Construir cenas
  'create-tension',  // Criar tensão
  'plot-twist',      // Reviravolta
  'worldbuild',      // Construção de mundo
  'create-list',     // Criar listas
  'tutorial',        // Criar tutorial
  'create-faq',      // Criar FAQ
  'argue',           // Argumentar (pode expandir)
  'add-hook'         // Adicionar gancho
];
```

### Ações que MANTÊM Tamanho (Limitadas)
```typescript
const MAINTAIN_SIZE_ACTIONS = [
  'rewrite',              // Reescrever = mesmo tamanho
  'simplify',             // Simplificar = igual ou menor
  'correct',              // Corrigir = mesmo tamanho
  'summarize',            // Resumir = menor
  'tone',                 // Mudar tom = mesmo tamanho
  'translate-tone',       // Traduzir tom = mesmo tamanho
  'dialogize',            // Transformar em diálogo
  'connect',              // Conectar seções
  'divide',               // Dividir seções
  'merge',                // Mesclar seções
  'compare',              // Comparar
  'cite-sources',         // Citar fontes
  'vary-structure',       // Variar estrutura
  'eliminate-redundancy', // Eliminar redundância
  'strengthen-opening',   // Fortalecer abertura
  'strong-closing',       // Fortalecer encerramento
  'improve-flow',         // Melhorar fluxo
  'inner-monologue'       // Monólogo interno
];
```

## 🔧 Implementação Técnica

### Arquivo: `src/config/ebook-llm.config.ts`

```typescript
/**
 * Verifica se uma ação deve manter o tamanho original
 */
export function shouldMaintainSize(action: GenerationAction): boolean {
  return !ALLOW_EXPANSION_ACTIONS.includes(action);
}
```

### Arquivo: `src/tools/ebook-advanced-generation.tool.ts`

```typescript
// REGRA INTELIGENTE: Limitação automática de tokens
if (args.selectedText && shouldMaintainSize(args.action)) {
  const selectedWordCount = countWords(args.selectedText);
  const selectedTokens = wordsToTokens(selectedWordCount);
  const requestedTokens = wordsToTokens(args.words);
  
  // Margem de 50% (ex: 2 palavras → máx 3 palavras)
  const maxAllowedTokens = Math.ceil(selectedTokens * 1.5);
  
  if (requestedTokens > maxAllowedTokens) {
    console.log(`🎯 [EbookAdvancedGen] LIMITAÇÃO AUTOMÁTICA: Ação "${args.action}"`);
    console.log(`   ↳ Texto selecionado: ${selectedWordCount} palavras (~${selectedTokens} tokens)`);
    console.log(`   ↳ Solicitado: ${args.words} palavras (~${requestedTokens} tokens)`);
    console.log(`   ↳ Limite máximo: ${maxAllowedTokens} tokens (150% do original)`);
    console.log(`   ↳ Ajustando max_tokens para evitar expansão indevida`);
    
    // Ajustar words para refletir o limite
    args.words = tokensToWords(maxAllowedTokens);
    console.log(`   ↳ Novo valor de palavras: ${args.words}`);
  }
}
```

## 🧪 Casos de Teste

### Teste 1: Rewrite com Limitação ✅
```javascript
// Input
{
  action: "rewrite",
  selectedText: "notável metamorfose", // 2 palavras
  words: 100
}

// Processamento
// → 2 palavras × 4 tokens/palavra = 8 tokens
// → Solicitado: 100 palavras = 400 tokens
// → Limite: 8 × 1.5 = 12 tokens (máximo)
// → Ajuste: 12 tokens ÷ 4 = 3 palavras

// Output esperado
// → ~3 palavras (não 100!)
```

### Teste 2: Expand SEM Limitação ✅
```javascript
// Input
{
  action: "expand",
  selectedText: "notável metamorfose", // 2 palavras
  words: 100
}

// Processamento
// → Ação "expand" está na lista ALLOW_EXPANSION_ACTIONS
// → Limitação NÃO é aplicada

// Output esperado
// → ~100 palavras (expandiu propositalmente)
```

### Teste 3: Continue SEM Limitação ✅
```javascript
// Input
{
  action: "continue",
  selectedText: "Era uma vez...", // 100 palavras
  words: 500
}

// Processamento
// → Ação "continue" está na lista ALLOW_EXPANSION_ACTIONS
// → Limitação NÃO é aplicada

// Output esperado
// → ~500 palavras (continua a história)
```

### Teste 4: Simplify com Limitação ✅
```javascript
// Input
{
  action: "simplify",
  selectedText: "parágrafo complexo com 50 palavras...",
  words: 200
}

// Processamento
// → 50 palavras × 4 = 200 tokens
// → Solicitado: 200 palavras = 800 tokens
// → Limite: 200 × 1.5 = 300 tokens
// → Ajuste: 300 tokens ÷ 4 = 75 palavras

// Output esperado
// → Máximo 75 palavras (simplificado, não expandido)
```

## 📈 Benefícios

### 1. UX Melhorada
- ✅ Comportamento previsível para ações de edição
- ✅ Resultados alinhados com expectativas do usuário
- ✅ Menos surpresas e frustrações

### 2. Economia de Recursos
- ✅ Menos tokens desperdiçados
- ✅ Redução de custos para ações de edição
- ✅ Melhor aproveitamento de créditos

### 3. Precisão Técnica
- ✅ Trabalha com tokens internamente (mais preciso)
- ✅ Interface amigável em palavras (UX)
- ✅ Conversões consistentes (1 palavra ≈ 4 tokens)

### 4. Flexibilidade Mantida
- ✅ Ações de criação/expansão não são afetadas
- ✅ Margem de 50% para flexibilidade
- ✅ Configurável por tipo de ação

## 🔄 Fluxo Completo

```
1. Usuário solicita ação
   ↓
2. Sistema verifica: shouldMaintainSize(action)?
   ↓
3a. NÃO → Permite expansão livre (continue, expand, etc.)
   ↓
3b. SIM → Calcula limite baseado em texto selecionado
   ↓
4. Aplica limite (150% do original)
   ↓
5. Ajusta args.words automaticamente
   ↓
6. Gera conteúdo com max_tokens ajustado
   ↓
7. Resultado: Tamanho apropriado para a ação
```

## ⚙️ Configuração

### Margem de Flexibilidade
```typescript
// Padrão: 150% (1.5x)
const maxAllowedTokens = Math.ceil(selectedTokens * 1.5);

// Para ajustar:
// 200% = selectedTokens * 2.0
// 125% = selectedTokens * 1.25
```

## 📊 Logs de Debug

Quando a limitação é aplicada:
```
🎯 [EbookAdvancedGen] LIMITAÇÃO AUTOMÁTICA: Ação "rewrite"
   ↳ Texto selecionado: 2 palavras (~8 tokens)
   ↳ Solicitado: 100 palavras (~400 tokens)
   ↳ Limite máximo: 12 tokens (150% do original)
   ↳ Ajustando max_tokens para evitar expansão indevida
   ↳ Novo valor de palavras: 3
```

## 🔗 Integração com Outros Sistemas

### 1. Context Depth Inteligente
```typescript
// Trabalha em conjunto com a regra de contextDepth='minimal'
// Ambas evitam expansão indevida em ações de edição
if (selectedText && requiresSelection(action)) {
  contextDepth = 'minimal';  // (1) Reduz contexto
}

if (selectedText && shouldMaintainSize(action)) {
  limitTokens();  // (2) Limita output
}
```

### 2. Custom Instructions
```typescript
// customInstructions continua funcionando normalmente
// Limitação de tokens não interfere com instruções personalizadas
{
  action: "rewrite",
  words: 100,  // → ajustado para 3
  customInstructions: "Use palavras sofisticadas"  // ✅ Funciona
}
```

### 3. Pricing System
```typescript
// Cálculo de créditos usa o valor ajustado
ebookPricingService.calculateGenerationCost({
  words: args.words,  // ← Já ajustado pela limitação
  tier: tier,
  contextDepth: contextDepth,
  action: args.action
});
```

## 🎓 Boas Práticas

### ✅ DO (Faça)
- Confie na limitação automática para ações de edição
- Use "expand" quando realmente quiser expandir texto
- Use "continue" para adicionar mais conteúdo
- Mantenha customInstructions focadas na qualidade, não quantidade

### ❌ DON'T (Não faça)
- Não force valores altos para "rewrite" esperando expansão
- Não desabilite a limitação sem entender impacto
- Não adicione ações à lista ALLOW_EXPANSION sem análise

## 🔮 Futuras Melhorias

### Possibilidades
1. **Margem configurável por usuário/tier**
   ```typescript
   const margin = tier === 'advanced' ? 2.0 : 1.5;
   ```

2. **Avisos ao usuário no frontend**
   ```typescript
   if (limitApplied) {
     return { warning: "Valor ajustado automaticamente..." };
   }
   ```

3. **Estatísticas de limitação**
   ```typescript
   trackLimitationStats({
     action,
     original: requestedTokens,
     adjusted: maxAllowedTokens,
     savings: requestedTokens - maxAllowedTokens
   });
   ```

## 📚 Referências

- **Documentação Context Depth**: `docs/CONTEXT_DEPTH_DECISION.md`
- **Sistema de Ações**: `src/config/ebook-llm.config.ts`
- **Tool Principal**: `src/tools/ebook-advanced-generation.tool.ts`
- **Conversões**: `wordsToTokens()`, `tokensToWords()` (1:4 ratio)

---

**Versão**: 1.0  
**Data**: 11/11/2025  
**Status**: ✅ Implementado e Testado
