# Sistema Profissional KDP (Amazon Kindle Direct Publishing)

## 📋 Resumo

Sistema completo para geração de PDFs compatíveis com **Amazon KDP**, resolvendo definitivamente os problemas de:
- ✅ Margens inconsistentes entre páginas
- ✅ Conteúdo cortado nas bordas
- ✅ Página em branco após a capa
- ✅ Dimensões inadequadas para publicação

## 🎯 Problema Resolvido

### Sintomas Anteriores
1. **Página em branco** após a capa (causada por mesclagem incorreta)
2. **Folha de rosto** (página 3) com margem superior/inferior muito pequena
3. **Capítulos** (página 4+) com margem lateral maior à esquerda
4. **Conteúdo cortado** à direita e na parte inferior
5. **Margens inconsistentes** entre diferentes tipos de seções

### Causa Raiz Identificada
- CSS do template com regras `@page` conflitantes
- Uso de `max-width: 100%` causando corte de conteúdo
- Margens simétricas (não adequadas para livros encadernados)
- Dimensões hardcoded incompatíveis com padrões KDP

## 🏗️ Arquitetura da Solução

### 1. **Mapeamento de Formatos KDP** (`kdp-trim-sizes.ts`)
- **30+ formatos** oficiais da Amazon KDP
- Formatos US (6x9, 5.5x8.5, 8.5x11, etc.)
- Formatos Japão (kdp.amazon.co.jp)
- Capa dura (hardcover) e quadrados

```typescript
// Exemplo de uso
import { KDP_TRIM_SIZES } from '../constants/kdp-trim-sizes';

const formato = KDP_TRIM_SIZES['6x9']; // Mais popular
// {
//   name: '6" × 9" (15,24 × 22,86 cm) ⭐ MAIS POPULAR',
//   widthMM: 152.4,
//   heightMM: 228.6,
//   category: 'regular',
//   market: 'us',
//   minPages: 24,
//   maxPages: { blackWhite: 828, ... }
// }
```

### 2. **Calculadora de Margens Assimétricas** (`kdp-margin-calculator.service.ts`)

#### Conceito Principal
Livros encadernados precisam de **margens assimétricas**:
- **Margem interna** (próxima à lombada): MAIOR
- **Margem externa** (borda livre): menor
- **Páginas ímpares** (direita): margem interna à ESQUERDA
- **Páginas pares** (esquerda): margem interna à DIREITA

#### Margens Recomendadas KDP
```
Top:     19.05mm (0.75")
Bottom:  19.05mm (0.75")
Outside: 15.875mm (0.625")
Inside:  22.225mm (0.875") + ajuste por espessura
```

#### Funcionalidades
```typescript
// 1. Calcular margens para formato específico
const margins = KDPMarginCalculatorService.calculateMargins(
  '6x9',           // Formato
  150,             // Número de páginas
  'black-white',   // Tipo de interior
  false,           // useMinimum (false = usa recomendadas)
  customMargins    // Opcional: sobrescreve cálculos
);

// 2. Gerar CSS @page com margens assimétricas
const css = KDPMarginCalculatorService.generatePageCSS(
  '6x9',
  150,
  'black-white'
);
// Retorna CSS completo com:
// - @page { ... }
// - @page :left { ... }   (páginas pares)
// - @page :right { ... }  (páginas ímpares)
// - @page :first { ... }  (capa sem margens)

// 3. Calcular dimensões de capa (frente + lombada + verso)
const coverDims = KDPMarginCalculatorService.calculateCoverDimensions(
  '6x9',
  150,
  'black-white'
);
```

### 3. **Adaptador de Capas** (`kdp-cover-adapter.service.ts`)

Gerencia dimensões de capas incluindo **bleed** (sangria de 3.175mm):

```typescript
// Calcular dimensões de capa simples (apenas frente)
const dims = KDPCoverAdapterService.calculateSimpleCoverDimensions('6x9');

// Validar imagem de capa
const validation = KDPCoverAdapterService.validateCoverImage(
  1800,    // largura em pixels
  2700,    // altura em pixels
  '6x9',
  150,
  'black-white'
);

// Gerar HTML de capa
const html = KDPCoverAdapterService.generateSimpleCoverHTML(
  '6x9',
  'https://example.com/cover.jpg',
  'Meu Livro',
  'Autor'
);

// Ver requisitos detalhados
const info = KDPCoverAdapterService.getCoverRequirements('6x9', 150, 'black-white');
console.log(info);
// Mostra: dimensões, DPI, bleed, especificações técnicas
```

### 4. **Integração no Export Service**

