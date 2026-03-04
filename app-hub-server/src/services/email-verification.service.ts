import { MongoHelper } from './db/mongo-helper.db'
import { MongoDbService } from './mongodb.service'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { errorToText } from './axios-errors.service'

//const generatedCodes = new Set<string>() // Usado para garantir que os códigos não se repitam
const db = new MongoDbService()
const apiUrl = 'https://api.turbo-smtp.com/api/v2'

async function getGeneratedCodes(): Promise<string[]>{
    const verifications = await db.get('email_verification', {})
    return verifications.map((v:any)=>{ return v.code }) 
}

async function addCode(email: string, code:string): Promise<void>{
    const collection = await MongoHelper.getCollection('email_verification')
    await collection.updateOne({ email }, { $set: { email, code, confirmed:false, createdAt: new Date() } }, { upsert:true })
}

export async function confirmEmail(email:string): Promise<void>{
    await db.updateOne('email_verification', { email }, { $set: { confirmed:true }})
}

//CONFIRMA O EMAIL VERIFICANDO SE O CÓDIGO FOI ENVIADO PARA O EMAIL INFORMADO
export async function codeVerify(email: string, code:string): Promise<boolean> {
    const response = await db.getOne('email_verification', { email, code: code.trim() })
    if(response!=null && response!=undefined) return true
    else return false
}

//VERIFICA SE O EMAIL FOI CONFIRMADO
export async function emailVerify(email: string): Promise<boolean>{
    const response = await db.getOne('email_verification', { email })
    if(response==null || response==undefined) return false
    else if(response.confirmed===false) return false
    else return true
}

//REMOVE EMAILS NAO CONFIRMADOS
export async function removeUnconfirmeds(email: string): Promise<void>{
    await db.deleteMany('email_verification', { email, confirmed:false })
}

export async function sendUniqueCodeEmail(userEmail: string): Promise<any> {
  // Gera um código único
  let uniqueCode: string
  try {
    const emailIsVerified = await emailVerify(userEmail)
    if(emailIsVerified) throw new Error('The email has already been verified.');   
    const generatedCodes = await getGeneratedCodes()
    do {
        uniqueCode = uuidv4()
    }while(generatedCodes.find((verification:string)=>{ return verification === uniqueCode })) // Garante que o código é único
    await addCode(userEmail, uniqueCode)
  } catch (error) {
    throw error
  }

  // Configura o transporte de email
  const config = {
    headers: {
        consumerKey: process.env.SMTP_CONSUMER_KEY,
        consumerSecret: process.env.SMPT_CONSUMER_SECRET
    }
  }
  const msgHtml = `
                <h3>Seu código chegou!!! Verifique seu email agora.</h3>
                <p>Oi, tudo bem?</p>
                <p>Desculpe a burocracia, ta bom🙈</p>
                <p>Isso é necessário pra manter nosso sistema voando..✈️ Mas te garanto que vai valer a pena.</p>
                <h4>Abaixo o seu código de verificação. Use isso pra desbloquear o sistema:</h4>
                <p style="padding: 3px; margin: 3px; background-color: #f8f9fa; text-align: center; font-weight: bold;">
                    ${uniqueCode}
                </p>
                `
  const emailForm = {
    "authuser": process.env.SMPT_USER,
    "authpass": process.env.SMTP_PASS,
    "from": 'suporte@redatudo.online',
    "to": userEmail,
    "subject": "Redatudo - Confirme seu email agora!",
    "content": `Aqui está o seu código único: ${uniqueCode}`,
    "html_content": msgHtml
  }
  // Envia o email
  try {
    const response = await axios.post(`${apiUrl}/mail/send`, emailForm, config)
    return response.data.message
    //console.log(`Email para ${userEmail} com o código ${uniqueCode} foi enviado?`, response.data.message)
  } catch (error) {
    console.error('Erro ao enviar email:', errorToText(error))
    await db.deleteOne('email_verification', { email: userEmail })
    throw error
  }
}