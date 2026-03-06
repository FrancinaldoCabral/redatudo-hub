import { Request, Response } from 'express';
import { errorToText } from '../../services/axios-errors.service';
import { MongoDbService } from '../../services/mongodb.service';
import { ObjectId } from 'mongodb';
import EbookImageService from '../../services/ebook-image.service';
import { getModelCost } from '../../config/ebook-llm.config';
import { projectReferenceService } from '../../services/project-reference.service';
import { ReferenceFile } from '../../services/ebook-prompt.service';

const mongoDbService = new MongoDbService();

// ============================================================================
// PROJECT ENDPOINTS
// ============================================================================

export const getProjects = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const projects = await mongoDbService.get('ebookProjects', { userId: userId });
        res.status(200).json({ projects });
    } catch (error) {
        console.error('❌ Erro ao buscar projetos:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

export const getProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(id), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const project = projects[0];
        
        // Buscar sections do projeto
        const sections = await mongoDbService.get('ebookSections', { 
            projectId: id 
        });
        
        project.sections = sections;
        
        res.json({ project });
    } catch (error) {
        console.error('❌ Erro ao buscar projeto:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

export const createProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { dna, structure } = req.body;
        
        const newProject = {
            userId: userId,
            title: dna.title,
            dna: dna,
            structure: structure,
            sections: [],
            metadata: {},
            settings: {},
            coverHistory: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await mongoDbService.add('ebookProjects', newProject);
        const projectId = result.insertedId.toString();
        
        // Criar seções automaticamente
        const sections = createSectionsFromStructure(projectId, structure, userId);
        
        for (const sectionData of sections) {
            const sectionResult = await mongoDbService.add('ebookSections', sectionData);
            newProject.sections.push(sectionResult.insertedId);
        }
        
        // Atualizar projeto com IDs das seções
        await mongoDbService.updateOne('ebookProjects', 
            { _id: result.insertedId },
            { $set: { sections: newProject.sections } }
        );
        
        res.status(201).json({ project: { ...newProject, _id: result.insertedId } });
    } catch (error) {
        console.error('❌ Erro ao criar projeto:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const updateData = { ...req.body, updatedAt: new Date() };
        
        const result = await mongoDbService.updateOne('ebookProjects',
            { _id: new ObjectId(id), userId: userId },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const projects = await mongoDbService.get('ebookProjects', { _id: new ObjectId(id) });
        res.json({ project: projects[0] });
    } catch (error) {
        console.error('❌ Erro ao atualizar projeto:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

export const updateProjectDna = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const { dna } = req.body;
        
        if (!dna) {
            return res.status(400).json({ error: 'DNA is required' });
        }
        
        // Validações
        if (!dna.title || dna.title.trim().length === 0) {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (!dna.idea || dna.idea.trim().length < 10) {
            return res.status(400).json({ error: 'Idea must be at least 10 characters' });
        }
        if (!dna.genre) {
            return res.status(400).json({ error: 'Genre is required' });
        }
        
        const result = await mongoDbService.updateOne('ebookProjects',
            { _id: new ObjectId(id), userId: userId },
            { $set: { dna: dna, title: dna.title, updatedAt: new Date() } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const projects = await mongoDbService.get('ebookProjects', { _id: new ObjectId(id) });
        res.json({ success: true, project: projects[0] });
    } catch (error) {
        console.error('❌ Erro ao atualizar DNA:', error);
        res.status(500).json({ error: 'Failed to update DNA' });
    }
};

export const updateProjectMetadata = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const { metadata } = req.body;
        
        if (!metadata) {
            return res.status(400).json({ error: 'Metadata is required' });
        }
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(id), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const currentMetadata = projects[0].metadata || {};
        const updatedMetadata = { ...currentMetadata, ...metadata };
        
        await mongoDbService.updateOne('ebookProjects',
            { _id: new ObjectId(id) },
            { $set: { metadata: updatedMetadata, updatedAt: new Date() } }
        );
        
        const updatedProjects = await mongoDbService.get('ebookProjects', { _id: new ObjectId(id) });
        res.json({ success: true, project: updatedProjects[0] });
    } catch (error) {
        console.error('❌ Erro ao atualizar metadata:', error);
        res.status(500).json({ error: 'Failed to update metadata' });
    }
};

export const updateProjectStructure = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const { structure: newStructure } = req.body;
        
        if (!newStructure) {
            return res.status(400).json({ error: 'Structure is required' });
        }
        
        // Validações
        if (!newStructure.chaptersCount || newStructure.chaptersCount < 1 || newStructure.chaptersCount > 100) {
            return res.status(400).json({ error: 'Chapters count must be between 1 and 100' });
        }
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(id), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const project = projects[0];
        const oldStructure = project.structure;
        const sections = await mongoDbService.get('ebookSections', { projectId: id });
        sections.sort((a: any, b: any) => a.order - b.order);
        
        const changes = {
            toAdd: [] as any[],
            toRemove: [] as string[],
            toKeep: [] as string[]
        };
        
        // Mapear tipos de seção
        const structureMapping: Record<string, string> = {
            'cover': 'hasCover',
            'title-page': 'hasTitlePage',
            'copyright': 'hasCopyright',
            'dedication': 'hasDedication',
            'acknowledgments': 'hasAcknowledgments',
            'epigraph': 'hasEpigraph',
            'table-of-contents': 'hasTableOfContents',
            'preface': 'hasPreface',
            'foreword': 'hasForeword',
            'introduction': 'hasIntroduction',
            'conclusion': 'hasConclusion',
            'afterword': 'hasAfterword',
            'appendix': 'hasAppendix',
            'glossary': 'hasGlossary',
            'bibliography': 'hasBibliography',
            'author-bio': 'hasAuthorBio',
            'back-cover': 'hasBackCover'
        };
        
        // Verificar elementos estruturais
        for (const [sectionType, structureField] of Object.entries(structureMapping)) {
            const wasEnabled = oldStructure[structureField];
            const isEnabled = newStructure[structureField];
            const existingSection = sections.find((s: any) => s.type === sectionType);
            
            if (isEnabled && !wasEnabled) {
                changes.toAdd.push({ type: sectionType });
            } else if (!isEnabled && wasEnabled && existingSection) {
                changes.toRemove.push(existingSection._id.toString());
            } else if (isEnabled && existingSection) {
                changes.toKeep.push(existingSection._id.toString());
            }
        }
        
        // Lidar com capítulos
        const oldChapterCount = oldStructure.chaptersCount;
        const newChapterCount = newStructure.chaptersCount;
        const existingChapters = sections.filter((s: any) => s.type === 'chapter');
        
        if (newChapterCount > oldChapterCount) {
            for (let i = oldChapterCount + 1; i <= newChapterCount; i++) {
                changes.toAdd.push({ type: 'chapter', number: i });
            }
        } else if (newChapterCount < oldChapterCount) {
            const chaptersToRemove = existingChapters.slice(newChapterCount);
            for (const chapter of chaptersToRemove) {
                changes.toRemove.push(chapter._id.toString());
            }
        }
        
        // Executar remoções
        let deletedImagesCount = 0;
        for (const sectionId of changes.toRemove) {
            const section = sections.find((s: any) => s._id.toString() === sectionId);
            if (section && section.images && section.images.length > 0) {
                deletedImagesCount += section.images.length;
            }
            await mongoDbService.deleteOne('ebookSections', { _id: new ObjectId(sectionId) });
        }
        
        // Executar adições
        const newSections = [];
        for (const toAdd of changes.toAdd) {
            let title = '';
            if (toAdd.type === 'chapter') {
                title = `Capítulo ${toAdd.number}`;
            } else {
                const titleMap: Record<string, string> = {
                    'cover': 'Capa',
                    'title-page': 'Folha de Rosto',
                    'copyright': 'Direitos Autorais',
                    'dedication': 'Dedicatória',
                    'acknowledgments': 'Agradecimentos',
                    'epigraph': 'Epígrafe',
                    'table-of-contents': 'Sumário',
                    'preface': 'Prefácio',
                    'foreword': 'Apresentação',
                    'introduction': 'Introdução',
                    'conclusion': 'Conclusão',
                    'afterword': 'Posfácio',
                    'appendix': 'Apêndice',
                    'glossary': 'Glossário',
                    'bibliography': 'Bibliografia',
                    'author-bio': 'Sobre o Autor',
                    'back-cover': 'Contracapa'
                };
                title = titleMap[toAdd.type] || toAdd.type;
            }
            
            const newSection = {
                projectId: id,
                type: toAdd.type,
                order: 0,
                title,
                content: '',
                images: [],
                metadata: {
                    wordCount: 0,
                    characterCount: 0,
                    estimatedTokens: 0,
                    estimatedPages: 0,
                    generatedBy: 'system',
                    regenerationCount: 0
                },
                status: 'empty',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const result = await mongoDbService.add('ebookSections', newSection);
            newSections.push({ ...newSection, _id: result.insertedId });
        }
        
        // Reordenar todas as seções
        const allSections = await mongoDbService.get('ebookSections', { projectId: id });
        const reorderedSections = reorderSections(allSections, newStructure);
        
        for (const section of reorderedSections) {
            await mongoDbService.updateOne('ebookSections',
                { _id: section._id },
                { $set: { order: section.order } }
            );
        }
        
        // Atualizar projeto
        await mongoDbService.updateOne('ebookProjects',
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    structure: newStructure,
                    sections: reorderedSections.map((s: any) => s._id),
                    updatedAt: new Date()
                }
            }
        );
        
        const updatedProjects = await mongoDbService.get('ebookProjects', { _id: new ObjectId(id) });
        const updatedProject = updatedProjects[0];
        updatedProject.sections = reorderedSections;
        
        res.json({
            success: true,
            project: updatedProject,
            changes: {
                added: changes.toAdd.length,
                removed: changes.toRemove.length,
                deletedImages: deletedImagesCount
            }
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar estrutura:', error);
        res.status(500).json({ error: 'Failed to update structure' });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(id), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const sections = await mongoDbService.get('ebookSections', { projectId: id });
        let deletedImagesCount = 0;
        
        for (const section of sections) {
            if (section.images && section.images.length > 0) {
                deletedImagesCount += section.images.length;
            }
        }
        
        await mongoDbService.deleteMany('ebookSections', { projectId: id });
        await mongoDbService.deleteOne('ebookProjects', { _id: new ObjectId(id) });
        
        res.json({
            success: true,
            deletedSections: sections.length,
            deletedImages: deletedImagesCount,
            message: 'Projeto e todos os dados relacionados foram deletados'
        });
    } catch (error) {
        console.error('❌ Erro ao deletar projeto:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

export const duplicateProject = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(id), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const originalProject = projects[0];
        
        const duplicatedProject = {
            userId: userId,
            title: `${originalProject.title} (Cópia)`,
            dna: originalProject.dna,
            structure: originalProject.structure,
            sections: [],
            metadata: originalProject.metadata || {},
            settings: originalProject.settings || {},
            coverHistory: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await mongoDbService.add('ebookProjects', duplicatedProject);
        const newProjectId = result.insertedId.toString();
        
        const sections = await mongoDbService.get('ebookSections', { projectId: id });
        
        for (const section of sections) {
            const duplicatedSection = {
                projectId: newProjectId,
                type: section.type,
                order: section.order,
                title: section.title,
                content: section.content,
                images: section.images || [],
                metadata: section.metadata,
                status: section.status,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const sectionResult = await mongoDbService.add('ebookSections', duplicatedSection);
            duplicatedProject.sections.push(sectionResult.insertedId);
        }
        
        await mongoDbService.updateOne('ebookProjects',
            { _id: result.insertedId },
            { $set: { sections: duplicatedProject.sections } }
        );
        
        res.status(201).json({ project: { ...duplicatedProject, _id: result.insertedId } });
    } catch (error) {
        console.error('❌ Erro ao duplicar projeto:', error);
        res.status(500).json({ error: 'Failed to duplicate project' });
    }
};

// ============================================================================
// SECTION ENDPOINTS
// ============================================================================

export const getSections = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { projectId } = req.params;
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(projectId), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const sections = await mongoDbService.get('ebookSections', { projectId: projectId });
        sections.sort((a: any, b: any) => a.order - b.order);
        
        res.json({ sections });
    } catch (error) {
        console.error('❌ Erro ao buscar seções:', error);
        res.status(500).json({ error: 'Failed to fetch sections' });
    }
};

export const getSection = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(id) });
        
        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const section = sections[0];
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(section.projectId), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        if (!section.status) {
            section.status = section.content && section.content.trim().length > 0 ? 'completed' : 'empty';
        }
        
        res.json(section);
    } catch (error) {
        console.error('❌ Erro ao buscar seção:', error);
        res.status(500).json({ error: 'Failed to fetch section' });
    }
};

export const createSection = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { projectId } = req.params;
        const { type, title, order } = req.body;
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(projectId), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const sections = await mongoDbService.get('ebookSections', { projectId: projectId });
        const maxOrder = sections.length > 0 
            ? Math.max(...sections.map((s: any) => s.order)) 
            : -1;
        
        const sectionOrder = order !== undefined ? order : maxOrder + 1;
        
        const newSection = {
            projectId,
            type,
            order: sectionOrder,
            title,
            synopsis: '',
            content: '',
            images: [],
            metadata: {
                wordCount: 0,
                characterCount: 0,
                estimatedTokens: 0,
                estimatedPages: 0,
                generatedBy: 'user',
                regenerationCount: 0
            },
            status: 'empty',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await mongoDbService.add('ebookSections', newSection);
        
        const project = projects[0];
        const projectSections = project.sections || [];
        projectSections.push(result.insertedId);
        
        await mongoDbService.updateOne('ebookProjects',
            { _id: new ObjectId(projectId) },
            { $set: { sections: projectSections } }
        );
        
        res.status(201).json({ section: { ...newSection, _id: result.insertedId } });
    } catch (error) {
        console.error('❌ Erro ao criar seção:', error);
        res.status(500).json({ error: 'Failed to create section' });
    }
};

export const updateSection = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(id) });
        
        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const currentSection = sections[0];
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(currentSection.projectId), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const updateData: any = { ...req.body, updatedAt: new Date() };
        
        if (req.body.content) {
            updateData.metadata = updateData.metadata || {};
            updateData.metadata.wordCount = countWords(req.body.content);
            updateData.metadata.characterCount = req.body.content.length;
            updateData.metadata.estimatedTokens = Math.ceil(req.body.content.length / 4);
            updateData.metadata.estimatedPages = Math.ceil(updateData.metadata.wordCount / 250);
        }
        
        await mongoDbService.updateOne('ebookSections',
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        const updatedSections = await mongoDbService.get('ebookSections', { _id: new ObjectId(id) });
        res.json({ section: updatedSections[0] });
    } catch (error) {
        console.error('❌ Erro ao atualizar seção:', error);
        res.status(500).json({ error: 'Failed to update section' });
    }
};

