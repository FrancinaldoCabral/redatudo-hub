import { Request, Response, NextFunction } from 'express'
import { verifyOrderHash } from './util'

export function verifyWooWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const order = req.body

    const orderId = order.id
    //const createdAt = order.date_created
    const createdAt = '2024-08-26T18:00:44+00:00'
    const incomingHash = order.meta_data?.find((m: any) => m.key === '_custom_order_hash')?.value
//    console.log(orderId, createdAt, incomingHash)

    if (!orderId || !createdAt || !incomingHash) {
      return res.status(400).json({ error: 'Missing verification data.' })
    }

    const isValid = verifyOrderHash(orderId, createdAt, incomingHash)

    if (!isValid) {
      return res.status(403).json({ error: 'Invalid hash.' })
    }

    next()
  } catch (err) {
    console.error('Erro ao verificar webhook:', err)
    return res.status(500).json({ error: 'Erro interno.' })
  }
}
