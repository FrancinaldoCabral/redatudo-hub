import throng from 'throng';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import controllers from './services/db/controllers'

import * as systemService from './services/system.service';
import { errorToText } from './services/axios-errors.service';
import { MongoHelper } from './services/db/mongo-helper.db';
import { addLog } from './services/audit.service';

import { makeAgentControllerFactory } from './factorys/AgentControllerFactory';
import { makeAgenLongContentFactory } from './factorys/AgentLongContentControllerFactory';
import { makeToolControllerFactory } from './factorys/ToolControllerFactory';
import { isJobAborted } from './services/abort.service';
import { EbookExportService } from './services/ebook-export.service';

// Conexão Redis (mesma configuração do jobs.service)
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
});

async function bootstrap() {
  const mongoUri = process.env.MONGO_URL!;
  try {
    await MongoHelper.connect(mongoUri);
//    console.log('MongoDB connected.');

    // Inicia os workers
    const workers = parseInt(process.env.WEB_CONCURRENCY || '2', 10);
    const maxJobsPerWorker = 50;
    throng({
      start: () => startWorker(maxJobsPerWorker),
      workers
    });

  } catch (err) {
    console.error(`Erro ao conectar no MongoDB (${mongoUri}):`, err);
  }
}

function startWorker(maxJobs: number) {
  const worker = new Worker('rFree11', processJob, {
    connection,
    concurrency: maxJobs,
  });

  // Configura listeners de eventos no worker
  worker.on('completed', async (job: Job, result: any) => {
//    console.log('Job completed:', job.id);
    /* console.log('📤 ENVIANDO RESULTADO:', {
      userId: job.data.metadata.userId,
      status: 'Completed',
      result: result
    }); */
    result.jobId = job.id
    await systemService.sendResult(job.data.metadata.userId, 'Completed', result);
  });

  worker.on('active', async (job: Job) => {
//    console.log('Job active:', job.id);
    await systemService.sendResult(job.data.metadata.userId, 'Active', { id: job.id });
  });

  worker.on('failed', async (job: Job, err: Error) => {
//    console.log('Job failed:', job.id, err.message);
    await addLog(job.data.metadata.userId, err.message, {});
    await job.remove().catch(err => console.error(`Erro ao remover job ${job.id}:`, err));
    await systemService.sendResult(job.data.metadata.userId, 'Failed', { msg: err.message });
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('Worker started.');
}

async function processJob(job: Job) {
  try {

    // Monta dependências
    const agentController = makeAgentControllerFactory()

    const agentLongContentController = makeAgenLongContentFactory()

    // Ajusta metadata e dispara execução
    const metadata = { ...job.data.metadata, jobId: job.id }

    console.log(`Iniciando processamento do job ${job.id} para o usuário ${metadata.userId} (app: ${metadata.app})`);
    
    if (await isJobAborted(job.id)) throw new Error('Job cancelled');

    if(metadata.app === 'ebook-structure'){
    //    console.log('ebook-structure', job.data.form, job.data.metadata)
        const { summary } = await agentLongContentController.execute(job.data.form, metadata);
    //    console.log('summary', summary)
        return { summary };
    } else if (metadata.app === 'ebook-export') {
        // NOVO: Exportação de ebooks
        const exportService = new EbookExportService();
        const result = await exportService.processExport(job.data);
        return result;
    } else if (metadata.app) {
        // NOVO: Ferramentas específicas - usa ToolController
    //    console.log('Tool execution:', metadata.app, job.data.form, job.data.metadata)
        const toolController = makeToolControllerFactory();
        const result = await toolController.execute(job.data.form, metadata);
    //    console.log('ToolController result:', result);
        return {
          status: 'completed',
          result: {
            content: result.content,
            toolUsed: result.toolUsed,
            creditsCharged: result.creditsCharged
          }
        };
    } else {
        // Chat genérico - mantém comportamento atual com agent
        const { content, formFeedback } = await agentController.execute(job.data.form, metadata);
        return { role: 'assistant', content, formFeedback };
    }

  } catch (err: any) {
    console.error('Erro no processJob:', err);
    throw new Error(errorToText(err));
  } finally {
    controllers.delete(job.id.toString());
  }
}

// Inicia tudo
bootstrap();
