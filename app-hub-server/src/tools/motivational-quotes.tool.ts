import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const motivationalQuotesTool: Tool = {
  title: 'Motivational Quotes',
  description: 'Gera citações motivacionais',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'motivational_quotes',
      description: 'Gera citações motivacionais',
      parameters: {
        type: 'object',
        properties: {
          theme: { type: 'string', description: 'Tema' },
          tone: { type: 'string', description: 'Tom' },
          number: { type: 'number', description: 'Número de citações' }
        },
        required: ['theme']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Usar tool_calls nativo do OpenAI para garantir formato correto
    const tools = [{
      type: 'function',
      function: {
        name: 'motivational_quotes_result',
        description: 'Resultado da geração de citações motivacionais',
        parameters: {
          type: 'object',
          properties: {
            quotes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  theme: { type: 'string' },
                  style: { type: 'string' }
                },
                required: ['text', 'theme', 'style']
              }
            }
          },
          required: ['quotes']
        }
      }
    }];

    const prompt = `Gere ${args.number || 5} citações motivacionais sobre ${args.theme}. Tom: ${args.tone || ''}.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'google/gemini-2.5-flash-lite-preview-09-2025',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'motivational_quotes_result' } },
      toolName: 'motivational-quotes',
      metadata: metadata
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
              name: 'motivational_quotes_result',
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

    if (!jsonResponse.quotes || !Array.isArray(jsonResponse.quotes)) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing or invalid quotes array');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-quote',
  provider: 'openai'
};

export default motivationalQuotesTool;
