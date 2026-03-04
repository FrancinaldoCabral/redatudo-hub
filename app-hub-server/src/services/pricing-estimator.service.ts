import { SystemLlmModel } from '../infra/db/globals.db';
import { CountCreditGpt } from './count-credit-gpt';

export class PricingEstimatorService {
    private countCreditGpt: CountCreditGpt;

    constructor() {
        this.countCreditGpt = new CountCreditGpt();
    }

    // Estimate credits for a given content and model
    estimateCredits(content: string | any[], modelName: string, type: 'input' | 'output'): number {
        return this.countCreditGpt.countCredits(content, modelName, type);
    }

    // Get fixed prices per model
    getFixedPrices(): { [key: string]: { input: number, output: number } } {
        return {
            [SystemLlmModel.nano]: { input: 0.05, output: 0.40 },
            [SystemLlmModel.mini]: { input: 0.25, output: 2.0 },
            [SystemLlmModel.full]: { input: 1.25, output: 10.0 }
        };
    }

    // Estimate for all models
    estimateForAllModels(content: string | any[]): { [key: string]: { input: number, output: number } } {
        const models = Object.values(SystemLlmModel);
        const estimates: { [key: string]: { input: number, output: number } } = {};

        models.forEach(model => {
            estimates[model] = {
                input: this.estimateCredits(content, model, 'input'),
                output: this.estimateCredits(content, model, 'output')
            };
        });

        return estimates;
    }
}
