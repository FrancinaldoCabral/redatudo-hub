import { errorToText } from '../services/axios-errors.service'
import { Response } from 'express'

export const badRequest = async (res: Response, status:number, error: Error): Promise<void> => {
//    console.log('STATUS/ERROR: ', status, error)
    res.status(status).json({msg: errorToText(error)})
}

export const successRequest = async (res: Response, status:number, data: any): Promise<void> => {
    //console.log('STATUS/SUCCESS: ', status, data)
    res.status(status).json(data)
}