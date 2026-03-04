import fs from 'fs'
import path from 'path'
import { Tool } from 'tools/protocols/tools.protocols'

/**
 * Stub function for getActivateTool - deactivated service
 */
async function getActivateTool(userId: any): Promise<any[]> {
    // This functionality has been removed
    return [];
}

export async function getTools(): Promise<Tool[]> {
    const directoryPath = path.join('dist','tools')
    const toolFiles = fs.readdirSync(directoryPath)
        .filter(file => file.includes('.tool.') && !file.includes('.map'))
    const tools:Tool[] = []
    for (let index = 0; index < toolFiles.length; index++) {
        const toolFile = (await import(`../tools/${toolFiles[index]}`)).default
        const { title, description, costPreview, action, schema, icon, toolsNames, provider } = toolFile
        tools.push({ title, description, costPreview, action, schema, icon, toolsNames, provider })
    }

    return tools
}

export async function getAgents(): Promise<Tool[]> {
    const directoryPath = path.join('dist','agents')
    const agentFiles = fs.readdirSync(directoryPath)
        .filter(file => file.includes('.agent.') && !file.includes('.map'))
    const agents:Tool[] = []
    for (let index = 0; index < agentFiles.length; index++) {
        const toolFile = (await import(`../agents/${agentFiles[index]}`)).default
        const { title, description, costPreview, action, schema, icon, toolsNames, provider } = toolFile
        agents.push({ title, description, costPreview, action, schema, icon, toolsNames, provider })
    }

    return agents
}

export async function selectTools(userId: any) {
    const toolNames = await getActivateTool(userId)
    const allTools = (await getTools()).map(tool => { return tool.schema })
    .filter((t:any)=>{ return !toolNames.map(tn=>{return tn.toolName}).includes(t.function.name)})
    return allTools
}
