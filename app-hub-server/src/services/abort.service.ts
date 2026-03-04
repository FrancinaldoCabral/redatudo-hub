// abort.service.ts
import Redis from 'ioredis';

// Inicia o client Redis (ajuste as envs se necessário)
const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined
});

// Prefixo para isolar a chave
const KEY_PREFIX = 'cancelled_jobs:';

/**
 * Marca um job como cancelado. Expira automaticamente após `ttlSeconds`.
 *
 * @param jobId Id do job (string ou number)
 * @param ttlSeconds Tempo de expiração da flag (ex: 3600 para 1h)
 */
export async function abortJob(jobId: string | number, ttlSeconds = 3600): Promise<void> {
    await redis.set(`${KEY_PREFIX}${jobId}`, "1", 'EX', ttlSeconds);
}

/**
 * Consulta se um job já foi cancelado.
 * Retorna TRUE se cancelado, FALSE se não.
 *
 * @param jobId Id do job (string ou number)
 */
export async function isJobAborted(jobId: string | number): Promise<boolean> {
    const value = await redis.get(`${KEY_PREFIX}${jobId}`);
    return !!value;
}

/**
 * Remove a flag de cancelamento explicitamente (opcional).
 * Útil se quiser limpar logo após concluir o job.
 *
 * @param jobId Id do job
 */
export async function clearAbort(jobId: string | number): Promise<void> {
    await redis.del(`${KEY_PREFIX}${jobId}`);
}