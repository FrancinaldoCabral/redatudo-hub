# Checklist de Implementação - Quick Start

## 🚀 Guia Rápido para o Frontend

### Fase 1: Setup (30 minutos)

- [ ] **Copiar componente** de `FRONTEND_COMPLETE_EXAMPLE.md`
- [ ] **Importar no projeto**: `import UnifiedExportModal from '@/components/UnifiedExportModal.vue'`
- [ ] **Testar endpoints** com Postman/Insomnia:
  - [ ] `GET /api/ebook/projects/{id}/preview/config`
  - [ ] `POST /api/ebook/projects/{id}/preview/live`
  - [ ] `POST /api/ebook/projects/{id}/export`
  - [ ] `GET /api/ebook/exports/{jobId}/status`
  - [ ] `GET /api/ebook/exports/{jobId}/download`

### Fase 2: Integração (1 hora)

- [ ] **Criar botão "Exportar"** na lista/detalhe de projetos
- [ ] **Abrir modal** ao clicar no botão
- [ ] **Testar live preview** com diferentes configurações
- [ ] **Validar preview** em iframe
- [ ] **Testar exportação** com cada formato

### Fase 3: UX Polish (30 minutos)

- [ ] **Adicionar loading states** (skeleton, spinner)
- [ ] **Notificações** de sucesso/erro
- [ ] **Progress bar** durante exportação
- [ ] **Keyboard shortcuts** (ESC para fechar)
- [ ] **Responsividade** em mobile

### Fase 4: Testes (1 hora)

- [ ] **Teste manual** completo
- [ ] **Teste em diferentes navegadores**
- [ ] **Teste com projeto grande** (100+ seções)
- [ ] **Teste de erro** (sem design, sem seções)
- [ ] **Performance** (debounce funcionando)

---

## 🔌 Integração Rápida do Componente

### Passo 1: Registrar Componente Global

```typescript
// src/main.ts ou src/components/index.ts
import UnifiedExportModal from '@/components/UnifiedExportModal.vue';

app.component('UnifiedExportModal', UnifiedExportModal);
```

### Passo 2: Usar no Template

```vue
<template>
  <div>
    <!-- Seu conteúdo -->
    <button @click="openExportModal" class="btn btn-primary">
      📥 Exportar
    </button>

    <!-- Modal -->
    <UnifiedExportModal
      v-if="isExportModalOpen"
      :projectId="selectedProjectId"
      :onClose="closeExportModal"
      :onExportComplete="handleExportDone"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isExportModalOpen = ref(false);
const selectedProjectId = ref('');

const openExportModal = (projectId: string) => {
  selectedProjectId.value = projectId;
  isExportModalOpen.value = true;
};

const closeExportModal = () => {
  isExportModalOpen.value = false;
};

const handleExportDone = (result: any) => {
  console.log('Exportação concluída:', result);
  // Mostrar notificação
};
</script>
```

---

## 🧪 Testes com curl/Postman

### Teste 1: Buscar Configuração

```bash
curl -X GET "http://localhost:3000/api/ebook/projects/PROJECT_ID/preview/config" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Teste 2: Gerar Live Preview

```bash
curl -X POST "http://localhost:3000/api/ebook/projects/PROJECT_ID/preview/live" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "design": {
      "baseTemplateKey": "classic",
      "visualIdentity": {
        "fontPrimary": "Georgia"
      }
    },
    "layout": {
      "pageSize": "A4",
      "margins": {
        "top": "1.5in"
      }
    },
    "content": {
      "includeCover": true
    },
    "format": "pdf"
  }'
```

### Teste 3: Iniciar Exportação

```bash
curl -X POST "http://localhost:3000/api/ebook/projects/PROJECT_ID/export" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "pdf",
    "options": {
      "includeImages": true,
      "includeToc": true,
      "layout": {
        "page": {
          "size": "A4",
          "margins": {"top": "1.5in"}
        }
      }
    }
  }'
```

### Teste 4: Monitorar Status

```bash
curl -X GET "http://localhost:3000/api/ebook/exports/JOB_ID/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Teste 5: Baixar Arquivo

