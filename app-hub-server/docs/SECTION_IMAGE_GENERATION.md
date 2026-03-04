# Geração de Imagens Opcionais em Seções - Implementação

## Visão Geral
O sistema agora permite que o agente gerador de seções produza imagens opcionalmente junto com o conteúdo de texto. As imagens são geradas via Replicate, armazenadas no MinIO, e posicionadas no conteúdo final como HTML `<img>`.

## Arquitetura

### 1. **Endpoint Estendido: POST `/ebook/generate/section`**
**Payload:**
```json
{
  "projectId": "string",
  "sectionId": "string",
  "generateImages": boolean,                    // Opcional (padrão: false)
  "imageCount": number,                        // 1-5 (padrão: 2)
  "imageStyle": string,                        // 'realistic'|'artistic'|'abstract'|'minimalist'|'photographic' (padrão: 'realistic')
  "imageAspectRatio": string,                  // OPCIONAL: '1:1'|'4:3'|'16:9'|'9:16'|'3:2'|'2:3' (sem default)
  "imageQuality": number,                      // OPCIONAL: 60|70|80|90 (sem default)
  "imagePromptEnhancements": string[]          // OPCIONAL: Array de detalhes a incorporar (max 100 chars cada, sem default)
}
```

**Exemplos:**
```json
// Geração básica com defaults
{
  "projectId": "...",
  "sectionId": "...",
  "generateImages": true,
  "imageCount": 3
}

// Com opções avançadas customizadas
{
  "projectId": "...",
  "sectionId": "...",
  "generateImages": true,
  "imageCount": 2,
  "imageStyle": "artistic",
  "imageAspectRatio": "16:9",
  "imageQuality": 90,
  "imagePromptEnhancements": [
    "warm sunset lighting",
    "bokeh background",
    "cinematic composition"
  ]
}

// LLM decide (nenhuma opção avançada)
{
  "projectId": "...",
  "sectionId": "...",
  "generateImages": true
  // imageCount, imageStyle, e opções avançadas deixadas em branco
  // LLM gera com eficiência contextual baseado no conteúdo
}
```
```json
{
  "jobId": "string",
  "status": "pending",
  "message": "Section generation started...",
  "options": {
    "generateImages": boolean,
    "imageCount": number,
    "imageStyle": string
  }
}
```

### 2. **Novo Endpoint: POST `/ebook/sections/:sectionId/save-content`**
Salva o conteúdo gerado no banco de dados com metadados de imagens.

**Payload:**
```json
{
  "projectId": "string",
  "sectionId": "string",
  "content": "string (HTML/Markdown com imagens)",
  "images": {
    "success": boolean,
    "generatedCount": number,
    "totalRequested": number,
    "error": string | null
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "section": {
    "_id": "string",
    "content": "string (primeiros 200 caracteres)",
    "metadata": {
      "wordCount": number,
      "characterCount": number,
      "estimatedTokens": number,
      "estimatedPages": number,
      "imagesGenerated": {
        "success": boolean,
        "count": number,
        "requested": number,
        "error": string | null
      }
    }
  }
}
```

## Fluxo de Execução

### Com geração de imagens:

