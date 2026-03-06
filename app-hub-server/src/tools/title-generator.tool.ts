import { Tool } from './protocols/tools.protocols';
import { RouterApiOpenAI } from '../services/openrouter.service';
import { extractValidJson } from '../services/extract-valid-json.service';

const titleGeneratorTool: Tool = {
  title: 'Title Generator',
  description: 'Gera títulos criativos para diferentes tipos de conteúdo',
  costPreview: 1,
  schema: {
    type: 'function',
    function: {
      name: 'title_generator',
      description: 'Gera títulos criativos',
      parameters: {
        type: 'object',
        properties: {
          theme: { type: 'string', description: 'Tema' },
          type: { type: 'string', description: 'Tipo (livro/blog/youtube/tcc/produto)' },
          tone: { type: 'number', description: 'Tom (1-10)' },
          number: { type: 'number', description: 'Número de títulos' }
        },
        required: ['theme', 'type']
      }
    }
  },
  action: async (args: any, functionName: string, metadata: any, tool_call_id?: string) => {
    const openai = new RouterApiOpenAI();

    const prompt = `Gere ${args.number || 9} títulos criativos e únicos para ${args.type} sobre "${args.theme}". Cada título deve ser original, envolvente e adaptado ao tom ${args.tone || 8} (onde 1 é sério e 10 é muito criativo). Evite títulos genéricos como "Título 1". Foque em variações interessantes e relevantes.

Responda APENAS com um JSON válido no formato:
{
  "titles": [
    {"title": "Título exemplo", "creativity": 8},
    {"title": "Outro título", "creativity": 7}
  ]
}`;

    const response = await openai.createCompletion({
      model: metadata.model || 'openai/gpt-4o-mini',
      max_tokens: 64000,
      messages: [{ role: 'user', content: prompt }],
      toolName: 'title-generator',
      metadata: metadata
    });

    const content = response.choices[0].message.content;
    const jsonResponse = extractValidJson(content);

    if (!jsonResponse || !jsonResponse.titles || !Array.isArray(jsonResponse.titles)) {
      throw new Error('INVALID_RESPONSE_FORMAT: Unable to parse titles from response');
    }

    return {
      role: 'tool',
      content: jsonResponse,
      tool_call_id: tool_call_id,
      credits: 1
    };
  },
  icon: 'bi-type-h1',
  provider: 'openai'
};

export default titleGeneratorTool;