export const deleteSection = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(id) });
        
        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const section = sections[0];
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(section.projectId), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        await mongoDbService.deleteOne('ebookSections', { _id: new ObjectId(id) });
        
        const project = projects[0];
        const updatedSections = (project.sections || []).filter((sId: any) => sId.toString() !== id);
        
        await mongoDbService.updateOne('ebookProjects',
            { _id: new ObjectId(section.projectId) },
            { $set: { sections: updatedSections } }
        );
        
        res.json({ message: 'Section deleted successfully' });
    } catch (error) {
        console.error('❌ Erro ao deletar seção:', error);
        res.status(500).json({ error: 'Failed to delete section' });
    }
};

export const reorderSection = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const { newOrder } = req.body;
        
        const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(id) });
        
        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const section = sections[0];
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(section.projectId), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const allSections = await mongoDbService.get('ebookSections', { projectId: section.projectId });
        allSections.sort((a: any, b: any) => a.order - b.order);
        
        const currentIndex = allSections.findIndex((s: any) => s._id.toString() === id);
        
        if (currentIndex !== -1) {
            const [movedSection] = allSections.splice(currentIndex, 1);
            allSections.splice(newOrder, 0, movedSection);
            
            for (let i = 0; i < allSections.length; i++) {
                if (allSections[i].order !== i) {
                    await mongoDbService.updateOne('ebookSections',
                        { _id: allSections[i]._id },
                        { $set: { order: i } }
                    );
                }
            }
        }
        
        res.json({ message: 'Section reordered successfully' });
    } catch (error) {
        console.error('❌ Erro ao reordenar seção:', error);
        res.status(500).json({ error: 'Failed to reorder section' });
    }
};