```
1. Cliente envia POST /ebook/generate/section com generateImages=true
   ↓
2. Endpoint valida opções (imageCount 1-5, imageStyle válido)
   ↓
3. Cria job assíncrono com forma { generateImages, imageCount, imageStyle, ... }
   ↓
4. ebook-generate-section.tool.ts processa:
   a) Monta prompt com instruções de imagens
      - Pede N descrições no formato: IMAGE_DESCRIPTION: "descrição" (posição: top|middle|bottom|inline)
      - Descrições em INGLÊS para melhor compatibilidade com Replicate
   b) Chama LLM (OpenRouter) para gerar conteúdo + descrições
   ↓
5. SectionImageGenerationService.generateAndIntegrateImages:
   a) Extrai descrições usando regex: /IMAGE_DESCRIPTION: "([^"]+)" \(posição: ([^\)]+)\)/
   b) Para cada descrição:
      - Aprimora prompt com estilo (realistic, artistic, etc.)
      - Chama Replicate (black-forest-labs/flux-pro)
      - Faz download da imagem gerada
      - Upload para MinIO via EbookImageService.uploadAndSaveImage
      - Salva metadados no DB (collection: ebookImages)
   c) Substitui placeholders {{img1}}, {{img2}}, etc. por <img src="URL">
   d) Remove marcadores IMAGE_DESCRIPTION do conteúdo
   e) Atualiza seção com referências de imagens
   ↓
6. Tool retorna resultado com:
   - generatedContent: HTML/Markdown com imagens integradas
   - images: { success, generatedCount, totalRequested, error }
   ↓
7. Worker envia resultado via socket para cliente
   ↓
8. Cliente pode:
   a) Visualizar conteúdo com imagens no preview
   b) Chamar POST /ebook/sections/:sectionId/save-content para salvar permanentemente
```

### Sem geração de imagens (comportamento anterior preservado):
```
Fluxo idêntico, mas sem processamento de imagens
```

## Serviços Modificados/Criados

### Novo: `src/services/section-image-generation.service.ts`
- **Responsabilidades:**
  - Gerar imagens via Replicate baseado em descrições
  - Integrar URLs de imagens no conteúdo
  - Extrair descrições de imagens do conteúdo gerado
  - Aprimorar prompts com estilos
  - Atualizar metadados de seção

- **Métodos principais:**
  - `generateAndIntegrateImages()`: Orquestra todo o processo
  - `extractImageDescriptions()`: Parse de descriptions do conteúdo
  - `cleanImageDescriptions()`: Remove marcadores do conteúdo final

### Modificado: `src/tools/ebook-generate-section.tool.ts`
- Imports novos: `SectionImageGenerationService`
- Prompt estendido com instruções de imagens quando `args.generateImages = true`
- Processamento de imagens após obter conteúdo da LLM
- Retorno estendido: `{ generatedContent, images }`

### Modificado: `src/controllers/api/ebook.controller.ts`
- `generateSection()`: Aceita e valida `generateImages`, `imageCount`, `imageStyle`
- Novo: `saveSectionContent()`: Salva conteúdo final com metadados

### Modificado: `src/routes/apiRoutes.ts`
- Rota CORS para `/ebook/sections/:sectionId/save-content`
- POST handler para salvar conteúdo

## Opções Avançadas Opcionais (Sem Defaults)

Quando `generateImages: true`, o usuário pode opcionalmente especificar:

### `imageAspectRatio` (string)
Proporção de tela das imagens geradas. **Sem default** - se não fornecido, LLM escolhe contextualmente.

Valores permitidos: `'1:1'`, `'4:3'`, `'16:9'`, `'9:16'`, `'3:2'`, `'2:3'`

**Casos de uso:**
- `16:9`: Paisagens, cenários amplos, composições panorâmicas
- `9:16`: Retratos, composições verticais, detalhes focados
- `1:1`: Quadradas, ícones, composições balanceadas

### `imageQuality` (number)
Qualidade/resolução das imagens geradas. **Sem default** - se não fornecido, LLM usa qualidade padrão (80).

Valores permitidos: `60`, `70`, `80`, `90`

- `60`: Rápido, menor detalhe, menor custo
- `70`: Balanceado
- `80`: Padrão, bom balanço qualidade/tempo
- `90`: Alta qualidade, mais tempo, mais custo

### `imagePromptEnhancements` (string[])
Array de detalhes adicionais a incorporar automaticamente em TODAS as descrições de imagem. **Sem default** - se não fornecido, LLM compõe integralmente.

Limitações:
- Máximo 5 elementos no array
- Máximo 100 caracteres cada
- Valores aceitos: strings não vazias

