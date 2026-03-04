import { MongoHelper } from './db/mongo-helper.db'

interface Connection {
    userId: string;
    connectionId: string;
    timestamp?: Date;
}

const COLLECTION_NAME = 'socket_connections'

async function newConnection(userId: string, connectionId: string): Promise<void> {
    const connectionsCollection = await MongoHelper.getCollection(COLLECTION_NAME)
    // First, remove any existing connection for this userId to ensure uniqueness
    await connectionsCollection.deleteMany({ userId })
    // Then insert the new connection
    await connectionsCollection.insertOne({
        userId,
        connectionId,
        timestamp: new Date()
    })
}

async function removeConnection(connectionId: string): Promise<void> {
    const connectionsCollection = await MongoHelper.getCollection(COLLECTION_NAME)
    await connectionsCollection.deleteOne({ connectionId })
}

async function getConnectionsByUserId(userId: string): Promise<Connection[]> {
    const connectionsCollection = await MongoHelper.getCollection(COLLECTION_NAME)
    const result = await connectionsCollection.find({ userId }).sort({ timestamp: -1 }).limit(1).toArray()
    return result as Connection[]
}

async function haveUserConnectedById(userId: string): Promise<boolean> {
    const connections = await getConnectionsByUserId(userId)
    return connections.length > 0
}

export { newConnection, removeConnection, getConnectionsByUserId, haveUserConnectedById };
