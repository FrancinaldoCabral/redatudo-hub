# Atualizações: Opções Avançadas para Geração de Imagens

## O que mudou?

Agora o endpoint `/ebook/generate/section` aceita **3 opções avançadas OPCIONAIS** para controlar a geração de imagens:

```typescript
POST /ebook/generate/section
{
  // Campos obrigatórios
  "projectId": "string",
  "sectionId": "string",
  
  // Opções básicas (com defaults)
  "generateImages": boolean,              // padrão: false
  "imageCount": number,                  // padrão: 2
  "imageStyle": string,                  // padrão: 'realistic'
  
  // ← NOVAS: Opções avançadas (SEM defaults)
  "imageAspectRatio": string,            // OPCIONAL: '1:1'|'4:3'|'16:9'|'9:16'|'3:2'|'2:3'
  "imageQuality": number,                // OPCIONAL: 60|70|80|90
  "imagePromptEnhancements": string[]    // OPCIONAL: max 5 elementos, 100 chars cada
}
```

## Como Funciona?

### Comportamento Padrão (Sem Opções Avançadas)
```json
{
  "projectId": "...",
  "sectionId": "...",
  "generateImages": true
  // Nenhuma opção avançada fornecida
}
```
→ **LLM é inteligente**: Escolhe automaticamente aspect ratio, quality e enhancements baseado no conteúdo

### Com Opções Customizadas
```json
{
  "projectId": "...",
  "sectionId": "...",
  "generateImages": true,
  "imageAspectRatio": "16:9",
  "imageQuality": 90,
  "imagePromptEnhancements": ["warm sunset lighting", "cinematic"]
}
```
→ **Controlado**: LLM respeita as preferências do usuário

### Parcialmente Customizado
```json
{
  "projectId": "...",
  "sectionId": "...",
  "generateImages": true,
  "imageQuality": 70
  // imageAspectRatio e imagePromptEnhancements omitidos
}
```
→ **Híbrido**: Usa qualidade 70, mas escolhe aspect ratio e enhancements contextualmente

## Opções Avançadas Explicadas

### `imageAspectRatio`
Controla a proporção de tela (width:height) das imagens geradas.

| Valor | Caso de Uso | Exemplo |
|-------|-------------|---------|
| `1:1` | Quadradas, composições balanceadas | Ícones, avatares, produtos |
| `4:3` | Padrão, um pouco mais largo | Fotos tradicionais |
| `16:9` | Panorâmicas, cenários amplos | Paisagens, backgrounds |
| `9:16` | Retratos, composições verticais | Pessoas, detalhes focados |
| `3:2` | Fotos clássicas | Fotografias tradicionais |
| `2:3` | Composições altas | Elementos verticais |

**Sem defaults**: Se não fornecido, LLM escolhe o que faz sentido para a imagem.

### `imageQuality`
Controla resolução, detalhe e tempo de geração.

| Valor | Velocidade | Qualidade | Custo | Quando Usar |
|-------|-----------|-----------|-------|------------|
| `60` | ⚡ Rápido | Baixa | 💰 Barato | Prototipos, testes |
| `70` | ⚡ Rápido | Média | 💰 Barato | Produção padrão |
| `80` | ⏱️ Médio | Boa | 💰💰 Normal | Padrão, recomendado |
| `90` | 🐢 Lento | Excelente | 💰💰💰 Alto | Premium, detalhe máximo |

**Sem defaults**: Se não fornecido, LLM usa qualidade contextual (baseado na descrição).

### `imagePromptEnhancements`
Array de detalhes que são **automaticamente incorporados** em TODAS as descrições de imagem geradas.

```json
{
  "imagePromptEnhancements": [
    "warm golden hour lighting",
    "shallow depth of field bokeh",
    "cinematic color grading with teal and orange"
  ]
}
```

Quando fornecido:
1. O LLM vê essas opções
2. Incorpora naturalmente nas descrições de imagens
3. O Replicate gera imagens com esses características

**Limitações:**
- Máximo 5 elementos no array
- Máximo 100 caracteres cada
- Deve ser relevante ao contexto (senão LLM ignora)

**Sem defaults**: Se não fornecido, descrições são 100% geradas pelo LLM

## Validação & Segurança

Todas as opções avançadas são **validadas rigorosamente** no backend:

