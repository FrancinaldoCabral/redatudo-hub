# Sistema Avançado de Geração de Ebooks

## 📋 Visão Geral

Sistema completo de geração de conteúdo para ebooks com **40+ ações diferentes**, **sistema de tiers de qualidade**, e **controle preciso de comprimento por palavras**.

## 🎯 Características Principais

### 1. **40+ Ações de Geração**

Organizadas em 6 categorias:

#### 📝 Criação (3 ações)
- `generate` - Gerar do zero
- `regenerate` - Regenerar com nova abordagem
- `continue` - Continuar escrevendo

#### ✏️ Edição (7 ações)
- `expand` - Expandir texto
- `rewrite` - Reescrever
- `tone` - Mudar tom
- `summarize` - Resumir
- `simplify` - Simplificar
- `enrich` - Enriquecer
- `correct` - Corrigir

#### 🔄 Transformação (7 ações)
- `dialogize` - Transformar em diálogo
- `describe` - Adicionar descrições
- `argue` - Adicionar argumentos
- `connect` - Melhorar transições
- `divide` - Dividir em seções
- `merge` - Mesclar parágrafos
- `translate-tone` - Traduzir entre tons

#### 📖 Narrativa (7 ações)
- `create-character` - Criar personagem
- `develop-dialogue` - Desenvolver diálogo
- `build-scene` - Construir cena
- `create-tension` - Criar tensão
- `plot-twist` - Adicionar plot twist
- `inner-monologue` - Monólogo interior
- `worldbuild` - Expandir worldbuilding

#### 🔬 Técnico (7 ações)
- `add-examples` - Adicionar exemplos
- `create-list` - Criar lista
- `compare` - Comparar A vs B
- `tutorial` - Criar tutorial
- `add-stats` - Adicionar estatísticas
- `cite-sources` - Citar fontes
- `create-faq` - Criar FAQ

#### ✨ Refinamento (6 ações)
- `vary-structure` - Variar estrutura
- `eliminate-redundancy` - Eliminar redundância
- `strengthen-opening` - Fortalecer abertura
- `strong-closing` - Concluir forte
- `add-hook` - Adicionar gancho
- `improve-flow` - Melhorar flow

### 2. **Sistema de Tiers**

Três níveis de qualidade:

| Tier | Modelo | Custo Input | Custo Output | Melhor Para |
|------|--------|-------------|--------------|-------------|
| **Basic** | Gemini Flash 2.0 | $0.10/M | $0.40/M | Rascunhos, testes |
| **Medium** | Gemini Pro 1.5 | $0.40/M | $1.60/M | Uso geral (padrão) |
| **Advanced** | GPT-4o | $2.00/M | $8.00/M | Máxima qualidade |

### 3. **Controle de Comprimento por Palavras**

Faixas predefinidas:

| Faixa | Palavras | Tokens (aprox) | Uso Ideal |
|-------|----------|----------------|-----------|
| Extra Curta | 100-300 | 400-1200 | Resumos breves |
| Curta | 300-600 | 1200-2400 | Seções pequenas |
| Média | 600-1200 | 2400-4800 | Capítulos normais |
| Longa | 1200-2500 | 4800-10000 | Capítulos extensos |
| Extra Longa | 2500-5000 | 10000-20000 | Gerações massivas |

**Conversão:** 1 palavra = 4 tokens

### 4. **Precificação Fixa**

**Fórmula:**
```
Custo = (input_tokens / 1M × custo_input) + (output_tokens / 1M × custo_output)
Créditos = Custo / $0.001
```

**Exemplo (1000 palavras, tier Medium):**
- Output tokens: 1000 × 4 = 4000
- Input tokens: ~2000 (contexto moderate)
- Custo input: (2000 / 1M) × $0.40 = $0.0008
- Custo output: (4000 / 1M) × $1.60 = $0.0064
- Custo total: $0.0072
- **Créditos: 8**

## 🏗️ Arquitetura

### Arquivos Criados

```
src/
├── config/
│   └── ebook-llm.config.ts           # Configuração de modelos e custos
├── constants/
│   └── ebook-word-ranges.ts          # Faixas de palavras predefinidas
├── services/
│   ├── ebook-pricing.service.ts      # Cálculo de custos
│   ├── ebook-context.service.ts      # Construção de contexto
│   ├── ebook-validation.service.ts   # Validação de requisições
│   ├── ebook-anti-repetition.service.ts  # Detecção de repetições
│   └── ebook-prompt.service.ts       # Construção de prompts (40+ ações)
└── tools/
    └── ebook-advanced-generation.tool.ts  # Tool unificado
```

### Fluxo de Execução

```
1. VALIDAÇÃO
   ├─ Verificar campos obrigatórios
   ├─ Validar número de palavras (100-5000)
   ├─ Validar tier (basic/medium/advanced)
   └─ Verificar se ação requer seleção

2. CONSTRUÇÃO DE CONTEXTO
   ├─ Carregar informações do projeto
   ├─ Carregar seção atual
   ├─ Carregar seções adjacentes (se moderate/full)
   └─ Extrair frases para anti-repetição

3. CONSTRUÇÃO DE PROMPT
   ├─ System prompt (instruções gerais)
   └─ User prompt (específico da ação)

4. SELEÇÃO DE MODELO
   ├─ Obter modelo baseado no tier
   ├─ Calcular max_tokens (palavras × 4)
   └─ Definir temperatura (por ação)

5. GERAÇÃO COM LLM
   └─ Chamar OpenRouter com parâmetros

6. PROCESSAMENTO DE RESULTADO
   ├─ Contar palavras geradas
   ├─ Calcular tokens usados
   └─ Retornar conteúdo + metadata
```

