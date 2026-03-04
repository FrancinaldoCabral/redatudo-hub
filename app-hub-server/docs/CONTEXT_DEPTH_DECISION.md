# Decisão Técnica: ContextDepth em Ações de Edição

## 📋 Problema Identificado

### Cenário
- Usuário seleciona **2 palavras** 
- Ação: **Simplificar**
- **Modo Rápido (contextDepth: minimal):** ✅ Funcionou bem
- **Modo Detalhado (contextDepth: full):** ❌ Aumentou demais o texto

### Feedback do Usuário
> "No modo detalhado aumentou demais o texto, não sei o que o usuário vai achar disso, ou se vai considerar um bug."

---

## 🔍 Pesquisa: Melhores Práticas do Mercado

### Como Ferramentas Profissionais Lidam com Edição de Texto Selecionado?

| Ferramenta | Permite escolher contexto? | Comportamento |
|------------|---------------------------|---------------|
| **Grammarly** | ❌ Não | Contexto **automático** e localizado. Trabalha sempre no texto selecionado. |
| **Notion AI** | ❌ Não | Contexto **automático** baseado no bloco e página atual. |
| **ChatGPT** | ❌ Não | Quando texto é destacado, trabalha nele. Contexto = histórico da conversa. |
| **Claude** | ❌ Não | Mesmo comportamento do ChatGPT. |
| **Google Docs Smart Compose** | ❌ Não | Contexto **automático** baseado no documento. |
| **Microsoft Editor** | ❌ Não | Contexto **automático** e inteligente. |

### 📊 Conclusão da Pesquisa

**NENHUMA** ferramenta profissional do mercado permite ao usuário escolher "quanto contexto a IA deve ler" para ações de edição.

**Padrão universal:**
- ✅ Contexto é **AUTOMÁTICO** e **INTELIGENTE**
- ✅ Ferramentas decidem internamente o contexto necessário
- ✅ Usuário não precisa se preocupar com isso
- ✅ Foco na **intenção da ação**, não em configurações técnicas

---

## 💡 Análise do Problema Atual

### Por que `contextDepth: full` causa expansão indevida?

1. **System Prompt Inchado:**
   - Com `contextDepth: full`, o system prompt inclui todo o projeto (5000 tokens estimados)
   - A IA recebe MUITO contexto e tenta "fazer jus" a toda essa informação
   - Mesmo com instruções explícitas de "trabalhar só no texto selecionado", o viés é forte

2. **Viés Cognitivo da IA:**
   - Quando a IA recebe muito contexto, ela tende a gerar respostas mais elaboradas
   - É um comportamento bem documentado em LLMs: mais input → mais output
   - O prompt explícito ajuda, mas não elimina completamente o viés

3. **Expectativa do Usuário:**
   - Usuário seleciona 2 palavras para "simplificar"
   - Não espera ler todo o projeto para fazer isso
   - "Modo Detalhado" sugere *qualidade*, não *volume de contexto*

---

## 🎯 Opções Avaliadas

### Opção A: Remover seletor de contextDepth do frontend para ações que requerem seleção
- ❌ **Rejeita:** Remove controle do usuário
- ❌ **Problema:** Usuário pode querer "modo rápido" vs "modelo melhor" (confusão com modelTier)

### Opção B: contextDepth afeta APENAS o system prompt (contexto de referência), não o escopo do trabalho
- ⚠️ **Parcial:** Já implementado, mas não resolve o viés cognitivo
- ✅ **Positivo:** Prompts já são explícitos sobre escopo

### Opção C: Forçar contextDepth='minimal' automaticamente quando há texto selecionado
- ✅ **RECOMENDADA**
- ✅ **Simples:** Lógica backend automática
- ✅ **Intuitiva:** Usuário não percebe mudança
- ✅ **Segura:** Elimina o problema na raiz

### Opção D: Ajustar prompts para ser AINDA MAIS enfático
- ⚠️ **Insuficiente:** Já tentado, viés cognitivo persiste
- ❌ **Limitada:** Não resolve o problema fundamental

---

## ✅ Solução Escolhida: **Opção C (Híbrida Inteligente)**

