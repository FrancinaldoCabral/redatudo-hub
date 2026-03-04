import { Request, Response } from 'express';
import { errorToText } from '../../services/axios-errors.service';
import { projectReferenceService } from '../../services/project-reference.service';

/**
 * GET /api/ebook/projects/:projectId/reference-files
 * Lista todos os arquivos de referência do projeto
 */
export const getProjectReferenceFiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const files = await projectReferenceService.getProjectReferences(projectId, userId);

    res.json({
      success: true,
      files,
      count: files.length,
      totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0)
    });
  } catch (error) {
    console.error('❌ Erro ao buscar arquivos de referência:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};

/**
 * POST /api/ebook/projects/:projectId/reference-files
 * Adiciona um arquivo de referência ao projeto
 */
export const uploadProjectReferenceFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { projectId } = req.params;
    const { alias, instructions } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    if (!alias || alias.trim().length === 0) {
      return res.status(400).json({ error: 'alias is required' });
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

    const referenceFile = await projectReferenceService.addReference(
      projectId,
      userId,
      req.file,
      alias,
      instructions
    );

    console.log(`✅ Arquivo de referência adicionado: @${referenceFile.alias} ao projeto ${projectId}`);

    res.status(201).json({
      success: true,
      file: referenceFile,
      message: `Arquivo adicionado com sucesso. Cite com @${referenceFile.alias} em seus prompts.`
    });
  } catch (error) {
    console.error('❌ Erro ao adicionar arquivo de referência:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};

/**
 * DELETE /api/ebook/projects/:projectId/reference-files/:fileId
 * Remove um arquivo de referência do projeto
 */
export const deleteProjectReferenceFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { projectId, fileId } = req.params;

    if (!projectId || !fileId) {
      return res.status(400).json({ error: 'projectId and fileId are required' });
    }

    await projectReferenceService.removeReference(projectId, userId, fileId);

    console.log(`✅ Arquivo de referência removido: ${fileId} do projeto ${projectId}`);

    res.json({
      success: true,
      message: 'Arquivo de referência removido com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao remover arquivo de referência:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};

/**
 * PUT /api/ebook/projects/:projectId/reference-files/:fileId
 * Atualiza instruções de um arquivo de referência
 */
export const updateProjectReferenceFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { projectId, fileId } = req.params;
    const { instructions } = req.body;

    if (!projectId || !fileId) {
      return res.status(400).json({ error: 'projectId and fileId are required' });
    }

    if (instructions === undefined) {
      return res.status(400).json({ error: 'instructions field is required' });
    }

    const updatedFile = await projectReferenceService.updateReferenceInstructions(
      projectId,
      userId,
      fileId,
      instructions
    );

    console.log(`✅ Instruções atualizadas para arquivo: @${updatedFile.alias}`);

    res.json({
      success: true,
      file: updatedFile,
      message: 'Instruções atualizadas com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar arquivo de referência:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};

/**
 * POST /api/ebook/projects/:projectId/reference-suggestions
 * Obtém sugestões inteligentes de citação baseadas em contexto
 */
export const getReferenceSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
    }

    const { projectId } = req.params;
    const { prompt, sectionType, action } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const suggestions = await projectReferenceService.getSuggestionsForContext(
      projectId,
      userId,
      {
        prompt,
        sectionType,
        action
      }
    );

    res.json({
      success: true,
      suggestions,
      count: suggestions.length,
      message: suggestions.length > 0 
        ? `${suggestions.length} sugestões encontradas` 
        : 'Nenhuma sugestão relevante encontrada'
    });
  } catch (error) {
    console.error('❌ Erro ao obter sugestões:', error);
    res.status(500).json({ error: errorToText(error) });
  }
};
