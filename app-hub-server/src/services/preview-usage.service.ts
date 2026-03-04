import { countTokens } from '@anthropic-ai/tokenizer'

export class PreviewUsageAnthropic {
    count(text: string): number {
        const tokens = countTokens(text)
        return tokens
    }
    countMessages(messages: any[]): number {
        let count=0
        messages.forEach(msg=>{
           count += countTokens(msg.content)
        })
        return count
    }
    countTools(tools: any[]): number {
        let count=0
        tools.forEach(tool=>{
           count += countTokens(JSON.stringify(tool))
        })
        return count
    }
}