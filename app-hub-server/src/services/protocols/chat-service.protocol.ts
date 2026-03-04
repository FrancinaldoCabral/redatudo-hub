export type Message = { role: any, content: any }
export interface LLMSystemService {
    request(form: any): Promise<any>
    sendMessage(messages: Message[], metadata: any): Promise<void>
    getSystemMessage(metadata: any): Promise<string>
    formatResponseGpt(any: any, metadata: any): Promise<string>
    runTools(toolCalls: any[], metadata: any): Promise<any>
}