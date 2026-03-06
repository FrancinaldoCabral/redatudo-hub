import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const academicConclusionTool: Tool = {
  title: 'Academic Conclusion',
  description: 'Gera conclusões acadêmicas',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'academic_conclusion',
      description: 'Gera conclusões acadêmicas',
      parameters: {
        type: 'object',
        properties: {
          mainPoints: { type: 'string', description: 'Pontos principais' },
          conclusionType: { type: 'string', description: 'Tipo de conclusão' },
          contribution: { type: 'string', description: 'Contribuição' }
        },
        required: ['mainPoints']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Usar tool_calls nativo do OpenAI para garantir formato correto
    const tools = [{
      type: 'function',
      function: {
        name: 'academic_conclusion_result',
        description: 'Resultado da geração de conclusão acadêmica',
        parameters: {
          type: 'object',
          properties: {
            conclusion: { type: 'string', description: 'Texto de conclusão acadêmica' },
            structure: {
              type: 'object',
              properties: {
                thesis: { type: 'string' },
                synthesis: { type: 'string' },
                closing: { type: 'string' },
                futureResearch: { type: 'string' }
              }
            }
          },
          required: ['conclusion']
        }
      }
    }];

    const prompt = `Escreva uma conclusão acadêmica com pontos principais: ${args.mainPoints}. Tipo: ${args.conclusionType || 'geral'}. Contribuição: ${args.contribution || ''}.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-4o-mini',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'academic_conclusion_result' } },
      toolName: 'academic-conclusion',
      metadata: metadata
    });

    // O LLM deve retornar uma tool_call com os parâmetros corretos
    const message = response.choices[0].message as any;
    const toolCall = message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: No tool call generated');
    }

    const jsonResponse = JSON.parse(toolCall.function.arguments);

    if (!jsonResponse.conclusion) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing conclusion');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-check-circle',
  provider: 'openai'
};

export default academicConclusionTool;
