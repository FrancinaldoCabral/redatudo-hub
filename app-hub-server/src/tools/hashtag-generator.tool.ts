import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const hashtagGeneratorTool: Tool = {
  title: 'Hashtag Generator',
  description: 'Gera hashtags para redes sociais',
  costPreview: 0.5,
  schema: {
    type: 'function',
    function: {
      name: 'hashtag_generator',
      description: 'Gera hashtags',
      parameters: {
        type: 'object',
        properties: {
          theme: { type: 'string', description: 'Tema' },
          platform: { type: 'string', description: 'Plataforma' },
          number: { type: 'number', description: 'Número de hashtags' }
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
        name: 'hashtag_generator_result',
        description: 'Resultado da geração de hashtags',
        parameters: {
          type: 'object',
          properties: {
            hashtags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hashtag: { type: 'string' },
                  volume: { type: 'string' },
                  competition: { type: 'string', enum: ['high', 'medium', 'low'] },
                  relevance: { type: 'number', minimum: 1, maximum: 10 }
                },
                required: ['hashtag', 'volume', 'competition', 'relevance']
              }
            }
          },
          required: ['hashtags']
        }
      }
    }];
//    console.log('ARGS: ', args)
    const prompt = args.theme;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-4o-mini',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'hashtag_generator_result' } },
      toolName: 'hashtag-generator',
      metadata: metadata
    });

    // O LLM deve retornar uma tool_call com os parâmetros corretos
    const message = response.choices[0].message as any;
    const toolCall = message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: No tool call generated');
    }

    const jsonResponse = JSON.parse(toolCall.function.arguments);

    if (!jsonResponse.hashtags || !Array.isArray(jsonResponse.hashtags)) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing or invalid hashtags array');
    }
//    console.log('JSON RESPONSE: ', jsonResponse)
    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 0.5
    };
  },
  icon: 'bi-hash',
  provider: 'openai'
};

export default hashtagGeneratorTool;
