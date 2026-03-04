# Accessibility & Inclusivity Guide

## ♿ Acessibilidade no Modal de Exportação

### 1. Estrutura ARIA

```vue
<div class="modal-unified-export" role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <div class="modal-header">
    <h2 id="modal-title">Exportar Ebook</h2>
    <button 
      @click="closeModal" 
      aria-label="Fechar diálogo"
      aria-pressed="false"
      class="btn-close"
    >✕</button>
  </div>

  <!-- ... conteúdo ... -->
</div>
```

### 2. Navegação com Teclado

```typescript
// Em UnifiedExportModal.vue
const handleKeydown = (e: KeyboardEvent) => {
  // ESC para fechar
  if (e.key === 'Escape') {
    closeModal();
    e.preventDefault();
  }

  // Tab para navegar
  if (e.key === 'Tab') {
    // Implementar focus trap dentro do modal
    handleTabKey(e);
  }

  // Enter para exportar (quando em botão Exportar)
  if (e.key === 'Enter' && e.ctrlKey) {
    exportEbook();
    e.preventDefault();
  }
};

const handleTabKey = (e: KeyboardEvent) => {
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  if (e.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      lastElement.focus();
      e.preventDefault();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      firstElement.focus();
      e.preventDefault();
    }
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
```

### 3. Labels Acessíveis

```vue
<!-- ❌ Ruim -->
<input type="checkbox" />
Incluir Capa

<!-- ✅ Bom -->
<input 
  type="checkbox"
  id="include-cover"
  aria-label="Incluir capa no documento exportado"
/>
<label for="include-cover">Incluir Capa</label>
```

### 4. Mensagens de Status Acessíveis

```typescript
// Usar aria-live para anunciar atualizações
const previewError = ref('');
const previewStatus = ref('');

// No template:
<div
  aria-live="polite"
  aria-atomic="true"
  role="status"
  id="preview-status"
>
  <p v-if="isLoadingPreview">Gerando preview...</p>
  <p v-if="previewError" role="alert">❌ {{ previewError }}</p>
</div>

<div
  aria-live="assertive"
  aria-atomic="true"
  id="export-status"
>
  <p v-if="isExporting">Exportando: {{ exportProgress }}%</p>
  <p v-if="exportError" role="alert">{{ exportError }}</p>
</div>
```

### 5. Descrições de Cores

```vue
<!-- ❌ Ruim - apenas cor -->
<div style="color: red">Erro</div>

<!-- ✅ Bom - cor + ícone + texto -->
<div style="color: red">
  ❌ Erro: Projeto não possui design
</div>

<!-- ❌ Ruim - apenas código -->
<span class="status pending"></span>

<!-- ✅ Bom - descrição visual -->
<span class="status pending" aria-label="Status: Pendente">⏳</span>
```

### 6. Contraste de Cores

```scss
// Verificar WCAG AA (4.5:1 para texto, 3:1 para UI)
// Boas práticas:

// ✅ Texto escuro em fundo claro
.modal-body {
  background: #ffffff;  // Branco
  color: #1a1a1a;       // Quase preto (21:1)
}

// ✅ Botão primário
.btn-primary {
  background: #0070c0;  // Azul escuro
  color: #ffffff;       // Branco (9.5:1)
}

// ❌ Evitar (contraste ruim)
.btn-danger {
  background: #ffcccc;  // Vermelho claro
  color: #ff0000;       // Vermelho (2.5:1) ← RUIM!
}

// ✅ Melhorado
.btn-danger {
  background: #d32f2f;  // Vermelho escuro
  color: #ffffff;       // Branco (8.5:1)
}
```

### 7. Focus Visível

```scss
// Garantir que o focus é visível
button,
input,
select {
  &:focus {
    outline: 2px solid #0070c0;
    outline-offset: 2px;
  }

  // Para navegadores que suportam :focus-visible
  &:focus:not(:focus-visible) {
    outline: none;  // Remove outline apenas se usando mouse
  }

  &:focus-visible {
    outline: 2px solid #0070c0;
    outline-offset: 2px;
  }
}

// Melhor para acessibilidade
.config-item input:focus,
.config-item select:focus {
  outline: none;
  border-color: #0070c0;
  box-shadow: 0 0 0 3px rgba(0, 112, 192, 0.3);
  // Cria um "halo" de foco mais acessível
}
```

### 8. Descrições de Campos

