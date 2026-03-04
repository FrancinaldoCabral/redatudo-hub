import { Decimal128 } from 'mongodb';

export interface CreditsService {
    checkBalance(userId: number): Promise<Decimal128>;
}
