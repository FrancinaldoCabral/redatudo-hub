import { RouterApiOpenAI } from '../../services/openrouter.service';

export class OpenrouterChatService {
  private readonly openai: RouterApiOpenAI;

  constructor() {
    this.openai = new RouterApiOpenAI();
  }

  async createChatCompletion(form: any): Promise<any> {
    return await this.openai.createCompletion(form);
  }
}
