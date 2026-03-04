# 🎨 Sistema de Exportação com Design Gerado por LLM

## 📋 Visão Geral

Sistema avançado de exportação de ebooks que utiliza **LLM para gerar designs CSS personalizados** baseados no conteúdo real do livro. 

### Abordagem: HTML/CSS First

1. **LLM analisa amostras reais** do conteúdo HTML
2. **Gera CSS completo** e universal
3. **HTML é montado** com design aplicado
4. **Conversão** para PDF, EPUB, DOCX ou HTML

**Vantagem**: Zero templates estáticos, design 100% adaptado ao conteúdo e gênero.

---

## 🏗️ Arquitetura

### Fluxo de Processamento

```
1. Content Sampler → 2. Design Generator → 3. Content Wrapper → 4. Format Converter
     (amostras)         (LLM cria CSS)       (monta HTML)        (PDF/EPUB/etc)
```

### Componentes

| Serviço | Responsabilidade |
|---------|------------------|
| `EbookContentSamplerService` | Extrai amostras estratégicas do HTML |
| `EbookDesignGeneratorService` | Chama LLM para gerar CSS |
| `EbookContentWrapperService` | Monta HTML final com design |
| `EbookFormatConverterService` | Converte HTML para formatos finais |

---

## 📊 Processo Detalhado

### Fase 1: Amostragem de Conteúdo

**Objetivo**: Coletar amostras representativas do HTML real.

```typescript
const contentSample = EbookContentSamplerService.extractSamples(sections);
```

**O que é extraído:**
- Primeira seção de cada tipo (chapter, introduction, etc)
- Seções do meio e fim do livro
- ~3000 caracteres por amostra

**Por que amostras e não tags mapeadas?**
- ✅ LLM vê o HTML REAL, não abstração
- ✅ Nenhum risco de deixar tags de fora
- ✅ LLM entende contexto e estrutura

### Fase 2: Geração de Design

**Objetivo**: LLM cria CSS completo baseado nas amostras.

```typescript
const designConcept = await EbookDesignGeneratorService.generateDesign(
  project,
  contentSample,
  userId
);
```

**Prompt enviado ao LLM:**
- DNA do projeto (gênero, público-alvo, mood)
- Amostras HTML reais
- Requisitos de design (print-ready, responsivo, etc)
- Diretrizes específicas do gênero

**LLM retorna:**
```json
{
  "globalCSS": "/* CSS completo para todas as tags HTML5 */",
  "containerStructure": "<div class=\"book\">...</div>",
  "wrapperClasses": { "book": "book", "chapter": "chapter" },
  "fonts": { "primary": "Georgia", "headings": "Palatino" },
  "needsBackgroundImage": false,
  "designNotes": "Design elegante para romance..."
}
```

**Modelo LLM usado**: `google/gemini-2.5-flash` (custo: ~2 créditos)

### Fase 3: Montagem do HTML

**Objetivo**: Aplicar CSS ao conteúdo real.

```typescript
let html = EbookContentWrapperService.wrapContent(
  sections,
  designConcept,
  project.title
);
```

**Estrutura gerada:**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>{{ título }}</title>
  <style>
    /* CSS gerado pelo LLM */
  </style>
</head>
<body>
  <div class="book">
    <div class="chapter">
      <div class="content">
        <!-- Conteúdo real das seções -->
      </div>
    </div>
    <!-- ... mais capítulos -->
  </div>
</body>
</html>
```

**Metadata adicionada:**
- Autor, descrição, keywords
- Idioma do documento
- Otimizações para impressão (se PDF)

### Fase 4: Conversão de Formato

**Objetivo**: Transformar HTML em formato final.

```typescript
const result = await EbookFormatConverterService.convert(
  format,    // 'pdf', 'epub', 'docx', 'html'
  html,
  project,
  sections
);
```

**Tecnologias:**
- **PDF**: Puppeteer (renderiza HTML em navegador headless)
- **EPUB**: epub-gen (empacota HTML em formato EPUB)
- **DOCX**: html-docx-js (converte HTML para Word)
- **HTML**: Direto (apenas salva HTML)

---

## 💰 Custo em Créditos

### Fórmula de Cálculo

```
Total = Base + Design + Conteúdo + Imagens

Base:
- Markdown: 1 crédito (sem design)
- HTML: 2 créditos
- DOCX: 2 créditos
- EPUB: 3 créditos
- PDF: 5 créditos

Design: 2 créditos (LLM Gemini 2.5 Flash)
Conteúdo: 0.5 crédito por 1000 palavras
Imagens: 0.2 crédito por imagem

