# Frontend: Tudo o que você precisa saber sobre Opções Avançadas de Imagens

## 🎯 Versão Curta

Quando `generateImages: true`, você pode opcionalmente passar parâmetros para controlar a geração. Os **parâmetros básicos** (quantidade e estilo) têm defaults sensatos. Os **parâmetros avançados** (proporção, qualidade, detalhes) são totalmente opcionais.

```typescript
// Mais simples (recomendado)
POST /ebook/generate/section {
  projectId: "...",
  sectionId: "...",
  generateImages: true
}

// Com parâmetros básicos
POST /ebook/generate/section {
  projectId: "...",
  sectionId: "...",
  generateImages: true,
  imageCount: 2,            // quantas imagens
  imageStyle: "realistic"   // estilo visual
}

// Com controle fino (opções avançadas)
POST /ebook/generate/section {
  projectId: "...",
  sectionId: "...",
  generateImages: true,
  imageCount: 2,
  imageStyle: "realistic",
  // Opções avançadas (opcional)
  imageAspectRatio: "16:9",
  imageQuality: "medio",
  imagePromptEnhancements: [...]
}
```

## 📋 Parâmetros de Imagem

### Parâmetros Básicos (com defaults)

#### `imageCount?: number`
**Valores permitidos:** `1` até `5`  
**Default:** `2`

Quantidade de imagens a gerar e distribuir na seção.

---

#### `imageStyle?: string`
**Valores permitidos:** `'realistic'` | `'artistic'` | `'abstract'` | `'minimalist'` | `'photographic'`  
**Default:** `'realistic'`

Estilo visual das imagens.
- `'realistic'`: Fotografia realista, natural
- `'artistic'`: Arte ilustrativa, pintura
- `'abstract'`: Abstraçãogeométrica, experimental
- `'minimalist'`: Simples, limpo, composição mínima
- `'photographic'`: Fotografia profissional, bem iluminada

---

### Parâmetros Avançados (opcionais, sem defaults)

#### `imageAspectRatio?: string`
**Valores permitidos:** `'1:1'` | `'4:3'` | `'16:9'` | `'9:16'` | `'3:2'` | `'2:3'`

Controla o formato das imagens (relação width:height).
- `16:9`: Paisagens, cenários
- `9:16`: Retratos, pessoas
- `1:1`: Quadradas, composições balanceadas

**Default se omitido:** LLM escolhe contextualmente

---

### `imageQuality?: string`
**Valores permitidos:** `'basico'` | `'medio'` | `'avancado'`

Controla o nível de qualidade das imagens geradas.
- `'basico'`: Geração mais rápida, resolução padrão, ideal para protótipos
- `'medio'`: Balanceado entre qualidade e tempo, recomendado para produção
- `'avancado'`: Máxima qualidade, processamento mais longo, ideal para destaque

**Default se omitido:** LLM escolhe baseado no conteúdo

---

### `imagePromptEnhancements?: string[]`
**Restrições:**
- Máximo 5 elementos
- Máximo 100 caracteres cada
- Strings não vazias

Detalhes que serão incorporados em TODAS as descrições de imagem.

```typescript
imagePromptEnhancements: [
  "warm sunset lighting",
  "shallow depth of field",
  "cinematic color grading"
]
```

O LLM automaticamente adiciona esses detalhes nas imagens geradas.

**Default se omitido:** Nenhum (descrições 100% do LLM)

---

## 🎨 Padrões de Uso

### Pattern 1: Deixar LLM Decidir (Melhor Prática ✅)
```typescript
const payload = {
  projectId: project._id,
  sectionId: section._id,
  generateImages: true,
  imageCount: 3
  // Nenhuma opção avançada
  // LLM escolhe tudo inteligentemente
};
```

**Quando usar:** Na maioria dos casos  
**Vantagens:** Simples, contextual, eficiente  
**Resultado:** Imagens relevantes ao conteúdo

---

### Pattern 2: Tema Visual Consistente
```typescript
const payload = {
  projectId: project._id,
  sectionId: section._id,
  generateImages: true,
  imageAspectRatio: "16:9",  // Sempre panorâmicas
  imagePromptEnhancements: [
    "vintage aesthetic",
    "warm tones",
    "nostalgic style"
  ]
};
```

**Quando usar:** Capítulos com tema visual definido  
**Vantagens:** Consistência visual entre seções  
**Resultado:** Imagens com estilo coeso

---

