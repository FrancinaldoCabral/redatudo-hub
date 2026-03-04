/**
 * Serviço de orquestração de geração de imagens para seções
 * Gerencia o ciclo completo: descrição → Replicate → MinIO → DB
 */

import EbookImageService, { EbookImage } from './ebook-image.service';
import { send as replicateSend } from './replicate.service';
import { MongoDbService } from './mongodb.service';
import { ObjectId } from 'mongodb';

export interface ImageDescription {
    placeholder: string; // {{img1}}, {{img2}}, etc.
    prompt: string;
    position?: string; // "top", "middle", "bottom", "inline" (para contexto)
}

export interface ImageGenerationOptions {
    aspectRatio?: string; // '1:1', '4:3', '16:9', '9:16', '3:2', '2:3'
    quality?: 'basico' | 'medio' | 'avancado'; // Nível de qualidade
    promptEnhancements?: string[]; // Detalhes adicionais a incorporar nos prompts
}

export interface SectionImageGenerationResult {
    success: boolean;
    imageDescriptions: ImageDescription[];
    generatedImages: EbookImage[];
    contentWithUrls: string;
    error?: string;
}

export class SectionImageGenerationService {
    private ebookImageService = new EbookImageService();
    private mongoDbService = new MongoDbService();

    /**
     * Aprimora o prompt com informações de estilo e opções avançadas
     */
    private enhancePromptWithStyle(basePrompt: string, style: string, options?: ImageGenerationOptions): string {
        const styleDescriptions: Record<string, string> = {
            realistic: 'Ultra-realistic, high quality, professional photography, detailed',
            artistic: 'Artistic style, painted, illustrative, expressive brushstrokes',
            abstract: 'Abstract art, geometric shapes, modern, colorful',
            minimalist: 'Minimalist design, clean lines, simple composition, elegant',
            photographic: 'Professional photograph, 4K quality, well-lit, sharp focus'
        };

        let enhancedPrompt = `${basePrompt}. Style: ${styleDescriptions[style] || styleDescriptions.realistic}`;

        // Se há opções avançadas, incorporá-las
        if (options?.promptEnhancements && options.promptEnhancements.length > 0) {
            enhancedPrompt += `. Additional details: ${options.promptEnhancements.join(', ')}`;
        }

        return enhancedPrompt;
    }

    /**
     * Gera uma única imagem via Replicate
     */
    private async generateSingleImage(
        description: ImageDescription,
        userId: string,
        projectId: string,
        sectionId: string,
        imageStyle: string,
        options?: ImageGenerationOptions,
        metadata?: { replicateApiKey?: string; model?: string }
    ): Promise<EbookImage | null> {
        try {
            const enhancedPrompt = this.enhancePromptWithStyle(description.prompt, imageStyle, options);
            console.log(`🎬 Gerando imagem com prompt: "${enhancedPrompt}"`);

            // Determinar aspect ratio baseado nas opções
            const aspectRatio = options?.aspectRatio || '1:1';

            // Montar input para Ideogram v3 turbo
            const replicateInput: any = {
                prompt: enhancedPrompt,
                aspect_ratio: aspectRatio,
                magic_prompt_option: 'On'
            };

            // Distinguir entre style_type e style_preset
            const STYLE_TYPES = ['None', 'Auto', 'General', 'Realistic', 'Design'];
            
            let styleType: string | undefined;
            let stylePreset: string | undefined;
            
            // Verificar se imageStyle é um style_type básico ou style_preset
            if (STYLE_TYPES.includes(imageStyle)) {
                // É um style_type básico
                if (imageStyle !== 'None') {
                    styleType = imageStyle;
                }
            } else {
                // É um style_preset (3D, Anime, Bokeh, etc)
                stylePreset = imageStyle;
                styleType = 'General'; // Quando há preset, style_type deve ser 'General'
            }
            
            // Aplicar style_type (prioridade: quality > imageStyle)
            if (options?.quality) {
                const qualityToStyleType: Record<string, string> = {
                    'basico': 'Auto',
                    'medio': 'General',
                    'avancado': 'Design'
                };
                replicateInput.style_type = qualityToStyleType[options.quality] || 'Auto';
            } else if (styleType) {
                replicateInput.style_type = styleType;
            }
            
            // Adicionar style_preset se definido
            if (stylePreset) {
                replicateInput.style_preset = stylePreset;
            }

            const replicateResult = await replicateSend(
                replicateInput,
                (metadata && metadata.model) ? metadata.model : 'ideogram-ai/ideogram-v3-turbo',
                metadata || {}
            );

            // A API pode retornar string de erro; trate explícito
            if (typeof replicateResult === 'string') {
                throw new Error(`Replicate error: ${replicateResult}`);
            }

            if (!replicateResult?.result || replicateResult.result.length === 0) {
                console.error('⚠️ Resposta inválida do Replicate', replicateResult);
                throw new Error('Replicate retornou resultado vazio');
            }

            const imageUrl = replicateResult.result[0];

            const savedImage = await this.ebookImageService.uploadAndSaveImage(
                imageUrl,
                userId,
                projectId,
                sectionId,
                'section-image',
                description.prompt
            );

            return savedImage;

        } catch (error) {
            console.error(`❌ Erro ao gerar imagem "${description.placeholder}":`, error);
            return null;
        }
    }

