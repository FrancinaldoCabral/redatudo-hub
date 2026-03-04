import { addLog } from '../../services/audit.service'
import { errorToText } from '../../services/axios-errors.service'
import { QdrantVectorService } from '../../services/qdrant-vector.service'
import { badRequest, successRequest } from '../protocols'
import { ProvidersService } from '../../services/providers.service'

const qdrantVectorService = new QdrantVectorService()
const providersService = new ProvidersService()

export async function addDoc(req, res, next) {
    const userId = req.user.id
    try {
        const docUrl = req.body.docUrl
        
        if(!docUrl) badRequest(res, 400, new Error('url doc required'))
        const result = await qdrantVectorService.addDoc(docUrl, { userId })
        successRequest(res, 200, result)
    } catch (error) {
        await addLog(userId, errorToText(error), {})
        badRequest(res, 500, error)
    }
}

export async function getDocs(req, res, next) {
    const userId = req.user.id
    try {
        const query = req.body.query
        const providers = await providersService.getProviders(userId)
        const userOpenAiApiKey = providers.filter(p => p.provider === 'openai')[0]
        const openaiApiKey = userOpenAiApiKey? userOpenAiApiKey.key: null
        const metadata = { userId, openaiApiKey }
        if(!query) badRequest(res, 404, new Error('query required'))
        const filter = { must: [ { key:'userId', match: { value: parseInt(userId)} } ]}
        const result = await qdrantVectorService.getDocs(query, filter, 5, metadata)
        successRequest(res, 200, result)
    } catch (error) {
        await addLog(userId, errorToText(error), {})
        badRequest(res, 500, error)
    }
}

export async function getFilesUrl(req, res, next) {
    const userId = req.user.id
    try {
        
        const result = await qdrantVectorService.getFilesUrl(userId)
        successRequest(res, 200, result)
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorToText(error), {})
        badRequest(res, 500, error)
    }
}

export async function deleteDocsByUrl(req, res, next) {
    const userId = req.user.id
    try {
        
        const docUrl = req.body.docUrl
        if(!docUrl) badRequest(res, 400, new Error('doc url required'))
        const result = await qdrantVectorService.deleteDocs(userId, docUrl)
        successRequest(res, 200, result)
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorToText(error), {})
        badRequest(res, 500, error)
    }
}

export async function deleteDocsByUserId(req, res, next) {
    const userId = req.user.id
    try {
        
        const result = await qdrantVectorService.deleteAllDocs(userId)
        successRequest(res, 200, result)
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorToText(error), {})
        badRequest(res, 500, error)
    }
}