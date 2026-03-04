import { AgentService } from '../../domain/services/AgentService';
import { CreditsService } from '../../domain/services/CreditsService';
import { CountCreditService } from '../../domain/services/CountCreditService';
import { QdrantVectorService } from '../../domain/services/QdrantVectorService';
import { WordPressUserService } from '../../domain/services/WordPressUserService';
import { SYSTEM_ASSISTANT, SYSTEM_LLM_MODEL } from '../../infra/db/globals.db';

export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly qdrantService: QdrantVectorService,
    private readonly countCredits: CountCreditService,
    private readonly creditsService: CreditsService,
    private readonly wordpressService: WordPressUserService
  ) {}

  async execute(form: any, metadata: any): Promise<any> {
    // Set default model if not provided or invalid
    if (!form.model || form.model === 'auto') {
      form.model = SYSTEM_LLM_MODEL;
    }

    const query = form.messages[form.messages.length - 1].content;
    const limit = metadata.memoryLimit || 5;

    const fcr = await this.qdrantService.getFeedback(query, limit, metadata);

    let fcrMemory = fcr.length === 0 ? 'Empty' : '';
    fcr.forEach((memory: any) => {
      fcrMemory += `User message: ${memory.pageContent}\nAssistant message: ${memory.metadata.assistantMessage}\nTools used for solution: ${memory.metadata.toolCallsText}\nFeedback: ${memory.metadata.feedback}\n\n`;
    });

    while (this.countCredits.countTokens(form.messages) >= 32000) {
      form.messages.splice(0, 2);
    }

    const user = await this.wordpressService.getMe(metadata.token);
    let userText = '';
    Object.keys(user).forEach(key => { userText += `${key}: ${user[key]}\n`; });

    const contentAssistant = SYSTEM_ASSISTANT
      .replace('{CURRENT_USER}', userText)
      .replace('{CURRENT_LANGUAGE}', metadata.userLanguage)
      .replace('{FCR_USER}', fcrMemory)
      .replace('{USER_TIME}', metadata.userTime);

    const formToolsString = JSON.stringify(form.tools) || '';
    const requiredCredits =
      this.countCredits.countCredits(form.messages, form.model, 'input') +
      this.countCredits.countCredits(formToolsString, form.model, 'input');

    const userCredits = await this.creditsService.checkBalance(parseInt(metadata.userId));
    const creditsFloat = parseFloat(`${userCredits}`);

    if (requiredCredits >= creditsFloat && !metadata.routerApiKey) {
      throw new Error(`no credit - Saldo insuficiente. Necessário: ${requiredCredits.toFixed(2)} créditos, Disponível: ${creditsFloat.toFixed(2)} créditos`);
    } else {
      form.messages.unshift({
        role: 'system',
        content: contentAssistant
      });

  //    console.log(form.model);
      return this.agentService.agentExecute(form, metadata);
    }
  }
}
