import { MongoDbService } from './mongodb.service';
import { ObjectId } from 'mongodb';
import { ReferenceFile } from './ebook-prompt.service';
import * as uploadService from './local-bucket-upload.service';

/**
 * Metadados de um arquivo de referência do projeto
 */
export interface ProjectReferenceFile extends ReferenceFile {
  _id?: string;
  alias: string; // Para citação com @alias
  uploadedAt: Date;
  uploadedBy: string; // userId
  size?: number;
  usageCount?: number; // Quantas vezes foi citado
  lastUsedAt?: Date;
}

/**
 * Sugestão inteligente de citação
 */
export interface ReferenceSuggestion {
  file: ProjectReferenceFile;
  relevanceScore: number;
  reason: string;
}

/**
 * Serviço para gerenciar arquivos de referência do projeto
 * Suporta citação tipo "@alias" em prompts
 */
export class ProjectReferenceService {
  private mongoService: MongoDbService;

  constructor() {
    this.mongoService = new MongoDbService();
  }

  /**
   * Busca todos os arquivos de referência de um projeto
   */
  async getProjectReferences(projectId: string, userId: string): Promise<ProjectReferenceFile[]> {
    // Verificar acesso ao projeto
    const projects = await this.mongoService.get('ebookProjects', {
      _id: new ObjectId(projectId),
      userId: userId
    });

    if (!projects || projects.length === 0) {
      throw new Error('Project not found or access denied');
    }

    const project = projects[0];
    return project.referenceFiles || [];
  }

  /**
   * Adiciona um arquivo de referência ao projeto
   */
  async addReference(
    projectId: string,
    userId: string,
    file: any, // Multer file
    alias: string,
    instructions?: string
  ): Promise<ProjectReferenceFile> {
    // Verificar acesso ao projeto
    const projects = await this.mongoService.get('ebookProjects', {
      _id: new ObjectId(projectId),
      userId: userId
    });

    if (!projects || projects.length === 0) {
      throw new Error('Project not found or access denied');
    }

    const project = projects[0];
    const existingFiles = project.referenceFiles || [];

    // Validar alias único
    const normalizedAlias = this.normalizeAlias(alias);
    if (existingFiles.some((f: ProjectReferenceFile) => f.alias === normalizedAlias)) {
      throw new Error(`Alias "${normalizedAlias}" já está em uso. Escolha outro alias.`);
    }

    // Upload do arquivo
    const directory = `ebook-references/${projectId}`;
    const fileUrl = await uploadService.uploadFile(file, userId, directory);

    // Detectar tipo do arquivo
    const fileType = this.detectFileType(file.mimetype, file.originalname);

    // Criar registro
    const referenceFile: ProjectReferenceFile = {
      _id: new ObjectId().toString(),
      url: fileUrl,
      type: fileType,
      name: file.originalname,
      alias: normalizedAlias,
      instructions: instructions || '',
      uploadedAt: new Date(),
      uploadedBy: userId,
      size: file.size,
      usageCount: 0
    };

    // Adicionar ao projeto
    existingFiles.push(referenceFile);

    await this.mongoService.updateOne('ebookProjects',
      { _id: new ObjectId(projectId) },
      {
        $set: {
          referenceFiles: existingFiles,
          'referenceFilesMetadata.uploadedAt': new Date(),
          'referenceFilesMetadata.totalSize': existingFiles.reduce((sum: number, f: ProjectReferenceFile) => sum + (f.size || 0), 0),
          'referenceFilesMetadata.count': existingFiles.length
        }
      }
    );

    return referenceFile;
  }

