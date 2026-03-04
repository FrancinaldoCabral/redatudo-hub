import { OpenAIEmbeddings } from '@langchain/openai'
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant'
import * as uuid from 'uuid'

import { QdrantClient } from '@qdrant/js-client-rest'

import axios from 'axios'

export class QdrantVectorService {
    
    client = new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_KEY,
        port:6333,
        https: false,
        checkCompatibility: false
    })

    qdrantUrl = process.env.QDRANT_URL 
    qdrantCollectionName =  'redatudo_docs'
    feedbackCollectionName = 'negative_feedback'
    articlesCollectionName = 'articles_redatudo'

    vectorStore: QdrantVectorStore
    vectorMemoryStore: QdrantVectorStore
    vectorArticlesStore: QdrantVectorStore

    constructor(){
        // QdrantVectorService initialization disabled (legacy code, not used by current apps)
        // Keeping methods as stubs to prevent breaking existing code
        // this.createCollection()
    }

    async createCollection():Promise<void>{
        const routerApiKey = process.env.OPENAI_API_KEY
        const embeddings = new OpenAIEmbeddings({ 
            openAIApiKey: process.env.OPENAI_API_KEY
        })
        this.vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
              url: this.qdrantUrl,
              collectionName: this.qdrantCollectionName,
            }
        )
        this.vectorMemoryStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
              url: this.qdrantUrl,
              collectionName: this.feedbackCollectionName,
            }
        )
        this.vectorArticlesStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
              url: this.qdrantUrl,
              collectionName: this.articlesCollectionName,
            }
        )
        await this.vectorStore.ensureCollection()
        await this.vectorMemoryStore.ensureCollection()
        await this.vectorArticlesStore.ensureCollection()
    }

    async addDoc(docUrl: string, metadata: any): Promise<any>{
        // This functionality has been disabled - url-to-loader service was removed
    //    console.log(`Document loading disabled for URL: ${docUrl}, user: ${metadata.userId}`);
        return 'ok'
    }

    async addNegativeFeedback(data: any): Promise<void>{
        // QdrantVectorService disabled (legacy code, OpenRouter is used instead)
        // This method is a stub to prevent breaking existing code
        return
    }

    async memoryFromConversation(userId:any, conversationId:number, limit:number): Promise<any[]>{
        //await this.createCollection()
        const filter = {
            must: [
              {
                key: 'metadata.userId',
                match: {
                  value: parseInt(userId),
                }
              },
              {
                  key: 'metadata.conversationId',
                  match: {
                    value: `${conversationId}`,
                  }
              }
            ]
        }
        const count = await this.client.count(this.feedbackCollectionName, {
            filter
        })
        if(count.count>0){
            const payloads = await this.client.scroll(this.feedbackCollectionName, {
                filter,
                //order_by: { key: 'metadata.timestamp', direction: 'desc' },
                limit: limit,
                with_payload: true,
                with_vector: false,
            })
            return payloads.points.reverse()
        }else{
            return []
        }
    }

    async allMemoryFromConversation(userId:any, conversationId:number): Promise<any[]>{
        // await this.createCollection()  // Legacy - disabled
        const payloads = await this.client.scroll(this.feedbackCollectionName, {
            filter: {
              must: [
                {
                    key: 'metadata.userId',
                    match: {
                        value: parseInt(userId),
                    }
                },
                {
                    key: 'metadata.conversationId',
                    match: {
                      value: `${conversationId}`,
                    }
                }
              ]
            },
            //order_by: { key: 'timestamp', direction: 'desc' },
            with_payload: true,
            with_vector: true,
        })
        return payloads.points
    }

    async getFeedback(query: string, limit:number, metadata:any): Promise<any[]>{
        const userId = metadata.userId
        const userOpenAiApiKey = metadata.routerApiKey

        const routerApiKey = userOpenAiApiKey? userOpenAiApiKey: process.env.OPENAI_API_KEY
        const embeddings = new OpenAIEmbeddings({ 
            openAIApiKey: routerApiKey
        })

        const vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings,
            {
              url: this.qdrantUrl,
              collectionName: this.feedbackCollectionName,
            }
        )
        const filter = {
            must:[
                { key:'metadata.userId', match: { value: parseInt(userId) }}
            ] 
        }
        const response = await vectorStore.similaritySearch(`${query}`, limit, filter)
        return response
    }    

    async getDocs(query: string, filter:any, limit:number, metadata:any): Promise<any[]>{
        // QdrantVectorService disabled (legacy code, OpenRouter is used instead)
        // This method is a stub to prevent breaking existing code
        return []
    }

    async getFilesUrl(userId:any): Promise<string[]>{
        // await this.createCollection()  // Legacy - disabled
        const responseCount = await this.client.count(this.qdrantCollectionName, {
            filter: {
              must: [
                {
                  key: 'metadata.userId',
                  match: {
                    value: parseInt(userId),
                  },
                },
              ],
            },
            exact: true
        })
        if(responseCount && responseCount.count>0){
            const payloads = await this.client.scroll(this.qdrantCollectionName, {
                filter: {
                  must: [
                    {
                      key: 'metadata.userId',
                      match: {
                        value: parseInt(userId),
                      },
                    }
                  ]
                },
                limit: responseCount.count,
                with_payload: true,
                with_vector: false,
            })
            
            const docUrls = new Set(payloads.points.map((p:any)=>{
                return p.payload?.metadata.docUrl
            }))
            const uniquesUrls = Array.from(docUrls)
            return uniquesUrls as string[]
        }else{
            return []
        }
    }

    async deleteDocs(userId:any, docUrl:string): Promise<any>{
        const filter = {
            must: [
                {
                    key: 'metadata.userId',
                    match: {
                        value: parseInt(userId)
                    }
                },
                {
                    key: 'metadata.docUrl',
                    match: {
                        value: `${docUrl}`
                    }
                }
            ]
        }
        const response = await axios.post(
            `http://${process.env.HOST}:${6333}/collections/${this.qdrantCollectionName}/points/delete`, 
            { filter }
        )
        return response.data
    }

    async deleteAllDocs(userId:any): Promise<any>{
        // Construindo o filtro
        const filter = {
            must: [
                {
                    key: 'metadata.userId',
                    match: {
                        value: parseInt(userId)
                    }
                }
            ]
        }

        const response = await axios.post(
            `http://${process.env.HOST}:${6333}/collections/${this.qdrantCollectionName}/points/delete`, 
            { filter }
        )
        return response.data
    }
}
