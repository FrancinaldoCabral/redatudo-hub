import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { PromptService } from '../services/prompt.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const promptService = new PromptService();

const ebookRewriteTextTool: Tool = {
  title: 'Ebook Rewrite Text',
  description: 'Reescreve um texto existente com um novo objetivo ou tom.',
  costPreview: 50, // Custo inicial de placeholder, será ajustado
  schema: {
    type: 'function',
    function: {
      name: 'ebook_rewrite_text',
      description: 'Reescreve um texto existente com um novo objetivo ou tom.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'O texto original a ser reescrito.',
          },
          objective: {
            type: 'string',
            description: 'O objetivo da reescrita (ex: parafrasear, formalizar, simplificar).',
            enum: ['parafrasear', 'formalizar', 'simplificar', 'humanizar'],
            default: 'parafrasear'
          },
          tone: {
            type: 'string',
            description: 'O tom desejado para o texto reescrito (ex: formal, casual, profissional, criativo).',
            enum: ['formal', 'casual', 'profissional', 'criativo', 'neutro'],
            default: 'neutro'
          }
        },
        required: ['text'],
      },
    },
  },
  action: async (args: { text: string, objective?: string, tone?: string }, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    const fullPrompt = promptService.generatePromptForRewriteText(args.text, args.objective, args.tone);

    const tools = [{
        type: 'function',
        function: {
          name: 'ebook_rewrite_text_result',
          description: 'Texto reescrito do ebook.',
          parameters: {
            type: 'object',
            properties: {
              rewrittenText: { type: 'string', description: 'O texto original reescrito.' },
            },
            required: ['rewrittenText'],
          },
        },
      }];

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-5-nano',
      max_tokens: 64000,
      messages: [{ role: 'user', content: fullPrompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'ebook_rewrite_text_result' } },
      toolName: 'ebook-rewrite-text'
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
              name: 'ebook_rewrite_text_result',
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

    const { rewrittenText } = extractValidJson(toolCall.function.arguments);

    // TODO: Implementar cálculo de créditos dinâmico baseado no uso real (tokens, etc.)
    const creditsCharged = 50; // Placeholder

    return {
      role: 'tool',
      content: { rewrittenText: rewrittenText },
      tool_call_id: tool_call_id,
      credits: creditsCharged,
    };
  },
  icon: 'bi-pencil-square',
  provider: 'llm',
};

export default ebookRewriteTextTool;
