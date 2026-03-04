import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const abntCorrectorTool: Tool = {
  title: 'ABNT Corrector',
  description: 'Corrige texto segundo normas ABNT',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'abnt_corrector',
      description: 'Corrige texto segundo normas ABNT',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Texto a corrigir' },
          mode: { type: 'string', description: 'Modo de correção (academico/formal/casual)' }
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
        name: 'abnt_corrector_result',
        description: 'Resultado da correção ABNT',
        parameters: {
          type: 'object',
          properties: {
            correctedText: { type: 'string', description: 'Texto corrigido completo' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['ortografia', 'gramatica', 'abnt', 'melhoria'] },
                  original: { type: 'string' },
                  suggestion: { type: 'string' },
                  explanation: { type: 'string' }
                }
              }
            },
            qualityScore: { type: 'number', minimum: 0, maximum: 100 },
            abntCompliant: { type: 'boolean' }
          },
          required: ['correctedText', 'errors', 'qualityScore', 'abntCompliant']
        }
      }
    }];

    const prompt = `Corrija o seguinte texto segundo as normas ABNT no modo ${args.mode || 'formal'}:

Texto: "${args.text}"

Forneça a correção completa com todas as informações necessárias.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-5-nano',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'abnt_corrector_result' } },
      toolName: 'abnt-corrector',
      temperature: 0.01,
      metadata: metadata
    });

    // O LLM deve retornar uma tool_call com os parâmetros corretos
    const message = response.choices[0].message as any;
    const toolCall = message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: No tool call generated');
    }

    const jsonResponse = JSON.parse(toolCall.function.arguments);

    if (!jsonResponse.correctedText) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing correctedText');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-file-earmark-text',
  provider: 'openai'
};

export default abntCorrectorTool;
