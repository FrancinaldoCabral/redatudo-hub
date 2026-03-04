import { encode, encodeChat } from 'gpt-tokenizer'
import { SystemLlmModel } from '../infra/db/globals.db'

export class CountCreditGpt {
   
    countTokens(content: string | any[]): number {
        if(Array.isArray(content)) return encodeChat(content, 'gpt-4').length
        else return encode(content).length
    }

    countCredits(content: string | any[], modelName: string, type:string): number {
        let totalTokens: number = this.countTokens(content)
        let price: number = this.priceBymodelName(modelName, type)
        return (totalTokens * price) / 1000000
    }

    creditsByTokens(tokens:number, modelName:string, type:string): number {
        let price: number = this.priceBymodelName(modelName, type)
        return (tokens * price) / 1000000
    }

    private priceBymodelName(modelName: string, type:string): number {
        let price: number
        if(type==='input'){
            switch (modelName) {
                case SystemLlmModel.nano:
                    price = 0.05
                    break
                case SystemLlmModel.mini:
                    price = 0.25
                    break                    
                case SystemLlmModel.full:
                    price = 1.25
                    break                                                                                       
                default:
                    price = 0.05
                    break
            }
        }else{
            switch (modelName) {
                case SystemLlmModel.nano:
                    price = 0.40
                    break
                case SystemLlmModel.mini:
                    price = 2.0
                    break                    
                case SystemLlmModel.full:
                    price = 10.0
                    break                                                                                      
                default:
                    price = 0.40
                    break
            }
        }
        return price
    }
}
