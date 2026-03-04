import { Request } from 'express'
import jwt from 'jsonwebtoken'
import { emailVerify } from './services/email-verification.service'
import crypto from 'crypto'

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-default-secret-key'
export class CustomRequest extends Request {
  user?: any
  token?: any
}

export function authWebMiddleware(req, res, next) {
  const authHeader: string | undefined = req.headers['authorization']
  let token: string | undefined
  //console.log(authHeader.replace('Bearer ', ''))
  if (authHeader) token = authHeader.replace('Bearer ', '')
  else return res.status(401).json({code: 'auth', msg: 'An authorization is required.'})

  if (!token) return res.status(401).json({code: 'auth', msg: 'An authorization is required.'})

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({code: 'auth', msg: 'An authorization is required.'})
    }
 
    if (decoded?.data) {
      req.user = decoded.data
      req.token = token
      next()
    } else {
      return res.status(401).json({code: 'auth', msg: 'An authorization is required.'})
    }
  })
}

export async function userParamToReqUser(req, res, next){
  req.user = { id: req.params.userId }
  next()
}

export async function emailConfirmed(req, res, next) {
  const email = req.user.email
  const response = await emailVerify(email)
  if(response) next()
  else return res.status(401).json({code: 'email', msg: `The email ${email} has not yet been confirmed.`})
}

export async function woocommerceHook(req, res, next){
  const secret = process.env.WOOCOMMERCE_SECRET // A chave secreta usada no WooCommerce
  const receivedSignature = req.headers['x-wc-webhook-signature'] as string
  const payload = JSON.stringify(req.body) // Corpo da requisição

      // Calcular o hash HMAC SHA256
      const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64')

  // Verificar se o hash recebido coincide com o gerado
  if (receivedSignature === generatedSignature) {
  //    console.log('Webhook autenticado com sucesso!')
      next()
  } else {
  //    console.log('Falha na autenticação do webhook!')
      return res.status(401).send('Unauthorized')
  }
}

export async function allowedFunction(req, res, next, permissions) {
  const user = req.user
  //console.log('USER: ', user)
  if(permissions.includes(user.role)) next()
  else return res.status(401).json({ code:'auth', msg: 'Admin Unauthorized' })
}export function authSocketMiddleware(socket, next) {
  if (socket.handshake.auth && socket.handshake.auth.token) {
    jwt.verify(socket.handshake.auth.token, JWT_SECRET, (err: any, decoded: any) => {
      if (err || !decoded?.data) {
        next(new Error('Authentication error'))
      } else {
        socket.user = decoded.data
        socket.token = socket.handshake.auth.token
        next()
      }
    })
  } else {
    next(new Error('Authentication error'))
  }
}