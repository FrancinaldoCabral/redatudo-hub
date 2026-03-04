import { errorToText } from "../../services/axios-errors.service"
import { badRequest, successRequest } from "../../controllers/protocols"
import { addHistoric, getHistoric } from "../../services/historic.service"
import { CreditsService } from "../../services/credits.service"
import { addLog } from "../../services/audit.service"
import * as wordpressService from '../../services/wordpress.service'

export async function getUserHistoricController(req, res, next) {
    const userId = req.params.id
    try {
        const offset = parseInt(req.query.offset) || 0
        const limit = parseInt(req.query.limit) || 5
        const response = await getHistoric(userId, offset, limit)
        successRequest(res, 200, response)
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function getUserBalanceController(req, res, next) {
    const userId = req.params.id
    try {
        const creditsService = new CreditsService()
        let response = await creditsService.checkBalance(userId)
        if(response===null || response===undefined) {
          initUserBalanceFree(req, res, next)
        }else successRequest(res, 200, { balance: response.toString()})
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function setUserBalanceController(req, res, next){
  const userId = req.params.id
  try {
      const balance = req.body.balance
      const description = req.body.description || `Add ${balance} credits (Manual).`
      const creditsService = new CreditsService()
      const response = await creditsService.setBalance(parseInt(userId), `${balance}`)
      await addHistoric({
        userId: userId,
        operation: 'credit',
        description: `${description} - by ${req.user.email}`,
        total: balance,
        createdAt: new Date()
      })
      successRequest(res, 200, { balance: response })
  } catch (error) {
      const errorMessage = errorToText(error)
  //    console.log(errorMessage)
      await addLog(userId, errorMessage, {})
      badRequest(res, 500, error)
  }
}

export async function initUserBalanceFree(req, res, next){
    const userId = req.params.id  
    try {
        const creditsService = new CreditsService()
        let balance = await creditsService.checkBalance(userId)
    //    console.log('BALANCE: ', balance)
        if(balance===null || balance === undefined) {
          balance = await creditsService.initBalance(parseInt(userId), '0.2')
          await addHistoric({
            userId: userId,
            operation: 'credit',
            description: 'Free Credit',
            total: 0.2,
            createdAt: new Date()
          })
          successRequest(res, 200, { balance: balance.toString() })
        }else{
          successRequest(res, 200, { balance: null })
        }
    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}

export async function getUserByEmailController(req, res, next){
    const userId = req.user.id
    const token = req.token
    const email = req.body.email
    try {
        const result = await wordpressService.getUserByEmail(token, email)
        const { id } = result
        successRequest(res, 200, { id, email })

    } catch (error) {
        const errorMessage = errorToText(error)
    //    console.log(errorMessage)
        await addLog(userId, errorMessage, {})
        badRequest(res, 500, error)
    }
}