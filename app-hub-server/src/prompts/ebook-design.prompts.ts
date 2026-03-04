/**
 * Prompts para geração de design de ebooks via LLM
 */

import { EbookProject } from '../templates/ebook/markdown-template';
import { ContentSample } from '../services/ebook-content-sampler.service';

export class EbookDesignPrompts {
  /**
   * Prompt principal para geração de design CSS
   */
  static generateDesignPrompt(project: EbookProject, contentSample: ContentSample): string {
    const dna: any = project.dna || {};
    
    return `# TAREFA: Criar Design Editorial CSS para Ebook

## INFORMAÇÕES DO PROJETO

**Título**: ${project.title}
**Gênero**: ${dna.genre || 'Não especificado'}
**Público-alvo**: ${dna.targetAudience || 'Geral'}
**Tom/Mood**: ${dna.tone || dna.mood || 'Profissional'}
**Autor**: ${dna.author || 'Não especificado'}
**Descrição**: ${dna.idea || 'Sem descrição'}

${contentSample.summary}

---

## AMOSTRAS DO CONTEÚDO REAL

Abaixo estão amostras estratégicas do conteúdo HTML REAL que será estilizado.
Você DEVE criar CSS que cubra TODAS as tags presentes + quaisquer outras tags HTML5 válidas.

${this.formatSamples(contentSample)}

---

## REQUISITOS DO DESIGN

1. **CSS Completo e Universal**:
   - Crie regras CSS genéricas que funcionem para TODAS as tags HTML5
   - Inclua estilos base para: html, body, h1-h6, p, ul, ol, li, blockquote, pre, code, table, tr, td, th, img, figure, figcaption, strong, em, a, hr, section, article, aside, nav, etc.
   - Use seletores genéricos que funcionem em todo o documento

2. **Adequação ao Gênero**:
   - ${this.getGenreGuidelines(dna.genre)}

3. **Controle Avançado de Páginas (CRÍTICO)**:
   - **CAPA (cover)**: Use CSS para seção com data-section-type="cover"
     * A imagem da capa DEVE ocupar 100% da largura e 100% da altura da página
     * **IMPORTANTE**: Use object-fit: contain; (NÃO use cover, pois corta a imagem)
     * Use: width: 100vw; height: 100vh; object-fit: contain; object-position: center;
     * Remova margens e padding da página da capa
     * Use page-break-after: always; para forçar nova página após a capa
   
   - **Quebras de Página**: 
     * Capítulos (chapter) DEVEM começar em nova página: page-break-before: always;
     * Seções importantes (introduction, conclusion) devem ter page-break-before: always;
     * Títulos principais não devem quebrar da primeira linha: page-break-after: avoid;
     * Evite quebras dentro de parágrafos importantes: page-break-inside: avoid;
     * Use orphans: 3; e widows: 3; para evitar linhas solitárias
   
   - **Regiões de Página com @page**:
     * Use @page para definir margens da página impressa
     * @page :first {} para primeira página (capa)
     * **IMPORTANTE**: Use VARIAVEIS CSS var(--page-size), var(--*-margin), etc.
     * Exemplo: @page { size: var(--page-size); margin: var(--page-standard-margin); }
     * @page :first { margin: var(--page-first-margin); }
     * @page chapter { margin: var(--page-chapter-margin); }

4. **Tipografia Profissional**:
   - Escolha fontes web-safe ou Google Fonts (especifique @import se necessário)
   - Hierarquia visual clara com tamanhos adequados
   - Espaçamento e leading (line-height) adequados
   - Kerning e tracking otimizados
   - Hifenização inteligente: hyphens: auto; para textos longos

5. **Efeitos Especiais (se apropriado ao gênero)**:
   - Drop caps (primeira letra grande) usando ::first-letter
   - Ornamentos de capítulo (bordas decorativas, elementos visuais)
   - Estilos especiais para citações (blockquote diferenciado)
   - Numeração criativa para listas
   - Texturas ou padrões sutis de fundo

6. **Responsividade e Impressão**:
   - Design deve funcionar em diferentes tamanhos de página
   - @media print {} para otimizações específicas de impressão
   - @media screen {} para visualização em tela
   - Garantir que cores funcionem em P&B (use contrast-ratio adequado)
   - Remover elementos desnecessários na impressão

---

## EXEMPLO DE CSS AVANÇADO

Aqui está um exemplo de CSS com controle avançado de páginas que você deve seguir como referência:

\`\`\`css
/* Configuração de página para impressão - USAR VARIAVEIS */
@page {
  size: var(--page-size);
  margin: var(--page-standard-margin);
}

@page :first {
  margin: var(--page-first-margin);
}

@page chapter {
  margin: var(--page-chapter-margin);
}

/* Capa - 100% largura e altura */
[data-section-type="cover"] {
  page-break-after: always;
  margin: 0 !important;
  padding: 0 !important;
  width: 100vw;
  height: 100vh;
  position: relative;
}

[data-section-type="cover"] img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Quebras de página para capítulos e seções importantes */
[data-section-type="chapter"],
[data-section-type="introduction"],
[data-section-type="conclusion"],
[data-section-type="appendix"] {
  page-break-before: always;
  page: chapter;
}

/* Evitar quebras indesejadas */
h1, h2, h3, h4, h5, h6 {
  page-break-after: avoid;
  page-break-inside: avoid;
}

blockquote, figure, table {
  page-break-inside: avoid;
}

/* Controle de órfãos e viúvas */
p {
  orphans: 3;
  widows: 3;
}

/* Drop cap para primeira letra de capítulos */
[data-section-type="chapter"] p:first-of-type::first-letter {
  font-size: 3.5em;
  line-height: 0.85;
  float: left;
  margin: 0.1em 0.1em 0 0;
  font-weight: bold;
}
\`\`\`

---

## FORMATO DE RESPOSTA

Retorne APENAS um objeto JSON válido (sem markdown, sem explicações):

\`\`\`json
{
  "globalCSS": "/* CSS completo aqui */",
  "containerStructure": "<div class=\\"book\\"><div class=\\"chapter\\"><div class=\\"content\\">{{CONTENT}}</div></div></div>",
  "wrapperClasses": {
    "book": "book",
    "chapter": "chapter",
    "content": "content"
  },
  "fonts": {
    "primary": "Georgia, serif",
    "headings": "Palatino, serif",
    "code": "Courier New, monospace"
  },
  "needsBackgroundImage": false,
  "backgroundImagePrompt": null,
  "designNotes": "Breve descrição do conceito visual aplicado"
}
\`\`\`

**IMPORTANTE - ESPECIFICAÇÕES AMAZON KDP**: 
- **Margens de página**: Use 1.5cm a 2cm (guidelines KDP: 0.5" a 1")
- **Tamanhos de fonte**: MODERADOS para evitar cortes de texto
  * h1: máximo 2.2em
  * h2: máximo 1.8em  
  * h3: máximo 1.4em
  * Fonte base impressão: 11pt (já configurado pelo sistema)
- **Capa**: DEVE ocupar página inteira sem margens (margin: 0 !important)
- **Padding de conteúdo**: MANTER padding de 2rem (NÃO use padding: 0 nas páginas de conteúdo)
- **Compatibilidade**: A4 e formatos KDP padrão (6x9", 5.5x8.5")
- **Evite**: Elementos decorativos complexos que quebram na impressão PDF

**IMPORTANTE - FONTES E @IMPORT**: 
- Se precisar de Google Fonts, especifique a URL no campo "fonts.googleFontsUrl" do JSON
- **NÃO INCLUA @import diretamente no CSS globalCSS** - o sistema adiciona automaticamente
- O CSS deve ser completo e self-contained (sem @import dentro do CSS)
- Não use paths relativos para recursos externos (apenas web-safe fonts)
- Garanta que o CSS funcione mesmo que apareçam tags HTML não presentes nas amostras
- Use CSS genérico o suficiente para cobrir todo o conteúdo do livro

Crie um design profissional, adequado ao gênero e visualmente atraente!`;
  }