```typescript
// imageAspectRatio
const validAspectRatios = ['1:1', '4:3', '16:9', '9:16', '3:2', '2:3'];
if (imageAspectRatio && !validAspectRatios.includes(imageAspectRatio)) {
  // Ignorado silenciosamente - LLM usa contextual
}

// imageQuality
const validQualityLevels = [60, 70, 80, 90];
if (imageQuality && !validQualityLevels.includes(imageQuality)) {
  // Ignorado - LLM usa contextual
}

// imagePromptEnhancements
if (Array.isArray(imagePromptEnhancements)) {
  const filtered = imagePromptEnhancements
    .filter(e => typeof e === 'string' && e.length > 0 && e.length <= 100);
  // Apenas elementos válidos são usados
}
```

**Princípio**: Valores inválidos são **silenciosamente ignorados**, LLM nunca falha por entrada ruim.

## Casos de Uso Recomendados

### Caso 1: Deixar LLM Decidir (Recomendado)
```json
{
  "projectId": "...",
  "sectionId": "...",
  "generateImages": true,
  "imageCount": 3
}
```
✅ Simples  
✅ LLM é inteligente  
✅ Melhor custo/benefício  
✅ Contextualmente relevante

### Caso 2: Estilo Visual Consistente
```json
{
  "generateImages": true,
  "imageCount": 3,
  "imageAspectRatio": "16:9",
  "imagePromptEnhancements": [
    "warm sunset lighting",
    "cinematic composition"
  ]
}
```
✅ Imagens com visual coeso  
✅ Tema visual consistente  
✅ Para capítulos/seções relacionadas

### Caso 3: Alta Qualidade para Premium
```json
{
  "generateImages": true,
  "imageCount": 2,
  "imageQuality": 90,
  "imagePromptEnhancements": [
    "ultra detailed",
    "professional grade"
  ]
}
```
✅ Máxima qualidade  
⚠️ Mais tempo de processamento  
⚠️ Custo mais alto

### Caso 4: Rápido & Econômico
```json
{
  "generateImages": true,
  "imageCount": 2,
  "imageQuality": 60
}
```
✅ Processamento rápido  
✅ Custo baixo  
⚠️ Qualidade reduzida

## Resposta do Endpoint

Agora inclui as opções que foram realmente usadas:

```json
{
  "jobId": "uuid",
  "status": "pending",
  "message": "...",
  "options": {
    "generateImages": true,
    "imageCount": 3,
    "imageStyle": "artistic",
    "imageAspectRatio": "16:9",      // Se foi fornecido
    "imageQuality": 90,               // Se foi fornecido
    "imagePromptEnhancements": [...]  // Se foi fornecido
  }
}
```

## No Frontend

### UI/UX Sugerida

```
┌─────────────────────────────────────┐
│ Gerar Seção com Imagens            │
├─────────────────────────────────────┤
│                                     │
│ ☑ Gerar imagens junto com texto    │
│                                     │
│ Quantidade: [2 ▼]                  │
│ Estilo: [Realista ▼]               │
│                                     │
│ ─── OPÇÕES AVANÇADAS (opcionais) ──│
│                                     │
│ Proporção de tela: [-- Automática --▼] │
│ Qualidade: [-- Automática --▼]     │
│ Detalhes adicionais: [        ]    │
│   (ex: warm sunset, shallow DOF)   │
│                                     │
│ [Gerar]  [Cancelar]                │
└─────────────────────────────────────┘
```

### Exemplo de Código

```typescript
async function generateSectionWithImages(options: {
  projectId: string;
  sectionId: string;
  generateImages: boolean;
  imageCount?: number;
  imageStyle?: string;
  // Opcionais avançadas
  imageAspectRatio?: string;
  imageQuality?: number;
  imagePromptEnhancements?: string[];
}) {
  const response = await fetch('/ebook/generate/section', {
    method: 'POST',
    body: JSON.stringify(options)
  });
  
  return response.json();
}

// Uso simples
await generateSectionWithImages({
  projectId: '...',
  sectionId: '...',
  generateImages: true
});

// Com opções avançadas
await generateSectionWithImages({
  projectId: '...',
  sectionId: '...',
  generateImages: true,
  imageCount: 3,
  imageStyle: 'artistic',
  imageAspectRatio: '16:9',
  imageQuality: 80,
  imagePromptEnhancements: ['warm lighting', 'cinematic']
});
```

## Resumo das Mudanças

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Opções de imagem | 3 (generateImages, imageCount, imageStyle) | 6 (+ 3 avançadas opcionais) |
| Controle do LLM | Menor | Maior (mas optativo) |
| Defaults | Todos parâmetros tinham defaults | Opções avançadas SEM defaults |
| Retrocompatibilidade | - | ✅ 100% compatível |
| Comportamento se omitir opções | - | LLM decide contextualmente |