### Pattern 3: Alta Qualidade Premium
```typescript
const payload = {
  projectId: project._id,
  sectionId: section._id,
  generateImages: true,
  imageQuality: "avancado",       // Máxima qualidade
  imagePromptEnhancements: [
    "ultra detailed",
    "professional grade",
    "masterpiece quality"
  ]
};


### Pattern 4: Rápido & Econômico
```typescript
const payload = {
  projectId: project._id,
  sectionId: section._id,
  generateImages: true,
  imageQuality: "basico"           // Qualidade básica
};
```

**Quando usar:** Prototipos, testes, produção em massa  
✅ **Custo:** Mais baixo  
✅ **Tempo:** Rápido (2-3 minutos)  
⚠️ **Resultado:** Qualidade reduzida

---

## ✅ Validação & Tratamento de Erros

### ✓ Valores inválidos são ignorados silenciosamente
```typescript
{
  imageAspectRatio: "invalid",        // Ignorado
  imageQuality: "premium",            // Ignorado (não está em [basico, medio, avancado])
  imagePromptEnhancements: ["ok", ""] // String vazia é filtrada
}
// → LLM usa valores contextuais para cada campo ignorado
```

### ✓ Nenhuma falha por opções erradas
O endpoint NUNCA retorna erro 400 por opções avançadas inválidas. Elas simplesmente são ignoradas.

---

## 📱 UI/UX Recomendada

### Formulário Básico (Recomendado)
```
┌─────────────────────────────────┐
│ ☑ Gerar imagens                │
│ Quantidade: [2 ▼]              │
│ Estilo: [Realista ▼]           │
│ [⚙️ Opções Avançadas]           │ ← Expandir para mais controle
└─────────────────────────────────┘
```

**Opções Avançadas (quando expandido):**
```
┌──────────────────────────────────┐
│ Proporção: [-- Automática --▼]  │
│ Qualidade: [-- Automática --▼]  │
│                                  │
│ Detalhes adicionais:             │
│ [warm lighting, shallow DOF, ...] │
│                                  │
│ [Aplicar] [Cancelar]             │
└──────────────────────────────────┘
```

---

## 🔄 Fluxo Completo

```
1. Usuário preenche dados da seção
   ↓
2. (Opcional) Clica "Opções Avançadas"
   → Preenche aspectRatio, quality, enhancements
   ↓
3. Clica "Gerar com Imagens"
   ↓
4. Frontend envia POST /ebook/generate/section com payload
   ↓
5. Backend retorna jobId (status 202)
   ↓
6. Aguarda resultado via WebSocket
   ↓
7. Resultado chega com:
   - content: HTML com <img> tags
   - images: { success, generatedCount, totalRequested, error }
   ↓
8. Mostra preview
   ↓
9. Usuário clica "Salvar"
   ↓
10. POST /ebook/sections/{sectionId}/save-content
    ↓
11. ✅ Seção salva com imagens e metadados
```

---

## 📊 Matriz de Decisão

| Cenário | generateImages | imageCount | imageQuality | imagePromptEnhancements |
|---------|---|---|---|---|
| Teste rápido | true | 1 | basico | - |
| Produção normal | true | 2-3 | - | - |
| Tema visual | true | 2-3 | - | ["tema1", "tema2"] |
| Premium/destaque | true | 2-3 | avancado | ["ultra detailed"] |
| Sem imagens | false | - | - | - |

---

## 🚀 Code Sample Completo

```typescript
interface GenerateSectionPayload {
  projectId: string;
  sectionId: string;
  generateImages: boolean;
  imageCount?: number;
  imageStyle?: 'realistic' | 'artistic' | 'abstract' | 'minimalist' | 'photographic';
  // Opções avançadas opcionais
  imageAspectRatio?: '1:1' | '4:3' | '16:9' | '9:16' | '3:2' | '2:3';
  imageQuality?: 'basico' | 'medio' | 'avancado';
  imagePromptEnhancements?: string[];
}

async function generateSection(payload: GenerateSectionPayload) {
  try {
    // 1. Requisição
    const response = await fetch('/ebook/generate/section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const { jobId, status, options } = await response.json();
    console.log('✅ Job criado:', jobId);
    console.log('Opções validadas:', options);

    // 2. Aguardar resultado via WebSocket
    return new Promise((resolve) => {
      socket.once('results', async (result) => {
        if (result.status === 'completed') {
          const { content, images } = result.result;
          
          console.log('📸 Imagens:', images);
          // images = { success, generatedCount, totalRequested, error }
          
          // 3. Renderizar preview
          document.getElementById('preview').innerHTML = content;
          
          // 4. Salvar no DB
          const saveResponse = await fetch(
            `/ebook/sections/${payload.sectionId}/save-content`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: payload.projectId,
                sectionId: payload.sectionId,
                content,
                images
              })
            }
          );
          
          const saveResult = await saveResponse.json();
          console.log('✅ Seção salva:', saveResult);
          resolve(saveResult);
        } else if (result.status === 'failed') {
          console.error('❌ Falha na geração:', result.result.msg);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Uso
await generateSection({
  projectId: '507f1f77bcf86cd799439011',
  sectionId: '507f1f77bcf86cd799439012',
  generateImages: true,
  imageCount: 3,
  // Sem opções avançadas = LLM decide
});
```

---

## 📚 Documentação Completa

- **`SECTION_IMAGE_GENERATION.md`**: Documentação técnica completa
- **`ADVANCED_IMAGE_OPTIONS.md`**: Guia detalhado das opções avançadas

