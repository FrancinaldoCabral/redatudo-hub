import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { PromptService } from '../services/prompt.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const promptService = new PromptService();

const ebookExpandTextTool: Tool = {
  title: 'Ebook Expand Text',
  description: 'Expande um texto existente, adicionando mais detalhes e profundidade.',
  costPreview: 50, // Custo inicial de placeholder, será ajustado
  schema: {
    type: 'function',
    function: {
      name: 'ebook_expand_text',
      description: 'Expande um texto existente, adicionando mais detalhes e profundidade.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'O texto original a ser expandido.',
          },
          tone: {
            type: 'string',
            description: 'O tom desejado para a expansão do texto (ex: formal, casual, profissional, criativo).',
            enum: ['formal', 'casual', 'profissional', 'criativo', 'neutro'],
            default: 'neutro'
          },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de palavras-chave a serem incluídas na expansão do texto.',
          },
          length: {
            type: 'string',
            description: 'O comprimento desejado para o texto expandido (ex: "curto", "médio", "longo").',
            enum: ['curto', 'médio', 'longo'],
            default: 'médio'
          }
        },
        required: ['text'],
      },
    },
  },
  action: async (args: { text: string, tone?: string, keywords?: string[], length?: string }, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    const fullPrompt = promptService.generatePromptForExpandText(args.text, args.tone, args.keywords, args.length);

    const tools = [{
        type: 'function',
        function: {
          name: 'ebook_expand_text_result',
          description: 'Texto expandido do ebook.',
          parameters: {
            type: 'object',
            properties: {
              expandedText: { type: 'string', description: 'O texto original expandido.' },
            },
            required: ['expandedText'],
          },
        },
      }];

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-5-nano',
      max_tokens: 64000,
      messages: [{ role: 'user', content: fullPrompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'ebook_expand_text_result' } },
      toolName: 'ebook-expand-text'
    });

    const message = response.choices[0].message as any;
    let toolCall = message?.tool_calls?.[0];

    // Fallback: se não houver tool_calls, tenta extrair JSON do content
    if (!toolCall && message.content) {
      try {
        const jsonMatch = message.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          toolCall = {
            function: {
              name: 'ebook_expand_text_result',
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

    const { expandedText } = extractValidJson(toolCall.function.arguments);

    // TODO: Implementar cálculo de créditos dinâmico baseado no uso real (tokens, etc.)
    const creditsCharged = 50; // Placeholder

    return {
      role: 'tool',
      content: { expandedText: expandedText },
      tool_call_id: tool_call_id,
      credits: creditsCharged,
    };
  },
  icon: 'bi-arrows-expand',
  provider: 'llm',
};

export default ebookExpandTextTool;
