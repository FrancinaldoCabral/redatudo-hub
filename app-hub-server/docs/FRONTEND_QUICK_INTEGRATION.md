# 🚀 Integração Frontend - Preview & Export Unificado

## 📋 Resumo Rápido

Este guia mostra como integrar o sistema de preview e exportação em **3 passos simples**.

---

## 🎯 O que você vai conseguir

✅ Modal único com preview ao vivo + configurações de exportação  
✅ Usuário vê exatamente como ficará o ebook antes de exportar  
✅ Suporte a PDF, DOCX e EPUB com design personalizado  
✅ Custo calculado antes da exportação

---

## 📡 APIs Disponíveis

### 1️⃣ **Carregar Preview + Configuração**
```javascript
// GET /api/ebook/projects/:id/preview/config
const response = await fetch(`${API_URL}/api/ebook/projects/${projectId}/preview/config`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { design, metadata } = await response.json();
// design: { visualIdentity, baseTemplateKey, version... }
// metadata: { title, sections, hasCover, createdAt... }
```

### 2️⃣ **Preview Dinâmico (ao vivo)**
```javascript
// POST /api/ebook/projects/:id/preview/live
const response = await fetch(`${API_URL}/api/ebook/projects/${projectId}/preview/live`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    layout: {
      margins: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
      contentPadding: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
      fontSize: { body: 12, headings: 18, caption: 10 },
      lineHeight: 1.6,
      pageSize: 'A4'
    },
    content: {
      includeCover: true,
      includeTableOfContents: true,
      includeImages: true,
      sectionsToInclude: [] // vazio = todas
    },
    format: 'pdf' // ou 'docx', 'epub'
  })
});

const html = await response.text();
// Renderizar em iframe
```

### 3️⃣ **Calcular Custo**
```javascript
// POST /api/pricing/estimate-generation
const response = await fetch(`${API_URL}/api/pricing/estimate-generation`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: projectId,
    format: 'pdf', // 'docx', 'epub'
    includeImages: true
  })
});

const { estimatedCost, breakdown } = await response.json();
// estimatedCost: número total
// breakdown: { base, images, complexity }
```

### 4️⃣ **Exportar Ebook**
```javascript
// POST /api/ebook/projects/:id/export
const response = await fetch(`${API_URL}/api/ebook/projects/${projectId}/export`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    format: 'pdf', // 'docx', 'epub'
    layout: { /* mesmas opções do preview */ },
    content: { /* mesmas opções do preview */ }
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
// Download automático ou preview
```

---

## 🎨 Componente Vue 3 - Versão Simplificada

