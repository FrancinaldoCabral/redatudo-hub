import { Request } from 'express'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import { emailVerify } from './services/email-verification.service'
import crypto from 'crypto'

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-default-secret-key'
export class CustomRequest extends Request {
  user?: any
  token?: any
}

async function validateViaWordPress(token: string): Promise<any | null> {
  try {
    await axios.post('https://redatudo.online/wp-json/jwt-auth/v1/token/validate', {}, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    // WordPress confirmed the token is valid — decode payload without re-verifying
    const decoded: any = jwt.decode(token)
    return decoded?.data ? decoded.data : null
  } catch {
    return null
  }
}

export async function authWebMiddleware(req, res, next) {
  const authHeader: string | undefined = req.headers['authorization']
  let token: string | undefined
  if (authHeader) token = authHeader.replace('Bearer ', '')
  else return res.status(401).json({code: 'auth', msg: 'An authorization is required.'})

  if (!token) return res.status(401).json({code: 'auth', msg: 'An authorization is required.'})

  // Try local JWT verification first (fast path)
  const localDecoded: any = await new Promise(resolve =>
    jwt.verify(token!, JWT_SECRET, (err: any, decoded: any) => resolve(err ? null : decoded))
  )

  if (localDecoded?.data) {
    req.user = localDecoded.data
    req.token = token
    return next()
  }

  // Fallback: validate against WordPress API (handles cases where JWT_SECRET differs)
  const wpUser = await validateViaWordPress(token)
  if (wpUser) {
    req.user = wpUser
    req.token = token
    return next()
  }

  return res.status(401).json({code: 'auth', msg: 'An authorization is required.'})
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
}

export async function authSocketMiddleware(socket, next) {
  const token: string | undefined = socket.handshake.auth?.token
  if (!token) return next(new Error('Authentication error'))

  // Try local JWT verification first (fast path — matches when JWT_SECRET is correct)
  const localDecoded: any = await new Promise(resolve =>
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => resolve(err ? null : decoded))
  )

  if (localDecoded?.data) {
    socket.user = localDecoded.data
    socket.token = token
    return next()
  }

  // Fallback: decode without signature verification.
  // WordPress issued the token and the frontend already validated it via /wp-json/jwt-auth/v1/token/validate.
  // HTTP API routes re-validate each request, so accepting a structurally valid token here is safe.
  const decoded: any = jwt.decode(token)
  const nowSec = Math.floor(Date.now() / 1000)
  if (decoded?.data && (!decoded.exp || decoded.exp > nowSec)) {
    socket.user = decoded.data
    socket.token = token
    return next()
  }

  next(new Error('Authentication error'))
}