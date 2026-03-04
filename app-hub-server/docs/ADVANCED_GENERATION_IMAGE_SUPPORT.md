# Suporte a Imagens no Sistema de Geração Avançada

## 📋 Resumo

O sistema `ebook-advanced-generation` agora possui suporte completo para geração de imagens em todas as 40+ ações disponíveis (regenerar, continuar, expandir, reescrever, etc.).

## 🎯 Problema Resolvido

**ANTES**: Apenas a geração inicial de seções (`ebook-generate-section`) suportava imagens. Ao regenerar/continuar/expandir/reescrever, mesmo marcando explicitamente as opções de imagem, o LLM não gerava imagens.

**AGORA**: Todas as ações do `ebook-advanced-generation` podem gerar imagens quando solicitado.

## 🔧 Implementação

### 1. Interface Atualizada

```typescript
interface EbookAdvancedGenerationArgs {
  // ... parâmetros existentes ...
  
  // Opções de imagem
  generateImages?: boolean;
  imageCount?: number;  // 1-5, ou undefined para 'auto'
  imageStyle?: string;  // Style Type ou Style Preset (veja lista completa abaixo)
  imageAspectRatio?: '1:1' | '4:3' | '16:9' | '9:16' | '3:2' | '2:3';
  imageQuality?: 'basico' | 'medio' | 'avancado';
  imagePromptEnhancements?: string[];
  imagePromptInstructions?: string;
}
```

### 2. Schema do Tool

```typescript
{
  // ... propriedades existentes ...
  
  generateImages: {
    type: 'boolean',
    description: 'Se deve gerar imagens para o conteúdo',
    default: false
  },
  imageCount: {
    type: 'number',
    description: 'Número de imagens a gerar (1-5, ou undefined para auto)',
    minimum: 1,
    maximum: 5
  },
  imageStyle: {
    type: 'string',
    description: 'Estilo visual das imagens (Style Type ou Style Preset)',
    enum: [
      // Style Types (básicos)
      'None', 'Auto', 'General', 'Realistic', 'Design',
      // Style Presets (detalhados - 35+ opções)
      '3D', 'Anime', 'Bokeh', 'Cinematic', 'Collage', 'Cyberpunk', 'Fantasy Art',
      'Film Noir', 'Graphic Novel', 'HDR', 'Horror', 'Impressionism', 
      'Long Exposure', 'Macro Photography', 'Medieval', 'Minimalist', 
      'Monochrome', 'Moody', 'Neon Noir', 'Noir', 'Origami', 'Photography', 
      'Pixel Art', 'Polaroid', 'Pop Art', 'Renaissance', 'Retro', 'Retrowave', 
      'Sticker', 'Studio Ghibli', 'Surrealism', 'Typography', 'Vibrant', 
      'Vintage', 'Watercolor'
    ],
    default: 'Auto'
  },
  // ... outras opções de imagem ...
}
```

### 🎨 Opções de imageStyle

O campo `imageStyle` aceita dois tipos de valores:

#### **Style Types (Básicos)**
- `Auto` - Deixa o modelo escolher automaticamente (recomendado)
- `General` - Estilo geral, versátil
- `Realistic` - Realismo fotográfico
- `Design` - Foco em design e composição
- `None` - Sem estilo específico

#### **Style Presets (35+ Estilos Detalhados)**

**Arte e Ilustração:**
- `3D` - Arte tridimensional
- `Anime` - Estilo anime japonês
- `Watercolor` - Aquarela
- `Impressionism` - Impressionismo
- `Surrealism` - Surrealismo
- `Pop Art` - Pop art
- `Origami` - Estilo origami
- `Pixel Art` - Arte pixelada
- `Sticker` - Estilo adesivo
- `Studio Ghibli` - Estilo Studio Ghibli
- `Fantasy Art` - Arte fantástica
- `Graphic Novel` - História em quadrinhos

**Fotografia:**
- `Photography` - Fotografia profissional
- `Bokeh` - Desfoque de fundo
- `Cinematic` - Cinematográfico
- `HDR` - High Dynamic Range
- `Long Exposure` - Longa exposição
- `Macro Photography` - Macrofotografia
- `Polaroid` - Estilo Polaroid

**Estéticas e Períodos:**
- `Medieval` - Medieval
- `Renaissance` - Renascimento
- `Retro` - Retrô
- `Vintage` - Vintage
- `Retrowave` - Synthwave/Retrowave
- `Cyberpunk` - Cyberpunk
- `Neon Noir` - Neon noir

