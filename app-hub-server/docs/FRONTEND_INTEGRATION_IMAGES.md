# Integração Frontend - Geração de Imagens no Advanced Generation

## 🎯 Status Atual

### ✅ Backend (100% Pronto)
- `ebook-advanced-generation.tool.ts` aceita todos os parâmetros de imagem
- `ebook-prompt.service.ts` instrui o LLM a gerar marcadores IMAGE_DESCRIPTION
- Sistema completo de geração e integração de imagens implementado
- Logs de debug ativos para rastreamento

### ❌ Frontend (Precisa Implementação)
O frontend **NÃO está enviando** os parâmetros de imagem ao chamar o socket.

**Evidência dos logs:**
```
🔍 [EbookAdvancedGen] Parâmetros recebidos:
   - action: regenerate
   - generateImages: undefined  ❌
   - imageCount: undefined      ❌
   - imageStyle: undefined      ❌
```

## 🔧 O Que Fazer no Frontend

### 1. Localizar o código que chama o socket

Procurar por código similar a:

```javascript
socket.emit('tool_call', {
  tool: 'ebook_advanced_generation',
  parameters: {
    projectId: '...',
    sectionId: '...',
    action: 'regenerate', // ou continue, expand, rewrite, etc.
    words: 500,
    tier: 'basic',
    contextDepth: 'moderate'
    // ❌ FALTAM os parâmetros de imagem aqui!
  },
  language: 'pt-BR',
  time: new Date().toISOString()
});
```

### 2. Adicionar parâmetros de imagem

```javascript
socket.emit('tool_call', {
  tool: 'ebook_advanced_generation',
  parameters: {
    projectId: '...',
    sectionId: '...',
    action: 'regenerate',
    words: 500,
    tier: 'basic',
    contextDepth: 'moderate',
    
    // ✅ ADICIONAR ESTES PARÂMETROS:
    generateImages: true,              // Boolean - se deve gerar imagens
    imageCount: 3,                     // Number (1-5) ou undefined para 'auto'
    imageStyle: 'realistic',           // String - estilo visual
    imageAspectRatio: '16:9',         // String (opcional) - proporção
    imageQuality: 'medio',             // String (opcional) - qualidade
    imagePromptEnhancements: [         // Array (opcional) - melhorias
      'cinematic lighting',
      'high detail'
    ],
    imagePromptInstructions: 'Foco em ambientes naturais' // String (opcional)
  },
  language: 'pt-BR',
  time: new Date().toISOString()
});
```

### 3. Interface/Type do Frontend

Criar ou atualizar a interface TypeScript:

```typescript
interface AdvancedGenerationParams {
  projectId: string;
  sectionId: string;
  action: GenerationAction;
  words: number;
  tier?: 'basic' | 'medium' | 'advanced';
  selectedText?: string;
  contextDepth?: 'minimal' | 'moderate' | 'full';
  
  // Opções de imagem
  generateImages?: boolean;
  imageCount?: number;  // 1-5 ou undefined para auto
  imageStyle?: 'realistic' | 'artistic' | 'abstract' | 'minimalist' | 'photographic';
  imageAspectRatio?: '1:1' | '4:3' | '16:9' | '9:16' | '3:2' | '2:3';
  imageQuality?: 'basico' | 'medio' | 'avancado';
  imagePromptEnhancements?: string[];
  imagePromptInstructions?: string;
}
```

### 4. UI - Adicionar Controles de Imagem

Adicionar campos na UI de regenerar/continuar/expandir/reescrever:

