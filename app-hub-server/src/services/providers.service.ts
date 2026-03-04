import { ObjectId } from 'mongodb'
import { MongoDbService } from '../services/mongodb.service'

export class ProvidersService {
    db: MongoDbService

    constructor(){
        this.db = new MongoDbService()
    }

    async getProviders(userId:any): Promise<any[]>{
        const documents = await this.db.get('providers', { userId })  
        return documents
    }

    async removeProvider(providerId:any): Promise<string>{
        const result = await this.db.deleteOne('providers', { _id: new ObjectId(providerId) })   
        return result
    }

    async getKeysByProvider(userId:any, provider:string): Promise<any>{
        const documents = await this.db.getOne('providers', { userId, provider })  
        return documents
    }

    async saveProvider(userId:any, provider:string, key:string): Promise<string>{
        const document = await this.getKeysByProvider(userId, provider)
        if(document){
            const _id = document._id
            const result = await this.db.updateOne('providers', { _id, userId, provider }, 
                { userId, provider, key})    
            return result
        }else{
            const result = await this.db.add('providers', { userId, provider, key })
            return result
        }
    }
}