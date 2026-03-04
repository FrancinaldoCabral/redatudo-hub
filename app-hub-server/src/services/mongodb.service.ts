import { MongoHelper } from './db/mongo-helper.db'


export class MongoDbService {
    constructor(){}
    async add(collectionName: string, data: any):Promise<any>{
        const collection = await MongoHelper.getCollection(collectionName)
        const result = await collection.insertOne(data)
        return result 
    }
    async getOne(collectionName: string, filter: any):Promise<any>{
        const collection = await MongoHelper.getCollection(collectionName)
        const result = await collection.findOne(filter)
        return result 
    }
    async updateOne(collectionName: string, filter: any, update:any):Promise<any>{
        const collection = await MongoHelper.getCollection(collectionName)
        const result = await collection.updateOne(filter, update)
        return result 
    }
    async get(collectionName: string, filter: any):Promise<any>{
        const collection = await MongoHelper.getCollection(collectionName)
        const result = await collection.find(filter).toArray()
        return result 
    }

    async deleteMany(collectionName: string, filter: any):Promise<any>{
        const collection = await MongoHelper.getCollection(collectionName)
        const result = await collection.deleteMany(filter)
        return result 
    }
    
    async deleteOne(collectionName: string, filter: any):Promise<any>{
        const collection = await MongoHelper.getCollection(collectionName)
        const result = await collection.deleteOne(filter)
        return result
    }

    async getToolUsageCostAverages(): Promise<any> {
        const collection = await MongoHelper.getCollection('historic');
        const result = await collection.aggregate([
            {
                $match: {
                    operation: 'tool_usage_cost'
                }
            },
            {
                $group: {
                    _id: '$toolName',
                    avgInputCost: { $avg: '$inputCost' },
                    avgOutputCost: { $avg: '$outputCost' },
                    avgTotalCost: { $avg: '$totalCost' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { avgTotalCost: -1 }
            }
        ]).toArray();

        return result;
    }
}
