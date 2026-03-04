import { MongoDbService } from './mongodb.service';
import { ObjectId } from 'mongodb';
import axios from 'axios';
import { uploadFile, deleteFile } from './local-bucket-upload.service';
import sharp from 'sharp';

const mongoDbService = new MongoDbService();

export interface EbookImage {
    _id?: ObjectId;
    userId: string;
    projectId: string;
    sectionId?: string;
    type: 'cover' | 'section-image';
    url: string;
    minioPath: string;
    prompt?: string;
    metadata?: {
        width?: number;
        height?: number;
        format?: string;
        size?: number;
        printUrl?: string;
        previewUrl?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export class EbookImageService {

    /**
     * Faz upload de uma imagem gerada para o MinIO e salva referência no banco
     */
    async uploadAndSaveImage(
        imageUrl: string,
        userId: string,
        projectId: string,
        sectionId: string | null,
        type: 'cover' | 'section-image',
        prompt?: string,
        options?: { generateCoverVariants?: boolean }
    ): Promise<EbookImage> {
        try {
            // 1. Baixar a imagem do Replicate
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data);

            // 2. Criar objeto de arquivo para upload
            const fileName = `${type}-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            const imageFile = {
                originalname: fileName,
                buffer: imageBuffer,
                size: imageBuffer.length,
                mimetype: 'image/png'
            };

            // 3. Upload para MinIO
            const directory = `ebook-images/${projectId}`;
            const minioUrl = await uploadFile(imageFile, userId, directory);

            // 4. Extrair caminho MinIO da URL
            const minioPath = minioUrl.replace(`${process.env.MINIO_SERVER_URL}/storage/`, '');

            // If requested and this is a cover, generate print-ready + preview variants
            let printUrl: string | undefined;
            let previewUrl: string | undefined;
            if (type === 'cover' && options?.generateCoverVariants) {
                try {
                    // Calculate target sizes at 300 DPI with 5mm bleed
                    const dpi = 300;
                    const mmToPx = (mm: number) => Math.round((mm / 25.4) * dpi);
                    const a4W = mmToPx(210);
                    const a4H = mmToPx(297);
                    const bleed = mmToPx(5);
                    const targetW = a4W + bleed * 2;
                    const targetH = a4H + bleed * 2;

                    const printBuffer = await sharp(imageBuffer)
                        .resize(targetW, targetH, { fit: 'cover' })
                        .jpeg({ quality: 92 })
                        .toBuffer();

                    const previewBuffer = await sharp(imageBuffer)
                        .resize(1000, 1500, { fit: 'cover' })
                        .jpeg({ quality: 82 })
                        .toBuffer();

                    const printFile = {
                        originalname: `cover-print-${Date.now()}.jpg`,
                        buffer: printBuffer,
                        size: printBuffer.length,
                        mimetype: 'image/jpeg'
                    };

                    const previewFile = {
                        originalname: `cover-preview-${Date.now()}.jpg`,
                        buffer: previewBuffer,
                        size: previewBuffer.length,
                        mimetype: 'image/jpeg'
                    };

                    printUrl = await uploadFile(printFile, userId, directory);
                    previewUrl = await uploadFile(previewFile, userId, directory);
                } catch (err) {
                    console.error('❌ Erro ao gerar variantes da capa:', err);
                }
            }

            // 5. Salvar referência no banco
            const imageData: EbookImage = {
                userId,
                projectId,
                sectionId: sectionId || undefined,
                type,
                url: minioUrl,
                minioPath,
                prompt,
                metadata: {
                    size: imageBuffer.length,
                    format: 'png',
                    printUrl: printUrl,
                    previewUrl: previewUrl
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await mongoDbService.add('ebookImages', imageData);
            imageData._id = result.insertedId;

            return imageData;
        } catch (error) {
            console.error('❌ Erro ao fazer upload e salvar imagem:', error);
            throw error;
        }
    }

    /**
     * Sincroniza imagens de uma seção com o storage
     */
    async syncSectionImages(sectionId: string, userId: string): Promise<{
        synced: number;
        removed: number;
        total: number;
    }> {
        try {
        //    console.log(`🔄 Iniciando syncSectionImages para seção ${sectionId}, usuário ${userId}`);

            // 1. Buscar seção
            const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(sectionId) });
            if (!sections || sections.length === 0) {
                throw new Error('Section not found');
            }

            const section = sections[0];

            // 2. Verificar se usuário tem acesso ao projeto
            const projects = await mongoDbService.get('ebookProjects', {
                _id: new ObjectId(section.projectId),
                userId: userId
            });

            if (!projects || projects.length === 0) {
                throw new Error('Project not found or access denied');
            }

            // 3. Buscar imagens existentes da seção
            const existingImages = await mongoDbService.get('ebookImages', {
                sectionId: sectionId,
                type: 'section-image'
            });

            // 4. Buscar TODAS as seções do projeto para verificar referências globais
            const allProjectSections = await mongoDbService.get('ebookSections', {
                projectId: section.projectId
            });

            // 5. Verificar quais imagens estão referenciadas no projeto (busca direta por URL)
        //    console.log(`📊 Seção ${sectionId}: Verificando ${existingImages.length} imagens no banco`);

            const imagesToRemove = [];
            for (const image of existingImages) {
                let isReferenced = false;

                // Verificar se a URL desta imagem aparece em qualquer seção do projeto
                for (const projectSection of allProjectSections) {
                    if (projectSection.content && this.isImageReferenced(projectSection.content, image.url)) {
                        isReferenced = true;
                    //    console.log(`✅ Imagem ${image.url} ENCONTRADA na seção ${projectSection._id}`);
                        break;
                    }
                }

                if (!isReferenced) {
                //    console.log(`❌ Imagem ${image.url} NÃO encontrada em nenhuma seção do projeto`);
                    imagesToRemove.push(image);
                }
            }

        //    console.log(`🗑️ Seção ${sectionId}: ${imagesToRemove.length} imagens identificadas como órfãs`);
            imagesToRemove.forEach(img => {
            //    console.log(`  - Imagem órfã: ${img.url} (criada em ${img.createdAt})`);
            });

            // 6. NÃO remover imagens órfãs automaticamente
        //    console.log(`⚠️  ${imagesToRemove.length} imagens órfãs IDENTIFICADAS mas NÃO removidas automaticamente`);
        //    console.log(`💡 Use o script de limpeza manual para remover imagens órfãs quando necessário`);

            // 7. Identificar imagens para adicionar (novas referências) - analisar apenas a seção atual
            // Usar busca direta por URL ao invés de regex para maior confiabilidade
            const existingUrls = existingImages.map(img => img.url);
            const imagesToAdd = [];

            // Verificar se há URLs do nosso storage na seção atual que não estão no banco
            if (section.content) {
                const minioServerUrl = process.env.MINIO_SERVER_URL;
                if (minioServerUrl) {
                    // Procurar por qualquer URL que contenha o domínio do nosso MinIO
                    const minioDomain = minioServerUrl.replace('http://', '').replace('https://', '');
                    const contentLines = section.content.split('\n');

                    for (const line of contentLines) {
                        if (line.includes(minioDomain) && line.includes('ebook-images')) {
                            // Extrair URLs usando regex simples
                            const urlMatches = line.match(/https?:\/\/[^\s<>"']+/g);
                            if (urlMatches) {
                                for (const url of urlMatches) {
                                    if (url.includes(minioDomain) && url.includes('ebook-images') && !existingUrls.includes(url)) {
                                        imagesToAdd.push(url);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 8. Adicionar novas imagens (se existirem no storage mas não no banco)
            let syncedCount = 0;
            for (const imageUrl of imagesToAdd) {
                try {
                    // Verificar se a imagem existe no MinIO
                    const minioPath = imageUrl.replace(`${process.env.MINIO_SERVER_URL}/storage/`, '');

                    // Tentar buscar metadados da imagem
                    const imageData: EbookImage = {
                        userId,
                        projectId: section.projectId,
                        sectionId: sectionId,
                        type: 'section-image',
                        url: imageUrl,
                        minioPath,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    await mongoDbService.add('ebookImages', imageData);
                    syncedCount++;
                } catch (error) {
                    console.error(`❌ Erro ao sincronizar imagem ${imageUrl}:`, error);
                }
            }

            // 9. Atualizar timestamp da seção
            await mongoDbService.updateOne('ebookSections',
                { _id: new ObjectId(sectionId) },
                { $set: { updatedAt: new Date() } }
            );

            return {
                synced: syncedCount,
                removed: 0, // Não remove mais automaticamente
                total: imagesToAdd.length
            };

        } catch (error) {
            console.error('❌ Erro ao sincronizar imagens da seção:', error);
            throw error;
        }
    }

    /**
     * Identifica imagens órfãs de um projeto inteiro (NÃO remove automaticamente)
     */
    async identifyOrphanedImages(projectId: string, userId: string): Promise<{
        orphaned: EbookImage[];
        total: number;
    }> {
        try {
            // 1. Verificar acesso ao projeto
            const projects = await mongoDbService.get('ebookProjects', {
                _id: new ObjectId(projectId),
                userId: userId
            });

            if (!projects || projects.length === 0) {
                throw new Error('Project not found or access denied');
            }

            // 2. Buscar todas as seções do projeto
            const sections = await mongoDbService.get('ebookSections', { projectId });

            // 3. Buscar todas as imagens do projeto no banco
            const allImages = await mongoDbService.get('ebookImages', { projectId });
        //    console.log(`🔍 Identificando imagens órfãs do projeto ${projectId}`);
        //    console.log(`📊 Total de imagens no projeto: ${allImages.length}`);

            // 4. Identificar imagens órfãs - verificar se cada imagem está referenciada em alguma seção
            const orphanedImages = [];
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            for (const image of allImages) {
                let isReferenced = false;

                // Verificar se a URL desta imagem aparece em qualquer seção do projeto
                for (const section of sections) {
                    if (section.content && this.isImageReferenced(section.content, image.url)) {
                        isReferenced = true;
                    //    console.log(`✅ Imagem ${image.url} ENCONTRADA na seção ${section._id}`);
                        break;
                    }
                }

                if (!isReferenced) {
                    // Verificar se foi criada há mais de 5 minutos (proteção contra remoção precoce)
                    if (image.createdAt < fiveMinutesAgo) {
                    //    console.log(`❌ Imagem ${image.url} NÃO encontrada - É ÓRFÃ (criada em ${image.createdAt})`);
                        orphanedImages.push(image);
                    } else {
                    //    console.log(`⏳ Imagem ${image.url} NÃO encontrada mas RECENTE - PRESERVADA (criada em ${image.createdAt})`);
                    }
                }
            }

        //    console.log(`🗑️ Projeto ${projectId}: ${orphanedImages.length} imagens órfãs identificadas`);
        //    console.log(`⚠️  Use o script de limpeza manual para remover estas imagens órfãs quando necessário`);

            return {
                orphaned: orphanedImages,
                total: allImages.length
            };

        } catch (error) {
            console.error('❌ Erro ao identificar imagens órfãs:', error);
            throw error;
        }
    }

    /**
     * Verifica se uma URL específica está referenciada no conteúdo
     */
    private isImageReferenced(content: string, imageUrl: string): boolean {
        return content.includes(imageUrl);
    }

    /**
     * Extrai referências de imagens do conteúdo HTML/markdown (método legado - mantido para compatibilidade)
     */
    private extractImageReferences(content: string): string[] {
        const urls: string[] = [];

        // Regex para encontrar URLs de imagens em markdown ![alt](url)
        const markdownRegex = /!\[.*?\]\((.*?)\)/g;
        let match;
        while ((match = markdownRegex.exec(content)) !== null) {
            urls.push(match[1]);
        }

        // Regex para encontrar tags <img> em HTML - CORRIGIDO para aceitar src como primeiro atributo
        const htmlRegex = /<img[^>]*?\s+src=["']([^"']+)["'][^>]*>|<img\s+src=["']([^"']+)["'][^>]*>/gi;
        while ((match = htmlRegex.exec(content)) !== null) {
            urls.push(match[1] || match[2]);
        }

        // Regex alternativo para capturar src= mesmo sem tag completa
        const srcRegex = /src=["']([^"']*?bucket-s3-api\.redatudo\.online[^"']*?)["']/gi;
        while ((match = srcRegex.exec(content)) !== null) {
            urls.push(match[1]);
        }

        // Regex para URLs diretas de imagens (mais robusto)
        const urlRegex = /(https?:\/\/[^\s<>"']+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s<>"']*)?)/gi;
        while ((match = urlRegex.exec(content)) !== null) {
            urls.push(match[1]);
        }

        // Regex específico para URLs do bucket
        const bucketRegex = /(https?:\/\/bucket-s3-api\.redatudo\.online\/[^\s<>"']+)/gi;
        while ((match = bucketRegex.exec(content)) !== null) {
            urls.push(match[1]);
        }

        return [...new Set(urls)]; // Remover duplicatas
    }

    /**
     * Busca imagens de um projeto
     */
    async getProjectImages(projectId: string, userId: string): Promise<EbookImage[]> {
        // Verificar acesso
        const projects = await mongoDbService.get('ebookProjects', {
            _id: new ObjectId(projectId),
            userId: userId
        });

        if (!projects || projects.length === 0) {
            throw new Error('Project not found or access denied');
        }

        return await mongoDbService.get('ebookImages', { projectId });
    }

    /**
     * Busca imagens de uma seção
     */
    async getSectionImages(sectionId: string, userId: string): Promise<EbookImage[]> {
        // Buscar seção para verificar acesso
        const sections = await mongoDbService.get('ebookSections', { _id: new ObjectId(sectionId) });
        if (!sections || sections.length === 0) {
            throw new Error('Section not found');
        }

        const section = sections[0];

        // Verificar acesso ao projeto
        const projects = await mongoDbService.get('ebookProjects', {
            _id: new ObjectId(section.projectId),
            userId: userId
        });

        if (!projects || projects.length === 0) {
            throw new Error('Project not found or access denied');
        }

        return await mongoDbService.get('ebookImages', { sectionId });
    }

    /**
     * Remove uma imagem específica
     */
    async removeImage(imageId: string, userId: string): Promise<void> {
        const images = await mongoDbService.get('ebookImages', { _id: new ObjectId(imageId) });
        if (!images || images.length === 0) {
            throw new Error('Image not found');
        }

        const image = images[0];

        // Verificar se usuário tem acesso
        if (image.userId !== userId) {
            throw new Error('Access denied');
        }

        // Remover do MinIO
        await deleteFile(image.minioPath);

        // Remover do banco
        await mongoDbService.deleteOne('ebookImages', { _id: new ObjectId(imageId) });
    }
}

export default EbookImageService;
