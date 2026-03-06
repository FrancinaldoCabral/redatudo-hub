export interface CreditsService {
    checkBalance(userId: number): Promise<number>;
}