```jsx
// Checkbox para habilitar imagens
<Checkbox
  checked={generateImages}
  onChange={(e) => setGenerateImages(e.target.checked)}
>
  Gerar imagens
</Checkbox>

{generateImages && (
  <>
    {/* Quantidade de imagens */}
    <Select
      value={imageCount}
      onChange={(value) => setImageCount(value)}
      options={[
        { label: 'Auto', value: undefined },
        { label: '1 imagem', value: 1 },
        { label: '2 imagens', value: 2 },
        { label: '3 imagens', value: 3 },
        { label: '4 imagens', value: 4 },
        { label: '5 imagens', value: 5 }
      ]}
    />

    {/* Estilo visual */}
    <Select
      value={imageStyle}
      onChange={(value) => setImageStyle(value)}
      options={[
        { label: 'Realista', value: 'realistic' },
        { label: 'Artístico', value: 'artistic' },
        { label: 'Abstrato', value: 'abstract' },
        { label: 'Minimalista', value: 'minimalist' },
        { label: 'Fotográfico', value: 'photographic' }
      ]}
    />

    {/* Proporção (opcional) */}
    <Select
      value={imageAspectRatio}
      onChange={(value) => setImageAspectRatio(value)}
      options={[
        { label: 'Quadrado (1:1)', value: '1:1' },
        { label: 'Paisagem (16:9)', value: '16:9' },
        { label: 'Retrato (9:16)', value: '9:16' },
        // ... outras opções
      ]}
    />

    {/* Qualidade (opcional) */}
    <Select
      value={imageQuality}
      onChange={(value) => setImageQuality(value)}
      options={[
        { label: 'Básico', value: 'basico' },
        { label: 'Médio', value: 'medio' },
        { label: 'Avançado', value: 'avancado' }
      ]}
    />
  </>
)}
```

### 5. Processar Resposta do Socket

```javascript
socket.on('results', (data) => {
  if (data.status === 'completed') {
    const result = data.result;
    
    // Conteúdo com imagens integradas
    console.log('Conteúdo:', result.content);
    
    // Array de imagens geradas
    console.log('Imagens:', result.images);
    // [
    //   { success: true, generatedAt: "2025-12-07T..." },
    //   { success: true, generatedAt: "2025-12-07T..." }
    // ]
    
    // Metadados das imagens
    console.log('Metadados:', result.metadata.imagesMetadata);
    // {
    //   success: true,
    //   generatedCount: 2,
    //   totalRequested: 3
    // }
    
    // Atualizar estado/UI
    setSectionContent(result.content);
    setGeneratedImages(result.images);
  }
});
```

## 📝 Exemplo Completo de Integração

```typescript
// Arquivo: SectionEditor.tsx (ou similar)

import { useState } from 'react';
import { socket } from '@/services/socket';

interface RegenerateOptions {
  generateImages?: boolean;
  imageCount?: number;
  imageStyle?: string;
  imageAspectRatio?: string;
  imageQuality?: string;
}

function SectionEditor() {
  const [generateImages, setGenerateImages] = useState(false);
  const [imageCount, setImageCount] = useState<number | undefined>(3);
  const [imageStyle, setImageStyle] = useState('realistic');
  const [imageAspectRatio, setImageAspectRatio] = useState<string | undefined>('16:9');
  const [imageQuality, setImageQuality] = useState<string | undefined>('medio');

  const regenerateSection = async (sectionId: string) => {
    // Construir parâmetros
    const params: any = {
      projectId: currentProject.id,
      sectionId: sectionId,
      action: 'regenerate',
      words: 500,
      tier: 'basic',
      contextDepth: 'moderate'
    };

    // Adicionar parâmetros de imagem se habilitado
    if (generateImages) {
      params.generateImages = true;
      params.imageCount = imageCount;
      params.imageStyle = imageStyle;
      
      if (imageAspectRatio) {
        params.imageAspectRatio = imageAspectRatio;
      }
      if (imageQuality) {
        params.imageQuality = imageQuality;
      }
    }

    // Emitir evento socket
    socket.emit('tool_call', {
      tool: 'ebook_advanced_generation',
      parameters: params,
      language: 'pt-BR',
      time: new Date().toISOString()
    });

    // Aguardar resposta
    socket.once('results', (data) => {
      if (data.status === 'completed') {
        updateSectionContent(sectionId, data.result.content);
        
        if (data.result.images && data.result.images.length > 0) {
          showNotification(`${data.result.images.length} imagens geradas!`);
        }
      }
    });
  };

  return (
    <div>
      {/* UI controls aqui */}
      <Checkbox
        checked={generateImages}
        onChange={(e) => setGenerateImages(e.target.checked)}
      >
        Gerar imagens ao regenerar
      </Checkbox>
      
      {generateImages && (
        <ImageOptions
          imageCount={imageCount}
          setImageCount={setImageCount}
          imageStyle={imageStyle}
          setImageStyle={setImageStyle}
          // ... outras props
        />
      )}

      <Button onClick={() => regenerateSection(currentSection.id)}>
        Regenerar Seção
      </Button>
    </div>
  );
}
```

