import OpenAI from "openai";
import axios from "axios";
import { extractValidJson } from "./extract-valid-json.service";
import { addHistoric } from "./historic.service";
import { CountCreditGpt } from "./count-credit-gpt";
import envConfig from "../env";
const countCredit = new CountCreditGpt();

export class RouterApiOpenAI {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: envConfig.openRouterKey,
      defaultHeaders: {
        "HTTP-Referer": "https://chat.redatudo.online",
        "X-Title": "redatudo",
      },
    });
  }

  private shouldSimulateToolCalls(tools: any[]): boolean {
    return tools.length > 0;
  }

  private createSystemMessage(tools: any[], userSystemMessage?: string): string {
    if (tools.length === 0) {
      return userSystemMessage || 'You are a helpful assistant.';
    }

    return `
    <tool-simulation-instructions>
    [REQUIRED] Respond EXCLUSIVELY in this format:
    {
      "finish_reason": "tool_calls" | "finish",
      "tool_calls": [{
        "name": "exact_tool_name",
        "arguments": {VALID_OBJECT}
      }]
    }

    Available tools:
    ${JSON.stringify(tools.map(t => t.schema?.function?.name || 'INVALID_TOOL'))}
    </tool-simulation-instructions>
    ${userSystemMessage ? `<user-instructions>${userSystemMessage}</user-instructions>` : ''}
    `;
  }

  async createCompletion(form: {
    model: string,
    messages: any[],
    tools?: any[],
    tool_choice?: any,
    max_tokens?: number,
    toolName?: string,
    temperature?:number,
    metadata?: any,
    referenceFiles?: Array<{
      url: string;
      type: 'pdf' | 'docx' | 'image' | 'video' | 'audio';
      name?: string;
    }>,
    webSearch?: {
      enabled?: boolean;
      engine?: 'native' | 'exa';
      max_results?: number;
      search_prompt?: string;
      search_context_size?: 'low' | 'medium' | 'high';
    }
  }) {
    const { model, messages, tools = [], tool_choice, toolName, metadata, referenceFiles, webSearch } = form;
    console.log('Reference Files:', referenceFiles);
    try {
      // Processar mensagens para incluir file input nativo
      const processedMessages = await this.processMessagesWithFiles(messages, referenceFiles);

      // Usar tools nativo do OpenAI quando disponível
      console.log('Processed Messages:', processedMessages.filter(m => m.role==='user' ).map(m=> m.content));
      if (tools.length > 0) {
        const plugins: any[] = [];
        // PDF parser (mantém comportamento anterior)
        plugins.push({
          id: 'file-parser',
          pdf: { engine: 'mistral-ocr' }
        });
        // Web search plugin se habilitado
        if (webSearch?.enabled) {
          plugins.push({
            id: 'web',
            ...(webSearch.engine ? { engine: webSearch.engine } : {}),
            ...(webSearch.max_results ? { max_results: webSearch.max_results } : {}),
            ...(webSearch.search_prompt ? { search_prompt: webSearch.search_prompt } : {})
          });
        }

        const requestConfig: any = {
          model,
          messages: processedMessages,
          tools: tools,
          tool_choice: tool_choice,
          temperature: 0.7,
          max_tokens: 64000,
          ...(plugins.length > 0 ? { plugins } : {}),
          ...(webSearch?.search_context_size
            ? { web_search_options: { search_context_size: webSearch.search_context_size } }
            : {})
        };
        console.log('Request Config with Tools:', JSON.stringify(requestConfig));

        const completion = await this.openai.chat.completions.create(requestConfig);

        // Registrar custos se for ferramenta individual
        if (toolName && metadata && completion.usage) {
          await this.registerToolCosts(toolName, metadata, completion.usage);
        }

        return completion;
      }

      // Fallback sem tools
      const plugins: any[] = [];
      if (referenceFiles && referenceFiles.length > 0) {
        plugins.push({
          id: 'file-parser',
          pdf: { engine: 'pdf-text' }
        });
        console.log('📋 [OpenRouter PDF] Plugin configurado: pdf-text engine');
      }
      if (webSearch?.enabled) {
        plugins.push({
          id: 'web',
          ...(webSearch.engine ? { engine: webSearch.engine } : {}),
          ...(webSearch.max_results ? { max_results: webSearch.max_results } : {}),
          ...(webSearch.search_prompt ? { search_prompt: webSearch.search_prompt } : {})
        });
        console.log('🌐 [OpenRouter Web] Plugin habilitado');
      }

      const requestConfig: any = {
        model,
        messages: processedMessages,
        temperature: form.temperature || 0.7,
        max_tokens: form.max_tokens || 64000,
        ...(plugins.length > 0 ? { plugins } : {}),
        ...(webSearch?.search_context_size
          ? { web_search_options: { search_context_size: webSearch.search_context_size } }
          : {})
      };

      const completion = await this.openai.chat.completions.create(requestConfig);

      // Registrar custos se for ferramenta individual
      if (toolName && metadata && completion.usage) {
        await this.registerToolCosts(toolName, metadata, completion.usage);
      }

      return completion;

    } catch (error) {
      console.error('API Error:', error);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Processa mensagens para incluir entradas multimodais seguindo a doc oficial do OpenRouter:
   * - PDFs/DOCX: type 'file' com campo file_data (data URI base64)
   * - Imagens: type 'image_url' com campo image_url.url (URL ou data URI base64)
   * - Áudio: type 'input_audio' com campo input_audio { data (base64 sem prefixo), format }
   * - Vídeo: type 'video_url' com campo video_url.url (URL ou data URI base64)
   * Sempre convertemos para base64 quando o arquivo é local/privado para evitar erros de tamanho.
   */
  private async processMessagesWithFiles(messages: any[], referenceFiles?: any): Promise<any[]> {
    if (!referenceFiles || referenceFiles.length === 0) {
      return messages;
    }

    return Promise.all(messages.map(async (message) => {
      if (message.role === 'user') {
        const contentArray: any[] = [];

        if (typeof message.content === 'string') {
          contentArray.push({ type: 'text', text: message.content });
        } else if (Array.isArray(message.content)) {
          contentArray.push(...message.content);
        }

        for (const file of referenceFiles) {
          try {
            console.log(`📎 [OpenRouter MM] Processando: ${file.name} (${file.type})`);

            // Baixar sempre para termos base64 (evita erro "NaN bytes" do SDK)
            const response = await axios.get(file.url, {
              responseType: 'arraybuffer',
              timeout: 30000
            });

            const base64Data = Buffer.from(response.data).toString('base64');
            const fileSize = Buffer.from(base64Data, 'base64').length;

            const ext = (file.name || '').split('.').pop()?.toLowerCase();

            // MIME / formato
            const mimeTypes: Record<string, string> = {
              pdf: 'application/pdf',
              docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              png: 'image/png',
              webp: 'image/webp',
              gif: 'image/gif',
              mp4: 'video/mp4',
              mpeg: 'video/mpeg',
              mov: 'video/mov',
              webm: 'video/webm',
              mp3: 'audio/mpeg',
              wav: 'audio/wav',
              aiff: 'audio/aiff',
              aac: 'audio/aac',
              ogg: 'audio/ogg',
              flac: 'audio/flac',
              m4a: 'audio/mp4'
            };

            const mimeType = mimeTypes[ext || ''] || mimeTypes[file.type] || 'application/octet-stream';

            if (file.type === 'pdf' || file.type === 'docx') {
              const fileData = `data:${mimeType};base64,${base64Data}`;
              contentArray.push({
                type: 'file',
                file: {
                  filename: file.name || `document.${file.type}`,
                  file_data: fileData
                }
              });
              console.log(`✅ [OpenRouter PDF] Base64 anexado (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
              continue;
            }

            if (file.type === 'image') {
              const dataUrl = `data:${mimeType};base64,${base64Data}`;
              contentArray.push({
                type: 'image_url',
                image_url: { url: dataUrl }
              });
              console.log(`✅ [OpenRouter IMG] Base64 anexado (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
              continue;
            }

            if (file.type === 'audio') {
              const format = ext || 'mp3';
              contentArray.push({
                type: 'input_audio',
                input_audio: {
                  data: base64Data,
                  format
                }
              });
              console.log(`✅ [OpenRouter AUDIO] Base64 anexado (${(fileSize / 1024 / 1024).toFixed(2)} MB, format=${format})`);
              continue;
            }

            if (file.type === 'video') {
              const dataUrl = `data:${mimeType};base64,${base64Data}`;
              contentArray.push({
                type: 'video_url',
                video_url: { url: dataUrl }
              });
              console.log(`✅ [OpenRouter VIDEO] Base64 anexado (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
              continue;
            }

            // Fallback genérico
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            contentArray.push({
              type: 'file',
              file: {
                filename: file.name || 'attachment',
                file_data: dataUrl
              }
            });
            console.log(`ℹ️ [OpenRouter MM] Fallback file anexado (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

          } catch (error) {
            console.error(`❌ [OpenRouter MM] Erro ao processar ${file.name}:`, error);
          }
        }

        return { ...message, content: contentArray };
      }

      return message;
    }));
  }

  private handleResponse(completion: OpenAI.ChatCompletion, simulateTools: boolean) {
    if (!simulateTools) {
      return {
        choices: [{
          message: { content: completion.choices[0].message.content },
          finish_reason: completion.choices[0].finish_reason
        }],
        usage: completion.usage
      };
    }

    const content = completion.choices[0].message.content;
    const jsonResponse = extractValidJson(content);

    if (!jsonResponse || !jsonResponse.finish_reason) {
      return {
        choices: [{
          message: { content: "INVALID_TOOL_RESPONSE_FORMAT" },
          finish_reason: "error"
        }],
        usage: completion.usage
      };
    }

    return {
      choices: [{
        message: {
          tool_calls: jsonResponse.tool_calls || [],
          content: jsonResponse.finish_reason === 'finish' ? content : null
        },
        finish_reason: jsonResponse.finish_reason
      }],
      usage: completion.usage
    };
  }

  private createErrorResponse(error?: Error) {
    return {
      choices: [{
        message: {
          content: error?.message || 'API_ERROR',
          role: 'assistant'
        },
        finish_reason: 'error'
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0 }
    };
  }

  private async registerToolCosts(toolName: string, metadata: any, usage: any) {
    // Calcular custos com preços corretos baseados no modelo
    const { inputCredits, outputCredits } = this.calculateAccurateCredits(metadata.model, usage);
    const totalCredits = inputCredits + outputCredits;

    await addHistoric({
      userId: metadata.userId,
      toolName: toolName,
      inputCost: inputCredits,
      outputCost: outputCredits,
      totalCost: totalCredits,
      operation: 'tool_usage_cost',
      createdAt: new Date(),
    });
  }

  private calculateAccurateCredits(modelId: string, usage: any): { inputCredits: number, outputCredits: number } {
    // Mapeamento de preços corretos por modelo (USD por 1M tokens)
    const modelPrices: { [key: string]: { input: number, output: number } } = {
      'google/gemini-2.5-pro': { input: 1.25, output: 10.00 },
      'google/gemini-2.5-flash': { input: 0.30, output: 2.50 },
      'google/gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
      // Modelos antigos (para compatibilidade)
      'anthropic/claude-sonnet-4.5': { input: 3.00, output: 15.00 },
      'openai/gpt-4.1-mini': { input: 0.40, output: 1.60 },
      // Fallback para outros modelos usando preços antigos
      'default': { input: 0.05, output: 0.40 }
    };

    const prices = modelPrices[modelId] || modelPrices['default'];

    const inputCredits = (usage.prompt_tokens * prices.input) / 1_000_000;
    const outputCredits = (usage.completion_tokens * prices.output) / 1_000_000;

    return { inputCredits, outputCredits };
  }
}