  /**
   * Formata amostras para o prompt
   */
  private static formatSamples(contentSample: ContentSample): string {
    return contentSample.samples.map((sample, index) => {
      return `### Amostra ${index + 1}: ${sample.title} (${sample.type})
**Posição no livro**: ${sample.position}

\`\`\`html
${sample.contentPreview}
\`\`\`
`;
    }).join('\n---\n\n');
  }

  /**
   * Retorna diretrizes específicas por gênero
   */
  private static getGenreGuidelines(genre?: string): string {
    const guidelines: Record<string, string> = {
      'romance': 'Use tipografia elegante, serifada, drop caps ornamentados, espaçamento generoso. Cores suaves e românticas.',
      'ficção científica': 'Tipografia moderna, possivelmente sans-serif, cores tecnológicas (azul, cinza). Efeitos futuristas sutis.',
      'fantasia': 'Tipografia medieval ou ornamentada, drop caps elaborados, bordas decorativas. Cores ricas e místicas.',
      'técnico': 'Tipografia limpa, hierarquia clara, destaque para código e tabelas. Cores neutras, foco na legibilidade.',
      'acadêmico': 'Tipografia tradicional serifada, margens largas para anotações, numeração clara. Profissional e sóbrio.',
      'infantil': 'Tipografia amigável, cores vibrantes, espaçamento amplo, tamanho de fonte maior.',
      'autoajuda': 'Tipografia convidativa, destaque para citações e listas, espaçamento arejado. Cores motivacionais.',
      'biografia': 'Tipografia clássica, cronológica e clara, foco em datas e eventos. Elegante mas informativo.',
      'terror': 'Tipografia gótica ou sinistra, cores escuras, efeitos sombrios. Atmosfera tensa.',
      'poesia': 'Tipografia elegante, centralização de versos, espaçamento entre estrofes. Minimalista e artístico.'
    };

    const genreLower = (genre || '').toLowerCase();
    for (const [key, guideline] of Object.entries(guidelines)) {
      if (genreLower.includes(key)) {
        return guideline;
      }
    }

    return 'Use tipografia profissional adequada ao tom do conteúdo. Mantenha legibilidade e elegância.';
  }