    /**
     * Gera imagens para uma seção baseado em descrições fornecidas pela LLM
     */
    async generateAndIntegrateImages(
        content: string,
        imageDescriptions: ImageDescription[],
        userId: string,
        projectId: string,
        sectionId: string,
        imageStyle: string = 'realistic',
        options?: ImageGenerationOptions,
        metadata?: { replicateApiKey?: string; model?: string }
    ): Promise<SectionImageGenerationResult> {
        try {
            console.log(`🎨 Iniciando geração de ${imageDescriptions.length} imagens para seção ${sectionId}`);

            const generatedImages: EbookImage[] = [];
            let contentWithUrls = content;

            const imagePromises = imageDescriptions.map(desc =>
                this.generateSingleImage(desc, userId, projectId, sectionId, imageStyle, options, metadata)
            );

            const results = await Promise.allSettled(imagePromises);

            const failedImages: string[] = [];
            const urlMap: Record<string, string> = {};

            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const description = imageDescriptions[i];

                if (result.status === 'fulfilled' && result.value) {
                    generatedImages.push(result.value);
                    urlMap[description.placeholder] = result.value.url;
                    console.log(`✅ Imagem ${description.placeholder} gerada com sucesso`);
                } else {
                    failedImages.push(description.placeholder);
                    console.error(
                        `❌ Erro ao gerar imagem ${description.placeholder}:`,
                        result.status === 'rejected' ? result.reason : 'Unknown error'
                    );
                }
            }

            for (const [placeholder, url] of Object.entries(urlMap)) {
                // Usar Markdown em vez de HTML para compatibilidade com frontend
                const imgMarkdown = `![Imagem gerada](${url})`;
                console.log(`🖼️ [IMG] Substituindo ${placeholder} por Markdown ![](url): ${url.substring(0, 80)}...`);
                contentWithUrls = contentWithUrls.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), imgMarkdown);
            }
            console.log(`✅ [IMG] Substituição completa. Conteúdo tem Markdown? ${contentWithUrls.includes('![')}, total de imagens: ${(contentWithUrls.match(/!\[/g) || []).length}`);

            for (const placeholder of failedImages) {
                contentWithUrls = contentWithUrls.replace(
                    new RegExp(placeholder, 'g'),
                    `<!-- Falha ao gerar imagem: ${placeholder} -->`
                );
            }

            if (generatedImages.length > 0) {
                await this.mongoDbService.updateOne('ebookSections',
                    { _id: new ObjectId(sectionId) },
                    {
                        $push: {
                            images: {
                                $each: generatedImages.map(img => img._id)
                            }
                        },
                        $set: {
                            updatedAt: new Date()
                        }
                    }
                );
            }

            console.log(
                `🎨 Conclusão: ${generatedImages.length}/${imageDescriptions.length} imagens geradas com sucesso`
            );

            return {
                success: failedImages.length === 0,
                imageDescriptions,
                generatedImages,
                contentWithUrls,
                error: failedImages.length > 0 ? `${failedImages.length} imagens falharam: ${failedImages.join(', ')}` : undefined
            };

        } catch (error) {
            console.error('❌ Erro geral na geração de imagens:', error);
            return {
                success: false,
                imageDescriptions,
                generatedImages: [],
                contentWithUrls: content,
                error: `Erro ao gerar imagens: ${String(error)}`
            };
        }
    }

    /**
     * Extrai descrições de imagens do conteúdo gerado pela LLM
     * Formato esperado:
     * IMAGE_DESCRIPTION[detailed description in English]
     */
    extractImageDescriptions(content: string, imageCount?: number): ImageDescription[] {
        const descriptions: ImageDescription[] = [];
        // Novo formato: IMAGE_DESCRIPTION[descrição entre colchetes]
        const imagePattern = /IMAGE_DESCRIPTION\[([^\]]+)\]/gi;

        let match;
        let index = 1;
        const maxImages = Math.min(imageCount ?? 5, 5); // limitar a 5 para evitar custos inesperados

        console.log(`🔍 [ImageExtract] Procurando por marcadores IMAGE_DESCRIPTION[...] no conteúdo...`);
        
        while ((match = imagePattern.exec(content)) !== null && index <= maxImages) {
            const description = match[1].trim();
            console.log(`✅ [ImageExtract] Marcador ${index} encontrado: "${description.substring(0, 80)}..."`);
            
            descriptions.push({
                placeholder: `{{img${index}}}`,
                prompt: description,
                position: 'inline' // Posição automática baseada em onde o marcador aparece
            });
            index++;
        }

        console.log(`📊 [ImageExtract] Total de marcadores extraídos: ${descriptions.length}`);
        return descriptions;
    }

    /**
     * Substitui marcadores IMAGE_DESCRIPTION[...] por placeholders {{img1}}, {{img2}}, etc.
     * Retorna o conteúdo modificado com placeholders no lugar dos marcadores
     */
    replaceDescriptionsWithPlaceholders(content: string, descriptions: ImageDescription[]): string {
        let modifiedContent = content;
        const imagePattern = /IMAGE_DESCRIPTION\[([^\]]+)\]/gi;
        let index = 1;
        
        modifiedContent = modifiedContent.replace(imagePattern, () => {
            const placeholder = `{{img${index}}}`;
            console.log(`🔄 [Placeholder] Substituindo IMAGE_DESCRIPTION ${index} por ${placeholder}`);
            index++;
            return placeholder;
        });
        
        return modifiedContent;
    }

    /**
     * Remove marcadores IMAGE_DESCRIPTION do conteúdo final (fallback se algo der errado)
     */
    cleanImageDescriptions(content: string): string {
        // Remove marcadores no novo formato IMAGE_DESCRIPTION[...]
        return content.replace(/IMAGE_DESCRIPTION\[([^\]]+)\]/gi, '').trim();
    }
}

export default SectionImageGenerationService;