**Mood e Atmosfera:**
- `Horror` - Terror
- `Film Noir` - Film noir
- `Noir` - Noir
- `Moody` - Atmosférico
- `Vibrant` - Vibrante
- `Monochrome` - Monocromático

**Design:**
- `Minimalist` - Minimalista
- `Typography` - Tipografia
- `Collage` - Colagem

> **Nota:** `style_type` e `style_preset` são mutuamente exclusivos. Quando você escolhe um Style Preset (ex: 'Anime'), o sistema automaticamente define `style_type='General'` e `style_preset='Anime'`. Quando escolhe um Style Type básico (ex: 'Realistic'), apenas `style_type` é enviado.

### 3. Lógica de Geração

```typescript
// Após gerar o conteúdo com LLM:
if (args.generateImages === true) {
  // 1. Extrair descrições de imagens do conteúdo
  const imageDescriptions = imageGenerationService.extractImageDescriptions(
    content,
    isAutoImageCount ? undefined : args.imageCount
  );
  
  // 2. Gerar e integrar imagens
  const imageResult = await imageGenerationService.generateAndIntegrateImages(
    content,
    imageDescriptions,
    metadata.userId,
    args.projectId,
    args.sectionId,
    args.imageStyle || 'Auto',  // Padrão: Auto
    imageOptions,
    { replicateApiKey: metadata.replicateApiKey, model: metadata.model }
  );
  
  // 3. Atualizar conteúdo com URLs das imagens
  finalContent = imageResult.contentWithUrls;
  
  // 4. Salvar metadados das imagens
  await mongoDbService.updateOne('ebookSections', 
    { _id: new ObjectId(args.sectionId) },
    { 
      $set: { 
        content: finalContent,
        images: imagesArray,
        imagesMetadata: imageData
      }
    }
  );
}
```

## 📡 Uso via Socket

O tool é chamado via socket, recebendo parâmetros diretamente do frontend:

```javascript
socket.emit('tool_call', {
  tool: 'ebook_advanced_generation',
  parameters: {
    projectId: '...',
    sectionId: '...',
    action: 'regenerate',  // ou 'continue', 'expand', 'rewrite', etc.
    words: 500,
    tier: 'basic',
    
    // Opções de imagem
    generateImages: true,
    imageCount: 3,
    imageStyle: 'realistic',
    imageAspectRatio: '16:9',
    imageQuality: 'medio',
    imagePromptEnhancements: ['cinematic lighting', 'high detail'],
    imagePromptInstructions: 'Foco em ambientes naturais'
  },
  language: 'pt-BR',
  time: new Date().toISOString()
});
```

## 📊 Resposta do Socket

```javascript
socket.on('results', (data) => {
  console.log(data.result);
  // {
  //   content: "Conteúdo gerado com <img src='...' />",
  //   images: [
  //     { success: true, generatedAt: "2025-12-07T..." },
  //     { success: true, generatedAt: "2025-12-07T..." }
  //   ],
  //   metadata: {
  //     action: 'regenerate',
  //     words: 523,
  //     tier: 'basic',
  //     model: 'google/gemini-2.5-flash',
  //     duration: 4521,
  //     imagesMetadata: {
  //       success: true,
  //       generatedCount: 2,
  //       totalRequested: 3
  //     }
  //   }
  // }
});
```

## ✅ Ações Suportadas

Todas as 40+ ações suportam geração de imagens:

### Ações Básicas
- ✅ `generate` - Gerar novo conteúdo
- ✅ `regenerate` - Regenerar com nova abordagem
- ✅ `continue` - Continuar escrevendo

### Ações de Edição
- ✅ `expand` - Expandir texto selecionado
- ✅ `rewrite` - Reescrever com novo tom
- ✅ `tone` - Ajustar tom
- ✅ `simplify` - Simplificar
- ✅ `enrich` - Enriquecer com detalhes

### Ações Criativas
- ✅ `dialogize` - Transformar em diálogo
- ✅ `describe` - Adicionar descrições
- ✅ `create-character` - Criar personagem
- ✅ `develop-dialogue` - Desenvolver diálogo
- ✅ `build-scene` - Construir cena
- ✅ `create-tension` - Criar tensão
- ✅ `plot-twist` - Adicionar reviravolta
- ✅ `worldbuild` - Desenvolver mundo

