/**
 * Serviço de Personalização de Design de Ebooks
 * Usa LLM para criar identidade visual única baseada no DNA do projeto
 */

import { EbookProject } from '../templates/ebook/markdown-template';
import { RouterApiOpenAI } from './openrouter.service';
import { extractValidJson } from './extract-valid-json.service';
import { 
  BaseTemplate, 
  DesignVariables, 
  getBaseTemplateOrFallback,
  applyVariablesToCSS,
  PuppeteerConfig,
  EPUBConfig
} from '../templates/ebook';

/**
 * Design completo do projeto (salvo no MongoDB)
 */
export interface ProjectDesign {
  baseTemplateKey: string;
  visualIdentity: DesignVariables;
  finalCSS: string;
  puppeteerConfig: PuppeteerConfig;
  epubConfig: EPUBConfig;
  customInstruction?: string; // Instrução customizada do usuário (se houver)
  reasoning: string; // Justificativa do LLM para as escolhas de design
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class EbookDesignPersonalizationService {
  /**
   * Gera design completo para um projeto (chamado 1x na criação)
   */
  static async generateProjectDesign(
    project: EbookProject,
    userId: string,
    customInstruction?: string
  ): Promise<ProjectDesign> {
    try {
      console.log(`🎨 Gerando design personalizado para projeto: ${project.title}`);

      // 1. Selecionar template base
      const genre = project.dna?.genre || 'Outro';
      const tone = project.dna?.tone || 'Profissional';
      const baseTemplate = getBaseTemplateOrFallback(genre, tone);
      
      console.log(`📋 Template base selecionado: ${baseTemplate.genre} × ${baseTemplate.tone}`);

      // 2. Chamar LLM para personalizar identidade visual
      const visualIdentity = await this.personalizeVisualIdentity(
        project,
        baseTemplate,
        customInstruction
      );

      console.log(`✨ Identidade visual personalizada:`, {
        primaryColor: visualIdentity.primaryColor,
        fonts: {
          primary: visualIdentity.fontPrimary,
          headings: visualIdentity.fontHeadings
        }
      });

      // 3. Montar CSS final (base + customização)
      const finalCSS = applyVariablesToCSS(baseTemplate.baseCSS, visualIdentity);

      // 4. Retornar design completo
      return {
        baseTemplateKey: `${genre}-${tone}`,
        visualIdentity,
        finalCSS,
        puppeteerConfig: baseTemplate.puppeteerConfig,
        epubConfig: baseTemplate.epubConfig,
        customInstruction,
        reasoning: visualIdentity.reasoning || 'Design gerado automaticamente',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Erro ao gerar design do projeto:', error);
      throw error;
    }
  }

  /**
   * Regenera identidade visual (mantém template base)
   */
  static async regenerateVisualIdentity(
    project: EbookProject,
    currentDesign: ProjectDesign,
    userId: string,
    customInstruction?: string
  ): Promise<ProjectDesign> {
    try {
      console.log(`🔄 Regenerando identidade visual para: ${project.title}`);

      // Obter template base atual
      const baseTemplate = getBaseTemplateOrFallback(
        project.dna?.genre || 'Outro',
        project.dna?.tone || 'Profissional'
      );

      // Gerar nova identidade visual
      const visualIdentity = await this.personalizeVisualIdentity(
        project,
        baseTemplate,
        customInstruction
      );

      // Montar novo CSS
      const finalCSS = applyVariablesToCSS(baseTemplate.baseCSS, visualIdentity);

      // Incrementar versão
      return {
        ...currentDesign,
        visualIdentity,
        finalCSS,
        customInstruction,
        reasoning: visualIdentity.reasoning || 'Design regenerado',
        version: currentDesign.version + 1,
        updatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Erro ao regenerar identidade visual:', error);
      throw error;
    }
  }

  /**
   * Modifica design via IA com instrução customizada
   */
  static async modifyDesignWithAI(
    project: EbookProject,
    currentDesign: ProjectDesign,
    instruction: string,
    userId: string
  ): Promise<ProjectDesign> {
    try {
      console.log(`✏️ Modificando design via IA: "${instruction}"`);

      // Obter template base
      const baseTemplate = getBaseTemplateOrFallback(
        project.dna?.genre || 'Outro',
        project.dna?.tone || 'Profissional'
      );

      // Modificar identidade visual existente
      const visualIdentity = await this.modifyVisualIdentity(
        project,
        baseTemplate,
        currentDesign.visualIdentity,
        instruction
      );

      // Montar novo CSS
      const finalCSS = applyVariablesToCSS(baseTemplate.baseCSS, visualIdentity);

      // Incrementar versão
      return {
        ...currentDesign,
        visualIdentity,
        finalCSS,
        customInstruction: instruction,
        reasoning: visualIdentity.reasoning || `Modificado: ${instruction}`,
        version: currentDesign.version + 1,
        updatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Erro ao modificar design:', error);
      throw error;
    }
  }

  /**
   * Personaliza identidade visual via LLM
   */
  private static async personalizeVisualIdentity(
    project: EbookProject,
    baseTemplate: BaseTemplate,
    customInstruction?: string
  ): Promise<DesignVariables & { reasoning: string }> {
    const prompt = this.buildPersonalizationPrompt(project, baseTemplate, customInstruction);

    const openai = new RouterApiOpenAI();
    const response = await openai.createCompletion({
      model: 'google/gemini-2.5-flash', // Modelo rápido e eficiente para design
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // Criatividade para design único
      max_tokens: 4000,
      toolName: 'ebook-design-personalization',
      metadata: {
        userId: project.userId || 'system',
        app: 'ebook-design-personalization',
        projectId: project._id,
        model: 'google/gemini-2.5-flash'
      }
    });

    const content = response.choices[0]?.message?.content || '';
    const designData = extractValidJson(content);

    if (!designData || !designData.primaryColor) {
      console.warn('⚠️ LLM não retornou design válido, usando padrão do template');
      return {
        ...baseTemplate.defaultVars,
        reasoning: 'Design padrão aplicado (LLM falhou)'
      };
    }

    // Validar e normalizar resposta
    return {
      primaryColor: designData.primaryColor || baseTemplate.defaultVars.primaryColor,
      secondaryColor: designData.secondaryColor || baseTemplate.defaultVars.secondaryColor,
      accentColor: designData.accentColor || baseTemplate.defaultVars.accentColor,
      backgroundColor: designData.backgroundColor || baseTemplate.defaultVars.backgroundColor,
      textColor: designData.textColor || baseTemplate.defaultVars.textColor,
      fontPrimary: designData.fontPrimary || baseTemplate.defaultVars.fontPrimary,
      fontHeadings: designData.fontHeadings || baseTemplate.defaultVars.fontHeadings,
      fontCode: designData.fontCode || baseTemplate.defaultVars.fontCode,
      googleFontsImport: designData.googleFontsImport,
      lineHeight: designData.lineHeight || baseTemplate.defaultVars.lineHeight,
      paragraphMargin: designData.paragraphMargin || baseTemplate.defaultVars.paragraphMargin,
      headingMarginTop: designData.headingMarginTop || baseTemplate.defaultVars.headingMarginTop,
      headingMarginBottom: designData.headingMarginBottom || baseTemplate.defaultVars.headingMarginBottom,
      chapterDropCap: designData.chapterDropCap ?? baseTemplate.defaultVars.chapterDropCap,
      chapterDivider: designData.chapterDivider || baseTemplate.defaultVars.chapterDivider,
      pageNumbersStyle: designData.pageNumbersStyle || baseTemplate.defaultVars.pageNumbersStyle,
      reasoning: designData.reasoning || 'Design personalizado via LLM'
    };
  }

  /**
   * Modifica identidade visual existente via LLM
   */
  private static async modifyVisualIdentity(
    project: EbookProject,
    baseTemplate: BaseTemplate,
    currentIdentity: DesignVariables,
    instruction: string
  ): Promise<DesignVariables & { reasoning: string }> {
    const prompt = this.buildModificationPrompt(
      project,
      baseTemplate,
      currentIdentity,
      instruction
    );

    const openai = new RouterApiOpenAI();
    const response = await openai.createCompletion({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      toolName: 'ebook-design-modification',
      metadata: {
        userId: project.userId || 'system',
        app: 'ebook-design-modification',
        projectId: project._id,
        model: 'google/gemini-2.5-flash'
      }
    });

    const content = response.choices[0]?.message?.content || '';
    const designData = extractValidJson(content);

    if (!designData || !designData.primaryColor) {
      console.warn('⚠️ LLM não retornou modificação válida, mantendo design atual');
      return {
        ...currentIdentity,
        reasoning: `Tentativa de modificação falhou: ${instruction}`
      };
    }

    // Retornar design modificado
    return {
      primaryColor: designData.primaryColor || currentIdentity.primaryColor,
      secondaryColor: designData.secondaryColor || currentIdentity.secondaryColor,
      accentColor: designData.accentColor || currentIdentity.accentColor,
      backgroundColor: designData.backgroundColor || currentIdentity.backgroundColor,
      textColor: designData.textColor || currentIdentity.textColor,
      fontPrimary: designData.fontPrimary || currentIdentity.fontPrimary,
      fontHeadings: designData.fontHeadings || currentIdentity.fontHeadings,
      fontCode: designData.fontCode || currentIdentity.fontCode,
      googleFontsImport: designData.googleFontsImport || currentIdentity.googleFontsImport,
      lineHeight: designData.lineHeight || currentIdentity.lineHeight,
      paragraphMargin: designData.paragraphMargin || currentIdentity.paragraphMargin,
      headingMarginTop: designData.headingMarginTop || currentIdentity.headingMarginTop,
      headingMarginBottom: designData.headingMarginBottom || currentIdentity.headingMarginBottom,
      chapterDropCap: designData.chapterDropCap ?? currentIdentity.chapterDropCap,
      chapterDivider: designData.chapterDivider || currentIdentity.chapterDivider,
      pageNumbersStyle: designData.pageNumbersStyle || currentIdentity.pageNumbersStyle,
      reasoning: designData.reasoning || `Modificado: ${instruction}`
    };
  }

  /**
   * Constrói prompt para personalização inicial
   */
  private static buildPersonalizationPrompt(
    project: EbookProject,
    baseTemplate: BaseTemplate,
    customInstruction?: string
  ): string {
    return `# Tarefa: Criar Identidade Visual Única para Ebook

## Contexto do Projeto
- **Título**: ${project.title}
- **Gênero**: ${project.dna?.genre || 'Não especificado'}
- **Tom de Escrita**: ${project.dna?.tone || 'Não especificado'}
- **Ideia Central**: ${project.dna?.idea || 'Não especificado'}
- **Autor**: ${project.dna?.author || 'Não especificado'}
- **Palavras-chave**: ${project.dna?.keywords?.join(', ') || 'Nenhuma'}

## Template Base Selecionado
- **Tipo**: ${baseTemplate.genre} × ${baseTemplate.tone}
- **Descrição**: ${baseTemplate.description}

## Valores Padrão do Template
\`\`\`json
${JSON.stringify(baseTemplate.defaultVars, null, 2)}
\`\`\`

${customInstruction ? `## Instrução Customizada do Usuário\n${customInstruction}\n` : ''}

## Sua Missão
Crie uma **identidade visual única e profissional** para este ebook, personalizando as variáveis de design.

### Diretrizes:
1. **Cores**: Escolha uma paleta que reflita o gênero e tom
   - Primary: Cor principal (títulos, destaque)
   - Secondary: Cor secundária (elementos UI)
   - Accent: Cor de acento (links, realces)
   - Background: Cor de fundo
   - Text: Cor do texto principal

2. **Tipografia**: Selecione fontes apropriadas
   - Font Primary: Fonte do corpo de texto
   - Font Headings: Fonte dos títulos
   - Font Code: Fonte para código (se aplicável)
   - Google Fonts Import: URL do Google Fonts (opcional, se usar fontes personalizadas)

3. **Espaçamento**: Ajuste ritmo visual
   - Line Height: Altura da linha (ex: "1.8")
   - Paragraph Margin: Margem entre parágrafos (ex: "1.2em")
   - Heading Margins: Margens dos títulos

4. **Elementos Decorativos**:
   - Chapter Drop Cap: true/false (letra capitular no início do capítulo)
   - Chapter Divider: Caractere/símbolo divisor (ex: "***", "❤", "---")
   - Page Numbers Style: "classic", "modern", "minimal", ou "none"

### Psicologia das Cores por Gênero:
- **Romance**: Tons pastéis, rosa, roxo, vermelho suave
- **Técnico**: Azul, cinza, cores sóbrias e profissionais
- **Thriller/Horror**: Dark, vermelho sangue, preto, cinza escuro
- **Fantasia**: Roxo místico, dourado, verde esmeralda
- **Autoajuda**: Laranja, amarelo, cores quentes e motivacionais
- **Infantil**: Cores vibrantes, alegres, primárias

### Fontes Sugeridas por Gênero:
- **Romance**: Georgia, Crimson Text, Lora
- **Técnico**: Arial, Roboto, Open Sans
- **Thriller**: Crimson Text, Playfair Display
- **Fantasia**: Cinzel, Cormorant Garamond
- **Autoajuda**: Montserrat, Raleway

## Formato de Resposta (JSON)
Retorne APENAS um JSON válido com esta estrutura:

\`\`\`json
{
  "primaryColor": "#HEXCODE",
  "secondaryColor": "#HEXCODE",
  "accentColor": "#HEXCODE",
  "backgroundColor": "#HEXCODE",
  "textColor": "#HEXCODE",
  "fontPrimary": "Nome da fonte, fallback",
  "fontHeadings": "Nome da fonte, fallback",
  "fontCode": "Nome da fonte, fallback",
  "googleFontsImport": "URL opcional do Google Fonts ou null",
  "lineHeight": "1.6",
  "paragraphMargin": "1em",
  "headingMarginTop": "2em",
  "headingMarginBottom": "0.6em",
  "chapterDropCap": true,
  "chapterDivider": "***",
  "pageNumbersStyle": "classic",
  "reasoning": "Breve explicação das escolhas de design (2-3 frases)"
}
\`\`\`

**IMPORTANTE**: 
- Use cores em formato hexadecimal (#RRGGBB)
- Fontes devem incluir fallbacks (ex: "Georgia, serif")
- Seja criativo mas profissional
- O design deve ser legível e apropriado para impressão PDF`;
  }

  /**
   * Constrói prompt para modificação de design existente
   */
  private static buildModificationPrompt(
    project: EbookProject,
    baseTemplate: BaseTemplate,
    currentIdentity: DesignVariables,
    instruction: string
  ): string {
    return `# Tarefa: Modificar Identidade Visual Existente

## Contexto do Projeto
- **Título**: ${project.title}
- **Gênero**: ${project.dna?.genre || 'Não especificado'}
- **Tom**: ${project.dna?.tone || 'Não especificado'}

## Design Atual
\`\`\`json
${JSON.stringify(currentIdentity, null, 2)}
\`\`\`

## Instrução de Modificação
"${instruction}"

## Sua Missão
Modifique o design atual seguindo a instrução do usuário, mas mantenha coerência visual.

### Exemplos de Modificações:
- "Torne mais moderno" → Fontes sans-serif, cores vibrantes
- "Deixe mais elegante" → Fontes serifadas, cores sóbrias
- "Cores mais vibrantes" → Aumentar saturação das cores
- "Mais minimalista" → Simplificar, cores neutras
- "Estilo vintage" → Tons sépia, fontes clássicas

## Formato de Resposta (JSON)
Retorne o design modificado no mesmo formato:

\`\`\`json
{
  "primaryColor": "#HEXCODE",
  "secondaryColor": "#HEXCODE",
  "accentColor": "#HEXCODE",
  "backgroundColor": "#HEXCODE",
  "textColor": "#HEXCODE",
  "fontPrimary": "Nome da fonte, fallback",
  "fontHeadings": "Nome da fonte, fallback",
  "fontCode": "Nome da fonte, fallback",
  "googleFontsImport": "URL opcional ou null",
  "lineHeight": "1.6",
  "paragraphMargin": "1em",
  "headingMarginTop": "2em",
  "headingMarginBottom": "0.6em",
  "chapterDropCap": true,
  "chapterDivider": "***",
  "pageNumbersStyle": "classic",
  "reasoning": "Explicação das mudanças feitas"
}
\`\`\`

**IMPORTANTE**: Mantenha a coerência com o gênero e tom do livro.`;
  }
}
