# Guia de Integração - Preview Dinâmico e Exportação de Ebooks

## Visão Geral

Este guia descreve como integrar o novo sistema de preview dinâmico e exportação melhorada de ebooks no frontend. O sistema permite que o usuário:

1. **Visualize em tempo real** como as configurações de design e layout afetam o documento
2. **Combine design e exportação** em uma única tela/modal
3. **Exporte em múltiplos formatos** (PDF, DOCX, EPUB) com as mesmas configurações de design e layout
4. **Veja claramente o que será exportado** com preview interativo

---

## Fluxo de Trabalho Recomendado

```
1. Projeto criado
   ↓
2. Gerar Design (novo ou regenerar)
   ↓
3. Abrir Modal de Exportação Unificada
   ├─ Esquerda: Preview ao vivo (atualiza conforme config)
   └─ Direita: Configurações de design, layout e exportação
   ↓
4. Usuário ajusta configurações (design/layout/conteúdo)
   ↓
5. Preview atualiza em tempo real
   ↓
6. Clicar em Exportar (formato + opções)
```

---

## APIs Disponíveis

### 1. Buscar Configuração do Projeto

Obtém design e metadados do projeto para usar no preview.

**Endpoint:**
```
GET /api/ebook/projects/{projectId}/preview/config
```

**Autenticação:** Requerida (Bearer token)

**Response:**
```json
{
  "success": true,
  "design": {
    "version": "1.0",
    "baseTemplateKey": "classic",
    "visualIdentity": {
      "fontPrimary": "Georgia",
      "fontHeadings": "Playfair Display",
      "fontCode": "Courier New",
      "colorPrimary": "#1a1a1a",
      "colorSecondary": "#666666",
      "colorAccent": "#d4af37"
    },
    "reasoning": "Professional, elegant design with serif fonts",
    "customInstruction": "...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "metadata": {
    "title": "Meu Ebook",
    "sections": 12,
    "hasCover": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Códigos de erro:**
- `400` - Projeto sem design
- `404` - Projeto não encontrado
- `500` - Erro no servidor

---

### 2. Gerar Preview Dinâmico (Live Preview)

Retorna HTML de preview com configurações customizadas **sem modificar o projeto**.

**Endpoint:**
```
POST /api/ebook/projects/{projectId}/preview/live
```

**Autenticação:** Requerida (Bearer token)

**Request Body:**
```json
{
  "design": {
    "baseTemplateKey": "classic",
    "visualIdentity": {
      "fontPrimary": "Georgia",
      "fontHeadings": "Playfair Display",
      "colorPrimary": "#1a1a1a"
    }
  },
  "layout": {
    "contentPadding": {
      "top": "2rem",
      "right": "3rem",
      "bottom": "2rem",
      "left": "3rem"
    },
    "margins": {
      "top": "1.5in",
      "right": "1in",
      "bottom": "1.5in",
      "left": "1in"
    },
    "pageSize": "A4",
    "lineHeight": "1.6",
    "fontSize": "18px"
  },
  "content": {
    "includeCover": true,
    "includeTableOfContents": true,
    "includeImages": true,
    "maxSections": 5
  },
  "format": "pdf"
}
```

**Parâmetros opcionais:**

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `design.baseTemplateKey` | string | - | Template base do design |
| `design.visualIdentity` | object | - | Propriedades de identidade visual |
| `layout.contentPadding` | object | 2rem | Espaçamento interno do conteúdo |
| `layout.margins` | object | 1.5in | Margens da página |
| `layout.pageSize` | 'A4' \| 'Letter' | 'A4' | Tamanho da página |
| `layout.lineHeight` | string | '1.6' | Altura da linha |
| `layout.fontSize` | string | '16px' | Tamanho base da fonte |
| `content.includeCover` | boolean | true | Incluir capa |
| `content.includeTableOfContents` | boolean | true | Incluir sumário |
| `content.includeImages` | boolean | true | Incluir imagens |
| `content.maxSections` | number | - | Número máximo de seções |
| `format` | 'pdf' \| 'docx' \| 'epub' \| 'html' | 'html' | Formato para otimização |

**Response:**
```
Content-Type: text/html
200 OK

<html>
  <head>
    <script type="application/json" id="preview-metadata">
    {"format": "pdf", "layout": {...}, "timestamp": "..."}
    </script>
    ...
  </head>
  <body>
    ...
  </body>