### Ações Educacionais
- ✅ `add-examples` - Adicionar exemplos
- ✅ `create-list` - Criar lista
- ✅ `compare` - Comparar conceitos
- ✅ `tutorial` - Criar tutorial
- ✅ `add-stats` - Adicionar estatísticas
- ✅ `create-faq` - Criar FAQ

### Ações Estruturais
- ✅ `vary-structure` - Variar estrutura
- ✅ `eliminate-redundancy` - Eliminar redundância
- ✅ `strengthen-opening` - Fortalecer abertura
- ✅ `strong-closing` - Fortalecer fechamento
- ✅ `add-hook` - Adicionar gancho
- ✅ `improve-flow` - Melhorar fluxo

## 🔍 Comportamento de Imagens

### Modo Auto (imageCount = undefined)
- LLM decide quantas imagens incluir baseado no conteúdo
- Extrai todas as descrições `IMAGE_DESCRIPTION[...]` encontradas
- Máximo de 5 imagens por seção

### Modo Fixo (imageCount = 1-5)
- Limita a quantidade de imagens ao número especificado
- Usa as primeiras N descrições encontradas
- Descarta descrições excedentes

### Tratamento de Erros
- Se geração de imagens falhar, o conteúdo de texto é preservado
- Erros de imagem são logados mas não bloqueiam a operação
- Marcadores `IMAGE_DESCRIPTION` são removidos do conteúdo final

## 📝 Exemplo Completo

```javascript
// Frontend envia:
socket.emit('tool_call', {
  tool: 'ebook_advanced_generation',
  parameters: {
    projectId: '507f1f77bcf86cd799439011',
    sectionId: '507f1f77bcf86cd799439012',
    action: 'expand',
    words: 800,
    tier: 'medium',
    selectedText: 'A floresta era densa e misteriosa.',
    contextDepth: 'minimal',
    
    // Habilitar imagens
    generateImages: true,
    imageCount: 2,
    imageStyle: 'photographic',
    imageAspectRatio: '16:9',
    imageQuality: 'avancado',
    imagePromptEnhancements: ['golden hour', 'volumetric fog'],
    imagePromptInstructions: 'Capturar a atmosfera misteriosa da floresta'
  }
});

// Backend responde:
socket.on('results', (data) => {
  // data.result.content = "A floresta era densa e misteriosa... <img src='https://...' /> ..."
  // data.result.images = [{ success: true, generatedAt: ... }, ...]
  // data.result.metadata.imagesMetadata = { success: true, generatedCount: 2, ... }
});
```

## 🛠️ Arquivos Modificados

1. **`src/tools/ebook-advanced-generation.tool.ts`**
   - Adicionado interface com parâmetros de imagem
   - Adicionado schema com propriedades de imagem
   - Implementado lógica de geração e integração de imagens
   - Adicionado salvamento de metadados de imagem

2. **`docs/ADVANCED_GENERATION_IMAGE_SUPPORT.md`** (este arquivo)
   - Documentação completa do sistema

## 🔄 Compatibilidade

- ✅ Compatível com sistema existente `ebook-generate-section`
- ✅ Usa mesma infraestrutura `SectionImageGenerationService`
- ✅ Mantém comportamento padrão (sem imagens) quando não solicitado
- ✅ Retorna formato consistente para o frontend

## 📌 Notas Importantes

1. **Frontend deve enviar parâmetros**: O backend agora aceita os parâmetros, mas o frontend precisa enviá-los ao chamar o socket.

2. **Custo de créditos**: A geração de imagens é feita via Replicate API e pode ter custo adicional (não incluído no cálculo de créditos do LLM).

3. **Persistência**: Imagens são salvas no banco com URL permanente e metadados completos.

4. **Limitações**:
   - Máximo 5 imagens por seção
   - Cada prompt de imagem limitado a 500 caracteres
   - Enhancements limitados a 100 caracteres cada

## ✨ Próximos Passos

Para uso completo do sistema:

1. **Frontend**: Adicionar UI para opções de imagem nas ações de regenerar/continuar/expandir
2. **Frontend**: Incluir parâmetros de imagem ao chamar `socket.emit('tool_call', ...)`
3. **Frontend**: Processar array `images` e `imagesMetadata` na resposta
4. **Backend**: Implementar cálculo de créditos específico para imagens (separado do LLM)

---

**Data de Implementação**: 7 de dezembro de 2025  
**Versão**: 1.0.0
