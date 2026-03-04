import { CreditsService } from '../../domain/services/CreditsService';
import { CreditsService as CreditsLib } from '../../services/credits.service'; // seu atual
import { Decimal128 } from 'mongodb';

export class CreditsServiceImp implements CreditsService {
  private readonly service = new CreditsLib();

  async checkBalance(userId: number): Promise<Decimal128> {
    return this.service.checkBalance(userId);
  }
}
