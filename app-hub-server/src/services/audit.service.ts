import { MongoDbService } from './mongodb.service'

export async function addLog(userId:any, errorMessage:string, errorInput:any): Promise<void>{
    const mongodbService = new MongoDbService()
    const log = { userId, errorMessage, errorInput }
    await mongodbService.add('logs', log)
}