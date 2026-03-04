import { MongoHelper } from './db/mongo-helper.db'
import { MongoDbService } from './mongodb.service'
import { Decimal128 } from 'mongodb'
import { getUserSubscription, addCreditsFromPurchase } from './wordpress.service'

export class CreditsService {
    db: MongoDbService
    constructor(){
        this.db = new MongoDbService()
    }

    // Subscription product variation IDs and credits
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

    // Legacy method - mantido para compatibilidade
    async checkBalance(userId: number): Promise<Decimal128>{
        const balance = await this.getBalance(userId)
        return balance.total
    }

    // Novo método que retorna os três valores
    async getBalance(userId: number): Promise<{
        subscription: Decimal128,
        recharge: Decimal128,
        total: Decimal128
    }>{
        //console.log(`getBalance: buscando userId=${userId} (type: ${typeof userId})`)

        // Listar todos os documentos para debug
        const collection = await MongoHelper.getCollection('balance')
        const allDocs = await collection.find({}).toArray()
        //console.log(`getBalance: todos os documentos na collection balance:`, allDocs.map(doc => ({ userId: doc.userId, type: typeof doc.userId })))

        // Tentar buscar como number primeiro
        let response = await this.db.getOne('balance', { userId })

        //console.log(`getBalance: final response=`, response)

        if(response && (response.subscription_balance || response.recharge_balance)) {
            const subscription = response.subscription_balance || Decimal128.fromString('0')
            const recharge = response.recharge_balance || Decimal128.fromString('0')
            const total = Decimal128.fromString(
                (parseFloat(subscription.toString()) + parseFloat(recharge.toString())).toString()
            )
            //console.log(`getBalance: subscription=${subscription}, recharge=${recharge}, total=${total}`)
            return { subscription, recharge, total }
        }

        //console.log(`getBalance: nenhum balance encontrado, retornando zeros`)
        return {
            subscription: Decimal128.fromString('0'),
            recharge: Decimal128.fromString('0'),
            total: Decimal128.fromString('0')
        }
    }

    async initBalance(userId: number, initBalance:string): Promise<Decimal128>{
        const collection = await MongoHelper.getCollection('balance')
        const balance: Decimal128 = Decimal128.fromString(initBalance)
        await collection.updateOne(
            { userId }, 
            { 
                $set: { 
                    subscription_balance: Decimal128.fromString('0'),
                    recharge_balance: balance,
                    userId,
                    last_updated: new Date()
                } 
            }, 
            { upsert: true }
        )
        const response = await this.checkBalance(userId)
        return response
    }

    async setSubscriptionBalance(userId: number, credits: number): Promise<void> {
    //    console.log(`setSubscriptionBalance: INICIANDO - userId=${userId}, credits=${credits}`)

        const collection = await MongoHelper.getCollection('balance')

        // Verificar documento atual antes da atualização
        const beforeUpdate = await collection.findOne({ userId })
        //console.log(`setSubscriptionBalance: documento ANTES=`, beforeUpdate)

        const result = await collection.updateOne(
            { userId },
            {
                $set: {
                    subscription_balance: Decimal128.fromString(credits.toString()),
                    last_updated: new Date()
                }
            },
            { upsert: true }
        )
        //console.log(`setSubscriptionBalance: update result=`, result)

        // Verificar documento após a atualização
        const afterUpdate = await collection.findOne({ userId })
    //    console.log(`setSubscriptionBalance: documento DEPOIS=`, afterUpdate)

        //console.log(`setSubscriptionBalance: FINALIZADO - userId=${userId}, credits=${credits}, matched=${result.matchedCount}, modified=${result.modifiedCount}`)
    }

    async addRechargeBalance(userId: number, credits: number): Promise<void> {
        const current = await this.getBalance(userId)
        const currentRecharge = parseFloat(current.recharge.toString())
        const newRecharge = currentRecharge + credits
        
        const collection = await MongoHelper.getCollection('balance')
        await collection.updateOne(
            { userId },
            { 
                $set: { 
                    recharge_balance: Decimal128.fromString(newRecharge.toString()),
                    last_updated: new Date()
                }
            },
            { upsert: true }
        )
    }

    async moveSubscriptionToRecharge(userId: number): Promise<void> {
        const current = await this.getBalance(userId)
        const subscriptionAmount = parseFloat(current.subscription.toString())
        
        if (subscriptionAmount > 0) {
            const currentRecharge = parseFloat(current.recharge.toString())
            const newRecharge = currentRecharge + subscriptionAmount
            
            const collection = await MongoHelper.getCollection('balance')
            await collection.updateOne(
                { userId },
                { 
                    $set: { 
                        subscription_balance: Decimal128.fromString('0'),
                        recharge_balance: Decimal128.fromString(newRecharge.toString()),
                        last_updated: new Date()
                    }
                }
            )
        }
    }

