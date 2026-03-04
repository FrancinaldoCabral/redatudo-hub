import { Request, Response } from 'express';
import { PricingEstimatorService } from '../../services/pricing-estimator.service';
import { MongoDbService } from '../../services/mongodb.service';
import { errorToText } from '../../services/axios-errors.service';
import { getProductVariations } from '../../services/wordpress.service';
import { getTools } from '../../services/tools.service';
import { EbookPricingService } from '../../services/ebook-pricing.service';
import { IMAGE_PRICING } from '../../config/ebook-llm.config';

const pricingEstimator = new PricingEstimatorService();
const mongoDbService = new MongoDbService();
const ebookPricingService = new EbookPricingService();

export const getPricingEstimates = async (req: Request, res: Response): Promise<void> => {
    try {
        const { content } = req.body;
        if (!content) {
            res.status(400).json({ msg: 'Content is required' });
            return;
        }
        const estimates = pricingEstimator.estimateForAllModels(content);
        res.status(200).json(estimates);
    } catch (error) {
        res.status(500).json({ msg: errorToText(error) });
    }
};

export const getToolCostPreview = async (req: Request, res: Response): Promise<void> => {
    try {
        const { appName, type, tier, length } = req.body; // Adaptar os parâmetros conforme necessário
        if (!appName) {
            res.status(400).json({ msg: 'appName is required' });
            return;
        }

        let costPreview: number;
        // Lógica para determinar qual serviço de precificação usar
        switch (appName) {
            case 'ebook-generate-section':
            case 'ebook-expand-text':
            case 'ebook-rewrite-text':
                // Para ferramentas de texto, usar o serviço de precificação de ebook
                const words = req.body.words || 1000; // Número de palavras, padrão 1000
                const tier = req.body.tier || 'medium'; // Tier padrão medium
                const costBreakdown = ebookPricingService.calculateGenerationCost({
                    words,
                    tier: tier as 'basic' | 'medium' | 'advanced'
                });
                costPreview = costBreakdown.credits;
                break;
            case 'ebook-generate-cover':
                costPreview = ebookPricingService.calculateReplicateCost('cover');
                break;
            case 'ebook-generate-image':
                costPreview = ebookPricingService.calculateReplicateCost('internal');
                break;
            default:
                // Para outras ferramentas, buscar o costPreview da tool
                const allTools = await getTools();
                const tool = allTools.find(t => t.title === appName || t.schema.function.name === appName);
                if (!tool) {
                     res.status(404).json({ msg: `Tool ${appName} not found` });
                     return;
                }
                costPreview = tool.costPreview;
                break;
        }
        res.status(200).json({ appName, costPreview });
    } catch (error) {
        res.status(500).json({ msg: errorToText(error) });
    }
};

export const getFixedPrices = async (req: Request, res: Response): Promise<void> => {
    try {
        const prices = pricingEstimator.getFixedPrices();
        res.status(200).json(prices);
    } catch (error) {
        res.status(500).json({ msg: errorToText(error) });
    }
};

export const getToolUsageCostAverages = async (req: Request, res: Response): Promise<void> => {
    try {
        const averages = await mongoDbService.getToolUsageCostAverages();
        res.status(200).json(averages);
    } catch (error) {
        res.status(500).json({ msg: errorToText(error) });
    }
};

export const getProductPricing = async (req: Request, res: Response): Promise<void> => {
    try {
        const subscriptionProductId = process.env.SUBSCRIPTION_PRODUCT_ID;
        const creditsProductId = process.env.CREDITS_PRODUCT_ID;

        const [subscriptionVariations, creditsVariations] = await Promise.all([
            getProductVariations(subscriptionProductId),
            getProductVariations(creditsProductId)
        ]);

        const subscriptionList = subscriptionVariations.map(variation => {
            const creditAttribute = variation.attributes.find(attr => attr.name.toLowerCase().includes('credit') || attr.name.toLowerCase().includes('crédito'));
            const creditValue = creditAttribute ? parseInt(creditAttribute.option) : 0;
            const price = (variation.regular_price || variation.price) || null;
            return {
                id: variation.id,
                product_type: 'assinatura',
                price: price,
                promotional_price: variation.sale_price || null,
                credito: creditValue,
                description: variation.description || ''
            };
        });

        const creditsList = creditsVariations.map(variation => {
            const creditAttribute = variation.attributes.find(attr => attr.name.toLowerCase().includes('credit') || attr.name.toLowerCase().includes('crédito'));
            const creditValue = creditAttribute ? parseInt(creditAttribute.option) : 0;
            const price = (variation.regular_price || variation.price) || null;
            return {
                id: variation.id,
                product_type: 'recarga',
                price: price,
                promotional_price: variation.sale_price || null,
                credito: creditValue,
                description: variation.description || ''
            };
        });

        res.status(200).json({
            subscriptions: subscriptionList,
            credits: creditsList
        });
    } catch (error) {
        res.status(500).json({ msg: errorToText(error) });
    }
};

