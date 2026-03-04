import OpenAI from 'openai';

export class OpenAIChatService {
  private readonly openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async createChatCompletion(form: any, signal: AbortSignal): Promise<any> {
    return await this.openai.chat.completions.create({ ...form, signal });
  }
}
