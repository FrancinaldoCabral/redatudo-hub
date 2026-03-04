# Templates de Ebooks - Estrutura Reorganizada

## 📁 Estrutura de Diretórios

```
src/templates/ebook/
├── index.ts                      # Arquivo principal - exporta tudo
├── types.ts                      # Interfaces TypeScript
├── utils.ts                      # Funções auxiliares
├── universal-base.css.ts         # CSS base compartilhado
├── base-templates.ts.backup      # Arquivo antigo (backup)
└── templates/                    # Templates organizados por gênero
    ├── romance/
    │   ├── profissional.ts
    │   ├── casual.ts
    │   ├── inspiracional.ts
    │   ├── academico.ts
    │   ├── serio.ts
    │   ├── formal.ts
    │   ├── humoristico.ts
    │   └── conversacional.ts
    ├── ficcao-cientifica/
    │   ├── profissional.ts
    │   └── casual.ts
    ├── fantasia/
    │   ├── profissional.ts
    │   ├── inspiracional.ts
    │   └── casual.ts
    ├── autoajuda/
    │   ├── profissional.ts
    │   ├── inspiracional.ts
    │   └── academico.ts
    ├── tecnico/
    │   ├── profissional.ts
    │   └── humoristico.ts
    ├── negocios/
    │   └── serio.ts
    ├── misterio/
    │   └── conversacional.ts
    ├── horror/
    │   └── formal.ts
    ├── biografia/
    │   └── profissional.ts
    ├── historia/
    │   └── casual.ts
    ├── poesia/
    │   └── inspiracional.ts
    ├── drama/
    │   └── academico.ts
    ├── aventura/
    │   └── humoristico.ts
    ├── thriller/
    │   ├── profissional.ts
    │   └── serio.ts
    ├── infantil/
    │   └── conversacional.ts
    └── outro/
        └── formal.ts
```

## 📊 Estatísticas

- **Total de templates**: 30
- **Gêneros cobertos**: 16
- **Tons de escrita**: 8 (Profissional, Casual, Inspiracional, Acadêmico, Humorístico, Sério, Conversacional, Formal)

## 🎯 Como Usar

### Importação Básica

```typescript
// Importar tudo do index
import { 
  BASE_TEMPLATES,
  getBaseTemplate,
  getBaseTemplateOrFallback,
  BaseTemplate,
  DesignVariables
} from '../templates/ebook';

// Ou importar template específico
import { romanceProfissional } from '../templates/ebook/templates/romance/profissional';
```

### Obter Template

```typescript
// Por gênero e tom
const template = getBaseTemplate('Romance', 'Profissional');

// Com fallback
const template = getBaseTemplateOrFallback('Romance', 'Profissional');

// Diretamente do objeto
const template = BASE_TEMPLATES['romance-profissional'];
```

### Aplicar Variáveis ao CSS

```typescript
import { applyVariablesToCSS } from '../templates/ebook';

const customVars: DesignVariables = {
  primaryColor: '#8B4789',
  secondaryColor: '#D4A5D4',
  // ... outras variáveis
};

const finalCSS = applyVariablesToCSS(template.baseCSS, customVars);
```

## ✨ Benefícios da Nova Estrutura

1. **Manutenibilidade**: Cada template em seu próprio arquivo (fácil de encontrar e editar)
2. **Escalabilidade**: Simples adicionar novos templates sem poluir um único arquivo
3. **Organização**: Agrupamento lógico por gênero literário
4. **Performance**: Possibilidade de lazy loading no futuro
5. **Legibilidade**: Arquivos menores, mais focados
6. **Versionamento**: Mudanças em um template não afetam outros no Git

## 🚀 Próximos Passos

Para completar os 128 templates planejados (16 gêneros × 8 tons):

1. Identificar gêneros/tons faltantes em cada diretório
2. Criar novos arquivos seguindo o padrão existente
3. Adicionar exports no `index.ts`
4. Adicionar entradas no objeto `BASE_TEMPLATES`

### Templates Faltantes por Gênero

- **Romance**: ✅ Completo (8/8)
- **Ficção Científica**: Precisa de 6 tons (2/8)
- **Fantasia**: Precisa de 5 tons (3/8)
- **Autoajuda**: Precisa de 5 tons (3/8)
- **Técnico**: Precisa de 6 tons (2/8)
- **Negócios**: Precisa de 7 tons (1/8)
- **Mistério**: Precisa de 7 tons (1/8)
- **Horror**: Precisa de 7 tons (1/8)
- **Biografia**: Precisa de 7 tons (1/8)
- **História**: Precisa de 7 tons (1/8)
- **Poesia**: Precisa de 7 tons (1/8)
- **Drama**: Precisa de 7 tons (1/8)
- **Aventura**: Precisa de 7 tons (1/8)
- **Thriller**: Precisa de 6 tons (2/8)
- **Infantil**: Precisa de 7 tons (1/8)
- **Outro**: Precisa de 7 tons (1/8)

## 📝 Template de Exemplo

```typescript
import { BaseTemplate } from '../../types';
import { UNIVERSAL_BASE_CSS } from '../../universal-base.css';

export const nomeDoTemplate: BaseTemplate = {
  genre: 'Gênero',
  tone: 'Tom',
  description: 'Descrição do template',
  baseCSS: UNIVERSAL_BASE_CSS, // + CSS adicional se necessário
  defaultVars: {
    primaryColor: '#000000',
    secondaryColor: '#666666',
    accentColor: '#0000FF',
    backgroundColor: '#FFFFFF',
    textColor: '#333333',
    fontPrimary: 'Georgia, serif',
    fontHeadings: 'Arial, sans-serif',
    fontCode: '"Courier New", monospace',
    lineHeight: '1.6',
    paragraphMargin: '1em',
    headingMarginTop: '2em',
    headingMarginBottom: '0.6em',
    chapterDropCap: false,
    chapterDivider: '***',
    pageNumbersStyle: 'classic'
  },
  puppeteerConfig: {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: '2.5cm', bottom: '2.5cm', left: '2cm', right: '2cm' }
  },
  epubConfig: {
    tocDepth: 2,
    chapterLevel: 2,
    embedFonts: false
  }
};
```

## 🔧 Manutenção

- **Adicionar novo template**: Criar arquivo no diretório correspondente, adicionar export no index.ts
- **Modificar template**: Editar apenas o arquivo específico
- **Remover template**: Deletar arquivo, remover export do index.ts
- **Backup**: Arquivo antigo em `base-templates.ts.backup`

---

**Última atualização**: 17/11/2025
**Versão**: 2.0 (Estrutura Modular)