export const duplicateSection = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { id } = req.params;
        const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(id) });
        
        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const originalSection = sections[0];
        
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(originalSection.projectId), 
            userId: userId 
        });
        
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const allSections = await mongoDbService.get('ebookSections', { projectId: originalSection.projectId });
        const maxOrder = allSections.length > 0 
            ? Math.max(...allSections.map((s: any) => s.order)) 
            : -1;
        
        const duplicatedSection = {
            projectId: originalSection.projectId,
            type: originalSection.type,
            order: maxOrder + 1,
            title: `${originalSection.title} (Cópia)`,
            synopsis: originalSection.synopsis || '',
            content: originalSection.content,
            images: [...(originalSection.images || [])],
            metadata: { ...originalSection.metadata },
            status: originalSection.status,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await mongoDbService.add('ebookSections', duplicatedSection);
        
        const project = projects[0];
        const projectSections = project.sections || [];
        projectSections.push(result.insertedId);
        
        await mongoDbService.updateOne('ebookProjects',
            { _id: new ObjectId(originalSection.projectId) },
            { $set: { sections: projectSections } }
        );
        
        res.status(201).json({ section: { ...duplicatedSection, _id: result.insertedId } });
    } catch (error) {
        console.error('❌ Erro ao duplicar seção:', error);
        res.status(500).json({ error: 'Failed to duplicate section' });
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createSectionsFromStructure(projectId: string, structure: any, userId: string) {
    const sections = [];
    let order = 0;
    
    // Pré-textuais
    if (structure.hasCover) {
        sections.push(createSectionData(projectId, 'cover', 'Capa', order++));
    }
    if (structure.hasTitlePage) {
        sections.push(createSectionData(projectId, 'title-page', 'Folha de Rosto', order++));
    }
    if (structure.hasCopyright) {
        sections.push(createSectionData(projectId, 'copyright', 'Direitos Autorais', order++));
    }
    if (structure.hasDedication) {
        sections.push(createSectionData(projectId, 'dedication', 'Dedicatória', order++));
    }
    if (structure.hasAcknowledgments) {
        sections.push(createSectionData(projectId, 'acknowledgments', 'Agradecimentos', order++));
    }
    if (structure.hasEpigraph) {
        sections.push(createSectionData(projectId, 'epigraph', 'Epígrafe', order++));
    }
    if (structure.hasTableOfContents) {
        sections.push(createSectionData(projectId, 'table-of-contents', 'Sumário', order++));
    }
    if (structure.hasPreface) {
        sections.push(createSectionData(projectId, 'preface', 'Prefácio', order++));
    }
    if (structure.hasForeword) {
        sections.push(createSectionData(projectId, 'foreword', 'Apresentação', order++));
    }
    if (structure.hasIntroduction) {
        sections.push(createSectionData(projectId, 'introduction', 'Introdução', order++));
    }
    
    // Capítulos
    for (let i = 1; i <= structure.chaptersCount; i++) {
        sections.push(createSectionData(projectId, 'chapter', `Capítulo ${i}`, order++));
    }
    
    // Pós-textuais
    if (structure.hasConclusion) {
        sections.push(createSectionData(projectId, 'conclusion', 'Conclusão', order++));
    }
    if (structure.hasAfterword) {
        sections.push(createSectionData(projectId, 'afterword', 'Posfácio', order++));
    }
    if (structure.hasAppendix) {
        sections.push(createSectionData(projectId, 'appendix', 'Apêndice', order++));
    }
    if (structure.hasGlossary) {
        sections.push(createSectionData(projectId, 'glossary', 'Glossário', order++));
    }
    if (structure.hasBibliography) {
        sections.push(createSectionData(projectId, 'bibliography', 'Bibliografia', order++));
    }
    if (structure.hasAuthorBio) {
        sections.push(createSectionData(projectId, 'author-bio', 'Sobre o Autor', order++));
    }
    if (structure.hasBackCover) {
        sections.push(createSectionData(projectId, 'back-cover', 'Contracapa', order++));
    }
    
    return sections;
}

function createSectionData(projectId: string, type: string, title: string, order: number, synopsis?: string) {
    return {
        projectId,
        type,
        order,
        title,
        synopsis: synopsis || '',
        content: '',
        images: [],
        metadata: {
            wordCount: 0,
            characterCount: 0,
            estimatedTokens: 0,
            estimatedPages: 0,
            generatedBy: 'system',
            regenerationCount: 0
        },
        status: 'empty',
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

function reorderSections(sections: any[], structure: any) {
    const typeOrder = [
        'cover',
        'title-page',
        'copyright',
        'dedication',
        'acknowledgments',
        'epigraph',
        'table-of-contents',
        'preface',
        'foreword',
        'introduction',
        'chapter',
        'conclusion',
        'afterword',
        'appendix',
        'glossary',
        'bibliography',
        'author-bio',
        'back-cover'
    ];
    
    const chapters = sections.filter((s: any) => s.type === 'chapter').sort((a: any, b: any) => {
        const numA = parseInt(a.title.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.title.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });
    
    const others = sections.filter((s: any) => s.type !== 'chapter');
    
    others.sort((a: any, b: any) => {
        const indexA = typeOrder.indexOf(a.type);
        const indexB = typeOrder.indexOf(b.type);
        return indexA - indexB;
    });
    
    const chapterIndex = typeOrder.indexOf('chapter');
    const preSections = others.filter((s: any) => typeOrder.indexOf(s.type) < chapterIndex);
    const postSections = others.filter((s: any) => typeOrder.indexOf(s.type) > chapterIndex);
    
    const ordered = [...preSections, ...chapters, ...postSections];
    
    ordered.forEach((section: any, index: number) => {
        section.order = index;
    });
    
    return ordered;
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Gera sumário automaticamente baseado nas seções do projeto
 * ZERO custo de LLM - apenas concatenação de dados existentes
 * Inclui TODAS as seções com synopsis, não apenas capítulos
 */
function buildTableOfContents(sections: any[]): string {
    // Filtrar TODAS as seções com synopsis (exceto cover e table-of-contents)
    const contentSections = sections
        .filter(s => 
            s.type !== 'cover' && 
            s.type !== 'table-of-contents' && 
            s.synopsis?.trim()
        )
        .sort((a, b) => a.order - b.order);

    if (contentSections.length === 0) {
        return '# Sumário\n\n*Nenhuma seção com synopsis encontrada.*\n\n💡 **Dica:** Clique em "Gerar Planejamento" para criar synopses para todas as seções.';
    }

    let toc = '# Sumário\n\n';
    let currentPage = 1;

    contentSections.forEach(section => {
        const wordCount = section.metadata?.wordCount || 0;
        const estimatedPages = Math.max(1, Math.ceil(wordCount / 250));

        // Formatar título de acordo com o tipo de seção
        const sectionTitle = section.title;
        
        toc += `**${sectionTitle}** ...... ${currentPage}\n`;
        if (section.synopsis) {
            toc += `*${section.synopsis}*\n\n`;
        }

        currentPage += estimatedPages;
    });

    toc += `\n---\n**Total de Páginas Estimadas:** ${currentPage - 1}`;

    return toc;
}

// ============================================================================
// IMAGE CONTEXT AND TRANSLATION HELPERS
// ============================================================================

/**
 * Traduz texto para inglês usando OpenRouter
 */
async function translateToEnglish(text: string): Promise<string> {
    try {
        const { RouterApiOpenAI } = await import('../../services/openrouter.service');
        const openai = new RouterApiOpenAI();

        const response = await openai.createCompletion({
            model: 'openai/gpt-4.1-nano', // Modelo rápido para tradução
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional translator. Translate the following text to English. Keep the meaning intact but make it natural English. Only return the translated text, nothing else.'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            max_tokens: 1000,
            temperature: 0.3
        });

        const translated = response.choices[0]?.message?.content?.trim();
        return translated || text; // Fallback para texto original se tradução falhar
    } catch (error) {
    //    console.log('Erro na tradução:', error);
        return text; // Retorna texto original em caso de erro
    }
}

/**
 * Gera contexto de imagem baseado no projeto e seção
 * Contexto relevante mas que não ofusca a demanda do usuário
 */
async function generateImageContext(projectId: string, sectionId: string, userId: string): Promise<string> {
    try {
        // Buscar projeto
        const projects = await mongoDbService.get('ebookProjects', {
            _id: new ObjectId(projectId),
            userId: userId
        });

        if (!projects || projects.length === 0) {
            return 'Professional ebook illustration';
        }

        const project = projects[0];
        const contextParts: string[] = [];

        // Contexto básico do projeto
        if (project.dna?.genre) {
            contextParts.push(`${project.dna.genre} style`);
        }

        if (project.dna?.tone) {
            contextParts.push(`${project.dna.tone} tone`);
        }

        // Contexto da seção (se fornecida)
        if (sectionId) {
            const sections = await mongoDbService.get('ebookSections', {
                _id: new ObjectId(sectionId)
            });

            if (sections && sections.length > 0) {
                const section = sections[0];
                if (section.type === 'chapter') {
                    contextParts.push('chapter illustration');
                } else if (section.type === 'cover') {
                    contextParts.push('book cover design');
                } else {
                    contextParts.push('ebook content illustration');
                }
            }
        }

        // Adicionar elementos visuais se disponíveis
        if (project.dna?.keywords && project.dna.keywords.length > 0) {
            const visualKeywords = project.dna.keywords.slice(0, 2);
            contextParts.push(`with ${visualKeywords.join(' and ')} elements`);
        }

        // Juntar contexto de forma concisa
        const context = contextParts.length > 0 ? contextParts.join(', ') : 'professional ebook illustration';

        return context;
    } catch (error) {
    //    console.log('Erro ao gerar contexto de imagem:', error);
        return 'professional ebook illustration'; // Fallback
    }
}

// ============================================================================
// HELPER FUNCTION: PARSE REFERENCES FROM PROMPT
// ============================================================================

/**
 * Helper para buscar arquivos de referência do projeto e parsear citações do prompt
 * Retorna lista de arquivos citados via @alias
 */
async function parseProjectReferences(
    projectId: string,
    userId: string,
    prompt?: string
): Promise<ReferenceFile[]> {
    try {
        if (!prompt || !projectId) {
            return [];
        }

        // Parsear citações do prompt
        const citedFiles = await projectReferenceService.parseReferencesFromPrompt(
            prompt,
            projectId,
            userId
        );

        // Converter para formato ReferenceFile esperado pelos endpoints
        return citedFiles.map(file => ({
            url: file.url,
            type: file.type,
            name: file.name,
            instructions: file.instructions
        }));
    } catch (error) {
        console.warn('⚠️  Erro ao parsear referências do projeto:', error);
        return [];
    }
}

// ============================================================================
// GENERATION ENDPOINTS (usando sistema de jobs/socket)
// ============================================================================

import { addJob } from '../../services/jobs.service';

/**
 * Gerar conteúdo de seção com IA (via job assíncrono)
 * Opcionalmente gera imagens posicionadas junto com o conteúdo
 */
export const generateSection = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { 
            projectId, 
            sectionId, 
            generateImages = false, 
            imageCount = 2, 
            imageStyle = 'realistic',
            customInstructions,
            // Opções avançadas OPCIONAIS (sem defaults)
            imageAspectRatio,
            imageQuality,
            imagePromptEnhancements,
            imagePromptInstructions
        } = req.body;
        
        if (!projectId || !sectionId) {
            return res.status(400).json({ error: 'projectId and sectionId are required' });
        }
        
        // Validar opções de imagem
        const isAutoImageCount = typeof imageCount === 'string' && ['auto', 'livre'].includes(imageCount.toLowerCase());
        const validatedImageCount = isAutoImageCount
            ? undefined
            : Math.min(Math.max(parseInt(String(imageCount)) || 2, 1), 5);
        
        // Validar imageStyle (aceita style_type ou style_preset)
        const validImageStyles = [
            // Style Types (básicos)
            'None', 'Auto', 'General', 'Realistic', 'Design',
            // Style Presets (detalhados)
            '3D', 'Anime', 'Bokeh', 'Cinematic', 'Collage', 'Cyberpunk', 'Fantasy Art',
            'Film Noir', 'General', 'General Graffiti', 'Graphic Novel', 'HDR',
            'Horror', 'Impressionism', 'Long Exposure', 'Macro Photography', 'Medieval',
            'Minimalist', 'Monochrome', 'Moody', 'Neon Noir', 'Noir', 'Origami',
            'Photography', 'Pixel Art', 'Polaroid', 'Pop Art', 'Renaissance', 'Retro',
            'Retrowave', 'Sticker', 'Studio Ghibli', 'Surrealism', 'Typography',
            'Vibrant', 'Vintage', 'Watercolor'
        ];
        const validatedImageStyle = validImageStyles.includes(imageStyle) ? imageStyle : 'Auto';
        
        // Validar opções avançadas opcionais
        const validAspectRatios = ['1:1', '4:3', '16:9', '9:16', '3:2', '2:3'];
        const validatedAspectRatio = imageAspectRatio && validAspectRatios.includes(imageAspectRatio) ? imageAspectRatio : undefined;
        
        const validQualityLevels = ['basico', 'medio', 'avancado'];
        const validatedQuality = imageQuality && validQualityLevels.includes(imageQuality) ? imageQuality : undefined;
        
        const validatedPromptEnhancements = Array.isArray(imagePromptEnhancements) 
            ? imagePromptEnhancements.filter((e: any) => typeof e === 'string' && e.length > 0 && e.length <= 100)
            : undefined;
        
        // Validar instruções de prompt customizadas
        const validatedPromptInstructions = imagePromptInstructions && typeof imagePromptInstructions === 'string' && imagePromptInstructions.length > 0 && imagePromptInstructions.length <= 500
            ? imagePromptInstructions
            : undefined;

        // Validar instruções adicionais de conteúdo (custom instructions)
        const validatedCustomInstructions = customInstructions && typeof customInstructions === 'string'
            ? customInstructions.trim().slice(0, 2000)
            : undefined;
        
        // Buscar seção para obter contexto
        const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(sectionId) });
        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const section = sections[0];
        
        // Buscar projeto para obter DNA
        const projects = await mongoDbService.get('ebookProjects', { 
            _id: new ObjectId(projectId),
            userId: userId 
        });
        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const project = projects[0];
        
        // Criar job para geração
        const job = await addJob({
            form: {
                projectId,
                sectionId,
                sectionTitle: section.title,
                sectionType: section.type,
                bookDNA: project.dna,
                structure: project.structure,
                generateImages: generateImages === true,
                imageCount: validatedImageCount,
                imageCountMode: isAutoImageCount ? 'auto' : 'fixed',
                imageStyle: validatedImageStyle,
                // Opções avançadas (apenas se fornecidas)
                ...(validatedAspectRatio && { imageAspectRatio: validatedAspectRatio }),
                ...(validatedQuality && { imageQuality: validatedQuality }),
                ...(validatedPromptEnhancements && { imagePromptEnhancements: validatedPromptEnhancements }),
                ...(validatedPromptInstructions && { imagePromptInstructions: validatedPromptInstructions }),
                ...(validatedCustomInstructions && { customInstructions: validatedCustomInstructions })
            },
            metadata: {
                userId,
                app: 'ebook-generate-section',
                projectId,
                sectionId
            }
        });
        
    //    console.log(`✅ Job criado para geração de seção: ${job.id}`);
        
        res.status(202).json({ 
            jobId: job.id,
            status: 'pending',
            message: 'Section generation started. Listen to socket for progress.',
            options: { 
                generateImages, 
                imageCount: validatedImageCount, 
                imageCountMode: isAutoImageCount ? 'auto' : 'fixed',
                imageStyle: validatedImageStyle,
                ...(validatedAspectRatio && { imageAspectRatio: validatedAspectRatio }),
                ...(validatedQuality && { imageQuality: validatedQuality }),
                ...(validatedPromptEnhancements && { imagePromptEnhancements: validatedPromptEnhancements }),
                ...(validatedPromptInstructions && { imagePromptInstructions: validatedPromptInstructions }),
                ...(validatedCustomInstructions && { customInstructions: validatedCustomInstructions })
            }
        });
    } catch (error) {
        console.error('❌ Erro ao criar job de geração:', error);
        res.status(500).json({ error: 'Failed to start section generation' });
    }
};

/**
 * Expandir texto (via job assíncrono)
 */
export const expandText = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { text, instruction } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }
        
        const job = await addJob({
            form: {
                text,
                instruction: instruction || 'Expanda este texto mantendo o estilo e contexto.'
            },
            metadata: {
                userId,
                app: 'ebook-expand-text'
            }
        });
        
    //    console.log(`✅ Job criado para expansão de texto: ${job.id}`);
        
        res.status(202).json({ 
            jobId: job.id,
            status: 'pending',
            message: 'Text expansion started. Listen to socket for progress.'
        });
    } catch (error) {
        console.error('❌ Erro ao criar job de expansão:', error);
        res.status(500).json({ error: 'Failed to start text expansion' });
    }
};