</html>
```

**Uso no Frontend:**
```javascript
async function generateLivePreview(projectId, options) {
  const response = await fetch(
    `/api/ebook/projects/${projectId}/preview/live`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(options)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const html = await response.text();
  return html;
}

// Usar em um iframe
const previewHtml = await generateLivePreview(projectId, {
  layout: { margins: { top: '1in' } },
  format: 'pdf'
});

const iframe = document.getElementById('preview-frame');
iframe.srcdoc = previewHtml;
```

**Códigos de erro:**
- `400` - Opções inválidas ou projeto sem design
- `404` - Projeto ou seções não encontradas
- `500` - Erro no servidor

---

### 3. Iniciar Exportação

Inicia processo assíncrono de exportação com configurações.

**Endpoint:**
```
POST /api/ebook/projects/{projectId}/export
```

**Autenticação:** Requerida (Bearer token)

**Request Body:**
```json
{
  "format": "pdf",
  "options": {
    "includeImages": true,
    "includeToc": true,
    "layout": {
      "page": {
        "size": "A4",
        "margins": {
          "top": "1.5in",
          "right": "1in",
          "bottom": "1.5in",
          "left": "1in"
        }
      },
      "content": {
        "padding": {
          "top": "2rem",
          "right": "2rem",
          "bottom": "2rem",
          "left": "2rem"
        }
      }
    },
    "pdf": {
      "header": {
        "content": "Meu Ebook",
        "enabled": true
      },
      "footer": {
        "enabled": true,
        "showPageNumber": true,
        "pageNumberFormat": "Página {pageNumber} de {totalPages}"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "job_123456",
  "estimatedCredits": 5.50,
  "message": "Exportação iniciada. Acompanhe o progresso via WebSocket.",
  "format": "pdf",
  "status": "pending"
}
```

**Códigos de erro:**
- `400` - Formato não suportado
- `401` - Não autenticado
- `500` - Erro ao iniciar exportação

---

### 4. Monitorar Status de Exportação

Obtém status em tempo real da exportação.

**Endpoint:**
```
GET /api/ebook/exports/{jobId}/status
```

**Autenticação:** Requerida (Bearer token)

**Response:**
```json
{
  "jobId": "job_123456",
  "status": "processing",
  "progress": 45,
  "message": "Processando exportação...",
  "result": null
}
```

**Possíveis status:**
- `pending` - Aguardando processamento
- `processing` - Processando
- `completed` - Concluído
- `failed` - Erro

---

### 5. Baixar Arquivo Exportado

**Endpoint:**
```
GET /api/ebook/exports/{jobId}/download
```

**Autenticação:** Requerida (Bearer token)

**Response:**
- `200` - Arquivo
- `404` - Job não encontrado
- `409` - Arquivo não pronto ou não encontrado

---

## Componente Modal Recomendado

### Estrutura

```html
<div class="modal-unified-export">
  <!-- Coluna Esquerda: Preview -->
  <div class="preview-section">
    <h2>Preview</h2>
    <div class="preview-controls">
      <button @click="updatePreview">Atualizar Preview</button>
      <select v-model="previewFormat">
        <option value="pdf">PDF</option>
        <option value="docx">Word</option>
        <option value="html">Web</option>
      </select>
    </div>
    <iframe 
      id="preview-frame" 
      class="preview-frame"
      :srcdoc="previewHtml"
    ></iframe>
  </div>

  <!-- Coluna Direita: Configurações -->
  <div class="config-section">
    <h2>Configurações</h2>
    
    <!-- Design -->
    <div class="config-group">
      <h3>Design</h3>
      <div class="config-item">
        <label>Template Base</label>
        <select v-model="config.design.baseTemplateKey">
          <option value="classic">Clássico</option>
          <option value="modern">Moderno</option>
          <option value="minimalist">Minimalista</option>
        </select>
      </div>
      <div class="config-item">
        <label>Fonte Principal</label>
        <select v-model="config.design.visualIdentity.fontPrimary">
          <option value="Georgia">Georgia</option>
          <option value="Calibri">Calibri</option>
          <option value="Arial">Arial</option>
        </select>
      </div>
    </div>

    <!-- Layout -->
    <div class="config-group">
      <h3>Layout</h3>
      <div class="config-item">
        <label>Tamanho da Página</label>
        <select v-model="config.layout.pageSize">
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
        </select>
      </div>
      <div class="config-item">
        <label>Margem Superior (in)</label>
        <input 
          type="number" 
          v-model="config.layout.margins.top"
          step="0.1"
          @change="updatePreview"
        />
      </div>
      <div class="config-item">
        <label>Altura da Linha</label>
        <input 
          type="number" 
          v-model="config.layout.lineHeight"
          step="0.1"
          min="1"
          max="3"
          @change="updatePreview"
        />
      </div>
    </div>

    <!-- Conteúdo -->
    <div class="config-group">
      <h3>Conteúdo</h3>
      <div class="config-item">
        <label>
          <input 
            type="checkbox" 
            v-model="config.content.includeCover"
            @change="updatePreview"
          />
          Incluir Capa
        </label>
      </div>
      <div class="config-item">
        <label>
          <input 
            type="checkbox" 
            v-model="config.content.includeTableOfContents"
            @change="updatePreview"
          />
          Incluir Sumário
        </label>
      </div>
      <div class="config-item">
        <label>
          <input 
            type="checkbox" 
            v-model="config.content.includeImages"
            @change="updatePreview"
          />
          Incluir Imagens
        </label>
      </div>
    </div>

    <!-- Botão Exportar -->
    <button 
      @click="exportEbook"
      :disabled="isExporting"
      class="btn-export"
    >
      {{ isExporting ? 'Exportando...' : 'Exportar ' + exportFormat }}
    </button>
  </div>
</div>
```

### Script Vue 3

```javascript
import { ref, reactive, watch } from 'vue';

export default {
  setup(props) {
    const projectId = ref(props.projectId);
    const previewHtml = ref('');
    const previewFormat = ref('pdf');
    const exportFormat = ref('pdf');
    const isExporting = ref(false);
    const isLoadingPreview = ref(false);

    const config = reactive({
      design: {
        baseTemplateKey: 'classic',
        visualIdentity: {
          fontPrimary: 'Georgia',
          fontHeadings: 'Playfair Display',
          colorPrimary: '#1a1a1a'
        }
      },
      layout: {
        contentPadding: {
          top: '2rem',
          right: '2rem',
          bottom: '2rem',
          left: '2rem'
        },
        margins: {
          top: '1.5in',
          right: '1in',
          bottom: '1.5in',
          left: '1in'
        },
        pageSize: 'A4',
        lineHeight: '1.6'
      },
      content: {
        includeCover: true,
        includeTableOfContents: true,
        includeImages: true
      }
    });

    // Atualizar preview quando configurações mudam
    const updatePreview = async () => {
      isLoadingPreview.value = true;
      try {
        const response = await fetch(
          `/api/ebook/projects/${projectId.value}/preview/live`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
              design: config.design,
              layout: config.layout,
              content: config.content,
              format: previewFormat.value
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message);
        }

        previewHtml.value = await response.text();
      } catch (error) {
        console.error('Erro ao gerar preview:', error);
        // Mostrar mensagem de erro ao usuário
      } finally {
        isLoadingPreview.value = false;
      }
    };

    // Exportar documento
    const exportEbook = async () => {
      isExporting.value = true;
      try {
        const response = await fetch(
          `/api/ebook/projects/${projectId.value}/export`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({
              format: exportFormat.value,
              options: {
                includeImages: config.content.includeImages,
                includeToc: config.content.includeTableOfContents,
                layout: {
                  page: {
                    size: config.layout.pageSize,
                    margins: config.layout.margins
                  },
                  content: {
                    padding: config.layout.contentPadding
                  }
                }
              }
            })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message);
        }

        const data = await response.json();
        
        // Monitorar progresso
        await monitorExportProgress(data.jobId);
        
        // Baixar arquivo
        await downloadExportedFile(data.jobId);
        
      } catch (error) {
        console.error('Erro ao exportar:', error);
      } finally {
        isExporting.value = false;
      }
    };

    // Monitorar progresso de exportação
    const monitorExportProgress = async (jobId) => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const response = await fetch(
              `/api/ebook/exports/${jobId}/status`,
              {
                headers: {
                  'Authorization': `Bearer ${getAuthToken()}`
                }
              }
            );

            if (!response.ok) throw new Error('Erro ao obter status');

            const data = await response.json();

            if (data.status === 'completed') {
              clearInterval(interval);
              resolve(data);
            } else if (data.status === 'failed') {
              clearInterval(interval);
              reject(new Error('Exportação falhou'));
            }
          } catch (error) {
            clearInterval(interval);
            reject(error);
          }
        }, 1000);
      });
    };

    // Baixar arquivo exportado
    const downloadExportedFile = async (jobId) => {
      try {
        const response = await fetch(
          `/api/ebook/exports/${jobId}/download`,
          {
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`
            }
          }
        );

        if (!response.ok) throw new Error('Arquivo não encontrado');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectId.value}.${exportFormat.value}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Erro ao baixar arquivo:', error);
      }
    };

    // Carregar preview inicial quando formato muda
    watch(previewFormat, () => updatePreview());

    // Carregar preview inicial
    onMounted(() => updatePreview());

    return {
      config,
      previewHtml,
      previewFormat,
      exportFormat,
      isExporting,
      isLoadingPreview,
      updatePreview,
      exportEbook
    };
  }
};
```

---

## Fluxo de Exportação

### 1. Usuário ajusta configurações no painel direito
```
contentPadding, margins, pageSize, fonts, cores, etc.
     ↓
preview atualiza em tempo real (iframe)
```

### 2. Usuário clica em "Exportar"
```
POST /api/ebook/projects/{id}/export
  ├─ formato (pdf, docx, epub)
  ├─ layout (margens, padding)
  ├─ conteúdo (capa, sumário, imagens)
  └─ opções específicas do formato (header, footer para PDF)
     ↓
backend valida design do projeto
     ↓
server-side: aplica configurações ao template
     ↓
converte para PDF/DOCX/EPUB
     ↓
retorna jobId para monitoramento
```

### 3. Monitorar progresso
```
GET /api/ebook/exports/{jobId}/status (polling cada 1s)
  ├─ status: pending → processing → completed
  └─ progress: 0-100%
```

### 4. Baixar
```
GET /api/ebook/exports/{jobId}/download
  └─ retorna arquivo binário
```

---

## Tratamento de Erros

### Preview falha
```javascript
try {
  await updatePreview();
} catch (error) {
  if (error.message.includes('sem design')) {
    showModal('Gere o design primeiro');
    openDesignScreen();
  } else if (error.message.includes('sem seções')) {
    showModal('Adicione seções ao projeto');
  } else {
    showModal(`Erro ao atualizar preview: ${error.message}`);
  }
}
```

### Exportação falha
```javascript
try {
  await exportEbook();
} catch (error) {
  if (error.message.includes('sem design')) {
    showModal('Projeto sem design');
  } else if (error.message.includes('saldo insuficiente')) {
    openCreditsPurchaseModal();
  } else {
    showModal(`Erro na exportação: ${error.message}`);
  }
}
```

---

## Dicas de UX

1. **Debounce na atualização de preview**: Use debounce de 500ms ao atualizar preview para não fazer muitas requisições
   ```javascript
   const debouncedUpdatePreview = debounce(updatePreview, 500);
   watch(() => config.layout, debouncedUpdatePreview);
   ```

2. **Loading state**: Mostrar skeleton ou spinner enquanto preview carrega

3. **Separar por seções**: 
   - Design (cores, fontes) - não afeta preview imediatamente
   - Layout (margens, padding) - atualiza preview imediatamente
   - Conteúdo (capa, sumário, imagens) - atualiza preview

4. **Preset de espaçamento**: Ofereça predefinições
   ```javascript
   const layoutPresets = {
     'Compacto': { margins: { top: '1in', right: '0.75in' } },
     'Normal': { margins: { top: '1.5in', right: '1in' } },
     'Generoso': { margins: { top: '2in', right: '1.5in' } }
   };
   ```

5. **Resumo visual no modal**: Mostrar tamanho estimado do arquivo
   ```
   Formato: PDF (A4)
   Páginas estimadas: 180
   Tamanho estimado: 3.2 MB
   ```

---

## Validação de Inputs

```javascript
const validateConfig = (config) => {
  const errors = [];

  if (!['A4', 'Letter'].includes(config.layout.pageSize)) {
    errors.push('Tamanho de página inválido');
  }

  const parseMargin = (m) => parseFloat(m);
  if (parseMargin(config.layout.margins.top) < 0.5) {
    errors.push('Margem superior mínima é 0.5 polegadas');
  }

  if (config.layout.lineHeight < 1 || config.layout.lineHeight > 3) {
    errors.push('Altura da linha deve estar entre 1 e 3');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
```

---

## WebSocket para Atualizações em Tempo Real

Alternativa ao polling para melhor UX (opcional):

```javascript
// Conectar ao WebSocket
const socket = io('/ebook-export');

socket.on('connect', () => {
  socket.emit('subscribe_job', { jobId });
});

socket.on('export_progress', (data) => {
  updateProgress(data.progress);
  if (data.status === 'completed') {
    downloadFile(data.jobId);
  }
});

socket.on('disconnect', () => {
  // Fallback para polling
  startPolling();
});
```

---

## Resumo das Mudanças no Backend

1. ✅ `EbookLivePreviewService` - Gera preview dinâmico com configurações
2. ✅ `POST /api/ebook/projects/:id/preview/live` - Endpoint de preview
3. ✅ `GET /api/ebook/projects/:id/preview/config` - Retorna config atual
4. ✅ `AdvancedDOCXTemplate` - DOCX com design e layout
5. ✅ Atualizado `EbookFormatConverterService` para usar novo DOCX
6. ✅ Corrigido erro no `getPreview()` (require dinâmico)

---

## Próximos Passos

1. **Testar integração** do live preview com iframe
2. **Otimizar performance** (debounce, caching)
3. **Integração com Convertio** (opcional) para DOCX idêntico a PDF
4. **Análise de créditos** para diferentes formatos
5. **Testes de qualidade** DOCX com diferentes configurações

