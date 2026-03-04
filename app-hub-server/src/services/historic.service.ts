import { MongoHelper } from "./db/mongo-helper.db";
import { MongoDbService } from "./mongodb.service";

const mongodbService = new MongoDbService()

export async function addHistoric(historic: any): Promise<void> {
//    console.log(`addHistoric: adicionando ao histórico:`, historic)
    const result = await mongodbService.add('historic', historic)
//    console.log(`addHistoric: resultado=`, result)
}

export async function getHistoric(userId: any, offset:number, limit:number): Promise<any> {
    const collection = await MongoHelper.getCollection('historic')
    const count = await collection.countDocuments({ userId })
    const result = await collection.find({ userId }).skip(offset).limit(limit).sort({"createdAt" : -1}).toArray()
    return { result, count }
}
