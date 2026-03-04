import { Request, Response } from 'express';
import { errorToText } from '../../services/axios-errors.service';
import * as uploadService from '../../services/local-bucket-upload.service';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * Temporary File Upload Controller
 * 
 * Gerencia uploads temporários de arquivos que são usados durante a geração
 * de conteúdo mas não são permanentemente armazenados no projeto.
 * 
 * Casos de uso:
 * - Upload rápido de referências durante geração de capítulo
 * - Anexos pontuais que não precisam ficar no projeto
 * - Arquivos de sessão/job específicos
 */

interface TempFileMetadata {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  expiresAt: Date;
  userId: string;
}

// Armazenamento em memória (pode ser migrado para Redis se necessário)
const tempFiles = new Map<string, TempFileMetadata>();

// Tempo de expiração padrão: 1 hora
const DEFAULT_EXPIRATION_HOURS = 1;

/**
 * POST /api/ebook/temp-files
 * Upload de arquivo temporário
 */
export const uploadTempFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validar tamanho (máximo 50MB por arquivo)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: `File too large. Maximum size is 50MB. Your file: ${(req.file.size / 1024 / 1024).toFixed(2)}MB` 
      });
    }

    // Gerar ID único para o arquivo temporário
    const tempFileId = uuidv4();

    // Upload para diretório temporário
    const directory = `temp-files/${userId}/${tempFileId}`;
    const fileUrl = await uploadService.uploadFile(req.file, userId, directory);

    // Detectar tipo do arquivo
    const fileType = detectFileType(req.file.mimetype, req.file.originalname);

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRATION_HOURS);

    // Criar metadados
    const metadata: TempFileMetadata = {
      id: tempFileId,
      url: fileUrl,
      name: req.file.originalname,
      type: fileType,
      size: req.file.size,
      uploadedAt: new Date(),
      expiresAt,
      userId
    };

    // Armazenar em memória
    tempFiles.set(tempFileId, metadata);

    console.log(`✅ Arquivo temporário criado: ${tempFileId} (expira em ${DEFAULT_EXPIRATION_HOURS}h)`);

    res.status(201).json({
      success: true,
      file: {
        id: metadata.id,
        url: metadata.url,
        name: metadata.name,
        type: metadata.type,
        size: metadata.size,
        expiresAt: metadata.expiresAt
      },
      message: `Arquivo temporário criado com sucesso. Expira em ${DEFAULT_EXPIRATION_HOURS} hora(s).`
    });
  } catch (error) {
    console.error('❌ Erro ao fazer upload de arquivo temporário:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};

/**
 * GET /api/ebook/temp-files/:fileId
 * Busca metadados de um arquivo temporário
 */
export const getTempFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { fileId } = req.params;

    const metadata = tempFiles.get(fileId);

    if (!metadata) {
      return res.status(404).json({ error: 'Temporary file not found or expired' });
    }

    // Verificar ownership
    if (metadata.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verificar se expirou
    if (new Date() > metadata.expiresAt) {
      tempFiles.delete(fileId);
      return res.status(410).json({ error: 'Temporary file has expired' });
    }

    res.json({
      success: true,
      file: {
        id: metadata.id,
        url: metadata.url,
        name: metadata.name,
        type: metadata.type,
        size: metadata.size,
        uploadedAt: metadata.uploadedAt,
        expiresAt: metadata.expiresAt
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar arquivo temporário:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};

/**
 * DELETE /api/ebook/temp-files/:fileId
 * Remove um arquivo temporário
 */
export const deleteTempFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { fileId } = req.params;

    const metadata = tempFiles.get(fileId);

    if (!metadata) {
      return res.status(404).json({ error: 'Temporary file not found' });
    }

    // Verificar ownership
    if (metadata.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remover do storage
    try {
      const minioPath = metadata.url.replace(`${process.env.MINIO_SERVER_URL}/storage/`, '');
      await uploadService.deleteFile(minioPath);
    } catch (error) {
      console.warn('⚠️  Erro ao remover arquivo do MinIO:', error);
    }

    // Remover dos metadados
    tempFiles.delete(fileId);

    console.log(`✅ Arquivo temporário removido: ${fileId}`);

    res.json({
      success: true,
      message: 'Temporary file deleted successfully'
    });
  } catch (error) {
    console.error('❌ Erro ao remover arquivo temporário:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};

/**
 * POST /api/ebook/temp-files/batch
 * Upload de múltiplos arquivos temporários
 */
export const uploadTempFiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    const uploadedFiles: any[] = [];
    const errors: any[] = [];

    for (const file of files) {
      try {
        // Validar tamanho
        if (file.size > maxSize) {
          errors.push({
            name: file.originalname,
            error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB > 50MB)`
          });
          continue;
        }

        // Upload
        const tempFileId = uuidv4();
        const directory = `temp-files/${userId}/${tempFileId}`;
        const fileUrl = await uploadService.uploadFile(file, userId, directory);

        const fileType = detectFileType(file.mimetype, file.originalname);

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRATION_HOURS);

        const metadata: TempFileMetadata = {
          id: tempFileId,
          url: fileUrl,
          name: file.originalname,
          type: fileType,
          size: file.size,
          uploadedAt: new Date(),
          expiresAt,
          userId
        };

        tempFiles.set(tempFileId, metadata);

        uploadedFiles.push({
          id: metadata.id,
          url: metadata.url,
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          expiresAt: metadata.expiresAt
        });
      } catch (error) {
        errors.push({
          name: file.originalname,
          error: errorToText(error)
        });
      }
    }

    console.log(`✅ ${uploadedFiles.length} arquivos temporários criados, ${errors.length} erros`);

    res.status(201).json({
      success: true,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      count: uploadedFiles.length,
      message: `${uploadedFiles.length} arquivo(s) temporário(s) criado(s) com sucesso.`
    });
  } catch (error) {
    console.error('❌ Erro ao fazer upload de arquivos temporários:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};

/**
 * Resolve temporary file IDs to full metadata
 * Helper function usado pelos endpoints de geração
 */
export async function resolveTempFiles(
  fileIds: string[],
  userId: string
): Promise<Array<{ url: string; type: string; name: string; instructions?: string }>> {
  const resolvedFiles: Array<{ url: string; type: string; name: string; instructions?: string }> = [];

  for (const fileId of fileIds) {
    const metadata = tempFiles.get(fileId);

    if (!metadata) {
      console.warn(`⚠️  Arquivo temporário não encontrado: ${fileId}`);
      continue;
    }

    // Verificar ownership
    if (metadata.userId !== userId) {
      console.warn(`⚠️  Acesso negado ao arquivo temporário: ${fileId}`);
      continue;
    }

    // Verificar expiração
    if (new Date() > metadata.expiresAt) {
      console.warn(`⚠️  Arquivo temporário expirado: ${fileId}`);
      tempFiles.delete(fileId);
      continue;
    }

    resolvedFiles.push({
      url: metadata.url,
      type: metadata.type,
      name: metadata.name
    });
  }

  return resolvedFiles;
}

/**
 * Cleanup de arquivos expirados
 * Deve ser chamado periodicamente (ex: cron job)
 */
export async function cleanupExpiredFiles(): Promise<number> {
  let cleanedCount = 0;
  const now = new Date();

  for (const [fileId, metadata] of tempFiles.entries()) {
    if (now > metadata.expiresAt) {
      try {
        // Remover do storage
        const minioPath = metadata.url.replace(`${process.env.MINIO_SERVER_URL}/storage/`, '');
        await uploadService.deleteFile(minioPath);
        
        // Remover dos metadados
        tempFiles.delete(fileId);
        cleanedCount++;
      } catch (error) {
        console.error(`❌ Erro ao limpar arquivo expirado ${fileId}:`, error);
      }
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Limpeza automática: ${cleanedCount} arquivo(s) temporário(s) removido(s)`);
  }

  return cleanedCount;
}

/**
 * Detecta tipo de arquivo baseado em mimetype
 */
function detectFileType(mimetype: string, filename: string): 'pdf' | 'docx' | 'image' | 'video' | 'audio' {
  if (mimetype.includes('pdf')) return 'pdf';
  if (mimetype.includes('document') || mimetype.includes('word') || filename.endsWith('.docx')) return 'docx';
  if (mimetype.includes('image')) return 'image';
  if (mimetype.includes('video')) return 'video';
  if (mimetype.includes('audio')) return 'audio';
  
  // Fallback baseado em extensão
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
  if (['mp4', 'avi', 'mov'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';

  return 'pdf'; // Default
}

// Iniciar cleanup automático (a cada 15 minutos)
setInterval(() => {
  cleanupExpiredFiles().catch(error => {
    console.error('❌ Erro no cleanup automático:', error);
  });
}, 15 * 60 * 1000);
