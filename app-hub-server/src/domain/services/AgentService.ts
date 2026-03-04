import { CreditsService } from '../../services/credits.service';
import { CountCreditGpt } from '../../services/count-credit-gpt';
import { sendStatus } from '../../services/system.service';
import { getTools } from '../../services/tools.service';
import { TimeServerService } from '../../services/count-server-time.service';
import { addHistoric } from '../../services/historic.service';
import { isJobAborted } from '../../services/abort.service';

interface Metadata {
  userId: string;
  conversationId: string;
  jobId: string | number;
  routerApiKey?: string;
  replicateApiKey?: string;
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatService {
  createChatCompletion(form: any): Promise<any>;
}

interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export class AgentService {
  private readonly creditsService = new CreditsService();
  private readonly countCredit = new CountCreditGpt();
  private readonly serverCostPerSecond = 0.000005401234567901234; // custo de servidor por segundo
  private readonly timeoutMs = 300000; // 5 minutos timeout para cada requisição

  constructor(
    private readonly chatService: ChatService,
    private readonly logger: Logger,
  ) {}

  async agentExecute(form: any, metadata: any): Promise<{ content: string; formFeedback: { toolCallsText: string } }> {
    const timeService = new TimeServerService();
    timeService.start();
    
    if (await isJobAborted(metadata.jobId)) throw new Error('Job cancelled')
//    console.log('BUSCA ERROS (form): ', form)
    let systemRequest = await this.safeChatRequest(form);
    let { message: responseMessage, finish_reason: finishReason } = systemRequest.choices[0];
    let inputTokens = systemRequest.usage.prompt_tokens;
    let outputTokens = systemRequest.usage.completion_tokens;
//    console.log('BUSCA ERROS (responseMessage): ', responseMessage)


    let toolCallsText = '';
    let toolCallCount = 0;

    this.logger.info('Model:', form.model);
    this.logger.info('First response:', responseMessage);

    while (finishReason === 'tool_calls') {
      toolCallsText += `Tool call nº ${toolCallCount + 1}\n`;
      form.messages.push(responseMessage);

      const toolCalls = responseMessage.tool_calls as ToolCall[];
      for (const t of toolCalls) {
        toolCallsText += `Tool: ${t.function.name}, Arguments: ${t.function.arguments}\n`;
      }

      const messagesTools = await this.runTools(toolCalls, metadata);
      form.messages.push(...messagesTools.map(m => ({
        role: m.role,
        content: m.content,
        tool_call_id: m.tool_call_id,
      })));

      if (await isJobAborted(metadata.jobId)) throw new Error('Job cancelled')
      systemRequest = await this.safeChatRequest(form);
      ({ message: responseMessage, finish_reason: finishReason } = systemRequest.choices[0]);
      inputTokens += systemRequest.usage.prompt_tokens;
      outputTokens += systemRequest.usage.completion_tokens;
      toolCallCount++;
    }

    timeService.end();

    const totalCredits = await this.calculateTotalCredits(form.model, inputTokens, outputTokens, timeService.calculateDuration());

    await this.registerHistoric(metadata, totalCredits);

    if (!metadata.routerApiKey) {
      await this.creditsService.subtractCredit(metadata.userId, `${totalCredits}`);
    }

    return {
      content: responseMessage.content,
      formFeedback: { toolCallsText: toolCallsText || 'Empty' },
    };
  }

  private async safeChatRequest(form: any) {
    try {
      return await this.chatService.createChatCompletion(form);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.error('Chat request aborted due to timeout.');
        throw new Error('Request timeout: exceeded allowed time.');
      }
      this.logger.error('Chat request failed:', error);
      throw new Error('Chat request error.');
    }
  }

  private async runTools(toolCalls: ToolCall[], metadata: Metadata): Promise<any[]> {
    const tools = await getTools();
    const responses = [];

    for (const toolCall of toolCalls) {
      const tool = tools.find(t => t.schema.function.name === toolCall.function.name);
      if (!tool) {
        responses.push(this.createErrorToolMessage(toolCall.id, toolCall.function.name, 'Tool not found.'));
        continue;
      }

      const hasApiProvider = this.hasApiProvider(tool.provider, metadata);
      const userBalance = await this.creditsService.checkBalance(parseInt(metadata.userId));

      if (parseFloat(`${userBalance}`) < tool.costPreview && !hasApiProvider) {
        const errorMessage = `The minimum expected cost for the tool ${tool.title} is ${tool.costPreview}, but your balance is ${userBalance}. Please recharge your credits.`;
        await sendStatus(metadata.userId, `${tool.title}... Insufficient credits.`);
        responses.push(this.createErrorToolMessage(toolCall.id, tool.title, errorMessage));
        continue;
      }

      try {
        await sendStatus(metadata.userId, `${tool.title}...`);
        const args = JSON.parse(toolCall.function.arguments);
        
        if (await isJobAborted(metadata.jobId)) {
          await sendStatus(metadata.userId, `Canceling ${tool.title.toLowerCase()}...`);
          throw new Error('Job cancelled')
        }
        const result = await tool.action(args, toolCall.function.name, metadata, toolCall.id);

        await addHistoric({
          userId: metadata.userId,
          operation: 'debit',
          description: tool.title,
          total: -result.credits,
          createdAt: new Date(),
        });

        if (!hasApiProvider) {
          await this.creditsService.subtractCredit(parseInt(metadata.userId), `${result.credits}`);
        }

        responses.push(result);
      } catch (error: any) {
        this.logger.error(`Error running tool ${tool.title}:`, error);
        responses.push(this.createErrorToolMessage(toolCall.id, tool.title, `Error running tool: ${error.message || error}`));
      }
    }

    return responses;
  }

  private hasApiProvider(provider: string, metadata: Metadata): boolean {
    return (
      (provider === 'openai' && !!metadata.routerApiKey) ||
      (provider === 'replicate' && !!metadata.replicateApiKey) ||
      provider === 'free'
    );
  }

  private createErrorToolMessage(toolCallId: string, toolName: string, message: string) {
    return {
      tool_call_id: toolCallId,
      role: 'tool',
      name: toolName,
      content: message,
      is_error: true,
    };
  }

  private async calculateTotalCredits(model: string, inputTokens: number, outputTokens: number, durationSeconds: number): Promise<number> {
    const inputCredits = this.countCredit.creditsByTokens(inputTokens, model, 'input');
    const outputCredits = this.countCredit.creditsByTokens(outputTokens, model, 'output');
    const serverCredits = durationSeconds * this.serverCostPerSecond;

    this.logger.info('Credit calculation:', { inputCredits, outputCredits, serverCredits });

    return inputCredits + outputCredits + serverCredits;
  }

  private async registerHistoric(metadata: Metadata, totalCredits: number) {
    const description = metadata.routerApiKey ? 'Assistant - with an API' : 'Assistant';

    await addHistoric({
      userId: metadata.userId,
      operation: 'debit',
      description,
      total: -totalCredits,
      createdAt: new Date(),
    });
  }
}