O sistema KDP é automaticamente aplicado em exportações PDF:

```typescript
// Exportar com formato KDP específico
await ebookExportService.exportEbook(
  projectId,
  userId,
  'pdf',
  {
    kdpTrimSize: '6x9',              // Formato desejado
    kdpInteriorType: 'black-white',  // Tipo de papel
    kdpPageCount: 200,               // Páginas estimadas
    kdpUseMinimumMargins: false,     // false = margens recomendadas
    kdpCustomMargins: {              // Opcional: margens custom
      top: 20,
      bottom: 20,
      inside: 25,
      outside: 15
    }
  }
);
```

Se não especificar opções KDP, usa **padrão: 6x9** (formato mais popular).

## 📐 CSS Gerado Automaticamente

O sistema gera CSS profissional substituindo as regras problemáticas:

### Antes (Problemático)
```css
/* Template com conflitos */
@page { margin: 1.5cm; }
@page chapter { margin: 2cm; }
.content { max-width: 100%; } /* ❌ CAUSAVA CORTE! */
```

### Depois (Sistema KDP)
```css
/* ============================================
   KDP Margins - 6" × 9" (15,24 × 22,86 cm)
   150 páginas, black-white
   ============================================ */

/* Configuração de página padrão */
@page {
  size: 152.4mm 228.6mm;
  margin: 19.05mm 15.875mm 19.05mm 22.225mm;
}

/* Página DIREITA (ímpar) - margem interna à ESQUERDA */
@page :right {
  margin-top: 19.05mm;
  margin-right: 15.875mm;     /* externa */
  margin-bottom: 19.05mm;
  margin-left: 22.225mm;      /* interna - maior */
}

/* Página ESQUERDA (par) - margem interna à DIREITA */
@page :left {
  margin-top: 19.05mm;
  margin-right: 22.225mm;     /* interna - maior */
  margin-bottom: 19.05mm;
  margin-left: 15.875mm;      /* externa */
}

/* Primeira página (capa) - sem margens */
@page :first {
  size: 152.4mm 228.6mm;
  margin: 0;
}

/* Garantir que o conteúdo não ultrapassa a área segura */
body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.content {
  max-width: 130.3mm; /* Largura segura calculada */
  margin: 0 auto;
  padding: 0;
}
```

## 🚀 Como Usar

### 1. Exportação Básica (usa formato padrão 6x9)
```bash
POST /api/ebook/project/:id/export
{
  "format": "pdf"
}
```

### 2. Exportação com Formato Específico
```bash
POST /api/ebook/project/:id/export
{
  "format": "pdf",
  "options": {
    "kdpTrimSize": "5.5x8.5",
    "kdpInteriorType": "black-white",
    "kdpPageCount": 120
  }
}
```

### 3. Exportação com Margens Customizadas
```bash
POST /api/ebook/project/:id/export
{
  "format": "pdf",
  "options": {
    "kdpTrimSize": "6x9",
    "kdpCustomMargins": {
      "top": 25,
      "bottom": 25,
      "inside": 30,
      "outside": 20
    }
  }
}
```

## 📊 Formatos Disponíveis

### Mais Populares
- **6x9** (15,24 × 22,86 cm) ⭐ RECOMENDADO
- **5.5x8.5** (13,97 × 21,59 cm) - Romances
- **8.5x11** (21,59 × 27,94 cm) - Manuais/Guias
- **5x8** (12,7 × 20,32 cm) - Ficção

### Todos os formatos suportados
```typescript
// Ver lista completa
import { getPopularKDPFormats, getKDPFormatsByCategory } from '../constants/kdp-trim-sizes';

// Formatos populares
const populares = getPopularKDPFormats();
// ['6x9', '5.5x8.5', '8.5x11', '5x8', '7x10']

// Por categoria
const regulares = getKDPFormatsByCategory('regular');
const grandes = getKDPFormatsByCategory('large');
const capaDura = getKDPFormatsByCategory('hardcover');
const quadrados = getKDPFormatsByCategory('square');
```

## 🔍 Debug e Validação

O sistema gera arquivos HTML de debug automaticamente:

```
ebook-debug-{nome-do-projeto}.html          # HTML antes do CSS KDP
ebook-debug-final-{timestamp}.html          # HTML com CSS KDP aplicado
```

### Logs de Console
```
📐 [KDP] Aplicando sistema de margens profissional Amazon KDP
📏 Formato selecionado: 6x9
📄 Tipo de interior: black-white
📚 Páginas estimadas: 150
✅ [KDP] CSS profissional injetado com sucesso
   📐 Margens: 6" × 9" (15,24 × 22,86 cm) ⭐ MAIS POPULAR
🔧 [DEBUG] HTML com CSS KDP salvo: ./ebook-debug-final-1763944906927.html
```

