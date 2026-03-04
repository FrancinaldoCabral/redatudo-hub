# Sistema de Preview Unificado - Ebook Generator

## Visão Geral

O sistema de preview foi unificado para usar um único endpoint que atende tanto o **Design Modal** quanto o **Export Modal**, simplificando a arquitetura e eliminando inconsistências.

## Arquitetura

### Endpoint Unificado

**POST** `/api/ebook/projects/:id/preview`

Este endpoint aceita diferentes níveis de configuração:

1. **Preview Simples** (Design Modal): Sem body ou body vazio `{}`
   - Mostra o design aplicado com configurações padrão
   - Usa o design salvo no projeto
   - Resposta rápida para visualização

2. **Preview Configurável** (Export Modal): Body com opções
   - Permite customizar layout, conteúdo e formato
   - Visualização em tempo real das configurações de exportação
   - Aceita opções de margens, padding, fontes, etc.

### Fluxo de Dados

```
┌─────────────────┐
│  Design Modal   │
└────────┬────────┘
         │ POST /preview (body vazio)
         ↓
┌─────────────────────────┐
│   Preview Controller    │
│  generatePreview()      │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐     ┌──────────────────────┐
│ ContentWrapperService   │────→│  Design já salvo     │
│ wrapContent()           │     │  no projeto          │
└─────────────────────────┘     └──────────────────────┘
         │
         ↓
    HTML com design aplicado
```

```
┌─────────────────┐
│  Export Modal   │
└────────┬────────┘
         │ POST /preview (body com opções)
         ↓
┌─────────────────────────┐
│   Preview Controller    │
│  generatePreview()      │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐     ┌──────────────────────┐
│  LivePreviewService     │────→│  Opções temporárias  │
│  generateLivePreview()  │     │  layout + content    │
└─────────────────────────┘     └──────────────────────┘
         │
         ↓
    HTML com design + customizações
```

## Backend

### Estrutura de Arquivos

```
src/
├── controllers/api/
│   └── ebook-design.controller.ts      # Controller unificado
├── services/
│   ├── ebook-content-wrapper.service.ts    # Aplica design ao conteúdo
│   ├── ebook-live-preview.service.ts       # Preview com opções
│   └── ebook-design-personalization.service.ts  # Gera design com LLM
└── routes/
    └── apiRoutes.ts                    # Rota POST /preview
```

### Controller: `EbookDesignController.generatePreview()`

```typescript
static async generatePreview(req: Request, res: Response) {
  const { id: projectId } = req.params;
  const options = req.body || {};

  // Buscar projeto e seções
  const project = await getProject(projectId, userId);
  const sections = await getSections(projectId);

  // Verificar se tem design
  if (!project.design) {
    return res.status(400).json({ 
      error: 'Projeto não possui design' 
    });
  }

  let html: string;

  // Preview Simples (Design Modal)
  if (!options || Object.keys(options).length === 0) {
    html = EbookContentWrapperService.wrapContent(
      sections,
      project.design,
      project.title
    );
  } 
  // Preview Configurável (Export Modal)
  else {
    html = await livePreviewService.generateLivePreview({
      projectId,
      userId,
      project,
      sections,
      options
    });
  }

  // Retornar HTML
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
```

## Frontend

### Estrutura de Arquivos

```
src/app/
├── services/
│   ├── ebook-design.service.ts     # Serviço de design
│   └── ebook-export.service.ts     # Serviço de export
└── components/
    ├── ebook-design-modal/
    │   └── ebook-design-modal.component.ts
    └── ebook-export-modal/
        └── ebook-export-modal.component.ts
```

### Design Service: Método Unificado

```typescript
/**
 * Gera preview HTML do ebook com design aplicado
 * 
 * @param projectId ID do projeto
 * @param options Opções de preview. Se vazio, gera preview simples.
 * @param useCache Usar cache (apenas para preview simples)
 */
generatePreview(
  projectId: string, 
  options?: any, 
  useCache = true
): Observable<string> {
  const url = `${this.API_URL}/api/ebook/projects/${projectId}/preview`;

  return this.http.post(url, options || {}, {
    responseType: 'text',
    observe: 'response',
    headers: this.getHeaders()
  }).pipe(
    map(response => {
      const html = response.body;
      const blob = new Blob([html], { type: 'text/html' });
      return URL.createObjectURL(blob);
    })
  );
}
```

### Uso no Design Modal

```typescript
// ebook-design-modal.component.ts
loadPreview(): void {
  this.previewLoading = true;

  // Preview simples - apenas mostra o design
  this.designService.generatePreview(this.projectId).subscribe({
    next: (url) => {
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.previewLoading = false;
    },
    error: (error) => {
      this.previewError = error.message;
      this.previewLoading = false;
    }
  });
}
```