/**
 * Reescrever texto (via job assíncrono)
 */
export const rewriteText = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { text, instruction } = req.body;
        
        if (!text || !instruction) {
            return res.status(400).json({ error: 'text and instruction are required' });
        }
        
        const job = await addJob({
            form: {
                text,
                instruction
            },
            metadata: {
                userId,
                app: 'ebook-rewrite-text'
            }
        });
        
    //    console.log(`✅ Job criado para reescrita de texto: ${job.id}`);
        
        res.status(202).json({ 
            jobId: job.id,
            status: 'pending',
            message: 'Text rewrite started. Listen to socket for progress.'
        });
    } catch (error) {
        console.error('❌ Erro ao criar job de reescrita:', error);
        res.status(500).json({ error: 'Failed to start text rewrite' });
    }
};

/**
 * Gerar capa (via job assíncrono)
 */
export const generateCover = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { projectId, bookInfo, style, aspectRatio, additionalInstructions, seed } = req.body;
        
        if (!projectId || !bookInfo) {
            return res.status(400).json({ error: 'projectId and bookInfo are required' });
        }
        
        const job = await addJob({
            form: {
                projectId,
                bookInfo,
                style: style || 'Minimalist',
                //aspectRatio: aspectRatio || '9:16',
                resolution: '2480×3450',
                additionalInstructions: additionalInstructions || '',
                seed
            },
            metadata: {
                userId,
                app: 'ebook-generate-cover',
                projectId
            }
        });
        
    //    console.log(`✅ Job criado para geração de capa: ${job.id}`);
        
        res.status(202).json({ 
            jobId: job.id,
            status: 'pending',
            message: 'Cover generation started. Listen to socket for progress.'
        });
    } catch (error) {
        console.error('❌ Erro ao criar job de geração de capa:', error);
        res.status(500).json({ error: 'Failed to start cover generation' });
    }
};

