# Sistema de Referências de Arquivos do Projeto

## 📋 Visão Geral

Sistema que permite aos usuários fazer upload de arquivos de referência no nível do **projeto** (em vez de por livro individual), permitindo citação destes arquivos usando a sintaxe `@alias` em qualquer prompt de geração (conteúdo, synopsis, design, etc.).

## 🎯 Objetivo

Centralizar arquivos de referência (PDFs, DOCX, imagens, vídeos, áudio) no projeto e permitir que sejam facilmente referenciados em todos os requests de geração através de citações tipo `@nome-do-arquivo`.

## 🏗️ Arquitetura

### Componentes Principais

1. **`ProjectReferenceService`** (`src/services/project-reference.service.ts`)
   - Gerenciamento CRUD de arquivos de referência
   - Parser de citações `@alias` → arquivos
   - Sistema de sugestões inteligentes
   - Tracking de uso (contadores)

2. **`ProjectReferenceController`** (`src/controllers/api/project-reference.controller.ts`)
   - Endpoints REST para gerenciar arquivos
   - Validações e controle de acesso

3. **Helper Function** (em `ebook.controller.ts`)
   - `parseProjectReferences()` - Parseia citações do prompt

## 📡 Endpoints API

### 1. Listar Arquivos de Referência
```
GET /api/ebook/projects/:projectId/reference-files
```
**Resposta:**
```json
{
  "success": true,
  "files": [
    {
      "_id": "...",
      "url": "https://...",
      "type": "pdf",
      "name": "Guia de Estilo.pdf",
      "alias": "guia-estilo",
      "instructions": "Usar este guia para manter tom profissional",
      "uploadedAt": "2024-...",
      "uploadedBy": "userId",
      "size": 102400,
      "usageCount": 5,
      "lastUsedAt": "2024-..."
    }
  ],
  "count": 1,
  "totalSize": 102400
}
```

### 2. Upload de Arquivo de Referência
```
POST /api/ebook/projects/:projectId/reference-files
Content-Type: multipart/form-data

Body:
  - file: [arquivo]
  - alias: "guia-estilo"
  - instructions: "Instruções opcionais"
```
**Resposta:**
```json
{
  "success": true,
  "file": { ... },
  "message": "Arquivo adicionado com sucesso. Cite com @guia-estilo em seus prompts."
}
```

**Validações:**
- Alias obrigatório
- Alias único por projeto
- Tamanho máximo: 50MB
- Tipos aceitos: PDF, DOCX, imagens, vídeo, áudio

### 3. Atualizar Instruções
```
PUT /api/ebook/projects/:projectId/reference-files/:fileId

Body:
{
  "instructions": "Novas instruções"
}
```

### 4. Remover Arquivo
```
DELETE /api/ebook/projects/:projectId/reference-files/:fileId
```

### 5. Obter Sugestões Inteligentes
```
POST /api/ebook/projects/:projectId/reference-suggestions

Body:
{
  "prompt": "Escre um capítulo sobre ansiedade...",
  "sectionType": "chapter",
  "action": "generate"
}
```
**Resposta:**
```json
{
  "success": true,
  "suggestions": [
    {
      "file": { ... },
      "relevanceScore": 85,
      "reason": "Arquivo frequentemente usado, Relacionado a 'estilo'"
    }
  ],
  "count": 3
}
```

## 🔧 Como Funciona

### 1. Upload de Arquivo

```typescript
// Usuário faz upload
POST /api/ebook/projects/123/reference-files
{
  file: guia-estilo.pdf,
  alias: "guia",
  instructions: "Manter tom profissional"
}

// Sistema armazena no MongoDB:
{
  url: "https://minio.../ebook-references/123/guia-estilo.pdf",
  type: "pdf",
  name: "guia-estilo.pdf",
  alias: "guia",
  usageCount: 0
}
```

### 2. Citação em Prompt

