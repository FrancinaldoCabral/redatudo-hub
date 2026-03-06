import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const instagramCaptionsTool: Tool = {
  title: 'Instagram Captions',
  description: 'Gera legendas para Instagram',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'instagram_captions',
      description: 'Gera legendas para Instagram',
      parameters: {
        type: 'object',
        properties: {
          theme: { type: 'string', description: 'Tema' },
          tone: { type: 'string', description: 'Tom' },
          emojis: { type: 'boolean', description: 'Incluir emojis' },
          number: { type: 'number', description: 'Número de legendas' }
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
        name: 'instagram_captions_result',
        description: 'Resultado da geração de legendas para Instagram',
        parameters: {
          type: 'object',
          properties: {
            captions: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['captions']
        }
      }
    }];

    const prompt = `Gere ${args.number || 5} legendas para Instagram sobre ${args.theme}. Tom: ${args.tone || ''}. Emojis: ${args.emojis || false}.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-5-nano',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'instagram_captions_result' } },
      toolName: 'instagram-captions',
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
          const jsonResponse = JSON.parse(jsonMatch[0]);
          if (jsonResponse.captions || Array.isArray(jsonResponse)) {
            // Wrap em formato esperado
            toolCall = {
              function: {
                name: 'instagram_captions_result',
                arguments: JSON.stringify(Array.isArray(jsonResponse) ? { captions: jsonResponse } : jsonResponse)
              }
            };
          }
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

    if (!jsonResponse.captions || !Array.isArray(jsonResponse.captions)) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing or invalid captions array');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-instagram',
  provider: 'openai'
};

export default instagramCaptionsTool;
