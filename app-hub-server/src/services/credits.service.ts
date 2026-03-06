import { MongoHelper } from './db/mongo-helper.db'
import { MongoDbService } from './mongodb.service'
import { Decimal128 } from 'mongodb'
import { getUserSubscription, addCreditsFromPurchase } from './wordpress.service'

export class CreditsService {
    db: MongoDbService
    constructor(){
        this.db = new MongoDbService()
    }

    // Subscription product variation IDs and credits (legado, mantido para compatibilidade)
    private subscriptionCredits: { [key: string]: number } = {
        '35613': 50,     // Free
        '35614': 5000,   // R$19.90
        '35615': 20000,  // R$59.90
        '35616': 60000   // R$149.90
    }

    private additionalCredits: { [key: string]: number } = {
        '35618': 2000,   // R$9.90
        '35619': 10000,  // R$39.90
        '35620': 30000   // R$99.90
    }

    // Retorna balance atual como number
    async checkBalance(userId: number): Promise<number>{
        const collection = await MongoHelper.getCollection('balance')
        const doc = await collection.findOne({ userId: userId.toString() })
        
        if (doc && doc.balance) {
            return parseFloat(doc.balance)
        }
        return 0
    }

    // Alias para compatibilidade
    async getBalance(userId: number): Promise<number>{
        return this.checkBalance(userId)
    }

    // Inicializa balance para novo usuário
    async initBalance(userId: number, initBalance:string): Promise<number>{
        const collection = await MongoHelper.getCollection('balance')
        const balanceNum = parseFloat(initBalance)
        await collection.updateOne(
            { userId: userId.toString() }, 
            { 
                $set: { 
                    userId: userId.toString(),
                    balance: initBalance,
                    last_updated: new Date()
                } 
            }, 
            { upsert: true }
        )
        return balanceNum
    }

    // Define balance (substitui valor anterior)
    async setBalance(userId:number, credit: string): Promise<number>{
        const balanceNum = parseFloat(credit)
        const collection = await MongoHelper.getCollection('balance')
        await collection.updateOne(
            { userId: userId.toString() }, 
            { 
                $set: { 
                    userId: userId.toString(),
                    balance: credit,
                    last_updated: new Date()
                }
            },
            { upsert: true }
        )
        return balanceNum
    }

    // Adiciona créditos (soma)
    async insertCredit(userId:number, credit: string): Promise<number>{
        const creditNum = parseFloat(credit)
        const currentBalance = await this.checkBalance(userId)
        const newBalance = currentBalance + creditNum
        const collection = await MongoHelper.getCollection('balance')
        await collection.updateOne(
            { userId: userId.toString() },
            { 
                $set: { 
                    userId: userId.toString(),
                    balance: newBalance.toString(),
                    last_updated: new Date()
                }
            },
            { upsert: true }
        )
        return newBalance
    }

    // Subtrai créditos (débito) - arredonda pra cima
    async subtractCredit(userId: number, credit: string): Promise<number>{
        const creditNum = Math.ceil(parseFloat(credit)) // Arredonda pra cima
        const currentBalance = await this.checkBalance(userId)
        const newBalance = Math.max(0, currentBalance - creditNum) // Não fica negativo
        
        const collection = await MongoHelper.getCollection('balance')
        await collection.updateOne(
            { userId: userId.toString() },
            { 
                $set: { 
                    userId: userId.toString(),
                    balance: newBalance.toString(),
                    last_updated: new Date()
                }
            },
            { upsert: true }
        )
        return newBalance
    }

    getCreditsForVariation(variationId: string): number | null {
        return this.subscriptionCredits[variationId] || null
    }

    getCreditsForAdditional(variationId: string): number | null {
        return this.additionalCredits[variationId] || null
    }

    isFreePlan(variationId: string): boolean {
        return variationId === '35613'
    }

    async addSubscriptionCredits(userId: number, token: string): Promise<number> {
        const subscription = await getUserSubscription(token)
        const productId = subscription?.product_id
        if (this.subscriptionCredits[productId]) {
            const credits = this.subscriptionCredits[productId]
            return await this.insertCredit(userId, credits.toString())
        }
        return await this.checkBalance(userId)
    }

    async addAdditionalCredits(userId: number, token: string, productId: string): Promise<number> {
        if (this.additionalCredits[productId]) {
            const credits = this.additionalCredits[productId]
            await addCreditsFromPurchase(token, productId, credits)
            return await this.insertCredit(userId, credits.toString())
        }
        return await this.checkBalance(userId)
    }
}