  /**
   * Remove um arquivo de referência do projeto
   */
  async removeReference(projectId: string, userId: string, fileId: string): Promise<void> {
    // Verificar acesso ao projeto
    const projects = await this.mongoService.get('ebookProjects', {
      _id: new ObjectId(projectId),
      userId: userId
    });

    if (!projects || projects.length === 0) {
      throw new Error('Project not found or access denied');
    }

    const project = projects[0];
    const existingFiles: ProjectReferenceFile[] = project.referenceFiles || [];

    // Encontrar arquivo
    const fileIndex = existingFiles.findIndex((f: ProjectReferenceFile) => f._id === fileId);
    if (fileIndex === -1) {
      throw new Error('Reference file not found');
    }

    const fileToRemove = existingFiles[fileIndex];

    // Remover do MinIO (opcional - pode querer manter por histórico)
    try {
      const minioPath = fileToRemove.url.replace(`${process.env.MINIO_SERVER_URL}/storage/`, '');
      await uploadService.deleteFile(minioPath);
    } catch (error) {
      console.warn('⚠️  Erro ao remover arquivo do MinIO:', error);
    }

    // Remover do array
    existingFiles.splice(fileIndex, 1);

    await this.mongoService.updateOne('ebookProjects',
      { _id: new ObjectId(projectId) },
      {
        $set: {
          referenceFiles: existingFiles,
          'referenceFilesMetadata.count': existingFiles.length,
          'referenceFilesMetadata.totalSize': existingFiles.reduce((sum: number, f: ProjectReferenceFile) => sum + (f.size || 0), 0)
        }
      }
    );
  }

  /**
   * Atualiza instruções de um arquivo de referência
   */
  async updateReferenceInstructions(
    projectId: string,
    userId: string,
    fileId: string,
    instructions: string
  ): Promise<ProjectReferenceFile> {
    // Verificar acesso ao projeto
    const projects = await this.mongoService.get('ebookProjects', {
      _id: new ObjectId(projectId),
      userId: userId
    });

    if (!projects || projects.length === 0) {
      throw new Error('Project not found or access denied');
    }

    const project = projects[0];
    const existingFiles: ProjectReferenceFile[] = project.referenceFiles || [];

    // Encontrar arquivo
    const fileIndex = existingFiles.findIndex((f: ProjectReferenceFile) => f._id === fileId);
    if (fileIndex === -1) {
      throw new Error('Reference file not found');
    }

    // Atualizar
    existingFiles[fileIndex].instructions = instructions;

    await this.mongoService.updateOne('ebookProjects',
      { _id: new ObjectId(projectId) },
      { $set: { referenceFiles: existingFiles } }
    );

    return existingFiles[fileIndex];
  }

  /**
   * Parse de prompt para detectar citações @alias
   * Retorna lista de arquivos citados
   */
  async parseReferencesFromPrompt(
    prompt: string,
    projectId: string,
    userId: string
  ): Promise<ProjectReferenceFile[]> {
    // Buscar arquivos do projeto
    const projectFiles = await this.getProjectReferences(projectId, userId);

    if (projectFiles.length === 0) {
      return [];
    }

    // Regex para detectar @alias (alfanumérico, hífen, underscore)
    const citationRegex = /@([\w\-]+)/g;
    const matches = [...prompt.matchAll(citationRegex)];

    if (matches.length === 0) {
      return [];
    }

    // Extrair aliases únicos
    const citedAliases = [...new Set(matches.map(m => m[1].toLowerCase()))];

    // Resolver para arquivos
    const resolvedFiles: ProjectReferenceFile[] = [];

    for (const alias of citedAliases) {
      const file = projectFiles.find((f: ProjectReferenceFile) => f.alias === alias);
      if (file) {
        resolvedFiles.push(file);
        
        // Incrementar contador de uso
        await this.incrementUsageCount(projectId, file._id!);
      } else {
        console.warn(`⚠️  Arquivo com alias "@${alias}" não encontrado no projeto ${projectId}`);
      }
    }

    return resolvedFiles;
  }

