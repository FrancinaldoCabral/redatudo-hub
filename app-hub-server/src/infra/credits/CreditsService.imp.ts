import { CreditsService } from '../../domain/services/CreditsService';
import { CreditsService as CreditsLib } from '../../services/credits.service'; // seu atual

export class CreditsServiceImp implements CreditsService {
  private readonly service = new CreditsLib();

  async checkBalance(userId: number): Promise<number> {
    return this.service.checkBalance(userId);
  }
}