/**
 * Gerar imagem genérica (via job assíncrono)
 */
export const generateImage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { prompt, type, projectId, sectionId } = req.body;
        const { seed, style_type, aspect_ratio, withContext } = req.body.bodyOptions;

        if (!prompt) {
            return res.status(400).json({ error: 'prompt is required' });
        }

        // Traduzir prompt para inglês se necessário
        let translatedPrompt = await translateToEnglish(prompt);

        // Gerar contexto se solicitado
        let context = '';
        if (withContext) {
            try {
                context = await generateImageContext(projectId, sectionId, userId);
            } catch (error) {
            //    console.log('Erro ao gerar contexto, usando contexto livre:', error);
                context = 'Free context';
            }
        } else {
            context = 'Free context';
        }

        const job = await addJob({
            form: {
                prompt: translatedPrompt,
                context,
                type: type || 'section-image',
                seed,
                styleType: style_type,
                aspectRatio: aspect_ratio || '16:9',
                projectId,
                sectionId
            },
            metadata: {
                userId,
                app: 'ebook-generate-image',
                projectId,
                sectionId
            }
        });

    //    console.log(`✅ Job criado para geração de imagem: ${job.id}`);

        res.status(202).json({
            jobId: job.id,
            status: 'pending',
            message: 'Image generation started. Listen to socket for progress.'
        });
    } catch (error) {
        console.error('❌ Erro ao criar job de geração de imagem:', error);
        res.status(500).json({ error: 'Failed to start image generation' });
    }
};

