import { MongoDbService } from './mongodb.service'


export async function save(data: any): Promise<void>{
    const mongodbService = new MongoDbService()
    const result = await mongodbService.add('memory_message', data)
    return result
}

export async function updateFeedback(userId:any, conversationId: any, index:number): Promise<void>{
    const mongodbService = new MongoDbService()
    const conversa = await mongodbService.get('memory_messages', { userId, conversationId })
    const msg = conversa[index]
    if(msg.negativeFeedback){
        await mongodbService.updateOne('memory_message', { _id: msg._id }, { $set: { negativeFeedback: false }})
    }else{
        await mongodbService.updateOne('memory_message', { _id: msg._id }, { $set: { negativeFeedback: true }})
    }
}

export async function getMemory(userId: any, limit:number): Promise<void>{
    const mongodbService = new MongoDbService()
    const result = await mongodbService.get('memory_message', {})
    return result
}