    async getCurrentSubscription(userId: number): Promise<any> {
    //    console.log(`getCurrentSubscription: buscando userId=${userId}`)

        // Buscar como number
        let response = await this.db.getOne('balance', { userId })
        //console.log(`getCurrentSubscription: busca como number result=`, response)

        const currentSubscription = response?.current_subscription || null
        //console.log(`getCurrentSubscription: current_subscription=`, currentSubscription)

        return currentSubscription
    }

    async updateCurrentSubscription(userId: number, subscriptionData: any): Promise<void> {
        //console.log(`updateCurrentSubscription: INICIANDO - userId=${userId}, subscriptionData=`, subscriptionData)

        const collection = await MongoHelper.getCollection('balance')

        // Verificar documento atual antes da atualização
        const beforeUpdate = await collection.findOne({ userId })
        //console.log(`updateCurrentSubscription: documento ANTES=`, beforeUpdate)

        const result = await collection.updateOne(
            { userId },
            {
                $set: {
                    current_subscription: subscriptionData,
                    last_updated: new Date()
                }
            },
            { upsert: true }
        )
    //    console.log(`updateCurrentSubscription: update result=`, result)

        // Verificar documento após a atualização
        const afterUpdate = await collection.findOne({ userId })
    //    console.log(`updateCurrentSubscription: documento DEPOIS=`, afterUpdate)

    //    console.log(`updateCurrentSubscription: FINALIZADO - userId=${userId}`)
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
 
    // Legacy method - atualizado para usar sistema de dois slots
    async insertCredit(userId:number, credit: string): Promise<Decimal128>{
        await this.addRechargeBalance(userId, parseFloat(credit))
        const balance = await this.getBalance(userId)
        return balance.total
    }

    async subtractCredit(userId:number, credit: string): Promise<Decimal128>{
    //    console.log(`subtractCredit: INICIANDO - userId=${userId}, credit=${credit}`)
        
        const decimalCredit = parseFloat(credit)
        const balance = await this.getBalance(userId)
        
    //    console.log(`subtractCredit: balance atual - subscription=${balance.subscription}, recharge=${balance.recharge}, total=${balance.total}`)
        
        let remaining = decimalCredit
        let newRecharge = parseFloat(balance.recharge.toString())
        let newSubscription = parseFloat(balance.subscription.toString())
        
        //console.log(`subtractCredit: valores iniciais - newRecharge=${newRecharge}, newSubscription=${newSubscription}, remaining=${remaining}`)
        
        // Consome primeiro do recharge
        if (newRecharge >= remaining) {
            newRecharge -= remaining
            remaining = 0
            //console.log(`subtractCredit: consumido totalmente de recharge - newRecharge=${newRecharge}, remaining=${remaining}`)
        } else {
            remaining -= newRecharge
            newRecharge = 0
            //console.log(`subtractCredit: recharge zerado - newRecharge=${newRecharge}, remaining=${remaining}`)
        }
        
        // Se ainda tem saldo a consumir, consome do subscription
        if (remaining > 0 && newSubscription >= remaining) {
            newSubscription -= remaining
            remaining = 0
            //console.log(`subtractCredit: consumido de subscription - newSubscription=${newSubscription}, remaining=${remaining}`)
        } else if (remaining > 0) {
            newSubscription = 0
            //console.log(`subtractCredit: subscription zerado - newSubscription=${newSubscription}, remaining=${remaining}`)
        }
        
    //    console.log(`subtractCredit: valores finais - newRecharge=${newRecharge}, newSubscription=${newSubscription}`)
        
        const collection = await MongoHelper.getCollection('balance')
        
        // Tentar atualizar como string primeiro
        
        await collection.updateOne(
            { userId: userId },
            { 
                $set: { 
                    subscription_balance: Decimal128.fromString(newSubscription.toString()),
                    recharge_balance: Decimal128.fromString(newRecharge.toString()),
                    last_updated: new Date()
                }
            }
        )
        
        const finalBalance = await this.getBalance(userId)
    //    console.log(`subtractCredit: FINALIZADO - novo total=${finalBalance.total}`)
        return finalBalance.total
    }

    async setBalance(userId:number, credit: string): Promise<Decimal128>{
        const decimalCredit: Decimal128 = Decimal128.fromString(credit)
        await this.db.updateOne('balance', { userId }, { 
            $set: { 
                userId, 
                recharge_balance: decimalCredit,
                subscription_balance: Decimal128.fromString('0'),
                last_updated: new Date()
            }
        })
        const result = await this.checkBalance(userId)
        return result
    }

    async addSubscriptionCredits(userId: number, token: string): Promise<Decimal128> {
        const subscription = await getUserSubscription(token)
        const productId = subscription?.product_id
        if (this.subscriptionCredits[productId]) {
            const credits = this.subscriptionCredits[productId]
            return await this.insertCredit(userId, credits.toString())
        }
        return await this.checkBalance(userId)
    }

    async addAdditionalCredits(userId: number, token: string, productId: string): Promise<Decimal128> {
        if (this.additionalCredits[productId]) {
            const credits = this.additionalCredits[productId]
            await addCreditsFromPurchase(token, productId, credits)
            return await this.insertCredit(userId, credits.toString())
        }
        return await this.checkBalance(userId)
    }
}
