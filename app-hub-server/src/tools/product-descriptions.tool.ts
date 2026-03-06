import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const productDescriptionsTool: Tool = {
  title: 'Product Descriptions',
  description: 'Gera descrições de produtos',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'product_descriptions',
      description: 'Gera descrições de produtos',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'Produto' },
          features: { type: 'string', description: 'Características' },
          tone: { type: 'string', description: 'Tom' },
          platform: { type: 'string', description: 'Plataforma' }
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
        name: 'product_descriptions_result',
        description: 'Resultado da geração de descrições de produto',
        parameters: {
          type: 'object',
          properties: {
            seoTitle: { type: 'string', description: 'Título SEO otimizado', maxLength: 60 },
            shortDescription: { type: 'string', description: 'Descrição curta', maxLength: 200 },
            longDescription: { type: 'string', description: 'Descrição longa detalhada' },
            bulletPoints: {
              type: 'array',
              items: { type: 'string' },
              minItems: 5,
              maxItems: 5
            }
          },
          required: ['seoTitle', 'shortDescription', 'longDescription', 'bulletPoints']
        }
      }
    }];

    const prompt = `Crie descrições completas para produto de e-commerce:

Produto: ${args.product}
Características: ${args.features || 'N/A'}
Tom: ${args.tone || 'profissional'}
Plataforma: ${args.platform || 'e-commerce geral'}

Crie:
1. Título SEO otimizado (máx 60 caracteres)
2. Descrição curta (2-3 linhas, máx 200 caracteres)
3. Descrição longa (parágrafo completo)
4. 5 bullet points com benefícios`;

    const response = await openai.createCompletion({
      model: metadata.model || 'google/gemini-2.5-flash-lite-preview-09-2025',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      tools: tools,
      tool_choice: { type: 'function', function: { name: 'product_descriptions_result' } },
      toolName: 'product-descriptions',
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
              name: 'product_descriptions_result',
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

    if (!jsonResponse.seoTitle || !jsonResponse.shortDescription) {
      throw new Error('INVALID_TOOL_RESPONSE_FORMAT: Missing required fields');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-box-seam',
  provider: 'openai'
};

export default productDescriptionsTool;
