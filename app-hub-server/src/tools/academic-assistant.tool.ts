import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const academicAssistantTool: Tool = {
  title: 'Academic Assistant',
  description: 'Gera conteúdo acadêmico como introduções, conclusões e formatação',
  costPreview: 2,
  schema: {
    type: 'function',
    function: {
      name: 'academic_assistant',
      description: 'Gera conteúdo acadêmico',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Tipo (introducao/conclusao/formatador)' },
          theme: { type: 'string', description: 'Tema' },
          context: { type: 'string', description: 'Contexto' },
          keywords: { type: 'string', description: 'Palavras-chave' }
        },
        required: ['type', 'theme']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Usar tool_calls nativo do OpenAI para garantir formato correto
    const tools = [{
      type: 'function',
      function: {
        name: 'academic_assistant_result',
        description: 'Resultado do assistente acadêmico',
        parameters: {
          type: 'object',
          properties: {
            academicContent: { type: 'string', description: 'Conteúdo acadêmico gerado' }
          },
          required: ['academicContent']
        }
      }
    }];

    const prompt = `Como assistente acadêmico, gere conteúdo acadêmico do tipo "${args.type}" sobre o tema: "${args.theme}". ${args.context ? `Contexto: ${args.context}` : ''} ${args.keywords ? `Palavras-chave: ${args.keywords}` : ''}`;

    const response = await openai.createCompletion({
      model: metadata.model || 'google/gemini-2.5-flash-lite-preview-09-2025',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'academic_assistant_result' } },
      toolName: 'academic-assistant',
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
              name: 'academic_assistant_result',
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

    if (!jsonResponse.academicContent) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing academicContent');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 2
    };
  },
  icon: 'bi-book',
  provider: 'openai'
};

export default academicAssistantTool;