```typescript
// Usuário escreve prompt com citação:
"Gere um capítulo sobre ansiedade seguindo o tom de @guia"

// Sistema detecta @guia e resolve:
const files = await parseProjectReferences(projectId, userId, prompt);
// Retorna: [{ url: "...", type: "pdf", name: "guia-estilo.pdf", ... }]

// Passa para geração com arquivos:
await llm.generate({
  prompt: "...",
  referenceFiles: files  // ← Injetado automaticamente
});
```

### 3. Auto-incremento de Uso

Quando um arquivo é citado:
```typescript
// Sistema automaticamente:
file.usageCount++  // 0 → 1 → 2 → ...
file.lastUsedAt = new Date()
```

## 🧠 Sugestões Inteligentes

Sistema analisa contexto e sugere arquivos relevantes baseado em:

### Fatores de Relevância

1. **Uso Frequente** (+30 pontos max)
   - Arquivos mais usados têm prioridade

2. **Palavras-chave** (+20 pontos)
   - Match entre prompt e nome/instruções do arquivo

3. **Tipo de Seção** (+15-25 pontos)
   - PDFs para capítulos densos
   - Imagens para capas/design

4. **Tipo de Ação** (+20-25 pontos)
   - Imagens para ações de design
   - Guias de estilo para ações de tom

5. **Uso Recente** (+10 pontos)
   - Arquivos usados nos últimos 7 dias

### Exemplo de Sugestão

```typescript
// Contexto:
{
  prompt: "Gere capa com estilo minimalista",
  sectionType: "cover",
  action: "design"
}

// Sugestões retornadas:
[
  {
    file: "referencia-capa.png",
    relevanceScore: 70,  // 25 (tipo de seção) + 20 (tipo de ação) + 25 (match keyword)
    reason: "Imagem de referência para design de capa, Imagem útil para geração de design, Relacionado a 'estilo'"
  }
]
```

## 📊 Schema MongoDB

### Collection: `ebookProjects`

Adicionado ao schema existente:

```typescript
{
  // ... campos existentes
  
  referenceFiles: [
    {
      _id: ObjectId,
      url: string,
      type: 'pdf' | 'docx' | 'image' | 'video' | 'audio',
      name: string,
      alias: string,  // Para citação @alias
      instructions: string,
      uploadedAt: Date,
      uploadedBy: string,  // userId
      size: number,
      usageCount: number,
      lastUsedAt: Date
    }
  ],
  
  referenceFilesMetadata: {
    uploadedAt: Date,
    totalSize: number,
    count: number
  }
}
```

## 🔌 Integração com Geração

### Endpoints que Suportam Referências

Todos os endpoints de geração podem usar referências:

- ✅ `generateSection` - Geração de conteúdo
- ✅ `generateSynopsis` - Synopsis individual  
- ✅ `generateAllSynopses` - Planejamento narrativo
- ✅ `generateCover` - Design de capa
- ✅ `generateImage` - Imagens
- ✅ Design generation (em `ebook-design` endpoints)

### Como Integrar (Exemplo)

```typescript
// No endpoint de geração:
export const generateSection = async (req: Request, res: Response) => {
  const { projectId, customPrompt } = req.body;
  
  // 1. Parsear referências do prompt
  const referenceFiles = await parseProjectReferences(
    projectId,
    userId,
    customPrompt
  );
  
  // 2. Passar para o tool/LLM
  await addJob({
    form: {
      projectId,
      sectionId,
      referenceFiles  // ← Arquivos citados
    }
  });
};
```

## 🎨 Casos de Uso

### 1. Guia de Estilo

```bash
# Upload
POST /projects/123/reference-files
  file: guia-tcc.pdf
  alias: "guia-tcc"
  instructions: "Guia oficial do TCC da universidade"

# Uso
Prompt: "Gere introdução seguindo @guia-tcc"
```

### 2. Referência Visual

```bash
# Upload
POST /projects/123/reference-files
  file: capa-inspiracao.png
  alias: "ref-visual"
  instructions: "Usar paleta de cores desta imagem"

# Uso
Prompt: "Gere capa baseada em @ref-visual"
```

