
import { MongoDbService } from './mongodb.service'
import { Decimal128 } from 'mongodb'

export class FilesService {
    db: MongoDbService
    constructor(){
        this.db = new MongoDbService()
    }

    async checkFileLimit(userId: any): Promise<number>{
        let response = await this.db.getOne('files_limit', {
            userId
        })
        if(response) return response?.limit
        else null
    }
    async initFileLimit(userId: any): Promise<number>{
        const limit: number = 20971520
        await this.db.add('files_limit', { limit, userId })
        const response = await this.checkFileLimit(userId)
        return response
    }
}