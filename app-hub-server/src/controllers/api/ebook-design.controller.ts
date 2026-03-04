/**
 * Controller para gerenciamento de design de ebooks
 */

import { Request, Response } from 'express';
import { MongoDbService } from '../../services/mongodb.service';
import { EbookDesignPersonalizationService } from '../../services/ebook-design-personalization.service';
import { EbookLivePreviewService } from '../../services/ebook-live-preview.service';
import { EbookContentWrapperService } from '../../services/ebook-content-wrapper.service';
import { EbookProject } from '../../templates/ebook/markdown-template';
import { ObjectId } from 'mongodb';

const mongoDbService = new MongoDbService();
const livePreviewService = new EbookLivePreviewService();

export class EbookDesignController {
  /**
   * POST /api/ebook/project/:id/design/generate
   * Gera design inicial para o projeto
   */
  static async generateDesign(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const { customInstruction } = req.body;
      const userId = (req as any).user.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar projeto
      const projects = await mongoDbService.get('ebookProjects', {
        _id: new ObjectId(projectId),
        userId: userId
      });

      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const project = projects[0] as EbookProject;

      // Verificar se já tem design
      if (project.design) {
        return res.status(400).json({ 
          error: 'Projeto já possui design. Use /regenerate ou /modify para alterar.',
          currentDesign: {
            version: project.design.version,
            reasoning: project.design.reasoning,
            createdAt: project.design.createdAt
          }
        });
      }

      // Gerar design
      console.log(`🎨 Gerando design para projeto: ${project.title}`);
      const design = await EbookDesignPersonalizationService.generateProjectDesign(
        project,
        userId,
        customInstruction
      );

      // Salvar no banco
      await mongoDbService.updateOne(
        'ebookProjects',
        { _id: new ObjectId(projectId) },
        { $set: { design } }
      );

      console.log(`✅ Design gerado com sucesso (v${design.version})`);

      return res.status(201).json({
        success: true,
        message: 'Design gerado com sucesso',
        design: {
          version: design.version,
          baseTemplateKey: design.baseTemplateKey,
          visualIdentity: design.visualIdentity,
          reasoning: design.reasoning,
          createdAt: design.createdAt
        }
      });

    } catch (error: any) {
      console.error('❌ Erro ao gerar design:', error);
      return res.status(500).json({ 
        error: 'Erro ao gerar design',
        message: error.message 
      });
    }
  }

  /**
   * POST /api/ebook/project/:id/design/regenerate
   * Regenera design mantendo template base
   */
  static async regenerateDesign(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const { customInstruction } = req.body;
      const userId = (req as any).user.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar projeto
      const projects = await mongoDbService.get('ebookProjects', {
        _id: new ObjectId(projectId),
        userId: userId
      });

      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const project = projects[0] as EbookProject;

      if (!project.design) {
        return res.status(400).json({ 
          error: 'Projeto não possui design. Use /generate primeiro.' 
        });
      }

      console.log(`🔄 Regenerando design para: ${project.title}`);

      // Regenerar design
      const newDesign = await EbookDesignPersonalizationService.regenerateVisualIdentity(
        project,
        project.design,
        userId,
        customInstruction
      );

      // Salvar no banco
      await mongoDbService.updateOne(
        'ebookProjects',
        { _id: new ObjectId(projectId) },
        { $set: { design: newDesign } }
      );

      console.log(`✅ Design regenerado (v${project.design.version} → v${newDesign.version})`);

      return res.status(200).json({
        success: true,
        message: 'Design regenerado com sucesso',
        design: {
          version: newDesign.version,
          baseTemplateKey: newDesign.baseTemplateKey,
          visualIdentity: newDesign.visualIdentity,
          reasoning: newDesign.reasoning,
          updatedAt: newDesign.updatedAt
        },
        previousVersion: project.design.version
      });

    } catch (error: any) {
      console.error('❌ Erro ao regenerar design:', error);
      return res.status(500).json({ 
        error: 'Erro ao regenerar design',
        message: error.message 
      });
    }
  }

  /**
   * POST /api/ebook/project/:id/design/modify
   * Modifica design com instrução customizada
   */
  static async modifyDesign(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const { instruction } = req.body;
      const userId = (req as any).user.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      if (!instruction || instruction.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Instrução de modificação é obrigatória' 
        });
      }

      // Buscar projeto
      const projects = await mongoDbService.get('ebookProjects', {
        _id: new ObjectId(projectId),
        userId: userId
      });

      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const project = projects[0] as EbookProject;

      if (!project.design) {
        return res.status(400).json({ 
          error: 'Projeto não possui design. Use /generate primeiro.' 
        });
      }

      console.log(`✏️ Modificando design: "${instruction}"`);

      // Modificar design
      const modifiedDesign = await EbookDesignPersonalizationService.modifyDesignWithAI(
        project,
        project.design,
        instruction,
        userId
      );

      // Salvar no banco
      await mongoDbService.updateOne(
        'ebookProjects',
        { _id: new ObjectId(projectId) },
        { $set: { design: modifiedDesign } }
      );

      console.log(`✅ Design modificado (v${project.design.version} → v${modifiedDesign.version})`);

      return res.status(200).json({
        success: true,
        message: 'Design modificado com sucesso',
        instruction,
        design: {
          version: modifiedDesign.version,
          visualIdentity: modifiedDesign.visualIdentity,
          reasoning: modifiedDesign.reasoning,
          updatedAt: modifiedDesign.updatedAt
        },
        previousVersion: project.design.version
      });

    } catch (error: any) {
      console.error('❌ Erro ao modificar design:', error);
      return res.status(500).json({ 
        error: 'Erro ao modificar design',
        message: error.message 
      });
    }
  }

  /**
   * GET /api/ebook/project/:id/design
   * Retorna design atual do projeto
   */
  static async getDesign(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar projeto
      const projects = await mongoDbService.get('ebookProjects', {
        _id: new ObjectId(projectId),
        userId: userId
      });

      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const project = projects[0] as EbookProject;

      if (!project.design) {
        return res.status(404).json({ 
          error: 'Projeto não possui design',
          suggestion: 'Use POST /api/ebook/project/:id/design/generate para criar um design'
        });
      }

      return res.status(200).json({
        success: true,
        design: {
          version: project.design.version,
          baseTemplateKey: project.design.baseTemplateKey,
          visualIdentity: project.design.visualIdentity,
          reasoning: project.design.reasoning,
          customInstruction: project.design.customInstruction,
          createdAt: project.design.createdAt,
          updatedAt: project.design.updatedAt
        }
      });

    } catch (error: any) {
      console.error('❌ Erro ao buscar design:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar design',
        message: error.message 
      });
    }
  }

  /**
   * POST /api/ebook/projects/:id/preview
   * Gera preview HTML unificado com opções de design, layout e conteúdo
   * Este é o endpoint principal para preview usado tanto pelo Design Modal quanto Export Modal
   */
  static async generatePreview(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;
      const options = req.body || {};

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar projeto
      const projects = await mongoDbService.get('ebookProjects', {
        _id: new ObjectId(projectId),
        userId: userId
      });

      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const project = projects[0] as EbookProject;

      // Verificar se tem design
      if (!project.design) {
        return res.status(400).json({
          error: 'Projeto não possui design',
          suggestion: 'Gere o design primeiro usando POST /api/ebook/projects/:id/design/generate'
        });
      }

      // Buscar seções do projeto
      const sections = await mongoDbService.get('ebookSections', {
        projectId: projectId
      });

      if (!sections || sections.length === 0) {
        return res.status(400).json({
          error: 'Projeto não possui seções',
          suggestion: 'Adicione seções ao projeto antes de gerar preview'
        });
      }

      // Se não há opções, usar preview simples (Design Modal)
      // Se há opções, usar preview com configurações (Export Modal)
      let html: string;

      if (!options || Object.keys(options).length === 0) {
        // Preview simples para Design Modal - apenas mostra o design aplicado
        console.log(`🎬 Gerando preview simples para: ${project.title}`);
        
        const designConcept = {
          globalCSS: project.design.finalCSS,
          containerStructure: '<div class="book"><div class="chapter"><div class="content">{{CONTENT}}</div></div></div>',
          wrapperClasses: {
            book: 'book',
            chapter: 'chapter',
            content: 'content'
          },
          fonts: {
            primary: project.design.visualIdentity?.fontPrimary,
            headings: project.design.visualIdentity?.fontHeadings,
            code: project.design.visualIdentity?.fontCode
          },
          needsBackgroundImage: false,
          backgroundImagePrompt: null,
          designNotes: project.design.reasoning
        };

        html = EbookContentWrapperService.wrapContent(
          sections,
          designConcept,
          project.title
        );

        // Adicionar metadata
        html = EbookContentWrapperService.addMetadata(html, {
          author: project.dna?.author,
          description: project.dna?.idea,
          keywords: project.dna?.keywords,
          language: 'pt-BR'
        });

      } else {
        // Preview com opções para Export Modal
        console.log(`🎬 Gerando preview configurável para: ${project.title}`);
        
        html = await livePreviewService.generateLivePreview({
          projectId,
          userId,
          project,
          sections,
          options
        });
      }

      console.log(`✅ Preview gerado com sucesso (${(html.length / 1024).toFixed(1)} KB)`);

      // Retornar como HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);

    } catch (error: any) {
      console.error('❌ Erro ao gerar preview:', error);
      return res.status(500).json({
        error: 'Erro ao gerar preview',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/ebook/project/:id/design
   * Remove design do projeto
   */
  static async deleteDesign(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar projeto
      const projects = await mongoDbService.get('ebookProjects', {
        _id: new ObjectId(projectId),
        userId: userId
      });

      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const project = projects[0] as EbookProject;

      if (!project.design) {
        return res.status(404).json({ error: 'Projeto não possui design' });
      }

      // Remover design
      await mongoDbService.updateOne(
        'ebookProjects',
        { _id: new ObjectId(projectId) },
        { $unset: { design: '' } }
      );

      console.log(`🗑️ Design removido do projeto: ${project.title}`);

      return res.status(200).json({
        success: true,
        message: 'Design removido com sucesso'
      });

    } catch (error: any) {
      console.error('❌ Erro ao remover design:', error);
      return res.status(500).json({ 
        error: 'Erro ao remover design',
        message: error.message 
      });
    }
  }



  /**
   * GET /api/ebook/projects/:id/preview/config
   * Retorna configuração atual de design e export para usar no preview
   */
  static async getPreviewConfig(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar projeto
      const projects = await mongoDbService.get('ebookProjects', {
        _id: new ObjectId(projectId),
        userId: userId
      });

      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: 'Projeto não encontrado' });
      }

      const project = projects[0] as EbookProject;

      if (!project.design) {
        return res.status(400).json({
          error: 'Projeto não possui design'
        });
      }

      // Buscar seções para contar
      const sections = await mongoDbService.get('ebookSections', {
        projectId: projectId
      });

      // Retornar configuração consolidada
      return res.status(200).json({
        success: true,
        design: {
          version: project.design.version,
          baseTemplateKey: project.design.baseTemplateKey,
          visualIdentity: project.design.visualIdentity,
          reasoning: project.design.reasoning,
          customInstruction: project.design.customInstruction,
          createdAt: project.design.createdAt,
          updatedAt: project.design.updatedAt
        },
        metadata: {
          title: project.title,
          sections: sections?.length || 0,
          hasCover: false, // 'currentCover' not present in metadata type
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      });

    } catch (error: any) {
      console.error('❌ Erro ao buscar config de preview:', error);
      return res.status(500).json({
        error: 'Erro ao buscar configuração',
        message: error.message
      });
    }
  }
}
