import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const usernameGeneratorTool: Tool = {
  title: 'Username Generator',
  description: 'Gera usernames únicos para redes sociais',
  costPreview: 0.5,
  schema: {
    type: 'function',
    function: {
      name: 'username_generator',
      description: 'Gera usernames únicos',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: 'Palavras-chave' },
          style: { type: 'string', description: 'Estilo (short/creative/professional/funny)' },
          includeNumbers: { type: 'boolean', description: 'Incluir números' },
          platform: { type: 'string', description: 'Plataforma' }
        },
        required: ['keywords']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Usar tool_calls nativo do OpenAI para garantir formato correto
    const tools = [{
      type: 'function',
      function: {
        name: 'username_generator_result',
        description: 'Resultado da geração de usernames',
        parameters: {
          type: 'object',
          properties: {
            usernames: {
              type: 'array',
              items: { type: 'string' },
              minItems: 10,
              maxItems: 10
            }
          },
          required: ['usernames']
        }
      }
    }];

    const prompt = `Gere 10 usernames únicos com palavras-chave: ${args.keywords}. Estilo: ${args.style || 'creative'}. Incluir números: ${args.includeNumbers || false}. Plataforma: ${args.platform || ''}.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-5-nano',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'username_generator_result' } },
      toolName: 'username-generator',
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
              name: 'username_generator_result',
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

    if (!jsonResponse.usernames || !Array.isArray(jsonResponse.usernames)) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing or invalid usernames array');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 0.5
    };
  },
  icon: 'bi-person-circle',
  provider: 'openai'
};

export default usernameGeneratorTool;