## 🧪 Como Testar

### 1. Verificar se parâmetros estão sendo enviados

Após implementar, você deve ver nos logs do backend:

```
🔍 [EbookAdvancedGen] Parâmetros recebidos:
   - action: regenerate
   - generateImages: true  ✅
   - imageCount: 3         ✅
   - imageStyle: realistic ✅
```

### 2. Verificar se LLM gera marcadores

O conteúdo gerado deve incluir:

```
... texto do ebook ...

IMAGE_DESCRIPTION[detailed description of image in English]

... mais texto ...
```

### 3. Verificar se imagens são geradas

Logs devem mostrar:

```
🖼️ [EbookAdvancedGen] INICIANDO geração de imagens...
📸 [EbookAdvancedGen] Descrições extraídas: 3
📸 [EbookAdvancedGen] Encontradas 3 descrições de imagens
✅ [EbookAdvancedGen] Imagens processadas: 3 geradas com sucesso
✅ [EbookAdvancedGen] Seção atualizada com conteúdo (3 imagens)
```

### 4. Verificar resposta no frontend

```javascript
socket.on('results', (data) => {
  console.log('Images:', data.result.images); // Deve ter array com objetos
  console.log('Metadata:', data.result.metadata.imagesMetadata); 
  // { success: true, generatedCount: 3, totalRequested: 3 }
});
```

## 🚨 Problemas Comuns

### Problema 1: `generateImages: undefined`
**Causa:** Frontend não está passando o parâmetro  
**Solução:** Adicionar `generateImages: true` nos parameters do socket.emit

### Problema 2: Nenhuma descrição de imagem encontrada
**Causa:** LLM não gerou marcadores IMAGE_DESCRIPTION  
**Solução:** Verificar se `generateImages: true` está sendo passado corretamente

### Problema 3: Imagens não aparecem no conteúdo
**Causa:** Tags `<img>` não estão no HTML retornado  
**Solução:** Verificar `result.content` - deve conter tags `<img src="...">`

## 📌 Checklist de Implementação

- [ ] Localizar código que chama `socket.emit('tool_call', ...)`
- [ ] Adicionar campos de UI para opções de imagem
- [ ] Adicionar parâmetros de imagem nos `parameters`
- [ ] Testar envio - verificar logs do backend
- [ ] Verificar conteúdo gerado tem marcadores IMAGE_DESCRIPTION
- [ ] Verificar imagens são geradas e URLs integradas
- [ ] Processar `result.images` no frontend
- [ ] Exibir feedback visual das imagens geradas
- [ ] Documentar componentes/funções criadas

## 🎯 Resultado Esperado

Após implementação completa:

1. ✅ Usuário marca checkbox "Gerar imagens"
2. ✅ Usuário escolhe quantidade e estilo
3. ✅ Frontend envia parâmetros via socket
4. ✅ Backend instrui LLM a incluir marcadores
5. ✅ LLM gera conteúdo com IMAGE_DESCRIPTION
6. ✅ Backend extrai descrições e gera imagens
7. ✅ Backend integra URLs no conteúdo
8. ✅ Frontend recebe conteúdo com tags `<img>`
9. ✅ Imagens são exibidas no editor

---

**Data:** 7 de dezembro de 2025  
**Status Backend:** ✅ Completo  
**Status Frontend:** ⏳ Aguardando implementação
