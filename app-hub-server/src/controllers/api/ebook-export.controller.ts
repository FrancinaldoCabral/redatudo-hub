import { Request, Response } from 'express';
import { EbookExportService } from '../../services/ebook-export.service';
import { errorToText } from '../../services/axios-errors.service';
import { getJobStatus, getUserJobs } from '../../services/jobs.service';

const exportService = new EbookExportService();

/**
 * Inicia processo de exportação de ebook
 * POST /api/ebook/projects/:projectId/export
 */
export const exportEbook = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { projectId } = req.params;
    const { format = 'markdown', options = {} } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId é obrigatório' });
    }

    // Validar formato suportado
    const supportedFormats = ['markdown', 'pdf', 'epub', 'docx'];
    if (!supportedFormats.includes(format)) {
      return res.status(400).json({
        error: `Formato não suportado. Use: ${supportedFormats.join(', ')}`
      });
    }

    // Iniciar exportação
    const result = await exportService.exportEbook(projectId, userId, format, options);

    res.status(202).json({
      success: true,
      jobId: result.jobId,
      estimatedCredits: result.estimatedCredits,
      message: 'Exportação iniciada. Acompanhe o progresso via WebSocket.',
      format,
      status: 'pending'
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar exportação:', error);
    res.status(500).json({
      error: 'Falha ao iniciar exportação',
      details: errorToText(error)
    });
  }
};

/**
 * Obtém status de uma exportação
 * GET /api/ebook/exports/:jobId/status
 */
export const getExportStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId é obrigatório' });
    }

    const jobStatus = await getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({ error: 'Job não encontrado' });
    }

    // Verificar se o job pertence ao usuário
    if (jobStatus.data?.metadata?.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Mapear estado do BullMQ para status amigável
    const statusMap: Record<string, string> = {
      'waiting': 'pending',
      'active': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'delayed': 'pending',
      'paused': 'paused'
    };

    res.json({
      jobId,
      status: statusMap[jobStatus.state] || jobStatus.state,
      progress: jobStatus.progress || 0,
      result: jobStatus.result,
      message: jobStatus.state === 'completed' ? 'Exportação concluída' : 
               jobStatus.state === 'active' ? 'Processando exportação...' :
               jobStatus.state === 'failed' ? jobStatus.failedReason || 'Falha na exportação' :
               'Aguardando processamento',
      timestamp: jobStatus.timestamp,
      processedOn: jobStatus.processedOn,
      finishedOn: jobStatus.finishedOn
    });

  } catch (error) {
    console.error('❌ Erro ao buscar status da exportação:', error);
    res.status(500).json({
      error: 'Falha ao buscar status',
      details: errorToText(error)
    });
  }
};

/**
 * Faz download do arquivo exportado
 * GET /api/ebook/exports/:jobId/download
 */
export const downloadExportedFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId é obrigatório' });
    }

    const jobStatus = await getJobStatus(jobId);

    if (!jobStatus) {
      return res.status(404).json({ error: 'Job não encontrado' });
    }

    // Verificar se o job pertence ao usuário
    if (jobStatus.data?.metadata?.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o job foi concluído
    if (jobStatus.state !== 'completed') {
      return res.status(400).json({ 
        error: 'Exportação ainda não concluída',
        status: jobStatus.state,
        message: 'Aguarde a conclusão da exportação para fazer o download'
      });
    }

    // Verificar se há resultado
    if (!jobStatus.result?.fileUrl) {
      return res.status(404).json({ 
        error: 'Arquivo não encontrado',
        message: 'O arquivo exportado não está mais disponível ou houve um erro na geração'
      });
    }

    // Redirecionar para o arquivo
    res.redirect(jobStatus.result.fileUrl);

  } catch (error) {
    console.error('❌ Erro no download:', error);
    res.status(500).json({
      error: 'Falha no download',
      details: errorToText(error)
    });
  }
};

/**
 * Lista exportações recentes do usuário
 * GET /api/ebook/exports/history
 */
export const getExportHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const jobs = await getUserJobs(userId, 'ebook-export', limit);

    const exports = jobs.map(job => ({
      jobId: job.id,
      format: job.format,
      status: job.state,
      createdAt: job.timestamp ? new Date(job.timestamp) : null,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      result: job.result,
      downloadUrl: job.state === 'completed' && job.result?.fileUrl 
        ? `/api/ebook/exports/${job.id}/download` 
        : null
    }));

    res.json({
      exports,
      total: exports.length
    });

  } catch (error) {
    console.error('❌ Erro ao buscar histórico de exportações:', error);
    res.status(500).json({
      error: 'Falha ao buscar histórico',
      details: errorToText(error)
    });
  }
};

/**
 * Obtém formatos suportados e custos
 * GET /api/ebook/export/formats
 */
export const getSupportedFormats = async (req: Request, res: Response) => {
  try {
    const formats = {
      markdown: {
        name: 'Markdown',
        extension: '.md',
        description: 'Arquivo de texto editável, compatível com GitHub, Notion, etc.',
        baseCost: 1,
        features: ['Editável', 'Leve', 'Universal', 'Versionamento Git']
      },
      pdf: {
        name: 'PDF',
        extension: '.pdf',
        description: 'Formato profissional para leitura e impressão',
        baseCost: 5,
        features: ['Layout fixo', 'Imagens', 'Profissional', 'Impressão']
      },
      epub: {
        name: 'EPUB',
        extension: '.epub',
        description: 'Padrão para e-readers (Kindle, Apple Books, etc.)',
        baseCost: 3,
        features: ['Layout responsivo', 'Metadados ricos', 'E-readers', 'Navegação']
      },
      docx: {
        name: 'Word',
        extension: '.docx',
        description: 'Documento editável no Microsoft Word',
        baseCost: 2,
        features: ['Editável', 'Compatível Word', 'Formatação rica']
      }
    };

    res.json({
      formats,
      note: 'Custos adicionais por palavras e imagens'
    });

  } catch (error) {
    console.error('❌ Erro ao buscar formatos suportados:', error);
    res.status(500).json({
      error: 'Falha ao buscar formatos',
      details: errorToText(error)
    });
  }
};

/**
 * Calcula custo estimado de exportação
 * POST /api/ebook/projects/:projectId/export/estimate
 */
export const estimateExportCost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { projectId } = req.params;
    const { format = 'markdown' } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId é obrigatório' });
    }

    // Validar formato
    const supportedFormats = ['markdown', 'pdf', 'epub', 'docx'];
    if (!supportedFormats.includes(format)) {
      return res.status(400).json({
        error: `Formato não suportado. Use: ${supportedFormats.join(', ')}`
      });
    }

    // Calcular estimativa real usando o serviço
    const estimate = await exportService.estimateExportCost(projectId, userId, format);

    res.json({
      projectId,
      format,
      estimatedCredits: estimate.totalCredits,
      breakdown: {
        baseCost: estimate.baseCost,
        contentCost: estimate.contentCost,
        imageCost: estimate.imageCost
      },
      stats: {
        wordCount: estimate.wordCount,
        imageCount: estimate.imageCount,
        sectionsCount: estimate.sectionsCount
      },
      note: 'Custo estimado baseado no conteúdo atual do projeto'
    });

  } catch (error) {
    console.error('❌ Erro ao estimar custo:', error);
    res.status(500).json({
      error: 'Falha na estimativa',
      details: errorToText(error)
    });
  }
};
