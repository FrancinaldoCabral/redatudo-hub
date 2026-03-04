export interface CountCreditService {
    countTokens(messages: any[]): number;
    countCredits(content: any, model: string, type: 'input' | 'output'): number;
}
  