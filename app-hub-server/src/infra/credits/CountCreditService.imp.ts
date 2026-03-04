import { CountCreditService } from '../../domain/services/CountCreditService';
import { CountCreditGpt } from '../../services/count-credit-gpt'; // seu atual

export class CountCreditServiceImp implements CountCreditService {
  private readonly countCredit = new CountCreditGpt();

  countTokens(messages: any[]): number {
    return this.countCredit.countTokens(messages);
  }

  countCredits(content: any, model: string, type: 'input' | 'output'): number {
    return this.countCredit.countCredits(content, model, type);
  }
}
