import axios from 'axios'
import * as connections from './connections'
const uri = process.env.LOCALHOST

async function sendResult(userId: string, status: string, result: any | boolean) {
    const userConnections = await connections.getConnectionsByUserId(userId)
    if (userConnections.length === 0) {
    //    console.log(`User ${userId} is not connected. Cannot send result.`)
        return
    }
    // Use the first (most recent) connection
    const currentConnectionId = userConnections[0].connectionId
    axios.post(`${uri}/job/results`, { connectionId: currentConnectionId, status, result, userId })
}

async function sendStatus(userId: string, status: string): Promise<any> {
    const userConnections = await connections.getConnectionsByUserId(userId)
    if (userConnections.length === 0) {
    //    console.log(`User ${userId} is not connected. Cannot send status.`)
        return
    }
    const currentConnectionId = userConnections[0].connectionId
    axios.post(`${uri}/job/results`, { connectionId: currentConnectionId, status, userId })
}

export { sendResult, sendStatus }
