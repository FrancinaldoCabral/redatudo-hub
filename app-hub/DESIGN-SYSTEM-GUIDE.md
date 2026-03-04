# 🎨 RedaTudo Tools - Guia do Design System

Sistema de design unificado para todas as ferramentas do hub RedaTudo.

## 📋 Índice

1. [Introdução](#introdução)
2. [Variáveis CSS](#variáveis-css)
3. [Estrutura de Página](#estrutura-de-página)
4. [Componentes](#componentes)
5. [Exemplos Práticos](#exemplos-práticos)
6. [Boas Práticas](#boas-práticas)

---

## 🎯 Introdução

O Design System do RedaTudo garante consistência visual em todas as ferramentas do hub. Use as classes CSS pré-definidas ao invés de criar estilos customizados.

### ✅ Benefícios
- **Consistência**: Visual unificado em todas ferramentas
- **Produtividade**: Desenvolvimento mais rápido
- **Manutenibilidade**: Mudanças centralizadas
- **Responsividade**: Mobile-first por padrão

---

## 🎨 Variáveis CSS

### Cores

```css
/* Principais */
--primary-purple: #7C3AED
--electric-blue: #3B82F6
--success-green: #10B981
--warning-orange: #F59E0B
--danger-red: #DC2626

/* Textos */
--text-primary: #FFFFFF
--text-secondary: #E5E7EB
--text-muted: #D1D5DB
--text-accent: #A78BFA
```

### Espaçamentos

```css
--spacing-xs: 0.5rem   /* 8px */
--spacing-sm: 0.75rem  /* 12px */
--spacing-md: 1rem     /* 16px */
--spacing-lg: 1.5rem   /* 24px */
--spacing-xl: 2rem     /* 32px */
--spacing-2xl: 3rem    /* 48px */
```

### Border Radius

```css
--border-radius-sm: 8px
--border-radius-md: 12px
--border-radius-lg: 16px
--border-radius-xl: 20px
--border-radius-2xl: 24px
```

---

## 📐 Estrutura de Página

### Template Básico

```html
<div class="tool-page">
  <div class="tool-container">
    
    <!-- Header da ferramenta -->
    <header class="tool-header">
      <span class="tool-header-badge">🎯 CATEGORIA</span>
      <h1 class="tool-header-title">Nome da Ferramenta</h1>
      <p class="tool-header-description">
        Descrição clara e concisa da ferramenta
      </p>
      
      <div class="tool-header-meta">
        <span class="tool-meta-item">
          <span class="tool-meta-icon">⭐</span>
          4.9 avaliação
        </span>
        <span class="tool-meta-item">
          <span class="tool-meta-icon">💡</span>
          12.4k gerações
        </span>
      </div>
    </header>

    <!-- Conteúdo principal -->
    <main>
      <!-- Seus componentes aqui -->
    </main>

  </div>
</div>
```

---

## 🧩 Componentes

### 1. Cards

```html
<!-- Card básico -->
<div class="tool-card">
  <div class="tool-card-header">
    <h3 class="tool-card-title">Título do Card</h3>
    <p class="tool-card-subtitle">Subtítulo opcional</p>
  </div>
  
  <div class="tool-card-body">
    <!-- Conteúdo do card -->
  </div>
</div>
```

### 2. Formulários

```html
<!-- Form Group -->
<div class="tool-form-group">
  <label class="tool-label" for="input-id">
    Título do Campo
  </label>
  
  <!-- Input -->
  <input 
    type="text" 
    id="input-id"
    class="tool-input" 
    placeholder="Digite aqui..."
  />
  
  <!-- Textarea -->
  <textarea 
    class="tool-textarea" 
    placeholder="Digite seu texto..."
    rows="5"
  ></textarea>
  
  <!-- Select -->
  <select class="tool-select">
    <option>Opção 1</option>
    <option>Opção 2</option>
  </select>
</div>
```

### 3. Botões

```html
<!-- Botão Primário -->
<button class="tool-btn tool-btn-primary">
  <span class="tool-btn-icon">🚀</span>
  Gerar Conteúdo
</button>

<!-- Botão Secundário -->
<button class="tool-btn tool-btn-secondary">
  Limpar
</button>

<!-- Botão Sucesso -->
<button class="tool-btn tool-btn-success">
  <span class="tool-btn-icon">✓</span>
  Confirmar
</button>

<!-- Botão Desabilitado -->
<button class="tool-btn tool-btn-primary" disabled>
  Processando...
</button>
```

### 4. Results / Output

```html
<div class="tool-results">
  <!-- Card de Resultado -->
  <div class="tool-result-card">
    <div class="tool-result-header">
      <h4 class="tool-result-title">Resultado #1</h4>
      
      <div class="tool-result-actions">
        <button class="tool-btn tool-btn-secondary">
          📋 Copiar
        </button>
        <button class="tool-btn tool-btn-secondary">
          ❤️ Favoritar
        </button>
      </div>
    </div>
    
    <div class="tool-result-content">
      Aqui vai o conteúdo gerado...
    </div>
  </div>
</div>
```

### 5. Badges

```html
<!-- Badge Primário -->
<span class="tool-badge tool-badge-primary">
  ⭐ Premium
</span>

<!-- Badge Sucesso -->
<span class="tool-badge tool-badge-success">
  ✓ Grátis
</span>

<!-- Badge Aviso -->
<span class="tool-badge tool-badge-warning">
  ⚠️ Atenção
</span>

<!-- Badge Info -->
<span class="tool-badge tool-badge-info">
  ℹ️ Informação
</span>
```

### 6. Loading State

```html
<div class="tool-loading">
  <div class="tool-loading-spinner"></div>
  <p class="tool-loading-text">Gerando conteúdo...</p>
</div>
```

### 7. Empty State

```html
<div class="tool-empty-state">
  <div class="tool-empty-icon">📭</div>
  <h3 class="tool-empty-title">Nenhum resultado ainda</h3>
  <p class="tool-empty-text">
    Preencha o formulário e clique em gerar para ver os resultados
  </p>
</div>
```

### 8. Grid Layouts

```html
<!-- Grid 2 colunas -->
<div class="tool-grid tool-grid-2">
  <div class="tool-card">...</div>
  <div class="tool-card">...</div>
</div>

<!-- Grid 3 colunas -->
<div class="tool-grid tool-grid-3">
  <div class="tool-card">...</div>
  <div class="tool-card">...</div>
  <div class="tool-card">...</div>
</div>

<!-- Grid 4 colunas -->
<div class="tool-grid tool-grid-4">
  <div class="tool-card">...</div>
  <div class="tool-card">...</div>
  <div class="tool-card">...</div>
  <div class="tool-card">...</div>
</div>
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Gerador de Títulos

```html
<div class="tool-page">
  <div class="tool-container">
    
    <!-- Header -->
    <header class="tool-header">
      <span class="tool-header-badge">✍️ TEXTO</span>
      <h1 class="tool-header-title">Gerador de Títulos</h1>
      <p class="tool-header-description">
        Crie títulos criativos e impactantes para seus conteúdos
      </p>
    </header>

    <!-- Formulário -->
    <div class="tool-card">
      <div class="tool-form-group">
        <label class="tool-label">Tema do Conteúdo</label>
        <input 
          type="text" 
          class="tool-input" 
          placeholder="Ex: Marketing Digital para Iniciantes"
        />
      </div>

      <div class="tool-form-group">
        <label class="tool-label">Quantidade de Títulos</label>
        <select class="tool-select">
          <option>5 títulos</option>
          <option>10 títulos</option>
          <option>15 títulos</option>
        </select>
      </div>

      <button class="tool-btn tool-btn-primary">
        <span class="tool-btn-icon">🚀</span>
        Gerar Títulos
      </button>
    </div>

    <!-- Resultados -->
    <div class="tool-results" *ngIf="hasResults">
      <div class="tool-grid tool-grid-2">
        <div class="tool-result-card" *ngFor="let title of titles">
          <div class="tool-result-header">
            <h4 class="tool-result-title">Título {{ title.index }}</h4>
            <div class="tool-result-actions">
              <button class="tool-btn tool-btn-secondary">📋</button>
            </div>
          </div>
          <div class="tool-result-content">
            {{ title.text }}
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
```

### Exemplo 2: Ferramenta com Abas

```html
<div class="tool-page">
  <div class="tool-container">
    
    <header class="tool-header">
      <h1 class="tool-header-title">Reformulador de Texto</h1>
    </header>

    <!-- Input -->
    <div class="tool-card">
      <div class="tool-form-group">
        <label class="tool-label">Texto Original</label>
        <textarea 
          class="tool-textarea" 
          rows="8"
          placeholder="Cole seu texto aqui..."
        ></textarea>
      </div>
      
      <button class="tool-btn tool-btn-primary">
        Reformular Texto
      </button>
    </div>

    <!-- Output com comparação -->
    <div class="tool-divider"></div>

    <div class="tool-grid tool-grid-2">
      <!-- Original -->
      <div class="tool-card">
        <div class="tool-card-header">
          <h3 class="tool-card-title">📄 Original</h3>
        </div>
        <div class="tool-result-content">
          {{ originalText }}
        </div>
      </div>

      <!-- Reformulado -->
      <div class="tool-card">
        <div class="tool-card-header">
          <h3 class="tool-card-title">✨ Reformulado</h3>
          <div class="tool-result-actions">
            <button class="tool-btn tool-btn-secondary">📋 Copiar</button>
          </div>
        </div>
        <div class="tool-result-content">
          {{ reformulatedText }}
        </div>
      </div>
    </div>

  </div>
</div>
```

---

## ✨ Boas Práticas

### ✅ Faça

- Use as classes do design system sempre que possível
- Mantenha hierarquia visual clara (títulos, subtítulos, textos)
- Use espaçamentos consistentes (--spacing-*)
- Adicione estados de loading e empty
- Teste responsividade em mobile

### ❌ Evite

- Criar estilos inline no HTML
- Sobrescrever variáveis CSS sem necessidade
- Usar cores hardcoded ao invés das variáveis
- Criar novos componentes sem verificar se já existem
- Ignorar estados de erro e loading

### 🎯 Checklist para Nova Ferramenta

- [ ] Header com badge de categoria
- [ ] Título e descrição clara
- [ ] Meta informações (avaliação, uso)
- [ ] Formulário com labels claros
- [ ] Botões com ícones quando apropriado
- [ ] Estado de loading durante processamento
- [ ] Cards de resultado bem estruturados
- [ ] Botões de ação (copiar, favoritar, etc)
- [ ] Estado vazio quando não há resultados
- [ ] Responsividade mobile testada

---

## 🔗 Classes Utilitárias

### Margens

```html
<div class="tool-mt-sm">margin-top: 0.75rem</div>
<div class="tool-mt-md">margin-top: 1rem</div>
<div class="tool-mt-lg">margin-top: 1.5rem</div>
<div class="tool-mt-xl">margin-top: 2rem</div>

<div class="tool-mb-sm">margin-bottom: 0.75rem</div>
<div class="tool-mb-md">margin-bottom: 1rem</div>
<div class="tool-mb-lg">margin-bottom: 1.5rem</div>
<div class="tool-mb-xl">margin-bottom: 2rem</div>
```

### Texto

```html
<div class="tool-text-center">Texto centralizado</div>
<div class="tool-text-gradient">Texto com gradiente</div>
```

### Dividers

```html
<div class="tool-divider"></div>
```

### Animações

```html
<div class="tool-animate-in">Fade in animation</div>
<div class="tool-transition-all">Smooth transitions</div>
```

---

## 📱 Responsividade

O design system é **mobile-first** e se adapta automaticamente:

- **Mobile**: < 480px - Layouts de coluna única
- **Tablet**: 480px - 768px - Grids adaptáveis
- **Desktop**: > 768px - Layout completo

### Pontos de Quebra

```css
@media (max-width: 768px) {
  /* Tablet e mobile */
}

@media (max-width: 480px) {
  /* Mobile apenas */
}
```

---

## 🎨 Paleta de Cores Extendida

Use estas cores para categorias específicas:

```css
--primary-purple: #7C3AED    /* Geral, Premium */
--electric-blue: #3B82F6     /* Acadêmico */
--success-green: #10B981     /* Sucesso, E-commerce */
--pink-vibrant: #EC4899      /* Redes Sociais */
--cyan-bright: #06B6D4       /* Tecnologia */
--teal-fresh: #14B8A6        /* Criativo */
--indigo-deep: #6366F1       /* Texto */
--violet-rich: #8B5CF6       /* Marketing */
--warning-orange: #F59E0B    /* Avisos, Premium */
--danger-red: #DC2626        /* Erros, Alertas */
```

---

## 🚀 Começando

1. O design system já está importado globalmente via `index.html`
2. Basta usar as classes CSS nos seus componentes
3. Não precisa importar CSS adicional
4. Consulte este guia sempre que precisar

---

## 📞 Suporte

Para dúvidas ou sugestões sobre o design system:
- Consulte este guia
- Veja exemplos em ferramentas existentes
- Mantenha consistência com o padrão estabelecido

---

**Última atualização**: Outubro 2025
**Versão**: 1.0.0
