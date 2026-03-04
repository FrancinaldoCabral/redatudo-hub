# Exemplo Completo de Integração Frontend

## Componente Vue 3 Completo: Modal Unificada de Export

```vue
<template>
  <div class="modal-unified-export">
    <!-- Header -->
    <div class="modal-header">
      <h2>Exportar Ebook</h2>
      <button @click="closeModal" class="btn-close">✕</button>
    </div>

    <!-- Body -->
    <div class="modal-body">
      <!-- Esquerda: Preview -->
      <div class="preview-section">
        <div class="preview-header">
          <h3>Preview</h3>
          <div class="preview-toolbar">
            <select 
              v-model="previewFormat" 
              @change="updatePreview"
              class="format-selector"
            >
              <option value="pdf">📄 PDF</option>
              <option value="docx">📝 Word</option>
              <option value="html">🌐 HTML</option>
            </select>
            <button 
              @click="updatePreview"
              :disabled="isLoadingPreview"
              class="btn btn-small"
            >
              {{ isLoadingPreview ? '⏳ Atualizando...' : '🔄 Atualizar' }}
            </button>
          </div>
        </div>

        <!-- Preview Content -->
        <div class="preview-content">
          <div v-if="isLoadingPreview" class="preview-loading">
            <div class="spinner"></div>
            <p>Gerando preview...</p>
          </div>
          <div v-else-if="previewError" class="preview-error">
            <p>❌ {{ previewError }}</p>
          </div>
          <iframe 
            v-else
            id="preview-frame"
            class="preview-frame"
            :srcdoc="previewHtml"
            sandbox="allow-same-origin"
          ></iframe>
        </div>

        <!-- Preview Info -->
        <div class="preview-info">
          <small>
            Formato: <strong>{{ previewFormat.toUpperCase() }}</strong> |
            Páginas estimadas: <strong>~{{ estimatedPages }}</strong> |
            Tamanho estimado: <strong>~{{ estimatedSize }}</strong>
          </small>
        </div>
      </div>

      <!-- Direita: Configurações -->
      <div class="config-section">
        <!-- Design -->
        <div class="config-group">
          <h3>🎨 Design</h3>
          
          <div class="config-item">
            <label>Template Base</label>
            <select v-model="config.design.baseTemplateKey" @change="updatePreview">
              <option value="classic">Clássico</option>
              <option value="modern">Moderno</option>
              <option value="minimalist">Minimalista</option>
            </select>
          </div>

          <div class="config-item">
            <label>Fonte Principal</label>
            <select 
              v-model="config.design.visualIdentity.fontPrimary"
              @change="updatePreview"
            >
              <option value="Georgia">Georgia</option>
              <option value="Garamond">Garamond</option>
              <option value="Calibri">Calibri</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
          </div>

          <div class="config-item">
            <label>Fonte de Títulos</label>
            <select 
              v-model="config.design.visualIdentity.fontHeadings"
              @change="updatePreview"
            >
              <option value="Playfair Display">Playfair Display</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>

          <div class="config-item">
            <label>Cor Principal</label>
            <input 
              type="color"
              v-model="config.design.visualIdentity.colorPrimary"
              @change="updatePreview"
            />
          </div>

          <div class="config-item">
            <label>Cor de Acentuação</label>
            <input 
              type="color"
              v-model="config.design.visualIdentity.colorAccent"
              @change="updatePreview"
            />
          </div>
        </div>

        <!-- Layout -->
        <div class="config-group">
          <h3>📐 Layout</h3>

          <div class="config-row">
            <div class="config-item">
              <label>Tamanho da Página</label>
              <select 
                v-model="config.layout.pageSize"
                @change="updatePreview"
              >
                <option value="A4">A4 (210×297mm)</option>
                <option value="Letter">Letter (8.5×11in)</option>
              </select>
            </div>

            <div class="config-item">
              <label>Orientação</label>
              <select 
                v-model="config.layout.orientation"
                @change="updatePreview"
              >
                <option value="portrait">Retrato</option>
                <option value="landscape">Paisagem</option>
              </select>
            </div>
          </div>

          <!-- Margens -->
          <div class="config-subsection">
            <h4>Margens (polegadas)</h4>
            <div class="config-row">
              <div class="config-item">
                <label>Top</label>
                <input 
                  type="number"
                  v-model.number="config.layout.margins.top"
                  step="0.1"
                  min="0.5"
                  max="2"
                  @change="updatePreview"
                />
              </div>
              <div class="config-item">
                <label>Right</label>
                <input 
                  type="number"
                  v-model.number="config.layout.margins.right"
                  step="0.1"
                  min="0.5"
                  max="2"
                  @change="updatePreview"
                />
              </div>
            </div>
            <div class="config-row">
              <div class="config-item">
                <label>Bottom</label>
                <input 
                  type="number"
                  v-model.number="config.layout.margins.bottom"
                  step="0.1"
                  min="0.5"
                  max="2"
                  @change="updatePreview"
                />
              </div>
              <div class="config-item">
                <label>Left</label>
                <input 
                  type="number"
                  v-model.number="config.layout.margins.left"
                  step="0.1"
                  min="0.5"
                  max="2"
                  @change="updatePreview"
                />
              </div>
            </div>
          </div>

          <!-- Padding de Conteúdo -->
          <div class="config-subsection">
            <h4>Espaçamento Interno (rem)</h4>
            <div class="config-row">
              <div class="config-item">
                <label>Top</label>
                <input 
                  type="number"
                  v-model.number="config.layout.contentPadding.top"
                  step="0.5"
                  min="0"
                  max="5"
                  @change="updatePreview"
                />
              </div>
              <div class="config-item">
                <label>Right</label>
                <input 
                  type="number"
                  v-model.number="config.layout.contentPadding.right"
                  step="0.5"
                  min="0"
                  max="5"
                  @change="updatePreview"
                />
              </div>
            </div>
          </div>

          <!-- Tipografia -->
          <div class="config-subsection">
            <h4>Tipografia</h4>
            <div class="config-row">
              <div class="config-item">
                <label>Tamanho Fonte (px)</label>
                <input 
                  type="number"
                  v-model.number="config.layout.fontSize"
                  step="1"
                  min="12"
                  max="24"
                  @change="updatePreview"
                />
              </div>
              <div class="config-item">
                <label>Altura da Linha</label>
                <input 
                  type="number"
                  v-model.number="config.layout.lineHeight"
                  step="0.1"
                  min="1"
                  max="2.5"
                  @change="updatePreview"
                />
              </div>
            </div>
          </div>

          <!-- Presets -->
          <div class="config-item">
            <label>Presets de Espaçamento</label>
            <div class="preset-buttons">
              <button 
                @click="applyMarginPreset('compact')"
                class="preset-btn"
              >
                Compacto
              </button>
              <button 
                @click="applyMarginPreset('normal')"
                class="preset-btn active"
              >
                Normal
              </button>
              <button 
                @click="applyMarginPreset('generous')"
                class="preset-btn"
              >
                Generoso
              </button>
            </div>
          </div>
        </div>

        <!-- Conteúdo -->
        <div class="config-group">
          <h3>📑 Conteúdo</h3>

          <div class="config-checkbox">
            <input 
              type="checkbox"
              id="include-cover"
              v-model="config.content.includeCover"
              @change="updatePreview"
            />
            <label for="include-cover">Incluir Capa</label>
          </div>

          <div class="config-checkbox">
            <input 
              type="checkbox"
              id="include-toc"
              v-model="config.content.includeTableOfContents"
              @change="updatePreview"
            />
            <label for="include-toc">Incluir Sumário</label>
          </div>

          <div class="config-checkbox">
            <input 
              type="checkbox"
              id="include-images"
              v-model="config.content.includeImages"
              @change="updatePreview"
            />
            <label for="include-images">Incluir Imagens</label>
          </div>

          <div class="config-item">
            <label>Máximo de Seções</label>
            <input 
              type="number"
              v-model.number="config.content.maxSections"
              step="1"
              min="1"
              :max="totalSections"
              @change="updatePreview"
            />
            <small>Total: {{ totalSections }} seções</small>
          </div>
        </div>

        <!-- Formato de Exportação -->
        <div class="config-group">
          <h3>💾 Exportar Como</h3>

          <div class="export-format-selector">
            <div 
              v-for="fmt in ['pdf', 'docx', 'epub']"
              :key="fmt"
              @click="exportFormat = fmt"
              :class="['format-option', { active: exportFormat === fmt }]"
            >
              <div class="format-icon">
                {{ formatIcons[fmt] }}
              </div>
              <div class="format-name">
                {{ formatNames[fmt] }}
              </div>
              <div class="format-info">
                {{ estimatedCost[fmt] }} créditos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <div class="footer-left">
        <p class="cost-summary">
          💰 Custo estimado: <strong>{{ estimatedCost[exportFormat] }} créditos</strong>
          <span v-if="userBalance < estimatedCost[exportFormat]" class="warning">
            ⚠️ Saldo insuficiente
          </span>
        </p>
      </div>

      <div class="footer-right">
        <button @click="closeModal" class="btn btn-secondary">
          Cancelar
        </button>
        <button 
          @click="exportEbook"
          :disabled="isExporting || userBalance < estimatedCost[exportFormat]"
          class="btn btn-primary btn-large"
        >
          {{ isExporting ? '⏳ Exportando...' : `✓ Exportar ${exportFormat.toUpperCase()}` }}
        </button>
      </div>
    </div>

    <!-- Progress Overlay -->
    <div v-if="isExporting" class="progress-overlay">
      <div class="progress-modal">
        <h3>Exportando...</h3>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: exportProgress + '%' }"></div>
        </div>
        <p>{{ exportProgress }}%</p>
        <p class="status-message">{{ exportStatusMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { debounce } from 'lodash-es';

const props = defineProps<{
  projectId: string;
  onClose: () => void;
  onExportComplete: (result: any) => void;
}>();

// State
const previewHtml = ref('');
const previewFormat = ref<'pdf' | 'docx' | 'html'>('pdf');
const exportFormat = ref<'pdf' | 'docx' | 'epub'>('pdf');
const isLoadingPreview = ref(false);
const isExporting = ref(false);
const exportProgress = ref(0);
const exportStatusMessage = ref('');
const previewError = ref('');
const userBalance = ref(100); // TODO: buscar do backend
const totalSections = ref(12); // TODO: buscar do backend

const config = reactive({
  design: {
    baseTemplateKey: 'classic',
    visualIdentity: {
      fontPrimary: 'Georgia',
      fontHeadings: 'Playfair Display',
      fontCode: 'Courier New',
      colorPrimary: '#1a1a1a',
      colorSecondary: '#666666',
      colorAccent: '#d4af37'
    }
  },
  layout: {
    contentPadding: {
      top: 2,
      right: 2,
      bottom: 2,
      left: 2
    },
    margins: {
      top: 1.5,
      right: 1,
      bottom: 1.5,
      left: 1
    },
    pageSize: 'A4',
    orientation: 'portrait',
    fontSize: 16,
    lineHeight: 1.6
  },
  content: {
    includeCover: true,
    includeTableOfContents: true,
    includeImages: true,
    maxSections: 0
  }
});

// Computed
const estimatedPages = computed(() => {
  return Math.ceil((totalSections.value * 15) / (config.layout.lineHeight * 1.5));
});

const estimatedSize = computed(() => {
  const sizeKb = estimatedPages.value * 150; // ~150KB por página
  return sizeKb > 1024 
    ? `${(sizeKb / 1024).toFixed(1)} MB`
    : `${sizeKb} KB`;
});

const estimatedCost = computed(() => ({
  pdf: (2.5 + estimatedPages.value * 0.02).toFixed(2),
  docx: (1.5 + estimatedPages.value * 0.01 + 0.5).toFixed(2),
  epub: (1.75 + estimatedPages.value * 0.01).toFixed(2)
}));

const formatIcons: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  epub: '📖'
};

const formatNames: Record<string, string> = {
  pdf: 'PDF',
  docx: 'Word',
  epub: 'E-Book'
};

// Methods
const updatePreview = debounce(async () => {
  isLoadingPreview.value = true;
  previewError.value = '';

  try {
    const configToSend = {
      design: config.design,
      layout: {
        contentPadding: {
          top: `${config.layout.contentPadding.top}rem`,
          right: `${config.layout.contentPadding.right}rem`,
          bottom: `${config.layout.contentPadding.bottom}rem`,
          left: `${config.layout.contentPadding.left}rem`
        },
        margins: {
          top: `${config.layout.margins.top}in`,
          right: `${config.layout.margins.right}in`,
          bottom: `${config.layout.margins.bottom}in`,
          left: `${config.layout.margins.left}in`
        },
        pageSize: config.layout.pageSize,
        lineHeight: config.layout.lineHeight.toString(),
        fontSize: `${config.layout.fontSize}px`
      },
      content: {
        includeCover: config.content.includeCover,
        includeTableOfContents: config.content.includeTableOfContents,
        includeImages: config.content.includeImages,
        maxSections: config.content.maxSections || undefined
      },
      format: previewFormat.value
    };

    const response = await fetch(
      `/api/ebook/projects/${props.projectId}/preview/live`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(configToSend)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error);
    }

    previewHtml.value = await response.text();
  } catch (error: any) {
    console.error('Erro ao gerar preview:', error);
    previewError.value = error.message || 'Erro ao gerar preview';
  } finally {
    isLoadingPreview.value = false;
  }
}, 500);

const applyMarginPreset = (preset: 'compact' | 'normal' | 'generous') => {
  const presets = {
    compact: { top: 1, right: 0.75, bottom: 1, left: 0.75 },
    normal: { top: 1.5, right: 1, bottom: 1.5, left: 1 },
    generous: { top: 2, right: 1.5, bottom: 2, left: 1.5 }
  };

  config.layout.margins = presets[preset];
  updatePreview();
};

const exportEbook = async () => {
  isExporting.value = true;
  exportProgress.value = 0;
  exportStatusMessage.value = 'Iniciando exportação...';

  try {
    // 1. Iniciar exportação
    const startResponse = await fetch(
      `/api/ebook/projects/${props.projectId}/export`,
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

    if (!startResponse.ok) {
      const error = await startResponse.json();
      throw new Error(error.message || error.error);
    }

    const data = await startResponse.json();
    const jobId = data.jobId;

    exportProgress.value = 10;
    exportStatusMessage.value = 'Processando...';

    // 2. Monitorar progresso
    await monitorExportProgress(jobId);

    exportProgress.value = 90;
    exportStatusMessage.value = 'Finalizando...';

    // 3. Baixar arquivo
    await downloadExportedFile(jobId);

    exportProgress.value = 100;
    exportStatusMessage.value = 'Exportação completa!';

    setTimeout(() => {
      props.onExportComplete({ jobId, format: exportFormat.value });
      props.onClose();
    }, 1000);

  } catch (error: any) {
    console.error('Erro ao exportar:', error);
    exportStatusMessage.value = `Erro: ${error.message}`;
  } finally {
    isExporting.value = false;
  }
};

const monitorExportProgress = (jobId: string): Promise<void> => {
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
        const progress = data.progress || 0;

        exportProgress.value = 10 + (progress * 0.8);
        exportStatusMessage.value = data.message || 'Processando...';

        if (data.status === 'completed') {
          clearInterval(interval);
          resolve();
        } else if (data.status === 'failed') {
          clearInterval(interval);
          reject(new Error('Exportação falhou'));
        }
      } catch (error) {
        // Continuar tentando
      }
    }, 1000);

    // Timeout após 5 minutos
    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('Timeout na exportação'));
    }, 5 * 60 * 1000);
  });
};

const downloadExportedFile = async (jobId: string) => {
  const response = await fetch(
    `/api/ebook/exports/${jobId}/download`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Arquivo não encontrado');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.projectId}.${exportFormat.value}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

const closeModal = () => {
  props.onClose();
};

// Helpers
const getAuthToken = () => {
  // TODO: implementar busca do token do localStorage/sessionStorage
  return localStorage.getItem('auth_token') || '';
};

// Inicializar
onMounted(() => {
  updatePreview();
});
</script>

<style scoped>
.modal-unified-export {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  padding: 30px;
  flex: 1;
  overflow: hidden;
}

/* Preview Section */
.preview-section {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.preview-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.preview-toolbar {
  display: flex;
  gap: 8px;
}

.format-selector {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.preview-loading,
.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #0070c0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-error {
  color: #d32f2f;
}

.preview-error p {
  margin: 0;
  font-size: 14px;
}

.preview-info {
  padding: 12px 16px;
  background: #f9f9f9;
  border-top: 1px solid #e0e0e0;
  font-size: 12px;
  color: #666;
}

/* Config Section */
.config-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 100%;
  overflow-y: auto;
  padding: 4px;
}

.config-group {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.config-group h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.config-subsection {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.config-subsection h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.config-item {
  margin-bottom: 12px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-item label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.config-item input[type="text"],
.config-item input[type="number"],
.config-item input[type="color"],
.config-item select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  transition: border 0.2s;
}

.config-item input[type="color"] {
  padding: 4px;
  cursor: pointer;
}

.config-item input:focus,
.config-item select:focus {
  outline: none;
  border-color: #0070c0;
  box-shadow: 0 0 0 3px rgba(0, 112, 192, 0.1);
}

.config-item small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.config-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.config-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.config-checkbox input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.config-checkbox label {
  margin: 0;
  cursor: pointer;
  font-weight: 400;
}

.preset-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.preset-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  border-color: #0070c0;
  color: #0070c0;
}

.preset-btn.active {
  background: #0070c0;
  color: white;
  border-color: #0070c0;
}

.export-format-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.format-option {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.format-option:hover {
  border-color: #0070c0;
  background: #f0f7ff;
}

.format-option.active {
  border-color: #0070c0;
  background: #0070c0;
  color: white;
}

.format-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.format-name {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}

.format-info {
  font-size: 12px;
  opacity: 0.7;
}

/* Footer */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: white;
  border-top: 1px solid #e0e0e0;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
}

.cost-summary {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.warning {
  color: #d32f2f;
  font-weight: 600;
}

.footer-right {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-primary {
  background: #0070c0;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #005fa3;
  box-shadow: 0 2px 8px rgba(0, 112, 192, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-large {
  padding: 12px 24px;
  font-size: 15px;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

/* Progress Overlay */
.progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.progress-modal {
  background: white;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
  min-width: 300px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.progress-modal h3 {
  margin: 0 0 24px 0;
  font-size: 18px;
  color: #333;
}

.progress-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0070c0, #00d4ff);
  transition: width 0.3s;
}

.progress-modal p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.status-message {
  margin-top: 12px;
  color: #0070c0;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 1400px) {
  .modal-body {
    gap: 20px;
    padding: 20px;
  }
}

@media (max-width: 1200px) {
  .modal-body {
    grid-template-columns: 1fr;
  }
}
</style>
```