/**
 * Sincronizar imagens de uma seção
 */
export const syncSectionImages = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { sectionId } = req.params;

        if (!sectionId) {
            return res.status(400).json({ error: 'sectionId is required' });
        }

        const imageService = new EbookImageService();
        const result = await imageService.syncSectionImages(sectionId, userId);

    //    console.log(`✅ Imagens sincronizadas para seção ${sectionId}:`, result);

        res.json({
            success: true,
            synced: result.synced,
            removed: result.removed,
            total: result.total,
            message: `Synchronized ${result.synced} images, removed ${result.removed} orphaned images`
        });
    } catch (error) {
        console.error('❌ Erro ao sincronizar imagens da seção:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Identificar imagens órfãs de um projeto (NÃO remove automaticamente)
 */
export const identifyOrphanedImages = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        const imageService = new EbookImageService();
        const result = await imageService.identifyOrphanedImages(projectId, userId);

    //    console.log(`✅ Imagens órfãs identificadas no projeto ${projectId}:`, result);

        res.json({
            success: true,
            orphaned: result.orphaned,
            total: result.total,
            message: `Found ${result.orphaned.length} orphaned images out of ${result.total} total images. Use the cleanup script to remove them.`
        });
    } catch (error) {
        console.error('❌ Erro ao identificar imagens órfãs:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Buscar imagens de um projeto
 */
export const getProjectImages = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        const imageService = new EbookImageService();
        const images = await imageService.getProjectImages(projectId, userId);

        res.json({ images });
    } catch (error) {
        console.error('❌ Erro ao buscar imagens do projeto:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Buscar imagens de uma seção
 */
export const getSectionImages = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { sectionId } = req.params;

        if (!sectionId) {
            return res.status(400).json({ error: 'sectionId is required' });
        }

        const imageService = new EbookImageService();
        const images = await imageService.getSectionImages(sectionId, userId);

        res.json({ images });
    } catch (error) {
        console.error('❌ Erro ao buscar imagens da seção:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Upload de imagem para uma seção
 */
export const uploadSectionImage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { sectionId } = req.params;

        if (!sectionId) {
            return res.status(400).json({ error: 'sectionId is required' });
        }

        // Verificar se há arquivo
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Buscar seção
        const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(sectionId) });
        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const section = sections[0];

        // Verificar acesso ao projeto
        const projects = await mongoDbService.get('ebookProjects', {
            _id: new ObjectId(section.projectId),
            userId: userId
        });

        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Fazer upload da imagem
        const { uploadFile } = await import('../../services/local-bucket-upload.service');
        const directory = `ebook-images/${section.projectId}`;
        const imageUrl = await uploadFile(req.file, userId, directory);

        // Extrair caminho MinIO da URL
        const minioPath = imageUrl.replace(`${process.env.MINIO_SERVER_URL}/storage/`, '');

        // Salvar referência no banco
        const imageData = {
            userId,
            projectId: section.projectId,
            sectionId: sectionId,
            type: 'section-image',
            url: imageUrl,
            minioPath,
            metadata: {
                size: req.file.size,
                format: req.file.mimetype
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await mongoDbService.add('ebookImages', imageData);

        res.status(201).json({
            success: true,
            image: {
                ...imageData,
                _id: result.insertedId
            }
        });
    } catch (error) {
        console.error('❌ Erro ao fazer upload de imagem:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Remover uma imagem específica
 */
export const removeImage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { imageId } = req.params;

        if (!imageId) {
            return res.status(400).json({ error: 'imageId is required' });
        }

        const imageService = new EbookImageService();
        await imageService.removeImage(imageId, userId);

        res.json({ success: true, message: 'Image removed successfully' });
    } catch (error) {
        console.error('❌ Erro ao remover imagem:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Gerar sumário automaticamente baseado nas seções do projeto
 * ZERO custo de LLM - apenas concatenação de dados existentes
 */
export const generateTableOfContents = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        // Verificar acesso ao projeto
        const projects = await mongoDbService.get('ebookProjects', {
            _id: new ObjectId(projectId),
            userId: userId
        });

        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Buscar todas as seções do projeto
        const sections = await mongoDbService.get('ebookSections', { projectId });
        sections.sort((a: any, b: any) => a.order - b.order);

        // Gerar sumário automaticamente
        const tocContent = buildTableOfContents(sections);

        // Encontrar ou criar seção de sumário
        let tocSection = sections.find((s: any) => s.type === 'table-of-contents');

        if (tocSection) {
            // Atualizar seção existente
            await mongoDbService.updateOne('ebookSections',
                { _id: tocSection._id },
                {
                    $set: {
                        content: tocContent,
                        metadata: {
                            ...tocSection.metadata,
                            wordCount: countWords(tocContent),
                            characterCount: tocContent.length,
                            estimatedTokens: Math.ceil(tocContent.length / 4),
                            estimatedPages: Math.ceil(countWords(tocContent) / 250),
                            generatedBy: 'auto-toc',
                            regenerationCount: (tocSection.metadata?.regenerationCount || 0) + 1
                        },
                        status: 'completed',
                        updatedAt: new Date()
                    }
                }
            );
        } else {
            // Criar nova seção de sumário
            const newTocSection = {
                projectId,
                type: 'table-of-contents',
                order: 6, // Após epígrafe, antes de prefácio
                title: 'Sumário',
                synopsis: '',
                content: tocContent,
                images: [],
                metadata: {
                    wordCount: countWords(tocContent),
                    characterCount: tocContent.length,
                    estimatedTokens: Math.ceil(tocContent.length / 4),
                    estimatedPages: Math.ceil(countWords(tocContent) / 250),
                    generatedBy: 'auto-toc',
                    regenerationCount: 1
                },
                status: 'completed',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await mongoDbService.add('ebookSections', newTocSection);

            // Adicionar à lista de seções do projeto
            const project = projects[0];
            const projectSections = project.sections || [];
            projectSections.push(result.insertedId);

            await mongoDbService.updateOne('ebookProjects',
                { _id: new ObjectId(projectId) },
                { $set: { sections: projectSections } }
            );
        }

        res.json({
            success: true,
            message: 'Sumário gerado automaticamente com base nas seções existentes.',
            tocContent
        });
    } catch (error) {
        console.error('❌ Erro ao gerar sumário:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Gerar synopses para TODOS os capítulos/seções baseado no DNA do livro
 * Sistema de PLANEJAMENTO NARRATIVO para manter coerência entre capítulos
 */
export const generateAllSynopses = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        // Verificar acesso ao projeto
        const projects = await mongoDbService.get('ebookProjects', {
            _id: new ObjectId(projectId),
            userId: userId
        });

        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const project = projects[0];

        // Buscar todas as seções do projeto
        const sections = await mongoDbService.get('ebookSections', { projectId });
        
        if (!sections || sections.length === 0) {
            return res.status(400).json({ error: 'No sections found in project' });
        }

        sections.sort((a: any, b: any) => a.order - b.order);

        // Filtrar TODAS as seções EXCETO cover e table-of-contents
        // Cover é imagem, table-of-contents é gerado automaticamente
        const contentSections = sections.filter((s: any) => 
            s.type !== 'cover' && 
            s.type !== 'table-of-contents'
        );

        if (contentSections.length === 0) {
            return res.status(400).json({ error: 'No content sections found to generate synopses' });
        }

        // Preparar contexto do DNA do livro
        const dna = project.dna || {};
        const totalSections = contentSections.length;

        const { RouterApiOpenAI } = await import('../../services/openrouter.service');
        const openai = new RouterApiOpenAI();

        const generatedSynopses: Array<{ sectionId: string; synopsis: string; title: string }> = [];
        const previousSynopses: Array<{ title: string; synopsis: string }> = [];
        
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalCost = 0;

        // Gerar synopsis para cada seção progressivamente
        for (let i = 0; i < contentSections.length; i++) {
            const section = contentSections[i];
            const sectionNumber = i + 1;

            // Construir prompt com contexto narrativo
            const contextPart = previousSynopses.length > 0 
                ? `\n\nCONTEXTO NARRATIVO (capítulos anteriores):\n${previousSynopses.map((s, idx) => `${idx + 1}. ${s.title}: ${s.synopsis}`).join('\n')}`
                : '';

            const prompt = `Você é um planejador narrativo especializado em criar estruturas coerentes para livros.

TAREFA: Gere uma synopsis (resumo planejado) para a seção "${section.title}" (${sectionNumber}/${totalSections}).

DNA DO LIVRO:
- Título: ${dna.title || 'Não especificado'}
- Gênero: ${dna.genre || 'Não especificado'}
- Tom: ${dna.tone || 'Não especificado'}
- Ideia Central: ${dna.idea || 'Não especificado'}
${dna.keywords?.length > 0 ? `- Palavras-chave: ${dna.keywords.join(', ')}` : ''}
${dna.targetAudience ? `- Público-alvo: ${dna.targetAudience}` : ''}${contextPart}

POSIÇÃO NO LIVRO:
- Esta é a seção ${sectionNumber} de ${totalSections}
- Tipo: ${section.type}

INSTRUÇÕES:
1. Crie uma synopsis de 50-100 palavras
2. Descreva O QUE DEVE ACONTECER nesta seção (planejamento prospectivo)
3. Mantenha coerência com as seções anteriores
${sectionNumber === 1 ? '4. Como é a primeira seção, estabeleça o tom e apresente elementos iniciais' : ''}
${sectionNumber === totalSections ? '4. Como é a última seção, planeje uma conclusão satisfatória' : ''}
${sectionNumber > 1 && sectionNumber < totalSections ? '4. Avance a narrativa de forma natural e mantenha o interesse' : ''}
5. Use linguagem clara e direta

IMPORTANTE: A synopsis deve guiar a FUTURA GERAÇÃO de conteúdo, não resumir conteúdo existente.

SYNOPSIS PLANEJADA:`;

            const response = await openai.createCompletion({
                model: getModelCost('basic').id,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 300,
                temperature: 0.7 // Criatividade moderada para planejamento
            });

            const synopsis = response.choices[0]?.message?.content?.trim();

            if (!synopsis) {
                console.error(`❌ Falha ao gerar synopsis para seção ${section.title}`);
                continue;
            }

            // Calcular tokens e custo
            const inputTokens = Math.ceil((prompt.length) / 4);
            const outputTokens = Math.ceil(synopsis.length / 4);
            
            // google/gemini-2.5-flash-lite-preview-09-2025: $0.050 / 1M input tokens, $0.400 / 1M output tokens
            const inputCost = (inputTokens / 1_000_000) * 0.050;
            const outputCost = (outputTokens / 1_000_000) * 0.400;
            const cost = inputCost + outputCost;

            totalInputTokens += inputTokens;
            totalOutputTokens += outputTokens;
            totalCost += cost;

            // Atualizar seção no banco com synopsis e metadata
            await mongoDbService.updateOne('ebookSections',
                { _id: section._id },
                {
                    $set: {
                        synopsis: synopsis,
                        synopsisMetadata: {
                            source: 'generated-from-dna',
                            generatedAt: new Date(),
                            usedForContentGeneration: false,
                            wordCount: synopsis.split(/\s+/).filter((w: string) => w.length > 0).length,
                            model: 'openai/gpt-4o-mini'
                        },
                        updatedAt: new Date()
                    }
                }
            );

            generatedSynopses.push({
                sectionId: section._id.toString(),
                synopsis: synopsis,
                title: section.title
            });

            // Adicionar ao contexto para próximas seções
            previousSynopses.push({
                title: section.title,
                synopsis: synopsis
            });

            console.log(`✅ Synopsis gerado para "${section.title}": ${synopsis.substring(0, 50)}...`);
        }

        // Registrar uso de créditos
        const { CreditsService } = await import('../../services/credits.service');
        const { addHistoric } = await import('../../services/historic.service');
        
        const creditsService = new CreditsService();
        await creditsService.subtractCredit(userId, totalCost.toString());
        
        // Adicionar ao histórico
        await addHistoric({
            userId,
            cost: totalCost.toString(),
            app: 'ebook-generate-all-synopses',
            model: 'openai/gpt-4o-mini',
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            total_tokens: totalInputTokens + totalOutputTokens
        });

        console.log(`✅ Geração completa: ${generatedSynopses.length} synopses, custo total: $${totalCost.toFixed(6)}`);

        res.json({
            success: true,
            synopses: generatedSynopses,
            count: generatedSynopses.length,
            creditsCharged: totalCost,
            tokens: {
                input: totalInputTokens,
                output: totalOutputTokens,
                total: totalInputTokens + totalOutputTokens
            }
        });
    } catch (error) {
        console.error('❌ Erro ao gerar synopses:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Gerar synopsis automaticamente usando IA
 * Extrai resumo conciso do conteúdo da seção (~100 palavras)
 * SISTEMA DE RESUMO: para conteúdo já escrito
 */
export const generateSynopsis = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }

        const { projectId, sectionId } = req.params;
        const { content } = req.body;

        if (!projectId || !sectionId) {
            return res.status(400).json({ error: 'projectId and sectionId are required' });
        }

        if (!content || content.trim().length < 50) {
            return res.status(400).json({ 
                error: 'Content is required and must be at least 50 characters' 
            });
        }

        // Verificar acesso à seção
        const sections = await mongoDbService.get('ebookSections', { 
            _id: new ObjectId(sectionId) 
        });

        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const section = sections[0];

        // Verificar acesso ao projeto
        const projects = await mongoDbService.get('ebookProjects', {
            _id: new ObjectId(projectId),
            userId: userId
        });

        if (!projects || projects.length === 0) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const project = projects[0];

        // Usar LLM para gerar synopsis
        const { RouterApiOpenAI } = await import('../../services/openrouter.service');
        const openai = new RouterApiOpenAI();

        // Truncar conteúdo para economizar tokens (primeiros 2000 caracteres)
        const contentPreview = content.substring(0, 2000);

        // Determinar tipo de conteúdo para gerar prompt adequado
        const sectionTypeHints: Record<string, string> = {
            'chapter': 'resumo narrativo do que acontece neste capítulo',
            'introduction': 'resumo do que será apresentado na introdução',
            'conclusion': 'resumo das principais conclusões',
            'preface': 'resumo do prefácio e seu propósito',
            'foreword': 'resumo da apresentação',
            'dedication': 'breve descrição da dedicatória',
            'acknowledgments': 'resumo dos agradecimentos principais',
            'epigraph': 'descrição da citação e seu significado',
            'appendix': 'descrição do material complementar',
            'bibliography': 'resumo das principais referências',
            'author-bio': 'resumo da biografia do autor',
            'back-cover': 'resumo da sinopse'
        };

        const hintForType = sectionTypeHints[section.type] || 'resumo do conteúdo desta seção';

        const response = await openai.createCompletion({
            model: getModelCost('basic').id, // Modelo econômico para geração rápida
            messages: [
                {
                    role: 'system',
                    content: `Você é um assistente especializado em criar resumos concisos e informativos para livros.

Sua tarefa é criar um ${hintForType} baseado no conteúdo fornecido.

REGRAS IMPORTANTES:
- O resumo deve ter entre 50 e 100 palavras
- Foque nos pontos principais e eventos importantes
- Use linguagem clara e objetiva
- NÃO inclua títulos, cabeçalhos ou formatação especial
- Retorne APENAS o texto do resumo, nada mais`
                },
                {
                    role: 'user',
                    content: `Título: ${section.title}
Tipo: ${section.type}
Gênero do livro: ${project.dna?.genre || 'Não especificado'}

Conteúdo:
${contentPreview}

Crie um resumo conciso (50-100 palavras) focando nos pontos principais.`
                }
            ],
            max_tokens: 300, // ~100 palavras
            temperature: 0.5 // Balanço entre criatividade e precisão
        });

        const synopsis = response.choices[0]?.message?.content?.trim();

        if (!synopsis) {
            return res.status(500).json({ error: 'Failed to generate synopsis' });
        }

        // Calcular custo (estimativa)
        const inputTokens = Math.ceil((contentPreview.length + 500) / 4); // Conteúdo + prompt
        const outputTokens = Math.ceil(synopsis.length / 4);
        
        // google/gemini-2.5-flash-lite-preview-09-2025: $0.150 / 1M input tokens, $0.600 / 1M output tokens
        const inputCost = (inputTokens / 1_000_000) * 0.050;
        const outputCost = (outputTokens / 1_000_000) * 0.400;
        const totalCost = inputCost + outputCost;

        // Registrar uso de créditos
        const { CreditsService } = await import('../../services/credits.service');
        const { addHistoric } = await import('../../services/historic.service');
        
        const creditsService = new CreditsService();
        await creditsService.subtractCredit(userId, totalCost.toString());
        
        // Adicionar ao histórico
        await addHistoric({
            userId,
            cost: totalCost.toString(),
            app: 'ebook-generate-synopsis',
            model: 'openai/gpt-4o-mini',
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens
        });

        console.log(`✅ Synopsis gerado para seção ${sectionId}: ${synopsis.length} caracteres, custo: $${totalCost.toFixed(6)}`);

        res.json({
            success: true,
            synopsis,
            creditsCharged: totalCost,
            tokens: {
                input: inputTokens,
                output: outputTokens,
                total: inputTokens + outputTokens
            },
            wordCount: synopsis.split(/\s+/).filter(w => w.length > 0).length
        });
    } catch (error) {
        console.error('❌ Erro ao gerar synopsis:', error);
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Salvar conteúdo gerado de uma seção com metadados de imagens
 * Chamado após a conclusão da geração para atualizar o DB
 */
export const saveSectionContent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        if (!userId) {
            return res.status(401).json({ msg: 'Unauthorized: User ID not found' });
        }
        
        const { sectionId, projectId, content, images } = req.body;
        
        if (!sectionId || !projectId || !content) {
            return res.status(400).json({ error: 'sectionId, projectId, and content are required' });
        }
        
        // Verificar acesso ao projeto
        const projects = await mongoDbService.get('ebookProjects', {
            _id: new ObjectId(projectId),
            userId: userId
        });
        
        if (!projects || projects.length === 0) {
            return res.status(403).json({ error: 'Project not found or access denied' });
        }
        
        // Verificar que a seção pertence ao projeto
        const sections = await mongoDbService.get('ebookSections', {
            _id: new ObjectId(sectionId),
            projectId: projectId
        });
        
        if (!sections || sections.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }
        
        const section = sections[0];
        
        // Calcular metadados
        const words = content.split(/\s+/).filter((w: string) => w.length > 0).length;
        const characters = content.length;
        const estimatedTokens = Math.ceil(words / 4); // Aproximação rápida
        const estimatedPages = Math.ceil(words / 250); // ~250 palavras por página
        
        // Atualizar seção com conteúdo e metadados
        const updateData: any = {
            content: content,
            status: 'generated',
            metadata: {
                wordCount: words,
                characterCount: characters,
                estimatedTokens: estimatedTokens,
                estimatedPages: estimatedPages,
                generatedBy: 'ebook-generate-section',
                regenerationCount: (section.metadata?.regenerationCount || 0) + 1,
                lastGeneratedAt: new Date()
            },
            updatedAt: new Date()
        };
        
        // Adicionar informações de imagens se houver
        if (images && typeof images === 'object') {
            updateData.metadata.imagesGenerated = {
                success: images.success,
                count: images.generatedCount,
                requested: images.totalRequested,
                error: images.error
            };
        }
        
        const result = await mongoDbService.updateOne('ebookSections',
            { _id: new ObjectId(sectionId) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Failed to update section' });
        }
        
        res.json({
            success: true,
            section: {
                _id: sectionId,
                content: content.substring(0, 200) + '...',
                metadata: updateData.metadata
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao salvar conteúdo da seção:', error);
        res.status(500).json({ error: 'Failed to save section content' });
    }
};
