import { errorToText } from "../../services/axios-errors.service"
import { badRequest, successRequest } from "../../controllers/protocols"
import { addLog } from "../../services/audit.service"
import { ProvidersService } from "../../services/providers.service"
import { isValidOpenAIKey, isValidReplicateKey } from "../../services/key-validate.service"

export async function getProvidersController(req, res, next) {
    const userId = req.user.id
    try {
        
        const providersService = new ProvidersService()
        const response = await providersService.getProviders(userId)
        successRequest(res, 200, response)
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function addProvider(req, res, next) {
    const userId = req.user.id
    const { provider, key } = req.body
    try {
        let isValid
        if(provider==='openai') isValid = await isValidOpenAIKey(key)
        if(provider==='replicate') isValid = await isValidReplicateKey(key)
        if(!isValid) badRequest(res, 401, new Error('Invalid key'))
        const providersService = new ProvidersService()
        const response = await providersService.saveProvider(userId, provider, key)
        successRequest(res, 200, response)
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function removeProvider(req, res, next) {
    const userId = req.user.id
    const providerId = req.params.providerId
    try {
        const providersService = new ProvidersService()
        const response = await providersService.removeProvider(providerId)
        successRequest(res, 200, response)
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}