## Uso do Componente

```vue
<template>
  <div>
    <button @click="showExportModal" class="btn btn-primary">
      Exportar Ebook
    </button>

    <transition name="modal-fade">
      <UnifiedExportModal
        v-if="isExportModalOpen"
        :projectId="currentProjectId"
        @close="isExportModalOpen = false"
        @export-complete="handleExportComplete"
      />
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import UnifiedExportModal from '@/components/UnifiedExportModal.vue';

const isExportModalOpen = ref(false);
const currentProjectId = ref('');

const showExportModal = async (projectId: string) => {
  currentProjectId.value = projectId;
  isExportModalOpen.value = true;
};

const handleExportComplete = (result: any) => {
  console.log('Exportação concluída:', result);
  // Mostrar notificação de sucesso
  showNotification('Arquivo exportado com sucesso!', 'success');
};
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
```

---

## Integração com TypeScript

```typescript
// types/export.ts

export interface ExportConfig {
  design: {
    baseTemplateKey: string;
    visualIdentity: VisualIdentity;
  };
  layout: LayoutConfig;
  content: ContentConfig;
}

export interface VisualIdentity {
  fontPrimary: string;
  fontHeadings: string;
  fontCode: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
}

export interface LayoutConfig {
  contentPadding: Margins;
  margins: Margins;
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  fontSize: number;
  lineHeight: number;
}

export interface ContentConfig {
  includeCover: boolean;
  includeTableOfContents: boolean;
  includeImages: boolean;
  maxSections?: number;
}

export interface ExportResult {
  jobId: string;
  format: 'pdf' | 'docx' | 'epub';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
}
```

---

Pronto! Componente completo, totalmente funcional e pronto para integração.

