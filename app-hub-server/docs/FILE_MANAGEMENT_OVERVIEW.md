# Sistema de Gerenciamento de Arquivos - E-book Generator

## 📚 Visão Geral

O E-book Generator oferece **dois sistemas complementares** para gerenciamento de arquivos de referência:

1. **Project Reference Files** - Arquivos permanentes do projeto com citação via @alias
2. **Temporary File Uploads** - Uploads temporários para uso pontual

## 🆚 Comparação Rápida

| Característica | Project Reference Files | Temporary Files |
|----------------|-------------------------|-----------------|
| **Duração** | Permanente | 1 hora |
| **Citação** | `@alias` | ID do arquivo |
| **Escopo** | Projeto inteiro | Sessão/Job específico |
| **Storage** | MongoDB + MinIO | Memória + MinIO |
| **Ideal para** | Reutilização, guias de estilo | Upload pontual, testes |
| **Gerenciamento** | Manual (CRUD completo) | Automático (auto-cleanup) |
| **Sugestões IA** | ✅ Sistema inteligente | ❌ Não aplicável |
| **Tracking** | ✅ usageCount, lastUsed | ❌ Efêmero |

## 🎯 Quando Usar Cada Sistema

### Use Project Reference Files quando:

- ✅ O arquivo será usado em **múltiplas gerações**
- ✅ É um **guia de estilo** ou template permanente
- ✅ Quer **organização de longo prazo**
- ✅ Precisa de **citação intuitiva** via `@alias`
- ✅ Quer **sugestões inteligentes** baseadas em contexto
- ✅ Precisa de **tracking de uso**

**Exemplos:**
- Guia de estilo TCC da universidade
- Template de design de capas
- Pesquisa acadêmica reutilizada em vários capítulos
- Paleta de cores do projeto

### Use Temporary Files quando:

- ✅ O arquivo será usado **uma única vez**
- ✅ É uma **referência pontual** ou experimental
- ✅ Não quer **poluir** os arquivos permanentes do projeto
- ✅ Precisa de **upload rápido** sem configurar alias
- ✅ Quer **cleanup automático**

**Exemplos:**
- Documento de referência para um capítulo específico
- Teste rápido de uma imagem
- Upload experimental para ver resultado
- Anexo pontual que não será reutilizado

## 📡 APIs Disponíveis

### Project Reference Files

```http
# Listar arquivos do projeto
GET /api/ebook/projects/:projectId/reference-files

# Upload de arquivo permanente
POST /api/ebook/projects/:projectId/reference-files
  Body: { file, alias, instructions }

# Atualizar instruções
PUT /api/ebook/projects/:projectId/reference-files/:fileId
  Body: { instructions }

# Remover arquivo
DELETE /api/ebook/projects/:projectId/reference-files/:fileId

# Obter sugestões inteligentes
POST /api/ebook/projects/:projectId/reference-suggestions
  Body: { prompt, sectionType, action }
```

### Temporary Files

```http
# Upload temporário (single)
POST /api/ebook/temp-files
  Body: { file }

# Upload temporário (batch, até 10 arquivos)
POST /api/ebook/temp-files/batch
  Body: { files }

# Buscar arquivo temporário
GET /api/ebook/temp-files/:fileId

# Remover arquivo temporário
DELETE /api/ebook/temp-files/:fileId
```

## 🔧 Fluxos de Uso

### Fluxo 1: Upload Permanente com Alias

```javascript
// 1. Upload com alias
const { file } = await uploadProjectReferenceFile(
  projectId,
  pdfFile,
  'guia-tcc',
  'Guia oficial de TCC da universidade'
);

// 2. Usar em múltiplas gerações
await generateSection({
  prompt: 'Gere introdução seguindo @guia-tcc'
});

await generateSection({
  prompt: 'Gere capítulo 1 seguindo @guia-tcc'
});

// Arquivo persiste no projeto indefinidamente
```

### Fluxo 2: Upload Temporário Pontual