### Uso no Export Modal

```typescript
// ebook-export-modal.component.ts
async loadPreview(): Promise<void> {
  this.previewLoading = true;

  // Preview com opções de layout e conteúdo
  const options = {
    layout: this.config.layout,
    content: this.config.content,
    format: this.config.format
  };

  this.exportService.getLivePreview(this.projectId, options).subscribe({
    next: (html) => {
      // Criar iframe com HTML
      this.previewHtml = html;
      this.previewLoading = false;
    },
    error: (error) => {
      this.previewError = error.message;
      this.previewLoading = false;
    }
  });
}
```

## Opções de Preview

### Opções de Layout

```typescript
interface LivePreviewOptions {
  layout?: {
    contentPadding?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    margins?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    pageSize?: 'A4' | 'Letter';
    lineHeight?: string;
    fontSize?: string;
  };
}
```

### Opções de Conteúdo

```typescript
interface LivePreviewOptions {
  content?: {
    includeCover?: boolean;
    includeTableOfContents?: boolean;
    includeImages?: boolean;
    maxSections?: number;
  };
}
```

### Opções de Formato

```typescript
interface LivePreviewOptions {
  format?: 'pdf' | 'docx' | 'epub' | 'html';
}
```

## Fluxo de Geração de Design

### 1. Criar Projeto
```
POST /api/ebook/projects
Body: { title, dna: { genre, tone, ... } }
```

### 2. Gerar Design
```
POST /api/ebook/projects/:id/design/generate
Body: { customInstruction?: string }

→ LLM gera identidade visual baseada no DNA
→ Aplica variáveis ao template CSS base
→ Salva design no projeto
```

### 3. Visualizar Preview
```
POST /api/ebook/projects/:id/preview
Body: {} (vazio para preview simples)

→ Busca design salvo
→ Aplica ao conteúdo das seções
→ Retorna HTML renderizado
```

### 4. Exportar com Customizações
```
POST /api/ebook/projects/:id/preview
Body: { layout: {...}, content: {...}, format: 'pdf' }

→ Usa design salvo
→ Aplica customizações temporárias
→ Retorna HTML otimizado para o formato
```

## Benefícios do Sistema Unificado

### 1. **Simplicidade**
- Um único endpoint para todas as necessidades de preview
- Menos código duplicado
- Mais fácil de manter

### 2. **Consistência**
- Mesmo motor de renderização para todos os casos
- Garantia de que preview = exportação
- Design sempre aplicado de forma uniforme

### 3. **Performance**
- Cache inteligente para preview simples
- Preview configurável regenerado sob demanda
- HTML otimizado para cada formato

### 4. **Flexibilidade**
- Aceita qualquer combinação de opções
- Permite testar configurações em tempo real
- Fácil adicionar novas opções no futuro

## Validação e Erros

### Erros Comuns

**400 - Projeto sem design**
```json
{
  "error": "Projeto não possui design",
  "suggestion": "Gere o design primeiro usando POST /api/ebook/projects/:id/design/generate"
}
```

**400 - Projeto sem seções**
```json
{
  "error": "Projeto não possui seções",
  "suggestion": "Adicione seções ao projeto antes de gerar preview"
}
```

**404 - Projeto não encontrado**
```json
{
  "error": "Projeto não encontrado"
}
```

## Migração

### Endpoints Removidos

- ~~GET `/api/ebook/projects/:id/preview`~~ → **Substituído por POST**
- ~~POST `/api/ebook/projects/:id/preview/live`~~ → **Substituído por POST `/preview` com opções**

### Métodos Deprecated (Frontend)

Os métodos antigos foram mantidos temporariamente por compatibilidade:

```typescript
// @deprecated Use generatePreview() instead
getPreview(projectId: string): Observable<string>

// @deprecated Use generatePreview(projectId, options) instead
generateLivePreview(projectId: string, options: any): Observable<string>
```

## Testes

### Testar Preview Simples

```bash
curl -X POST http://localhost:5000/api/ebook/projects/{projectId}/preview \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Testar Preview com Opções

```bash
curl -X POST http://localhost:5000/api/ebook/projects/{projectId}/preview \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "layout": {
      "pageSize": "A4",
      "margins": {
        "top": "2cm",
        "bottom": "2cm",
        "left": "2.5cm",
        "right": "2cm"
      }
    },
    "content": {
      "includeCover": true,
      "includeImages": true
    },
    "format": "pdf"
  }'
```

## Próximos Passos

1. ✅ Unificar endpoint de preview
2. ✅ Atualizar frontend para usar novo endpoint
3. ✅ Adicionar documentação
4. 🔄 Remover endpoints antigos após período de transição
5. 🔄 Adicionar testes automatizados
6. 🔄 Melhorar cache e performance