## 📦 Como Usar

### Exemplo de Requisição

```typescript
const params = {
  projectId: '507f1f77bcf86cd799439011',
  sectionId: '507f191e810c19729de860ea',
  action: 'expand',
  words: 1000,
  tier: 'medium',
  selectedText: 'Texto para expandir...',
  contextDepth: 'moderate',
  options: {
    tone: 'profissional',
    style: 'descriptive',
    targetAudience: 'adultos'
  }
};

// Preview de custo
const preview = await ebookAdvancedGenerationTool.costPreview(params);
console.log(preview.credits); // 8 créditos

// Executar geração
const result = await ebookAdvancedGenerationTool.action(params);
console.log(result.content); // Texto gerado
console.log(result.metadata.words); // Palavras geradas
```

### Registrar Tool

No `src/services/tools.service.ts`:

```typescript
import { ebookAdvancedGenerationTool } from '../tools/ebook-advanced-generation.tool';

// Adicionar ao mapa de tools
const toolsMap = {
  // ... outros tools
  'ebook-advanced-generation': ebookAdvancedGenerationTool,
};
```

## ⚙️ Configuração

### Ajustar Custos dos Modelos

Editar `src/config/ebook-llm.config.ts`:

```typescript
export const LLM_MODELS: Record<string, LLMModelCost> = {
  'advanced': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o (Advanced)',
    inputCostPerMillionTokens: 2.00,   // Editável
    outputCostPerMillionTokens: 8.00   // Editável
  },
  // ... outros modelos
};
```

### Ajustar Estimativas de Contexto

```typescript
export const CONTEXT_SIZE_ESTIMATES = {
  minimal: 500,     // Editável
  moderate: 2000,   // Editável
  full: 5000        // Editável
};
```

### Ajustar Conversões

```typescript
export const WORDS_TO_TOKENS_RATIO = 4;          // Editável
export const TOKEN_TO_CREDITS_RATIO = 0.001;     // Editável
```

## 📊 Tabela de Preços

### Tier BASIC (Gemini Flash)

| Palavras | Créditos |
|----------|----------|
| 100 | 1 |
| 300 | 1 |
| 600 | 2 |
| 1,200 | 3 |
| 2,500 | 5 |
| 5,000 | 9 |

### Tier MEDIUM (Gemini Pro)

| Palavras | Créditos |
|----------|----------|
| 100 | 1 |
| 300 | 3 |
| 600 | 6 |
| 1,200 | 11 |
| 2,500 | 24 |
| 5,000 | 48 |

### Tier ADVANCED (GPT-4o)

| Palavras | Créditos |
|----------|----------|
| 100 | 4 |
| 300 | 11 |
| 600 | 21 |
| 1,200 | 42 |
| 2,500 | 88 |
| 5,000 | 176 |

## 🔧 Manutenção

### Adicionar Nova Ação

1. Adicionar ao enum em `src/config/ebook-llm.config.ts`:
```typescript
export type GenerationAction = 
  | 'existing-actions'
  | 'nova-acao';  // Adicionar aqui
```

2. Adicionar temperatura em `ACTION_TEMPERATURES`
3. Adicionar categoria em `ACTION_CATEGORIES`
4. Adicionar ao schema do Tool
5. Criar método de prompt em `EbookPromptService`

### Adicionar Novo Tier

1. Adicionar modelo em `LLM_MODELS`
2. Atualizar tipo `ModelTier`
3. Atualizar schema do Tool

## 🎓 Boas Práticas

1. **Use tier apropriado:**
   - Basic: Rascunhos e testes
   - Medium: Uso geral (recomendado)
   - Advanced: Conteúdo final de alta qualidade

2. **Ajuste o comprimento:**
   - Seja específico com o número de palavras
   - Evite extremos (muito curto ou muito longo)

3. **Aproveite o contexto:**
   - Use 'full' para projetos com muita inter-relação
   - Use 'minimal' para textos independentes

4. **Customize quando necessário:**
   - Use `customInstructions` para requisitos específicos
   - Ajuste tone, style, perspective conforme o conteúdo

## 🐛 Troubleshooting

### Erro: "Validação falhou"
- Verifique se projectId e sectionId estão corretos
- Verifique se words está entre 100-5000
- Para ações que requerem seleção, forneça selectedText

### Custo maior que esperado
- Verifique o tier selecionado
- Verifique a profundidade de contexto
- Considere usar tier lower para testes

### Conteúdo gerado não atende expectativas
- Ajuste o tier para 'advanced'
- Adicione customInstructions detalhadas
- Especifique tone, style e targetAudience

## 📝 Notas Importantes

- **Sem validação de comprimento:** O sistema não rejeita se o LLM gerar mais/menos palavras que o solicitado
- **Precificação fixa:** O custo é calculado ANTES da geração baseado no máximo de tokens possíveis
- **Contexto inteligente:** O sistema carrega automaticamente contexto relevante do projeto
- **Anti-repetição disponível:** Serviço implementado mas não usado obrigatoriamente conforme requisito

## 🚀 Próximos Passos

1. Registrar o Tool no sistema de Tools
2. Testar todas as 40+ ações
3. Implementar endpoint de sincronização de imagens (opcional)
4. Criar interface frontend para seleção de ações e tiers
5. Adicionar suporte a múltiplas gerações em lote

---

**Versão:** 1.0.0  
**Data:** 03/11/2025  
**Autor:** Sistema de Geração Avançada de Ebooks