/**
 * Estima o custo de geração de texto para ebook
 * POST /api/ebook/generation/estimate
 * Body: { words: number, tier: 'basic'|'medium'|'advanced', contextDepth?: 'minimal'|'moderate'|'full' }
 */
export const estimateGenerationCost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { words, tier, contextDepth } = req.body;
        
        if (!words || words < 100 || words > 5000) {
            res.status(400).json({ msg: 'words deve estar entre 100 e 5000' });
            return;
        }
        
        if (!tier || !['basic', 'medium', 'advanced'].includes(tier)) {
            res.status(400).json({ msg: 'tier deve ser basic, medium ou advanced' });
            return;
        }
        
        const estimate = ebookPricingService.calculateGenerationCost({
            words,
            tier: tier as 'basic' | 'medium' | 'advanced',
            contextDepth: contextDepth || 'moderate'
        });
        
        res.status(200).json({ success: true, estimate });
    } catch (error) {
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Estima o custo de geração de imagens
 * POST /api/ebook/image/estimate
 * Body: { imageCount: number, quality: 'basico'|'medio'|'avancado', imageType?: 'cover'|'internal' }
 */
export const estimateImageCost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { imageCount, quality, imageType } = req.body;
        
        if (!imageCount || imageCount < 1 || imageCount > 10) {
            res.status(400).json({ msg: 'imageCount deve estar entre 1 e 10' });
            return;
        }
        
        if (!quality || !['basico', 'medio', 'avancado'].includes(quality)) {
            res.status(400).json({ msg: 'quality deve ser basico, medio ou avancado' });
            return;
        }
        
        const costPerImage = ebookPricingService.calculateImageCost(
            quality as 'basico' | 'medio' | 'avancado',
            imageType || 'internal'
        );
        
        const totalCredits = costPerImage * imageCount;
        
        res.status(200).json({
            success: true,
            estimate: {
                imageCount,
                quality,
                imageType: imageType || 'internal',
                costPerImage,
                totalCredits,
                description: IMAGE_PRICING[quality as 'basico' | 'medio' | 'avancado'].description
            }
        });
    } catch (error) {
        res.status(500).json({ error: errorToText(error) });
    }
};

/**
 * Estima o custo total de uma seção (texto + imagens opcionais)
 * POST /api/ebook/section/estimate
 * Body: { words, tier, contextDepth?, generateImages?, imageCount?, imageQuality? }
 */
export const estimateSectionCost = async (req: Request, res: Response): Promise<void> => {
    try {
        const { words, tier, contextDepth, generateImages, imageCount, imageQuality } = req.body;
        
        if (!words || words < 100 || words > 5000) {
            res.status(400).json({ msg: 'words deve estar entre 100 e 5000' });
            return;
        }
        
        if (!tier || !['basic', 'medium', 'advanced'].includes(tier)) {
            res.status(400).json({ msg: 'tier deve ser basic, medium ou advanced' });
            return;
        }
        
        // Custo de texto
        const textEstimate = ebookPricingService.calculateGenerationCost({
            words,
            tier: tier as 'basic' | 'medium' | 'advanced',
            contextDepth: contextDepth || 'moderate'
        });
        
        // Custo de imagens (se solicitado)
        let imageEstimate = null;
        if (generateImages && imageCount && imageCount > 0) {
            const quality = imageQuality || 'medio';
            
            if (!['basico', 'medio', 'avancado'].includes(quality)) {
                res.status(400).json({ msg: 'imageQuality deve ser basico, medio ou avancado' });
                return;
            }
            
            const imageCredits = ebookPricingService.calculateMultipleImagesCost(
                imageCount,
                quality as 'basico' | 'medio' | 'avancado',
                'internal'
            );
            
            imageEstimate = {
                credits: imageCredits,
                imageCount,
                quality
            };
        }
        
        const totalCredits = textEstimate.credits + (imageEstimate?.credits || 0);
        const breakdown = imageEstimate
            ? `${textEstimate.credits} créditos (texto) + ${imageEstimate.credits} créditos (${imageCount} imagens)`
            : `${textEstimate.credits} créditos (texto)`;
        
        res.status(200).json({
            success: true,
            estimate: {
                textGeneration: {
                    credits: textEstimate.credits,
                    words: textEstimate.words,
                    tier: textEstimate.tier
                },
                imageGeneration: imageEstimate,
                total: {
                    credits: totalCredits,
                    breakdown
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: errorToText(error) });
    }
};