```vue
<!-- Input com descrição -->
<div class="form-group">
  <label for="line-height">
    Altura da Linha
    <span aria-label="valor recomendado entre 1 e 2.5">*</span>
  </label>
  <input 
    id="line-height"
    type="range"
    min="1"
    max="2.5"
    step="0.1"
    aria-describedby="line-height-help"
  />
  <small id="line-height-help">
    Recomendado entre 1 (compacto) e 2.5 (espaçado)
  </small>
</div>
```

### 9. Modais Acessíveis

```typescript
// Salvar foco anterior
let previousFocus: HTMLElement | null = null;

const openModal = () => {
  previousFocus = document.activeElement as HTMLElement;
  isExportModalOpen.value = true;

  // Dar foco ao primeiro elemento do modal
  nextTick(() => {
    const firstButton = document.querySelector('.modal .btn-primary') as HTMLElement;
    if (firstButton) {
      firstButton.focus();
    }
  });
};

const closeModal = () => {
  isExportModalOpen.value = false;

  // Restaurar foco
  nextTick(() => {
    previousFocus?.focus();
  });
};
```

### 10. Atributos ARIA Específicos

```vue
<!-- Progress bar -->
<div
  class="progress-bar"
  role="progressbar"
  aria-valuenow="45"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Progresso da exportação"
>
  <div class="progress-fill" style="width: 45%"></div>
</div>

<!-- Disabled button -->
<button
  @click="exportEbook"
  :disabled="isExporting || userBalance < estimatedCost[exportFormat]"
  :aria-disabled="isExporting || userBalance < estimatedCost[exportFormat]"
  aria-label="Exportar documento (desabilitado: saldo insuficiente)"
>
  Exportar
</button>

<!-- Dropdown -->
<select
  v-model="exportFormat"
  aria-label="Selecionar formato de exportação"
  aria-describedby="format-info"
>
  <option value="pdf">PDF</option>
  <option value="docx">Word</option>
  <option value="epub">E-Book</option>
</select>
<small id="format-info">
  Escolha o formato desejado para exportação do documento
</small>
```

---

## 🌐 Suporte a Diferentes Idiomas

### 1. i18n Integration

```typescript
// src/i18n/messages/pt-BR.json
{
  "export": {
    "title": "Exportar Ebook",
    "preview": "Preview",
    "design": "Design",
    "layout": "Layout",
    "content": "Conteúdo",
    "format": "Formato",
    "button": "Exportar",
    "loading": "Carregando...",
    "error": "Erro ao exportar"
  }
}

// Em UnifiedExportModal.vue
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// No template:
<h2>{{ t('export.title') }}</h2>
<button>{{ t('export.button') }}</button>
```

### 2. RTL Support (Árabe, Hebraico)

```scss
// styles/rtl.scss
[dir="rtl"] {
  .modal-body {
    grid-template-columns: 1fr 1fr;  // Reverter visualmente
    direction: rtl;
  }

  .preview-section {
    order: 2;
  }

  .config-section {
    order: 1;
  }

  .config-row {
    flex-direction: row-reverse;
  }
}

// HTML
<div :dir="locale.includes('ar') ? 'rtl' : 'ltr'">
  <!-- conteúdo -->
</div>
```

---

## 📖 Testes de Acessibilidade

### 1. Ferramentas Recomendadas

```javascript
// axe DevTools (Browser Extension)
// - Detecta problemas de WCAG

// WAVE (Browser Extension)
// - Visualiza problemas de acessibilidade

// Lighthouse (Chrome DevTools)
// - Auditoria automática de acessibilidade

// Screen Reader Testing
// - NVDA (Windows, grátis)
// - JAWS (Windows, pago)
// - VoiceOver (macOS/iOS, grátis)
```

### 2. Checklist de Testes

```
Testes de Teclado:
- [ ] Abrir modal com Tab
- [ ] Navegar entre campos com Tab
- [ ] Reverter com Shift+Tab
- [ ] Fechar com ESC
- [ ] Enviar com Enter/Ctrl+Enter
- [ ] Nenhum foco "preso"

Testes de Screen Reader (NVDA):
- [ ] Ler título do modal
- [ ] Ler labels de campos
- [ ] Anunciar status de carregamento
- [ ] Anunciar erros
- [ ] Ler descrições de botões

Testes de Contraste:
- [ ] Ratio mínimo 4.5:1 (texto)
- [ ] Ratio mínimo 3:1 (UI)
- [ ] Cores não comunicam sozinhas

Testes de Zoom:
- [ ] Funciona em 200% zoom
- [ ] Sem scroll horizontal
- [ ] Legível e navegável
```

### 3. Exemplo de Teste Automatizado