### 3. Pesquisa Acadêmica

```bash
# Upload múltiplos PDFs
POST /projects/123/reference-files
  file: artigo-harvard.pdf, alias: "harvard"
  
POST /projects/123/reference-files
  file: tese-phd.pdf, alias: "tese"

# Uso em capítulo
Prompt: "Gere capítulo sobre IA citando @harvard e @tese"
```

## ⚡ Performance

### Otimizações

1. **Normalização de Alias**
   - Lowercase automático
   - Remoção de espaços
   - Caracteres especiais → hífen

2. **Validação Preventiva**
   - Alias único ANTES do upload
   - Evita duplicação de dados

3. **Tracking Eficiente**
   - Incremento assíncrono de contadores
   - Não bloqueia geração

## 🔒 Segurança

### Controles de Acesso

- ✅ Verificação de `userId` em todos endpoints
- ✅ Usuário só acessa arquivos de seus próprios projetos
- ✅ Validação de tamanho (50MB max)
- ✅ Storage isolado por projeto (`ebook-references/{projectId}/`)

### Validações

```typescript
// Alias único
if (existingFiles.some(f => f.alias === newAlias)) {
  throw new Error('Alias já em uso');
}

// Tamanho
if (file.size > 50MB) {
  throw new Error('File too large');
}

// Acesso ao projeto
const projects = await db.get('ebookProjects', {
  _id: projectId,
  userId: userId  // ← Garante acesso
});
```

## 📈 Métricas e Analytics

### Dados Coletados

- `usageCount` - Quantas vezes arquivo foi citado
- `lastUsedAt` - Última vez que foi citado
- `size` - Tamanho do arquivo
- `uploadedAt` - Data de upload

### Uso nas Sugestões

Arquivos com maior `usageCount` recebem maior pontuação nas sugestões inteligentes.

## 🚀 Benefícios

### Para o Usuário

1. ✅ Upload uma vez, usa em todo projeto
2. ✅ Citação intuitiva com `@nome`
3. ✅ Não precisa reenviar arquivos repetidamente
4. ✅ Sugestões inteligentes baseadas em contexto

### Para o Sistema

1. ✅ Dados organizados logicamente
2. ✅ Reutilização eficiente
3. ✅ Tracking de uso
4. ✅ Redução de duplicação

## 🔄 Compatibilidade

### Retrocompatível

- Arquivos inline ainda funcionam (se enviados no body)
- Arquivos do projeto servem como padrão
- Pode combinar ambos:

```typescript
const finalFiles = [
  ...projectReferenceFiles,  // Do projeto
  ...inlineFiles             // Do request
];
```

## 📝 Exemplo Completo

```typescript
// 1. Criar projeto
POST /api/ebook/projects
{ dna: {...}, structure: {...} }
→ projectId: "abc123"

// 2. Upload referências
POST /api/ebook/projects/abc123/reference-files
  file: guia-estilo.pdf, alias: "guia"
  
POST /api/ebook/projects/abc123/reference-files
  file: pesquisa.pdf, alias: "pesquisa"

// 3. Gerar conteúdo citando referências
POST /api/ebook/generate/section
{
  projectId: "abc123",
  sectionId: "xyz",
  customPrompt: "Gere capítulo sobre IA seguindo @guia e usando dados de @pesquisa"
}

// Sistema automaticamente:
// - Detecta @guia e @pesquisa
// - Resolve para arquivos
// - Injeta no LLM
// - Incrementa usageCount de ambos
```

## 🎯 Conclusão

Sistema completo e funcional que:
- ✅ Centraliza referências no projeto
- ✅ Suporta citações via `@alias`
- ✅ Fornece sugestões inteligentes
- ✅ Tracked uso para analytics
- ✅ Retrocompatível com sistema anterior
- ✅ Integrado em todos endpoints de geração

---

**Documentação gerada em:** 26/11/2025  
**Versão:** 1.0.0