```bash
curl -X GET "http://localhost:3000/api/ebook/exports/JOB_ID/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "exported-file.pdf"
```

---

## 🎨 Customização do Componente

### Adicionar Novo Preset

```typescript
// Em UnifiedExportModal.vue, adicionar ao método:
const applyMarginPreset = (preset: 'compact' | 'normal' | 'generous' | 'wide') => {
  const presets = {
    compact: { top: 1, right: 0.75, bottom: 1, left: 0.75 },
    normal: { top: 1.5, right: 1, bottom: 1.5, left: 1 },
    generous: { top: 2, right: 1.5, bottom: 2, left: 1.5 },
    wide: { top: 1, right: 2, bottom: 1, left: 2 }  // NEW
  };
  config.layout.margins = presets[preset];
  updatePreview();
};

// No template, adicionar botão:
<button 
  @click="applyMarginPreset('wide')"
  class="preset-btn"
>
  Largo
</button>
```

### Adicionar Nova Fonte

```typescript
// No template, na seção de fontes:
<select v-model="config.design.visualIdentity.fontPrimary">
  <option value="Georgia">Georgia</option>
  <option value="Garamond">Garamond</option>
  <option value="Calibri">Calibri</option>
  <option value="Arial">Arial</option>
  <option value="Verdana">Verdana</option>  <!-- NEW -->
  <option value="Trebuchet MS">Trebuchet MS</option>  <!-- NEW -->
</select>
```

### Alterar Cores Padrão

```typescript
// No setup do componente:
const config = reactive({
  design: {
    visualIdentity: {
      colorPrimary: '#000000',      // Alterar aqui
      colorSecondary: '#666666',    // Alterar aqui
      colorAccent: '#0070c0'        // Alterar aqui
    }
  }
});
```

---

## 📱 Responsividade

### Para telas pequenas (mobile)

```scss
@media (max-width: 768px) {
  .modal-body {
    grid-template-columns: 1fr;  // Stack em coluna
  }

  .preview-section {
    min-height: 300px;  // Altura mínima
  }

  .config-section {
    max-height: none;  // Remove scroll se necessário
  }
}
```

---

## 🐛 Debug

### Verificar requests/responses

```javascript
// Adicionar em updatePreview():
const response = await fetch(...);
console.log('Preview Request:', requestBody);
console.log('Preview Response:', response.status);
const html = await response.text();
console.log('HTML Length:', html.length);
```

### Verificar iframe

```javascript
// No DevTools Console:
document.getElementById('preview-frame').srcdoc  // Ver conteúdo
document.getElementById('preview-frame').contentWindow  // Acessar DOM
```

### Logs de exportação

```javascript
// Em exportEbook():
console.log('Export started with:', {
  format: exportFormat.value,
  config: config,
  jobId: data.jobId
});

// Durante monitoramento:
console.log('Export progress:', data.progress, data.status);
```

---

## 🔐 Autenticação

### Buscar token do storage

```typescript
const getAuthToken = () => {
  // Opção 1: localStorage
  return localStorage.getItem('auth_token');

  // Opção 2: sessionStorage
  // return sessionStorage.getItem('auth_token');

  // Opção 3: Cookie
  // return getCookie('auth_token');

  // Opção 4: Vuex/Pinia
  // return store.getters.getAuthToken;
};
```

### Validar se autenticado antes de abrir modal

```typescript
const openExportModal = (projectId: string) => {
  if (!getAuthToken()) {
    showModal('Por favor, faça login para exportar');
    return;
  }
  isExportModalOpen.value = true;
};
```

---

## 💾 Persistência de Configurações

### Salvar configs do usuário

```typescript
// Após atualizar config:
const saveUserPreferences = () => {
  const prefs = {
    lastFormat: exportFormat.value,
    lastMargins: config.layout.margins,
    lastFont: config.design.visualIdentity.fontPrimary
  };
  localStorage.setItem('export_preferences', JSON.stringify(prefs));
};

// Carregar ao abrir modal:
onMounted(() => {
  const saved = localStorage.getItem('export_preferences');
  if (saved) {
    const prefs = JSON.parse(saved);
    exportFormat.value = prefs.lastFormat;
    config.layout.margins = prefs.lastMargins;
    config.design.visualIdentity.fontPrimary = prefs.lastFont;
  }
});
```

