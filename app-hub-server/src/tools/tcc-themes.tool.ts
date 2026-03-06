import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const tccThemesTool: Tool = {
  title: 'TCC Themes',
  description: 'Gera temas para TCC',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'tcc_themes',
      description: 'Gera temas para TCC',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'string', description: 'Área de estudo' },
          level: { type: 'string', description: 'Nível (graduação/mestrado)' },
          number: { type: 'number', description: 'Número de temas' }
        },
        required: ['area']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Usar tool_calls nativo do OpenAI para garantir formato correto
    const tools = [{
      type: 'function',
      function: {
        name: 'tcc_themes_result',
        description: 'Resultado da geração de temas para TCC',
        parameters: {
          type: 'object',
          properties: {
            themes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  justification: { type: 'string' },
                  relevance: { type: 'number', minimum: 1, maximum: 5 },
                  difficulty: { type: 'string', enum: ['facil', 'medio', 'avancado'] }
                },
                required: ['title', 'justification', 'relevance', 'difficulty']
              }
            }
          },
          required: ['themes']
        }
      }
    }];

    const prompt = `Gere ${args.number || 5} temas para TCC na área de ${args.area}. Nível: ${args.level || 'graduação'}.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-4o-mini',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'tcc_themes_result' } },
      toolName: 'tcc-themes',
      metadata: metadata
    });

    // O LLM deve retornar uma tool_call com os parâmetros corretos
    const message = response.choices[0].message as any;
    const toolCall = message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: No tool call generated');
    }

    const jsonResponse = JSON.parse(toolCall.function.arguments);

    if (!jsonResponse.themes || !Array.isArray(jsonResponse.themes)) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing or invalid themes array');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-mortarboard',
  provider: 'openai'
};

export default tccThemesTool;