**Exemplos:**
```json
{
  "imagePromptEnhancements": [
    "warm golden hour lighting",
    "shallow depth of field",
    "cinematic color grading"
  ]
}
```

O LLM automaticamente incorporará esses detalhes nas descrições geradas, mantendo a relevância contextual.

## Comportamento Contextual do LLM

Quando o usuário NÃO especifica opções avançadas, o LLM é **inteligente e contextual**:

1. **Aspect Ratio**: Escolhe automaticamente baseado no tipo de imagem
   - Paisagens → `16:9`
   - Retratos/caracteres → `9:16`
   - Objetos/composições balanceadas → `1:1`

2. **Quality**: Ajusta baseado na descrição
   - Cenas complexas → qualidade mais alta
   - Imagens simples → qualidade padrão

3. **Enhancements**: Não adiciona nada artificialmente
   - As descrições refletem naturalmente o conteúdo da seção
   - Sem filtros ou estilos impostos

**Filosofia:** O padrão é deixar o LLM ser criativo e eficiente, opções servem para quando o usuário quer **controlar** aspectos específicos.

## Formatos Suportados

### Estilos de Imagem:
1. **realistic**: Ultra-realistic, high quality, professional photography
2. **artistic**: Painted, illustrative, expressive brushstrokes
3. **abstract**: Geometric shapes, modern, colorful
4. **minimalist**: Clean lines, simple composition, elegant
5. **photographic**: Professional photograph, 4K quality, well-lit

### Posições de Imagem:
- **top**: Inserida no início da seção
- **middle**: Inserida no meio/durante o texto
- **bottom**: Inserida no final da seção
- **inline**: Inserida contextualmente onde aparece a descrição

## Exemplo de Uso (Cliente)

```typescript
// 1. Solicitar geração com imagens
const response = await fetch('/ebook/generate/section', {
  method: 'POST',
  body: JSON.stringify({
    projectId: '507f1f77bcf86cd799439011',
    sectionId: '507f1f77bcf86cd799439012',
    generateImages: true,
    imageCount: 3,
    imageStyle: 'artistic'
  })
});

const { jobId } = await response.json();

// 2. Aguardar resultado via WebSocket
socket.on('results', async (result) => {
  if (result.status === 'completed') {
    const { content, images } = result.result;
    
    // 3. Visualizar preview com imagens integradas
    preview.innerHTML = content; // Contém <img> tags
    
    // 4. Salvar conteúdo no DB
    await fetch(`/ebook/sections/${sectionId}/save-content`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        sectionId,
        content,
        images
      })
    });
  }
});
```

## Tratamento de Erros

- **Se alguma imagem falhar:** Placeholder é substituído por comentário HTML `<!-- Falha ao gerar imagem: {{imgN}} -->`
- **Se todas falharem:** `success: false`, conteúdo sem imagens é retornado
- **Se Replicate cair:** Continua com conteúdo de texto, erro registrado em metadados
- **Timeout em Replicate:** Controlled via config do job (600s)

## Próximos Passos (Futuros)

1. Permitir ajuste de aspect ratio de imagens por seção
2. Cache de prompts de imagem para evitar duplicatas
3. UI para previsualisar imagens antes de salvar
4. Integração com outros provedores de imagem (DALL-E, Stable Diffusion, etc.)
5. Regeneração de imagens individuais após geração
6. Análise de desempenho: qual estilo produz melhores resultados

## Troubleshooting

**P: Imagens não aparecem no conteúdo final?**
- Verifique se o formato das descrições segue exatamente: `IMAGE_DESCRIPTION: "..." (posição: ...)`
- Verifique logs do backend para erros de Replicate

**P: Por que algumas imagens falharam?**
- Replicate pode rejeitar prompts inadequados
- Limite de requisições simultâneas pode ser excedido
- Timeout se o processamento demorar >10 min

**P: Como evitar custos altos?**
- Use `imageCount: 1-2` em produção
- Monitor créditos debitados no response de `saveSectionContent`
- Implemente rate limiting por usuário