Mínimo: 1 crédito
```

### Exemplos

**Ebook de 50.000 palavras, 10 imagens, formato PDF:**
```
Base: 5
Design: 2
Conteúdo: (50000/1000) * 0.5 = 25
Imagens: 10 * 0.2 = 2
TOTAL: 34 créditos
```

**Ebook de 10.000 palavras, sem imagens, formato Markdown:**
```
Base: 1
Design: 0 (markdown não usa design)
Conteúdo: (10000/1000) * 0.5 = 5
Imagens: 0
TOTAL: 6 créditos
```

---

## 🎨 Design por Gênero

O LLM adapta o design automaticamente baseado no gênero:

| Gênero | Características do Design |
|--------|---------------------------|
| **Romance** | Tipografia elegante serifada, drop caps ornamentados, cores suaves |
| **Ficção Científica** | Tipografia moderna, sans-serif, cores tecnológicas (azul/cinza) |
| **Fantasia** | Tipografia medieval, bordas decorativas, cores místicas |
| **Técnico/Acadêmico** | Tipografia limpa, hierarquia clara, destaque para código/tabelas |
| **Infantil** | Fonte maior, cores vibrantes, espaçamento amplo |
| **Terror** | Tipografia gótica, cores escuras, atmosfera tensa |
| **Poesia** | Centralização de versos, minimalista, artístico |

### Fallback

Se o LLM falhar, o sistema usa **CSS pré-definido** por gênero (sem chamada adicional).

---

## 🔧 Vantagens do Sistema

### 1. Sem Templates Estáticos
- LLM cria design único para cada livro
- Adaptação perfeita ao gênero e tom

### 2. Zero Risco de Tags Não Mapeadas
- LLM vê HTML real, não abstração
- CSS genérico cobre qualquer tag HTML5

### 3. Eficiência de Custos
- Apenas 1 chamada LLM (design)
- Sem loop de injeção de conteúdo
- Modelo econômico (Gemini Flash)

### 4. Flexibilidade Total
- LLM pode criar qualquer regra CSS
- Drop caps, numeração especial, etc
- Inovação ilimitada no design

### 5. Performance
- Amostragem rápida (sem LLM)
- Wrapper simples (sem LLM)
- Conversão nativa (Puppeteer, etc)

---

## 📝 Formatos Suportados

| Formato | Extensão | Design | Tecnologia | Status |
|---------|----------|--------|------------|--------|
| Markdown | `.md` | ❌ | Template nativo | ✅ Completo |
| HTML | `.html` | ✅ | LLM + Wrapper | ✅ Completo |
| PDF | `.pdf` | ✅ | Puppeteer | ✅ Completo |
| EPUB | `.epub` | ✅ | epub-gen | ✅ Completo |
| DOCX | `.docx` | ✅ | html-docx-js | ✅ Completo |

---

## 🚀 Como Usar

### Backend (já implementado)

```typescript
// Iniciar exportação
const { jobId, estimatedCredits } = await ebookExportService.exportEbook(
  projectId,
  userId,
  'pdf',    // formato
  {
    includeImages: true,
    includeToc: true,
    language: 'pt-BR'
  }
);

// Estimativa de custo
const estimate = await ebookExportService.estimateExportCost(
  projectId,
  userId,
  'pdf'
);

console.log(`Custo estimado: ${estimate.totalCredits} créditos`);
console.log(`Design: ${estimate.designCost} créditos`);
```

### API (existente)

```http
POST /api/ebook/projects/:id/export
Content-Type: application/json

{
  "format": "pdf",
  "options": {
    "includeImages": true,
    "includeToc": true,
    "language": "pt-BR"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "jobId": "12345",
  "estimatedCredits": 34,
  "format": "pdf",
  "status": "pending"
}
```

---

## 🔍 Validação e Qualidade

### HTML Validation

```typescript
const validation = EbookContentWrapperService.validateHTML(html);

if (!validation.valid) {
  console.error('Erros:', validation.errors);
}
```

**Verificações:**
- DOCTYPE presente
- Tags básicas (html, head, body)
- Tags balanceadas
- Tamanho mínimo de conteúdo

### CSS Safety

- LLM instruído a usar apenas web-safe fonts ou CDN
- Sem paths relativos
- Print-ready CSS
- Responsivo

---

## ⚡ Performance

### Benchmarks Esperados

| Livro | Tamanho | Formato | Tempo Estimado |
|-------|---------|---------|----------------|
| Pequeno | 10k palavras | PDF | ~15-20s |
| Médio | 50k palavras | PDF | ~30-45s |
| Grande | 100k palavras | PDF | ~60-90s |

**Gargalos:**
1. Geração de design (LLM): 5-10s
2. Puppeteer renderização (PDF): 10-30s
3. Upload do arquivo: 2-5s

### Otimizações Implementadas

- ✅ Amostras truncadas (não conteúdo completo ao LLM)
- ✅ Puppeteer headless otimizado
- ✅ Compressão de HTML antes conversão
- ✅ Pool de conexões

---

## 🐛 Troubleshooting

### LLM não retorna JSON válido

**Solução**: Fallback automático para CSS pré-definido por gênero.

### Puppeteer timeout

**Solução**: Aumentar timeout ou dividir documento em partes.

### EPUB/DOCX corrompido

**Solução**: Validar HTML antes de conversão, corrigir tags não fechadas.

### Custo muito alto

**Solução**: 
- Usar Markdown (sem design)
- Reduzir número de seções
- Otimizar conteúdo (remover duplicações)

---

## 🔮 Roadmap Futuro

### Curto Prazo
- [ ] Cache de designs por gênero (reutilizar)
- [ ] Preview antes de exportar
- [ ] Geração de imagem de fundo via LLM

### Médio Prazo
- [ ] Editor de CSS na UI
- [ ] Templates customizáveis pelo usuário
- [ ] Exportação em lote

### Longo Prazo
- [ ] IA para otimização de layout
- [ ] Análise de legibilidade
- [ ] Recomendações de melhorias

---

## 📦 Dependências Instaladas

```json
{
  "puppeteer": "^21.0.0",      // HTML → PDF
  "html-docx-js": "^0.3.2",    // HTML → DOCX
  "epub-gen": "^0.1.0"         // HTML → EPUB
}
```

---

## 📞 Suporte

**Erros comuns:**
1. Verificar logs do worker
2. Verificar status do Redis (BullMQ)
3. Verificar se Puppeteer está instalado corretamente
4. Consultar esta documentação

**Performance issues:**
1. Monitorar uso de memória (Puppeteer)
2. Verificar timeout de jobs
3. Analisar tamanho do conteúdo

---

**Última Atualização**: 17/11/2025  
**Versão**: 3.0 (Design com LLM)  
**Autor**: Sistema de Exportação Avançada
