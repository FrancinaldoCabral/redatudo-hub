import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const bookNamesTool: Tool = {
  title: 'Book Names',
  description: 'Gera nomes de livros',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'book_names',
      description: 'Gera nomes de livros',
      parameters: {
        type: 'object',
        properties: {
          theme: { type: 'string', description: 'Tema' },
          genre: { type: 'string', description: 'Gênero' },
          tone: { type: 'string', description: 'Tom' },
          number: { type: 'number', description: 'Número de sugestões' }
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
        name: 'book_names_result',
        description: 'Resultado da geração de nomes de livros',
        parameters: {
          type: 'object',
          properties: {
            bookNames: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  subtitle: { type: 'string' },
                  creativityScore: { type: 'number', minimum: 1, maximum: 10 }
                },
                required: ['title', 'creativityScore']
              }
            }
          },
          required: ['bookNames']
        }
      }
    }];

    const prompt = args.theme;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-4o-mini',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'book_names_result' } },
      toolName: 'book-names',
      metadata: metadata
    });

    // O LLM deve retornar uma tool_call com os parâmetros corretos
    const message = response.choices[0].message as any;
    const toolCall = message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: No tool call generated');
    }

    const jsonResponse = JSON.parse(toolCall.function.arguments);

    if (!jsonResponse.bookNames || !Array.isArray(jsonResponse.bookNames)) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing or invalid bookNames array');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-book-half',
  provider: 'openai'
};

export default bookNamesTool;