  /**
   * Sugestões inteligentes de citação baseadas em contexto
   * Analisa o prompt e sugere arquivos relevantes
   */
  async getSuggestionsForContext(
    projectId: string,
    userId: string,
    context: {
      prompt?: string;
      sectionType?: string;
      action?: string;
    }
  ): Promise<ReferenceSuggestion[]> {
    const projectFiles = await this.getProjectReferences(projectId, userId);

    if (projectFiles.length === 0) {
      return [];
    }

    const suggestions: ReferenceSuggestion[] = [];

    for (const file of projectFiles) {
      let relevanceScore = 0;
      const reasons: string[] = [];

      // 1. Arquivos mais usados têm prioridade
      if (file.usageCount && file.usageCount > 0) {
        relevanceScore += Math.min(file.usageCount * 10, 30);
        if (file.usageCount > 5) {
          reasons.push('Arquivo frequentemente usado');
        }
      }

      // 2. Análise de palavras-chave no nome do arquivo e instruções
      if (context.prompt) {
        const promptLower = context.prompt.toLowerCase();
        const fileLower = file.name.toLowerCase();
        const instructionsLower = (file.instructions || '').toLowerCase();

        // Keywords específicas
        const keywords = [
          'estilo', 'style', 'guia', 'guide', 'tom', 'tone',
          'pesquisa', 'research', 'referência', 'reference',
          'exemplo', 'example', 'template', 'modelo'
        ];

        for (const keyword of keywords) {
          if (promptLower.includes(keyword) && (fileLower.includes(keyword) || instructionsLower.includes(keyword))) {
            relevanceScore += 20;
            reasons.push(`Relacionado a "${keyword}"`);
            break;
          }
        }
      }

      // 3. Tipo de seção vs tipo de arquivo
      if (context.sectionType) {
        // PDFs são bons para capítulos e conteúdo denso
        if ((context.sectionType === 'chapter' || context.sectionType === 'introduction') && file.type === 'pdf') {
          relevanceScore += 15;
          reasons.push('PDF útil para conteúdo denso');
        }

        // Imagens boas para capas e design
        if (context.sectionType === 'cover' && file.type === 'image') {
          relevanceScore += 25;
          reasons.push('Imagem de referência para design de capa');
        }
      }

      // 4. Ação vs tipo de arquivo
      if (context.action) {
        if (context.action.includes('design') && file.type === 'image') {
          relevanceScore += 20;
          reasons.push('Imagem útil para geração de design');
        }

        if (context.action.includes('style') || context.action.includes('tone')) {
          if (file.instructions?.toLowerCase().includes('estilo') || file.instructions?.toLowerCase().includes('tom')) {
            relevanceScore += 25;
            reasons.push('Guia de estilo ou tom');
          }
        }
      }

      // 5. Arquivos recentemente usados
      if (file.lastUsedAt) {
        const daysSinceUsed = (Date.now() - new Date(file.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUsed < 7) {
          relevanceScore += 10;
          reasons.push('Usado recentemente');
        }
      }

      // Adicionar à lista se tiver alguma relevância
      if (relevanceScore > 0) {
        suggestions.push({
          file,
          relevanceScore,
          reason: reasons.join(', ') || 'Disponível no projeto'
        });
      }
    }

    // Ordenar por relevância (maior primeiro)
    suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Retornar top 5
    return suggestions.slice(0, 5);
  }

  /**
   * Incrementa contador de uso de um arquivo
   */
  private async incrementUsageCount(projectId: string, fileId: string): Promise<void> {
    try {
      const projects = await this.mongoService.get('ebookProjects', {
        _id: new ObjectId(projectId)
      });

      if (!projects || projects.length === 0) return;

      const project = projects[0];
      const files: ProjectReferenceFile[] = project.referenceFiles || [];

      const fileIndex = files.findIndex((f: ProjectReferenceFile) => f._id === fileId);
      if (fileIndex === -1) return;

      files[fileIndex].usageCount = (files[fileIndex].usageCount || 0) + 1;
      files[fileIndex].lastUsedAt = new Date();

      await this.mongoService.updateOne('ebookProjects',
        { _id: new ObjectId(projectId) },
        { $set: { referenceFiles: files } }
      );
    } catch (error) {
      console.error('Erro ao incrementar contador de uso:', error);
    }
  }

  /**
   * Normaliza alias (lowercase, remove espaços)
   */
  private normalizeAlias(alias: string): string {
    return alias
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]/g, '');
  }

  /**
   * Detecta tipo de arquivo baseado em mimetype
   */
  private detectFileType(mimetype: string, filename: string): 'pdf' | 'docx' | 'image' | 'video' | 'audio' {
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
}

// Singleton instance
export const projectReferenceService = new ProjectReferenceService();