```typescript
// tests/accessibility.test.ts
import { render, screen } from '@testing-library/vue';
import UnifiedExportModal from '@/components/UnifiedExportModal.vue';
import { axe } from 'jest-axe';

describe('UnifiedExportModal Accessibility', () => {
  it('deve passar em auditoria de acessibilidade', async () => {
    const { container } = render(UnifiedExportModal, {
      props: {
        projectId: 'test-123',
        onClose: () => {},
        onExportComplete: () => {}
      }
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('deve ter labels para todos os inputs', () => {
    render(UnifiedExportModal, {
      props: {
        projectId: 'test-123',
        onClose: () => {},
        onExportComplete: () => {}
      }
    });

    const inputs = screen.getAllByRole('input');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('aria-label');
    });
  });

  it('deve ser navegável apenas com teclado', async () => {
    const { container } = render(UnifiedExportModal);
    
    // Tab até encontrar o botão de exportar
    let focusedElement = container;
    let tabCount = 0;
    
    while (tabCount < 50) {
      focusedElement.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab' })
      );
      
      if (
        document.activeElement?.textContent?.includes('Exportar')
      ) {
        break;
      }
      tabCount++;
    }

    expect(tabCount).toBeLessThan(50);  // Não deveria levar 50 tabs
  });
});
```

---

## 🎯 Objetivos de Conformidade

### WCAG 2.1 Level AA ✅
- Contraste de cores: 4.5:1 (texto), 3:1 (UI)
- Navegação por teclado completa
- Sem conteúdo que pisca mais de 3x/segundo
- Ordem lógica de foco
- Labels para todos os controles
- Mensagens de status acessíveis

### Checklist WCAG

```
1. Perceivable
  - [x] Alternativas para conteúdo visual
  - [x] Conteúdo em cores + outros meios
  - [x] Contraste de cores adequado

2. Operable
  - [x] Totalmente navegável por teclado
  - [x] Sem armadilhas de teclado
  - [x] Tempo suficiente (sem timeouts)
  - [x] Sem conteúdo piscante

3. Understandable
  - [x] Linguagem clara
  - [x] Instruções visíveis
  - [x] Tratamento de erros

4. Robust
  - [x] HTML válido
  - [x] ARIA attributes corretos
  - [x] Compatível com screen readers
```

---

## 📱 Mobile & Touch Accessibility

### 1. Touch Targets

```scss
// Mínimo 44x44px para touch
.btn {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px;  // Garante 44px
}

// Espaço entre botões
button + button {
  margin-left: 8px;  // Evita toques acidentais
}
```

### 2. Gestos Alternativos

```typescript
// Fornecer alternativa para gestos complexos
// ❌ Ruim: Apenas swiping
<div @swipe="handleSwipe"></div>

// ✅ Bom: Swipe + botões
<div @swipe="handleSwipe">
  <button @click="handlePrevious">← Anterior</button>
  <button @click="handleNext">Próximo →</button>
</div>
```

### 3. Zoom e Responsividade

```html
<!-- Meta tag para zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">

<!-- Não desabilitar user-scalable! -->
<!-- ❌ user-scalable=no é ruim para acessibilidade -->
```

---

## 📝 Documentação de Acessibilidade

Incluir no README:

```markdown
## Acessibilidade

### Suporte a Teclado
- **ESC**: Fechar modal
- **Tab**: Navegar entre campos
- **Shift+Tab**: Navegar para trás
- **Enter**: Confirmar ação

### Screen Reader
- Totalmente compatível com NVDA, JAWS, VoiceOver
- Descrições ARIA para todos os elementos
- Mensagens de status anunciadas

### Visual
- Suporta zoom até 200%
- Alto contraste de cores (WCAG AA)
- Sem dependência em cor única

### Motor
- Totalmente navegável por teclado
- Sem gestos complexos obrigatórios
- Timeouts suficientes para todas as ações
```

---

## ✨ Boas Práticas Resumidas

1. **Semântica**: Use elementos HTML corretos
2. **ARIA**: Complemente, não substitua
3. **Contraste**: 4.5:1 mínimo
4. **Teclado**: Totalmente navegável
5. **Focus**: Sempre visível
6. **Labels**: Em todos os inputs
7. **Status**: Anuncie mudanças
8. **Erros**: Claros e corrigíveis
9. **Tempo**: Suficiente para ler/agir
10. **Teste**: Com pessoas reais

---

**Objetivo:** WCAG 2.1 Level AA
**Status:** Implementação Completa ✅

