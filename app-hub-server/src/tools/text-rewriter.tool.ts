import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const textRewriterTool: Tool = {
  title: 'Text Rewriter',
  description: 'Reescreve texto com diferentes objetivos',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'text_rewriter',
      description: 'Reescreve texto com diferentes objetivos',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto original' },
          objective: { type: 'string', description: 'Objetivo (parafrasear/formalizar/simplificar)' },
          level: { type: 'string', description: 'Nível de reformulação' },
          keywords: { type: 'string', description: 'Palavras-chave a manter' }
        },
        required: ['text']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Sistema dinâmico de créditos baseado no tamanho do texto
    const textLength = args.text?.length || 0;
    const credits = textLength > 1000 ? 2 : 1;

    // Usar tool_calls nativo do OpenAI para garantir formato correto
    const tools = [{
      type: 'function',
      function: {
        name: 'text_rewriter_result',
        description: 'Resultado da reescrita de texto',
        parameters: {
          type: 'object',
          properties: {
            rewrittenText: { type: 'string', description: 'Texto reescrito' }
          },
          required: ['rewrittenText']
        }
      }
    }];

    const prompt = `Reescreva o seguinte texto com o objetivo de ${args.objective || 'parafrasear'}.

Texto original:
"${args.text}"

Nível de reformulação: ${args.level || 'médio'}
${args.keywords ? `Mantenha as seguintes palavras-chave: ${args.keywords}` : ''}

Mantenha o significado original, mas torne o texto único e natural.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'google/gemini-2.5-flash-lite-preview-09-2025',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'text_rewriter_result' } },
      toolName: 'text-rewriter'
    });

    // O LLM deve retornar uma tool_call com os parâmetros corretos
    const message = response.choices[0].message as any;
    let toolCall = message.tool_calls?.[0];

    // Fallback: se não houver tool_calls, tenta extrair JSON do content
    if (!toolCall && message.content) {
      try {
        const jsonMatch = message.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          toolCall = {
            function: {
              name: 'text_rewriter_result',
              arguments: JSON.stringify(parsed)
            }
          };
        }
      } catch (e) {
        // Fallback falhou, continuar para erro
      }
    }

    if (!toolCall) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: No tool call generated');
    }

    const jsonResponse = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments) 
      : toolCall.function.arguments;

    if (!jsonResponse.rewrittenText) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing rewrittenText');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: credits
    };
  },
  icon: 'bi-pencil-square',
  provider: 'openai'
};

export default textRewriterTool;