  /**
   * Prompt para geração de imagem de fundo (se necessário)
   */
  static generateBackgroundImagePrompt(project: EbookProject, designConcept: string): string {
    const dna = project.dna || {};

    return `Crie uma imagem de fundo sutil e elegante para um ebook.

**Gênero**: ${dna.genre || 'Geral'}
**Tema**: ${project.title}
**Conceito de Design**: ${designConcept}

A imagem deve:
- Ser MUITO sutil (opacidade baixa quando aplicada)
- Funcionar como textura de fundo
- Não competir com o texto
- Complementar o gênero e mood do livro
- Ser adequada para impressão em P&B

Estilo: minimalista, textura, padrão sutil, watermark effect`;
  }

  /**
   * Prompt para validação do CSS gerado
   */
  static generateValidationPrompt(css: string, samples: string[]): string {
    return `Valide se o CSS abaixo cobre todas as tags HTML presentes nas amostras:

**CSS Gerado**:
\`\`\`css
${css}
\`\`\`

**Amostras HTML**:
${samples.map((s, i) => `\`\`\`html\n${s}\n\`\`\``).join('\n\n')}

Retorne JSON:
{
  "valid": true/false,
  "missingTags": ["tag1", "tag2"],
  "suggestions": "melhorias recomendadas"
}`;
  }

  /**
   * Prompt para aplicação incremental de conteúdo (se necessário usar loop)
   */
  static generateContentApplicationPrompt(
    currentHTML: string,
    newSections: any[],
    designStructure: string
  ): string {
    return `Você é um compositor editorial. Adicione as seguintes seções ao HTML mantendo a estrutura de design.

**HTML Atual**:
\`\`\`html
${currentHTML}
\`\`\`

**Novas Seções**:
${newSections.map((s, i) => `
### Seção ${i + 1}: ${s.title}
\`\`\`html
${s.content}
\`\`\`
`).join('\n')}

**Estrutura de Wrapper**:
\`\`\`
${designStructure}
\`\`\`

Retorne o HTML completo com as novas seções inseridas na ordem correta.
NÃO modifique o CSS ou a estrutura base.
APENAS adicione o novo conteúdo dentro dos wrappers apropriados.`;
  }
}