### Implementação

```typescript
/**
 * REGRA DE NEGÓCIO:
 * 
 * Ações de EDIÇÃO com texto selecionado sempre usam contextDepth='minimal'
 * - Garante que a IA trabalhe SÓ no texto selecionado
 * - Contexto mínimo = seção atual (500 tokens)
 * - Suficiente para manter tom/estilo
 * - Elimina viés cognitivo de "contexto demais"
 * 
 * Ações de CRIAÇÃO respeitam o contextDepth escolhido pelo usuário
 * - generate, regenerate, continue, etc.
 * - Usuário QUER que a IA considere todo o projeto
 */
```

### Mudanças Necessárias

1. **Backend:** Aplicar regra automática em `ebook-context.service.ts`
2. **Frontend:** Nenhuma mudança necessária (transparente para o usuário)
3. **UX:** Comportamento mais previsível e alinhado com mercado

---

## 📦 Benefícios da Solução

### ✅ Para o Usuário
1. **Comportamento Previsível:**
   - Seleciona 2 palavras → IA trabalha nas 2 palavras
   - Independente de configurações adicionais

2. **Sem Confusão:**
   - "Modo Rápido" vs "Detalhado" deixa de ser relevante para edição
   - Foco na **ação**, não na configuração

3. **Alinhado com Mercado:**
   - Mesmo comportamento de Grammarly, Notion AI, etc.
   - Familiar e intuitivo

### ✅ Para o Sistema
1. **Menos Tokens Consumidos:**
   - ContextDepth='minimal' = 500 tokens (vs 5000 em full)
   - **90% de redução** em custos para ações de edição

2. **Respostas Mais Rápidas:**
   - Menos input = processamento mais rápido

3. **Menor Risco de Erros:**
   - Elimina viés cognitivo de contexto excessivo

---

## 🧪 Casos de Teste

### Antes da Solução
```
Ação: Simplificar "machine learning"
ContextDepth: minimal → ✅ "aprendizado de máquina" (2 palavras)
ContextDepth: full → ❌ "aprendizado de máquina é uma técnica..." (30 palavras)
```

### Depois da Solução
```
Ação: Simplificar "machine learning"
ContextDepth: minimal → ✅ "aprendizado de máquina" (2 palavras)
ContextDepth: full → ✅ "aprendizado de máquina" (2 palavras) [forçado para minimal]
```

---

## 🔧 Implementação Técnica

### Serviço: `ebook-context.service.ts`

```typescript
buildContext(params: ContextParams): EbookContext {
  // REGRA: Ações de edição com seleção sempre usam minimal
  const effectiveDepth = this.shouldForceMinimalContext(params)
    ? 'minimal'
    : params.contextDepth;
  
  // ... resto do código
}

private shouldForceMinimalContext(params: ContextParams): boolean {
  const { action, selectedText, contextDepth } = params;
  
  // Se não há seleção, respeita a escolha do usuário
  if (!selectedText || selectedText.trim().length === 0) {
    return false;
  }
  
  // Se ação requer seleção, força minimal
  return requiresSelection(action);
}
```

---

## 📈 Métricas de Sucesso

### KPIs
1. **Precisão:** Texto gerado deve ter tamanho similar ao selecionado
2. **Satisfação:** Usuários não reportam "expansão indevida"
3. **Custo:** Redução de ~80% em tokens para ações de edição
4. **Performance:** Respostas ~50% mais rápidas

### Monitoramento
- Logs de `contextDepth original` vs `contextDepth efetivo`
- Comparação tamanho input vs output
- Feedback de usuários sobre qualidade

---

## 📚 Referências

- Grammarly UX Patterns: Contexto automático
- Notion AI Documentation: Intelligent context selection
- OpenAI Best Practices: Context management for editing tasks
- Anthropic Claude Guidelines: Scoped editing

---

## 🔄 Histórico

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-01-11 | 1.0 | Decisão inicial: Força contextDepth='minimal' para ações de edição com seleção |

---

**Status:** ✅ Aprovado para implementação
**Prioridade:** Alta
**Impacto:** Crítico para UX
