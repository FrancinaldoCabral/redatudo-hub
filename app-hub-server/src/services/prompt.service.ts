import { EbookMetadata, Section } from '../tools/protocols/ebook-tools.protocols';

export class PromptService {
    generatePromptForSection(metadata: EbookMetadata, section: Section, chapterTitle: string, wordCount?: number): string {
        const sectionKeywords = section.keywords && section.keywords.length > 0 
            ? section.keywords.join(', ') 
            : '';
        
        const mainKeywords = metadata.keywords && metadata.keywords.length > 0 
            ? metadata.keywords.join(', ') 
            : '';

        // Calcular contagem de palavras esperada
        const targetWords = wordCount || 900;
        const minWords = Math.floor(targetWords * 0.95);
        const maxWords = Math.ceil(targetWords * 1.05);

        return `Você é um escritor profissional especializado em criar conteúdo de alta qualidade para ebooks.

# CONTEXTO DO EBOOK
- Título do Ebook: ${metadata.title}
- Descrição: ${metadata.description}
- Nicho/Área: ${metadata.niche}
- Público-Alvo: ${metadata.audience}
- Tom/Estilo: ${metadata.tone}
- Idioma: ${metadata.language}
- Palavras-chave principais: ${mainKeywords}

# TAREFA
Escreva o conteúdo completo para a seção intitulada "${section.title}", que faz parte do capítulo "${chapterTitle}".

⚠️ REQUISITO CRÍTICO DE COMPRIMENTO:
- Quantidade de palavras: ${targetWords} palavras (margem aceita: ${minWords}-${maxWords})
- Este é um requisito OBRIGATÓRIO. Conte as palavras antes de finalizar.
- Não pare antes de atingir a quantidade solicitada.

# DIRETRIZES OBRIGATÓRIAS
1. **Profundidade e Valor**: Forneça conteúdo substancial, informativo e útil que agregue valor real ao leitor
2. **Estrutura Clara**: Organize o conteúdo com introdução, desenvolvimento lógico e conclusão natural
3. **Tom Consistente**: Mantenha o tom ${metadata.tone} durante todo o texto
4. **Público-Alvo**: Escreva considerando especificamente o público ${metadata.audience}
5. **Engajamento**: Use exemplos práticos, analogias relevantes e linguagem envolvente
6. **Formatação**: Use markdown apropriadamente (títulos, listas, negrito, itálico) para melhorar a legibilidade
7. **Palavras-chave**: Integre naturalmente as seguintes palavras-chave quando relevante: ${sectionKeywords}
8. **Extensão**: Garanta exatamente ${targetWords} palavras no texto final
9. **Originalidade**: Garanta que o conteúdo seja único, autêntico e livre de plágio
10. **Coesão**: Mantenha coerência com o tema geral do ebook e a proposta do capítulo

# ELEMENTOS A INCLUIR
- Introdução que contextualize o tema da seção
- Desenvolvimento com explicações detalhadas e fundamentadas
- Exemplos práticos ou estudos de caso quando apropriado
- Listas ou bullet points para organizar informações complexas
- Conclusão que reforce os pontos principais e conecte com o próximo conteúdo
- Transições suaves entre parágrafos e ideias

# FORMATO DE SAÍDA
Retorne APENAS o conteúdo da seção em markdown, bem estruturado e pronto para ser incorporado ao ebook.
Não inclua o título da seção no início (será adicionado automaticamente).
Foque em criar conteúdo profissional, informativo e de alta qualidade.
IMPORTANTE: Garanta que o texto final tenha ${targetWords} palavras.`;
    }

    generatePromptForExpandText(text: string, tone?: string, keywords?: string[], length?: string): string {
        const toneInstruction = tone ? `\n- Tom desejado: ${tone}` : '';
        const keywordsInstruction = keywords && keywords.length > 0 
            ? `\n- Palavras-chave a incorporar naturalmente: ${keywords.join(', ')}` 
            : '';
        
        let lengthInstruction = '';
        if (length === 'curto') {
            lengthInstruction = '\n- Extensão: Expandir moderadamente (50-100% maior que o original)';
        } else if (length === 'médio') {
            lengthInstruction = '\n- Extensão: Expandir significativamente (100-200% maior que o original)';
        } else if (length === 'longo') {
            lengthInstruction = '\n- Extensão: Expandir extensivamente (200-300% maior que o original)';
        }

        return `Você é um especialista em redação e expansão de conteúdo editorial.

# TAREFA
Expanda o seguinte texto, mantendo seu significado original mas adicionando profundidade, detalhes e valor informativo.

# TEXTO ORIGINAL
"${text}"

# INSTRUÇÕES${toneInstruction}${keywordsInstruction}${lengthInstruction}

# DIRETRIZES PARA EXPANSÃO
1. **Preservação do Significado**: Mantenha a mensagem central e ideias principais do texto original
2. **Adição de Valor**: Inclua:
   - Explicações mais detalhadas dos conceitos mencionados
   - Exemplos práticos e contextualizações
   - Informações complementares relevantes
   - Nuances e sutilezas do tema
   - Argumentos de apoio e evidências quando apropriado
3. **Fluidez**: O texto expandido deve fluir naturalmente, sem parecer artificial ou repetitivo
4. **Estrutura**: Organize as informações adicionais de forma lógica e coerente
5. **Qualidade**: Mantenha alta qualidade de escrita, com gramática e ortografia impecáveis
6. **Originalidade**: Adicione perspectivas únicas e insights valiosos
7. **Formatação**: Use markdown apropriadamente para melhorar a legibilidade

# FORMATO DE SAÍDA
Retorne APENAS o texto expandido, bem estruturado e pronto para uso.
Não adicione comentários explicativos ou notas sobre a expansão realizada.`;
    }

