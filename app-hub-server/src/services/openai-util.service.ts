const schema: any = {
    "type": 'function',
    "function": {
       "name": "semantic_search",
       "description":'Performs a semantic search on a document. Direct questions are preferred. Example: Who is the pioneer of the Americas?',
       "parameters": {
           "type": "object",
           "properties": {
                "query": {
                    "type": "string",
                    "description": "User query."
                },
                "urlSource": {
                    "type": "string",
                    "description": "The URL of the document where the query will be performed."
                }
           },
           "required": ["query","urlSource"]
        } 
    }
}
export class OpenAiUtilService {
    constructor(){}
    openAiSchemaToClaudeSchema(schema: any): any {
        const newSchema = { 
            "name": schema.function.name,
            "description": schema.function.description,
            "input_schema": schema.function.parameters
        }
        return newSchema
    }
}