## 📚 Referências KDP

### Documentação Oficial Amazon
- **Trim Sizes**: https://kdp.amazon.com/pt_BR/help/topic/GVBQ3CMEQW3W2VL6
- **Interior Guidelines**: https://kdp.amazon.com/pt_BR/help/topic/G201834180
- **Cover Guidelines**: https://kdp.amazon.com/pt_BR/help/topic/G201953020
- **Margin Guide**: https://kdp.amazon.com/pt_BR/help/topic/G201834180

### Especificações Técnicas
- **Bleed**: 3.175mm (0.125") em todos os lados da capa
- **DPI Mínimo**: 72 DPI (Recomendado: 300 DPI)
- **Margens Mínimas**: 12.7mm (0.5") em todos os lados
- **Margens Recomendadas**: 19.05mm top/bottom, 15.875-22.225mm laterais

## ✨ Vantagens do Sistema

### Antes
❌ Margens inconsistentes  
❌ Conteúdo cortado  
❌ Dimensões genéricas (A4)  
❌ CSS conflitante  
❌ Página em branco após capa  

### Depois
✅ Margens assimétricas profissionais  
✅ Conteúdo 100% visível  
✅ 30+ formatos KDP oficiais  
✅ CSS limpo e validado  
✅ Capa mesclada corretamente  
✅ Pronto para publicação na Amazon  

## 🔧 Manutenção

### Adicionar Novo Formato
1. Editar `src/constants/kdp-trim-sizes.ts`
2. Adicionar ao type union `KDPTrimSize`
3. Adicionar especificação em `KDP_TRIM_SIZES`

### Ajustar Margens Padrão
Editar `KDPMarginCalculatorService`:
- `MIN_MARGINS_MM` - Margens mínimas KDP
- `RECOMMENDED_MARGINS_MM` - Margens recomendadas (padrão)

### Customizar CSS Adicional
Editar `ebook-export.service.ts`, seção `additionalCSS`

## 📝 Notas Importantes

1. **Puppeteer Respeita @page CSS**: O Chrome/Puppeteer suporta `@page :left` e `@page :right` para margens assimétricas
2. **Não Usar max-width Global**: Causa corte de conteúdo
3. **Capa Separada**: Gerada em PDF separado e mesclada para evitar página em branco
4. **Ajuste por Espessura**: Livros mais grossos recebem margem interna maior automaticamente
5. **Validação Automática**: Sistema valida se margens não excedem 50% da página

## 🎓 Conceitos-Chave

### Gutter (Margem Interna)
Margem próxima à lombada do livro. Deve ser maior para:
- Acomodar a curva da encadernação
- Evitar perda de texto na dobra
- Facilitar leitura sem forçar abertura total

### Bleed (Sangria)
Área extra além do corte final. Necessária para:
- Compensar variações no processo de corte
- Garantir que elementos visuais cheguem até a borda
- KDP exige 3.175mm (0.125")

### Trim Size (Dimensão Final)
Tamanho exato do livro após corte e acabamento.

## 🐛 Troubleshooting

### Problema: Margens ainda inconsistentes
**Solução**: Verificar se `options.kdpTrimSize` está sendo passado. Padrão é 6x9.

### Problema: Conteúdo cortado
**Solução**: Aumentar margens via `kdpCustomMargins` ou usar `kdpUseMinimumMargins: false`

### Problema: Página em branco após capa
**Solução**: Sistema já resolve isso gerando capa separada. Verificar logs de mesclagem.

### Problema: Formato não reconhecido
**Solução**: Usar `isValidKDPTrimSize('formato')` para validar antes de exportar.

---

## 📄 Arquivos do Sistema

```
src/
├── constants/
│   └── kdp-trim-sizes.ts                 # 30+ formatos KDP oficiais
├── services/
│   ├── kdp-margin-calculator.service.ts  # Cálculo de margens assimétricas
│   ├── kdp-cover-adapter.service.ts      # Adaptação de capas com bleed
│   └── ebook-export.service.ts           # Integração completa
└── docs/
    └── KDP_PROFESSIONAL_SYSTEM.md        # Esta documentação
```

---

**Sistema Desenvolvido em**: 23/11/2025  
**Versão**: 1.0.0  
**Status**: ✅ Produção  
**Compatibilidade**: Amazon KDP (US, JP), IngramSpark, Lulu (formatos compatíveis)
