export interface Tool {
    title:string, 
    description:string, 
    costPreview: number
    action(args: any, functionName:string, metadata:any, tool_call_id?:string): Promise<any>, 
    schema:any
    icon:string
    toolsNames?:string[]
    provider?:string
}