```javascript
// 1. Upload temporário
const { file } = await uploadTempFile(pdfFile);

// 2. Usar uma vez
await generateSection({
  tempFileIds: [file.id],
  prompt: 'Gere capítulo baseado no documento anexado'
});

// Arquivo expira automaticamente em 1 hora
```

### Fluxo 3: Combinação de Ambos

```javascript
// Usar arquivos permanentes do projeto + uploads temporários
await generateSection({
  prompt: 'Gere capítulo seguindo @guia-tcc e use também o documento anexado',
  tempFileIds: [tempFileId]  // Arquivo temporário
});

// Sistema resolve:
// - @guia-tcc → Arquivo permanente do projeto
// - tempFileId → Arquivo temporário
// - Combina ambos e passa para LLM
```

## 🎨 Casos de Uso Reais

### Caso 1: TCC Acadêmico

**Arquivos Permanentes:**
- `@guia-tcc` - Guia de TCC da universidade
- `@normas-abnt` - Manual de normas ABNT
- `@template-capa` - Template de design de capa

**Arquivos Temporários:**
- Artigo científico citado em capítulo específico
- Gráfico gerado para ilustrar análise de dados
- Rascunho de seção experimental

### Caso 2: E-book Profissional

**Arquivos Permanentes:**
- `@identidade-visual` - Guia de identidade visual da marca
- `@tom-voz` - Guia de tom de voz e linguagem
- `@referencias-design` - Paleta de cores e tipografia

**Arquivos Temporários:**
- Screenshot para explicar conceito em capítulo
- Documento externo citado uma única vez
- Imagem de teste para verificar geração

## 📊 Métricas e Insights

### Project Reference Files

O sistema rastreia:
- **usageCount** - Quantas vezes cada arquivo foi citado
- **lastUsedAt** - Última utilização
- **Sugestões Inteligentes** - IA sugere arquivos relevantes

**Exemplo de insights:**
```json
{
  "file": "@guia-estilo",
  "usageCount": 15,
  "lastUsedAt": "2024-11-27",
  "relevanceScore": 85,
  "reason": "Arquivo frequentemente usado, Relacionado a 'estilo'"
}
```

### Temporary Files

Não há tracking (arquivos efêmeros), mas você pode monitorar:
- Total de uploads temporários
- Taxa de expiração vs uso
- Padrões de uso

## 🔒 Segurança e Limites

### Ambos os Sistemas:

- ✅ **Autenticação:** Obrigatória
- ✅ **Ownership:** Verificado (userId)
- ✅ **Isolamento:** Storage separado por usuário
- ✅ **Tamanho máximo:** 50MB por arquivo
- ✅ **Tipos aceitos:** PDF, DOCX, imagens, vídeo, áudio

### Específicos:

**Project Reference Files:**
- Alias único por projeto
- Sem limite de quantidade (sujeito a quotas futuras)
- Remoção manual

**Temporary Files:**
- TTL fixo de 1 hora
- Batch upload: máximo 10 arquivos simultâneos
- Cleanup automático a cada 15 minutos

## 🚀 Roadmap Futuro

### Project Reference Files

- [ ] Versioning de arquivos
- [ ] Compartilhamento entre projetos
- [ ] Tags e categorização
- [ ] Busca full-text em PDFs

### Temporary Files

- [ ] Migração para Redis (persistência entre restarts)
- [ ] TTL customizável (15min, 1h, 24h)
- [ ] Conversão para arquivo permanente
- [ ] Preview de arquivos temporários

## 📚 Documentação Detalhada

- [Project Reference Files System](./PROJECT_REFERENCE_FILES_SYSTEM.md)
- [Temporary File Upload System](./TEMP_FILE_UPLOAD_SYSTEM.md)

## 🎯 Conclusão

Ambos os sistemas são **complementares**, não concorrentes:

- **Project Reference Files** = Organização de longo prazo, reutilização, gestão inteligente
- **Temporary Files** = Rapidez, simplicidade, uso pontual

Use o sistema apropriado para cada necessidade e combine ambos quando fizer sentido!

---

**Última atualização:** 27/11/2024  
**Versão:** 1.0.0
