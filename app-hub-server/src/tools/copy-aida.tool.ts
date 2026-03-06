import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const copyAidaTool: Tool = {
  title: 'Copy AIDA',
  description: 'Gera copy seguindo estrutura AIDA',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'copy_aida',
      description: 'Gera copy AIDA',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'Produto/tema' }
        },
        required: ['product']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    // Usar tool_calls nativo do OpenAI para garantir formato correto
    const tools = [{
      type: 'function',
      function: {
        name: 'copy_aida_result',
        description: 'Resultado da geração de copy AIDA',
        parameters: {
          type: 'object',
          properties: {
            copy: { type: 'string', description: 'Texto de copy AIDA completo' }
          },
          required: ['copy']
        }
      }
    }];

    const prompt = `Crie uma copy de vendas seguindo a fórmula AIDA para este produto/serviço: "${args.product}"

Estrutura AIDA:
- **Atenção (A)**: Headline impactante que chama atenção
- **Interesse (I)**: Desperte curiosidade e interesse com o problema/solução
- **Desejo (D)**: Crie desejo destacando 3 benefícios principais
- **Ação (A)**: Call-to-action clara e convincente

Retorne um texto persuasivo e conciso, totalizando entre 200-400 palavras.`;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-3.5-turbo',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'copy_aida_result' } },
      toolName: 'copy-aida',
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
              name: 'copy_aida_result',
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

    if (!jsonResponse.copy) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing copy');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-card-text',
  provider: 'openai'
};

export default copyAidaTool;
