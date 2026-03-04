import { MongoHelper } from './db/mongo-helper.db';
import { emailVerify, sendUniqueCodeEmail } from './email-verification.service';
import { addLog } from './audit.service';
import { errorToText } from './axios-errors.service';

/**
 * Verifica se o usuário tem role adequado para usar o sistema
 */
async function userHasValidRole(userId: string): Promise<boolean> {
  try {
    // Buscar dados do usuário no WordPress/WooCommerce
    // Por enquanto, assumimos que customer_id do WooCommerce = userId do sistema
    // e que todos os usuários que assinam têm role válido (subscriber ou administrator)
    return true;
  } catch (err) {
    console.error('Erro ao verificar role do usuário:', err);
    return false;
  }
}

/**
 * Verifica se o email do usuário já foi confirmado
 */
async function isEmailVerified(email: string): Promise<boolean> {
  try {
    return await emailVerify(email);
  } catch (err) {
    console.error('Erro ao verificar email:', err);
    return false;
  }
}

/**
 * Envia email de verificação para o usuário após assinatura criada
 */
export async function sendSubscriptionWelcomeEmail(
  userId: string,
  email: string,
  subscriptionData: any
): Promise<void> {
  try {
    // Verificar se usuário tem role válido
    const hasValidRole = await userHasValidRole(userId);
    if (!hasValidRole) {
  //    console.log(`Usuário ${userId} não tem role válido, não enviando email.`);
      return;
    }

    // Verificar se email já foi confirmado
    const emailAlreadyVerified = await isEmailVerified(email);
    if (emailAlreadyVerified) {
  //    console.log(`Email ${email} já verificado, não enviando novamente.`);
      return;
    }

    // Enviar email de verificação usando o serviço existente
//    console.log(`Enviando email de verificação para ${email} (userId: ${userId})`);
    
    const result = await sendUniqueCodeEmail(email);
    
    await addLog(userId, `Email de verificação enviado para ${email} após criação de assinatura`, {
      subscription_id: subscriptionData.subscription_id,
      variation_id: subscriptionData.variation_id,
      smtp_result: result,
    });

    await logEmailAttempt(userId, email, true);
//    console.log(`Email de verificação enviado com sucesso para ${email}`);
  } catch (err) {
    console.error('Erro ao enviar email de verificação:', errorToText(err));
    await addLog(userId, `Erro ao enviar email de verificação: ${errorToText(err)}`, {});
    await logEmailAttempt(userId, email, false, errorToText(err));
  }
}

/**
 * Registra tentativa de envio de email
 */
export async function logEmailAttempt(
  userId: string,
  email: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const collection = await MongoHelper.getCollection('email_verification_log');
    await collection.insertOne({
      userId,
      email,
      success,
      error,
      created_at: new Date(),
    });
  } catch (err) {
    console.error('Erro ao registrar tentativa de email:', err);
  }
}