```vue
<template>
  <div class="export-modal" v-if="isOpen">
    <div class="modal-content">
      <!-- Fechar -->
      <button @click="close" class="close-btn">✕</button>
      
      <div class="split-layout">
        <!-- ESQUERDA: Preview -->
        <div class="preview-panel">
          <h2>Preview</h2>
          <iframe 
            ref="previewFrame"
            :srcdoc="previewHtml"
            class="preview-iframe"
          ></iframe>
        </div>

        <!-- DIREITA: Configurações -->
        <div class="config-panel">
          <h2>Configurações de Exportação</h2>

          <!-- Formato -->
          <div class="form-group">
            <label>Formato:</label>
            <select v-model="config.format" @change="updatePreview">
              <option value="pdf">PDF</option>
              <option value="docx">Word (DOCX)</option>
              <option value="epub">E-Pub</option>
            </select>
          </div>

          <!-- Margens -->
          <div class="form-group">
            <label>Margens:</label>
            <div class="margin-inputs">
              <input v-model="config.layout.margins.top" @input="debouncedUpdate" placeholder="2cm">
              <input v-model="config.layout.margins.right" @input="debouncedUpdate" placeholder="2cm">
              <input v-model="config.layout.margins.bottom" @input="debouncedUpdate" placeholder="2cm">
              <input v-model="config.layout.margins.left" @input="debouncedUpdate" placeholder="2.5cm">
            </div>
          </div>

          <!-- Tamanho Fonte -->
          <div class="form-group">
            <label>Tamanho do Texto:</label>
            <input 
              type="number" 
              v-model.number="config.layout.fontSize.body" 
              @input="debouncedUpdate"
              min="8" 
              max="20"
            >
          </div>

          <!-- Incluir elementos -->
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="config.content.includeCover" @change="updatePreview">
              Incluir Capa
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="config.content.includeTableOfContents" @change="updatePreview">
              Incluir Sumário
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="config.content.includeImages" @change="updatePreview">
              Incluir Imagens
            </label>
          </div>

          <!-- Custo -->
          <div class="cost-preview">
            <strong>Custo estimado:</strong>
            <span class="cost-value">{{ estimatedCost }} créditos</span>
          </div>

          <!-- Exportar -->
          <button 
            @click="exportEbook" 
            class="export-btn"
            :disabled="isExporting"
          >
            {{ isExporting ? 'Exportando...' : 'Exportar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';

const props = defineProps({
  projectId: String,
  isOpen: Boolean
});

const emit = defineEmits(['close', 'exported']);

// Estado
const previewHtml = ref('');
const estimatedCost = ref(0);
const isExporting = ref(false);

// Configuração padrão
const config = reactive({
  format: 'pdf',
  layout: {
    margins: { top: '2cm', right: '2cm', bottom: '2cm', left: '2.5cm' },
    contentPadding: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    fontSize: { body: 12, headings: 18, caption: 10 },
    lineHeight: 1.6,
    pageSize: 'A4'
  },
  content: {
    includeCover: true,
    includeTableOfContents: true,
    includeImages: true,
    sectionsToInclude: []
  }
});

// API URL (ajuste para seu ambiente)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Token de autenticação (ajuste conforme seu sistema)
const getToken = () => {
  return localStorage.getItem('authToken') || '';
};

// Carregar preview inicial
const loadPreview = async () => {
  try {
    const response = await fetch(
      `${API_URL}/api/ebook/projects/${props.projectId}/preview/live`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          layout: config.layout,
          content: config.content,
          format: config.format
        })
      }
    );

    if (response.ok) {
      previewHtml.value = await response.text();
    }
  } catch (error) {
    console.error('Erro ao carregar preview:', error);
  }
};

// Calcular custo
const calculateCost = async () => {
  try {
    const response = await fetch(
      `${API_URL}/api/pricing/estimate-generation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: props.projectId,
          format: config.format,
          includeImages: config.content.includeImages
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      estimatedCost.value = data.estimatedCost || 0;
    }
  } catch (error) {
    console.error('Erro ao calcular custo:', error);
  }
};

// Atualizar preview (debounced)
let debounceTimer;
const debouncedUpdate = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadPreview();
    calculateCost();
  }, 500);
};

const updatePreview = () => {
  loadPreview();
  calculateCost();
};

// Exportar ebook
const exportEbook = async () => {
  isExporting.value = true;

  try {
    const response = await fetch(
      `${API_URL}/api/ebook/projects/${props.projectId}/export`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: config.format,
          layout: config.layout,
          content: config.content
        })
      }
    );

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ebook-${props.projectId}.${config.format}`;
      a.click();
      window.URL.revokeObjectURL(url);

      emit('exported');
      close();
    } else {
      alert('Erro ao exportar. Tente novamente.');
    }
  } catch (error) {
    console.error('Erro ao exportar:', error);
    alert('Erro ao exportar. Verifique sua conexão.');
  } finally {
    isExporting.value = false;
  }
};

// Fechar modal
const close = () => {
  emit('close');
};

// Carregar ao abrir
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    loadPreview();
    calculateCost();
  }
});

onMounted(() => {
  if (props.isOpen) {
    loadPreview();
    calculateCost();
  }
});
</script>

<style scoped>
.export-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  width: 95%;
  height: 90%;
  border-radius: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: #f44336;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  z-index: 10;
}

.split-layout {
  display: flex;
  height: 100%;
  padding: 20px;
  gap: 20px;
}

.preview-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.preview-iframe {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  width: 100%;
}

.config-panel {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  border-left: 1px solid #ddd;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.margin-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.cost-preview {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  margin: 20px 0;
}

.cost-value {
  color: #2196F3;
  font-size: 18px;
  margin-left: 8px;
}

.export-btn {
  width: 100%;
  padding: 14px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.export-btn:hover:not(:disabled) {
  background: #45a049;
}

.export-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
```

---

## 🔌 Como Usar

### 1. Adicionar o Componente

```vue
<!-- Em ProjectDetails.vue ou onde listar projetos -->
<template>
  <div>
    <button @click="openExportModal">Exportar Ebook</button>

    <ExportModal
      :projectId="currentProjectId"
      :isOpen="isExportModalOpen"
      @close="isExportModalOpen = false"
      @exported="handleExported"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ExportModal from './ExportModal.vue';

const currentProjectId = ref('123abc');
const isExportModalOpen = ref(false);

const openExportModal = () => {
  isExportModalOpen.value = true;
};

const handleExported = () => {
  alert('Ebook exportado com sucesso!');
  // Atualizar lista, mostrar notificação, etc.
};
</script>
```

