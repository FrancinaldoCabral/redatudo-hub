// queue.ts
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// Conexão Redis (pode usar opções modernas sem erro)
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
})

// Inicializa a fila
const workQueue = new Queue('rFree11', {
  connection,
})

// Opções padrão dos jobs
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'fixed', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
  timeout: 600000,
}

// Adiciona um job à fila
async function addJob(data: any) {
  data.createdAt = new Date()
  const result = await workQueue.add('job', data, defaultJobOptions)
  return result
}

// Busca um job pelo ID
async function getJob(jobId: string) {
  return await workQueue.getJob(jobId)
}

// Busca status e resultado de um job
async function getJobStatus(jobId: string) {
  const job = await workQueue.getJob(jobId)
  if (!job) {
    return null
  }

  const state = await job.getState()
  const progress = job.progress
  const returnvalue = job.returnvalue
  
  return {
    id: job.id,
    state,
    progress,
    result: returnvalue,
    data: job.data,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason
  }
}

// Lista jobs de um usuário
async function getUserJobs(userId: string, app?: string, limit: number = 10) {
  const jobs = await workQueue.getJobs(['completed', 'failed'], 0, limit * 2)
  
  return jobs
    .filter(job => {
      const matchUser = job.data?.metadata?.userId === userId
      const matchApp = !app || job.data?.metadata?.app === app
      return matchUser && matchApp
    })
    .slice(0, limit)
    .map(job => ({
      id: job.id,
      state: job.state,
      app: job.data?.metadata?.app,
      format: job.data?.metadata?.format,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      result: job.returnvalue
    }))
}

export { addJob, workQueue, getJob, getJobStatus, getUserJobs }