    generatePromptForRewriteText(text: string, objective?: string, tone?: string): string {
        const toneInstruction = tone ? `\n- Tom desejado: ${tone}` : '';
        
        let objectiveDescription = '';
        switch(objective) {
            case 'parafrasear':
                objectiveDescription = 'Reescrever o texto usando palavras e estruturas diferentes, mantendo o mesmo significado';
                break;
            case 'formalizar':
                objectiveDescription = 'Transformar o texto em uma versão mais formal, profissional e acadêmica';
                break;
            case 'simplificar':
                objectiveDescription = 'Simplificar o texto, tornando-o mais claro, direto e acessível';
                break;
            case 'humanizar':
                objectiveDescription = 'Tornar o texto mais natural, conversacional e humano, removendo características de texto gerado por IA';
                break;
            default:
                objectiveDescription = 'Parafrasear o texto mantendo o significado original';
        }

        return `Você é um especialista em reescrita e otimização de conteúdo editorial.

# TAREFA
${objectiveDescription}

# TEXTO ORIGINAL
"${text}"

# INSTRUÇÕES${toneInstruction}

# DIRETRIZES PARA REESCRITA
1. **Preservação do Significado**: Mantenha todas as ideias e informações principais do texto original
2. **Originalidade**: Crie uma versão completamente única e original do texto
3. **Naturalidade**: O texto reescrito deve soar natural e fluente
4. **Estrutura Variada**: Varie a estrutura das frases e parágrafos
5. **Vocabulário Rico**: Use sinônimos apropriados e vocabulário diversificado
6. **Coerência**: Mantenha a coesão e lógica do texto original
7. **Qualidade**: Garanta gramática e ortografia impecáveis
8. **Estilo**: ${objective === 'humanizar' 
    ? 'Use linguagem natural, variações de ritmo, e evite padrões repetitivos típicos de IA' 
    : objective === 'formalizar' 
    ? 'Use linguagem formal, técnica quando apropriado, e evite coloquialismos' 
    : objective === 'simplificar'
    ? 'Use frases curtas, vocabulário acessível, e estrutura direta'
    : 'Mantenha o estilo geral do texto original enquanto o torna único'}

# FORMATO DE SAÍDA
Retorne APENAS o texto reescrito, sem comentários adicionais ou explicações sobre as mudanças realizadas.
O texto deve estar pronto para uso imediato.`;
    }

    generatePromptForEbookCover(bookInfo: any, style: string, additionalInstructions: string): string {
        // Build text elements that MUST appear on cover (with quotes)
        const textElements: string[] = [];
        
        if (bookInfo.title) {
            textElements.push(`"${bookInfo.title}"`);
        }
        if (bookInfo.subtitle) {
            textElements.push(`"${bookInfo.subtitle}"`);
        }
        if (bookInfo.author) {
            textElements.push(`"${bookInfo.author}"`);
        }
        if (bookInfo.publisher) {
            textElements.push(`"${bookInfo.publisher}"`);
        }
        if (bookInfo.edition) {
            textElements.push(`"${bookInfo.edition}"`);
        }
        if (bookInfo.series && bookInfo.seriesNumber) {
            textElements.push(`"${bookInfo.series} - ${bookInfo.seriesNumber}"`);
        } else if (bookInfo.series) {
            textElements.push(`"${bookInfo.series}"`);
        }
        
        // Build visual description
        const parts: string[] = [];
        
        // Main description
        const genreDesc = bookInfo.genre || 'book';
        const audienceDesc = bookInfo.targetAudience ? ` for ${bookInfo.targetAudience}` : '';
        parts.push(`A professional ${genreDesc} cover${audienceDesc}`);
        
        // Text placement
        if (textElements.length > 0) {
            parts.push(`with the text ${textElements.join(', ')} clearly displayed on the cover`);
        }
        
        // Visual concept from idea/keywords
        if (bookInfo.idea) {
            parts.push(`featuring ${bookInfo.idea}`);
        }
        
        if (bookInfo.keywords && bookInfo.keywords.length > 0) {
            parts.push(`visual elements: ${bookInfo.keywords.slice(0, 3).join(', ')}`);
        }
        
        // Additional visual instructions
        if (additionalInstructions) {
            parts.push(additionalInstructions);
        }
        
        // Style and quality
        parts.push('Clean typography, balanced composition, professional book cover design, high-quality polished appearance, commercially appealing');
        
        // Assemble prompt (aim for under 150 words as per Ideogram docs)
        const prompt = parts.join('. ') + '.';
        
        return prompt;
    }

    generatePromptForEbookImage(description: string, keywords: string[], context?: any): string {
        // Para imagens de seção: apenas usar o prompt do usuário diretamente
        // O usuário quer liberdade total para suas ideias sem interferência do sistema
        // Apenas garantir que seja uma string válida
        const validDescription = description && description.trim() !== '' ? description.trim() : 'A beautiful illustration';

        // Retornar apenas o prompt do usuário - sem adicionar texto extra
        // O magic_prompt_option: 'On' no Replicate vai otimizar o prompt automaticamente
        return validDescription;
    }
}