### 2. Configurar Variável de Ambiente

```bash
# .env ou .env.local
VITE_API_URL=http://localhost:5000
# ou em produção
VITE_API_URL=https://api.seusite.com
```

### 3. Ajustar Autenticação

Se você usa Vuex/Pinia para gerenciar autenticação:

```javascript
// No componente ExportModal.vue
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const getToken = () => {
  return authStore.token; // ou authStore.getToken()
};
```

---

## 🎯 Fluxo Completo

```
1. Usuário clica "Exportar Ebook"
   └─> Modal abre

2. Modal carrega preview inicial
   ├─> POST /preview/live
   └─> POST /pricing/estimate-generation

3. Usuário ajusta configurações
   ├─> Margens, fonte, formato
   └─> Preview atualiza automaticamente (debounced)

4. Usuário clica "Exportar"
   ├─> POST /export
   ├─> Download automático
   └─> Modal fecha
```

---

## 🧪 Testar com Curl

```bash
# 1. Carregar preview
curl -X POST http://localhost:5000/api/ebook/projects/YOUR_PROJECT_ID/preview/live \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "layout": {
      "margins": {"top": "2cm", "right": "2cm", "bottom": "2cm", "left": "2.5cm"}
    },
    "format": "pdf"
  }'

# 2. Calcular custo
curl -X POST http://localhost:5000/api/pricing/estimate-generation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "format": "pdf"
  }'

# 3. Exportar
curl -X POST http://localhost:5000/api/ebook/projects/YOUR_PROJECT_ID/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "pdf",
    "layout": {
      "margins": {"top": "2cm", "right": "2cm", "bottom": "2cm", "left": "2.5cm"}
    }
  }' \
  --output ebook.pdf
```

---

## 🎨 Customizações Rápidas

### Adicionar Campo de Página

```vue
<div class="form-group">
  <label>Tamanho da Página:</label>
  <select v-model="config.layout.pageSize" @change="updatePreview">
    <option value="A4">A4 (21 x 29.7 cm)</option>
    <option value="A5">A5 (14.8 x 21 cm)</option>
    <option value="Letter">Letter (21.6 x 27.9 cm)</option>
  </select>
</div>
```

### Adicionar Seletor de Seções

```vue
<div class="form-group">
  <label>Seções para Incluir:</label>
  <select v-model="config.content.sectionsToInclude" multiple>
    <option v-for="section in sections" :key="section.id" :value="section.id">
      {{ section.title }}
    </option>
  </select>
</div>
```

### Mudar Cores/Design

```css
/* Tema escuro */
.modal-content {
  background: #1e1e1e;
  color: white;
}

.config-panel {
  border-left-color: #444;
}

/* Botão diferente */
.export-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

---

## ⚡ Performance

O componente já inclui:
- ✅ Debounce de 500ms para evitar muitas requests
- ✅ Loading states
- ✅ Error handling
- ✅ Download automático

---

## 📱 Responsividade

Para mobile, ajuste o layout:

```css
@media (max-width: 768px) {
  .split-layout {
    flex-direction: column;
  }
  
  .preview-panel {
    height: 50%;
  }
  
  .config-panel {
    border-left: none;
    border-top: 1px solid #ddd;
  }
}
```

---

## 🐛 Troubleshooting

### Preview não aparece
- Verifique se o `projectId` está correto
- Verifique se o token está válido
- Verifique console do navegador para erros CORS

### Custo não atualiza
- Verifique se o endpoint `/pricing/estimate-generation` está funcionando
- Verifique se o `projectId` existe no banco

### Export falha
- Verifique se há créditos suficientes
- Verifique se o formato é suportado (pdf, docx, epub)
- Verifique logs do backend

---

## 📚 Documentação Completa

Para mais detalhes, consulte:
- `FRONTEND_COMPLETE_EXAMPLE.md` - Componente completo com todas funcionalidades
- `FRONTEND_UNIFIED_EXPORT_GUIDE.md` - Todas as APIs disponíveis
- `QUICK_START_CHECKLIST.md` - Checklist de implementação

---

## ✅ Pronto!

Com este código você tem:
- ✅ Preview ao vivo
- ✅ Configurações dinâmicas
- ✅ Cálculo de custo
- ✅ Exportação em múltiplos formatos
- ✅ Interface responsiva

**Tempo de implementação:** ~2 horas

**Próximos passos:**
1. Copiar o componente ExportModal.vue
2. Ajustar API_URL e getToken()
3. Integrar no seu projeto
4. Testar e customizar
