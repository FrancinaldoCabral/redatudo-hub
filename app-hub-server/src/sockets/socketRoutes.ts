import * as connections from '../services/connections'
import { SystemLlmModel } from '../infra/db/globals.db'
import { sendResult } from '../services/system.service'
import { selectTools } from '../services/tools.service'
import { addJob } from '../services/jobs.service'
import { addLog } from '../services/audit.service'
import { QdrantVectorService } from '../services/qdrant-vector.service'
import { ProvidersService } from '../services/providers.service'
import { errorToText } from '../services/axios-errors.service'
import { authSocketMiddleware } from '../middlewares'
import { abortJob } from '../services/abort.service'
import { CreditsService } from '../services/credits.service'

const qdrantService = new QdrantVectorService()
const providersService = new ProvidersService()
const creditsService = new CreditsService()

export function registerSocketRoutes(io: any) {
  io.use(authSocketMiddleware)
  io.on('connection', (socket: any) => {
    const userId: string = socket.user.id
    const conversationId = socket.id
    connections.newConnection(userId, socket.id).catch(err => console.error('Error storing connection:', err))
//    console.log(`User CONNECTED. User: ${userId} and socket: ${socket.id}`)

    socket.on('chat', async (data: any) => {
      const userLanguage = data.language
      const userTime = data.time
      const messages = data.messages

      const model = data.model
 
      const token = socket.token

      const providers = await providersService.getProviders(userId)
      const responseUserReplicateApiKey = providers.find(p => p.provider === 'replicate')
      const responseUserOpenrouterApiKey = providers.find(p => p.provider === 'openrouter')

      const routerApiKey = responseUserOpenrouterApiKey ? responseUserOpenrouterApiKey.key : null
      const replicateApiKey = responseUserReplicateApiKey ? responseUserReplicateApiKey.key : null

      const app = data.app

      const metadata = { userId, token, userLanguage, userTime, model, conversationId, routerApiKey, replicateApiKey, app }
      //console.log('metadata: ', metadata)
      try {
        let form

        if (data.app) {
          // NOVO: Ferramentas específicas - não passa tools para execução direta
          form = { messages, model }
        } else {
          // Chat genérico - mantém comportamento atual com agent
          const tools = await selectTools(userId)
          if (tools.length > 0) {
            form = { messages, model, tools, parallel_tool_calls: true }
          } else {
            form = { messages, model }
          }
        }

        const job = await addJob({ form, metadata })
        //console.log('job in routes: ', job)
        sendResult(metadata.userId, 'Processing...', { id: job.id })
      } catch (error) {
    //    console.log(error)
        await addLog(userId, errorToText(error), {})
        await sendResult(metadata.userId, 'error', { msg: `${errorToText(error)}` })
      }
    })

    socket.on('tool_call', async (data: any) => {
  //    console.log('🔧 [BACKEND] Evento tool_call RECEBIDO:', data)
      
      const { tool, parameters, language, time } = data
      const token = socket.token

      try {
        if (tool === 'ebook_advanced_generation') {
      //    console.log('📚 [BACKEND] Chamando ebook_advanced_generation com:', parameters)
          
          // Importar o tool dinamicamente (usando default export)
          const ebookAdvancedGenerationToolModule = await import('../tools/ebook-advanced-generation.tool')
          const ebookAdvancedGenerationTool = ebookAdvancedGenerationToolModule.default
          
      //    console.log('🔧 [BACKEND] Tool importado, executando...')
          
          // Construir metadata para o tool
          const metadata = {
            userId,
            token,
            userLanguage: language || 'pt-BR',
            userTime: time
          }
          
          // Executar o tool com os parâmetros (método action, não execute)
          const toolResult = await ebookAdvancedGenerationTool.action(
            parameters,
            'ebook_advanced_generation',
            metadata
          )
          
          /* console.log('✅ [BACKEND] Tool executado com sucesso:', {
            hasContent: !!toolResult.content,
            credits: toolResult.credits
          }) */

          // Debitar créditos do usuário se houver custo
          if (toolResult.credits && toolResult.credits > 0) {
        //    console.log(`💰 [BACKEND] Debitando ${toolResult.credits} créditos do usuário ${userId}`)
            try {
              await creditsService.subtractCredit(parseInt(userId), toolResult.credits.toString())
          //    console.log(`✅ [BACKEND] Créditos debitados com sucesso`)
            } catch (creditError) {
              console.error('❌ [BACKEND] Erro ao debitar créditos:', creditError)
              // Não falha a operação por erro de crédito, apenas loga
            }
          }

          // Processar resultado do tool
          const result = {
            content: toolResult.content.generatedContent,
            images: toolResult.content.images, // Array de imagens geradas
            metadata: {
              ...toolResult.content.metadata,
              imagesMetadata: toolResult.content.metadata?.imagesMetadata, // Metadados completos
              cost: (toolResult.credits || 0) / 1000, // Converter créditos para dólar
              inputTokens: 0, // TODO: pegar do completion
              outputTokens: 0, // TODO: pegar do completion
              wordCount: toolResult.content.metadata?.words
            }
          }

          // Enviar resultado via socket
          socket.emit('results', {
            status: 'completed',
            result: result
          })

      //    console.log('📤 [BACKEND] Resultado enviado via socket')
          
        } else {
          console.warn(`⚠️ [BACKEND] Tool desconhecido: ${tool}`)
          socket.emit('results', {
            status: 'failed',
            result: { msg: `Tool desconhecido: ${tool}` }
          })
        }
      } catch (error: any) {
        console.error('❌ [BACKEND] Erro ao executar tool_call:', error)
        
        await addLog(userId, errorToText(error), { tool, parameters })
        
        socket.emit('results', {
          status: 'failed',
          result: { 
            msg: errorToText(error),
            error: error.message 
          }
        })
      }
    })

    socket.on('cancel', async (data: any) => {
      const { jobId } = data
      const result = await abortJob(jobId)
      sendResult(userId, 'cancel', result)
    })

    socket.on('feedback', async (data: any) => {
      const { firstMessage, assistantMessage, toolCallsText, feedback } = data
      const provider = new ProvidersService()
      const responseProvider = await provider.getKeysByProvider(userId, 'openai')
      const userOpenAiApiKey = responseProvider.key
      const formFeedback = { userId, conversationId: socket.id, firstMessage, assistantMessage, toolCallsText, feedback, userOpenAiApiKey }
      await qdrantService.addNegativeFeedback(formFeedback)
    })

    socket.on('disconnect', () => {
  //    console.log(`User DISCONNECTED. User: ${userId} and socket: ${socket.id}`)
      connections.removeConnection(socket.id).catch(err => console.error('Error removing connection:', err))
    })
  })

  io.on("connection_error", (err) => {
//    console.log(err.req)
//    console.log(err.code)
//    console.log(err.message)
//    console.log(err.context)
  })
}