---

## 📊 Analytics

### Rastrear eventos de exportação

```typescript
// Em exportEbook():
trackEvent('ebook_export_started', {
  projectId: props.projectId,
  format: exportFormat.value,
  estimatedSize: estimatedSize.value
});

// Em onExportComplete:
trackEvent('ebook_export_completed', {
  jobId: result.jobId,
  format: result.format,
  duration: Date.now() - exportStartTime
});
```

---

## ⚡ Performance

### Otimizações implementadas

- ✅ Debounce em updatePreview (500ms)
- ✅ Lazy loading de iframe
- ✅ CSS inline no preview (não faz requests)
- ✅ Validação client-side antes de submit

### Otimizações opcionais

```typescript
// 1. Cachear preview entre mudanças
const previewCache = new Map();

// 2. Usar Virtual Scrolling para muitas seções
import { RecycleScroller } from 'vue-virtual-scroller';

// 3. Code Splitting do componente
const UnifiedExportModal = defineAsyncComponent(() =>
  import('@/components/UnifiedExportModal.vue')
);
```

---

## 🚨 Tratamento de Erros Específicos

### Erro: "Projeto não possui design"

```typescript
if (error.message.includes('design')) {
  showModal('Gere o design do projeto primeiro');
  // Redirecionar para design screen
  router.push(`/projects/${projectId}/design`);
}
```

### Erro: "Saldo insuficiente"

```typescript
if (error.message.includes('saldo') || error.message.includes('creditos')) {
  showModal('Saldo insuficiente. Compre créditos para continuar.');
  // Abrir modal de compra de créditos
  openCreditsPurchaseModal();
}
```

### Erro: "Timeout"

```typescript
if (error.message.includes('timeout')) {
  showModal('Exportação demorou muito. Tente novamente.');
  // Permitir retry
}
```

---

## ✨ Nice-to-Have Features

### Recurso 1: Exportação Rápida

```vue
<button 
  @click="quickExport('pdf')"
  title="Exportar com configurações padrão"
>
  ⚡ Exportar Rápido
</button>

<script>
const quickExport = async (format: string) => {
  exportFormat.value = format;
  // Usar configurações padrão
  config = getDefaultConfig();
  // Iniciar export imediatamente
  await exportEbook();
};
</script>
```

### Recurso 2: Histórico de Exportações

```typescript
// Salvar cada export
const exportHistory = ref<ExportHistoryItem[]>([]);

interface ExportHistoryItem {
  jobId: string;
  format: string;
  timestamp: Date;
  config: ExportConfig;
}
```

### Recurso 3: Comparação de Formatos

```vue
<div class="format-comparison">
  <div>PDF: {{ estimatedSize['pdf'] }}</div>
  <div>DOCX: {{ estimatedSize['docx'] }}</div>
  <div>EPUB: {{ estimatedSize['epub'] }}</div>
</div>
```

---

## 📋 Checklist Final

- [ ] Todos os endpoints testados
- [ ] Modal renderizando corretamente
- [ ] Preview atualizando em tempo real
- [ ] Exportação iniciando sem erros
- [ ] Status sendo monitorado
- [ ] Arquivo sendo baixado
- [ ] Erros sendo tratados
- [ ] UX polish completo
- [ ] Responsividade verificada
- [ ] Performance aceitável
- [ ] Tests unitários (opcional)
- [ ] Documentação atualizada

---

## 🎓 Próximos Passos

1. **Implementar componente** no frontend
2. **Testar com dados reais** do projeto
3. **Otimizar performance** conforme necessário
4. **Recolher feedback** dos usuários
5. **Iterar melhorias** com base em uso
6. **Considerar Convertio** se necessário qualidade extra

---

**Status:** Pronto para Implementação ✅
**Tempo Estimado:** 3-4 horas
**Complexidade:** Média
**Risco:** Baixo

