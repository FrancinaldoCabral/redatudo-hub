import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const aiHumanizerTool: Tool = {
  title: 'AI Humanizer',
  description: 'Humaniza texto gerado por IA',
  costPreview: 2,
  schema: {
    type: 'function',
    function: {
      name: 'ai_humanizer',
      description: 'Humaniza texto gerado por IA',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto de IA' }
        },
        required: ['text']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Usar tool_calls nativo do OpenAI para garantir formato correto
    const tools = [{
      type: 'function',
      function: {
        name: 'ai_humanizer_result',
        description: 'Resultado da humanização de texto de IA',
        parameters: {
          type: 'object',
          properties: {
            humanizedText: { type: 'string', description: 'Texto humanizado' },
            aiDetectionBefore: { type: 'number', minimum: 0, maximum: 100 },
            aiDetectionAfter: { type: 'number', minimum: 0, maximum: 100 },
            wordsChanged: { type: 'number', minimum: 0 },
            totalWords: { type: 'number', minimum: 0 }
          },
          required: ['humanizedText', 'aiDetectionBefore', 'aiDetectionAfter', 'wordsChanged', 'totalWords']
        }
      }
    }];

    const prompt = `Humanize o seguinte texto de IA: ${args.text}. Torne-o mais natural e humano.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-4o-mini',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'ai_humanizer_result' } },
      toolName: 'ai-humanizer',
      metadata: metadata
    });

    // O LLM deve retornar uma tool_call com os parâmetros corretos
    const message = response.choices[0].message as any;
    const toolCall = message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: No tool call generated');
    }

    const jsonResponse = JSON.parse(toolCall.function.arguments);

    if (!jsonResponse.humanizedText) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing humanizedText');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 2
    };
  },
  icon: 'bi-person-check',
  provider: 'openai'
};

export default aiHumanizerTool;
