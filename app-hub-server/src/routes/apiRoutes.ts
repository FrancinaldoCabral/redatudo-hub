// src/routes/apiRoutes.ts

import express, { Request, Response, Router } from 'express'
import cors from 'cors'
import corsOptions from '../config/corsOptions'
import * as middlewares from '../middlewares'
import multer from 'multer'
import * as uploadController from '../controllers/api/upload.controller'
import * as vectorStoreController from '../controllers/api/vector-store.controller'
import { getLlmModels } from '../infra/db/globals.db'
import { errorToText } from '../services/axios-errors.service'
import { getAgents, getTools  } from '../services/tools.service'
import { markDownController } from '../controllers/api/markdown.controller'
import { getBalanceController, getDetailedBalanceController, getHistoricController, initBalanceFree, removeCustomer, updateBalanceWebhook } from '../controllers/api/historic.controller'
import { codeVerifyController, resendEmailVerifyController, sendEmailVerifyController, resendCodeViaWebhookController } from '../controllers/api/email.controller'
import { getUserBalanceController, getUserByEmailController, getUserHistoricController, setUserBalanceController } from '../controllers/api/admin.controller'
import { addProvider, getProvidersController, removeProvider } from '../controllers/api/providers.controller'
import { getPricingEstimates, getFixedPrices, getToolUsageCostAverages, getProductPricing, getToolCostPreview, estimateGenerationCost, estimateImageCost, estimateSectionCost } from '../controllers/api/pricing.controller'
import * as ebookController from '../controllers/api/ebook.controller'
import * as ebookExportController from '../controllers/api/ebook-export.controller'
import { EbookDesignController } from '../controllers/api/ebook-design.controller'
import { addSubscriptionCredits, addAdditionalCredits } from '../controllers/api/subscription.controller'
import * as projectReferenceController from '../controllers/api/project-reference.controller'
import * as tempFileController from '../controllers/api/temp-file.controller'
import path from 'path'
import fs from 'fs'
import { OpenrouterModels } from '../util'
const router = Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

// Diretório onde os PDFs serão armazenados
const PDF_STORAGE_PATH = path.join(__dirname, '..', 'pdf-storage')

// Certifique-se de que o diretório de armazenamento existe
if (!fs.existsSync(PDF_STORAGE_PATH)) {
    fs.mkdirSync(PDF_STORAGE_PATH, { recursive: true })
}

let models: any

async function startModels() {
    const openrouterModels = new OpenrouterModels()
    const result = await openrouterModels.update({ tools: true })
    if (result) models = openrouterModels.models
}
startModels()

router.use('/output-pdf', express.static('output-pdf'))

router.get('/fetch-models', async (req, res) => {
  res.json({ models });
});

router.get('/providers', middlewares.authWebMiddleware, middlewares.emailConfirmed, getProvidersController)
router.post('/providers', middlewares.authWebMiddleware, middlewares.emailConfirmed, addProvider)
router.delete('/providers/:providerId', middlewares.authWebMiddleware, middlewares.emailConfirmed, removeProvider)
//router.use(express.static(path.join(__dirname,'../', 'public')))

router.get('/llm-models', async (req: Request, res: Response) => {
  try {
    const models = getLlmModels()
    res.status(200).json(models)
  } catch (error) {
    res.status(500).json({msg: errorToText(error)})
  }
})

router.get('/tools', async (req: Request, res: Response) => {
  try {
    const allTools = await getTools()
    const result = allTools.map(t=>{ 
      return { 
        title: t.title, 
        description: t.description, 
        icon: t.icon, 
        schema: t.schema 
      }
    })
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({msg: errorToText(error)})
  }
})
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const allTools = await getAgents()
    const result = allTools.map(t=>{return { title: t.title, description: t.description, icon:t.icon, schema:t.schema, toolsNames: t.toolsNames }})
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({msg: errorToText(error)})
  }
})
 
//MANIPULAÇÃO DE ARQUIVOS
router.post('/file', middlewares.authWebMiddleware, middlewares.emailConfirmed, upload.single('file'), uploadController.uploadFileController)
router.get('/file', middlewares.authWebMiddleware, middlewares.emailConfirmed, uploadController.getFilesController)
router.delete('/file', middlewares.authWebMiddleware, middlewares.emailConfirmed, uploadController.deleteFilesController)

//INDEXAÇÃO DE ARQUIVOS
router.post('/file-index', middlewares.authWebMiddleware, middlewares.emailConfirmed, vectorStoreController.addDoc)
router.get('/file-index', middlewares.authWebMiddleware, middlewares.emailConfirmed, vectorStoreController.getFilesUrl)
router.post('/file-remove', middlewares.authWebMiddleware, middlewares.emailConfirmed, vectorStoreController.deleteDocsByUrl)
router.delete('/file-remove', middlewares.authWebMiddleware, middlewares.emailConfirmed, vectorStoreController.deleteDocsByUserId)
router.post('/file-search', middlewares.authWebMiddleware, middlewares.emailConfirmed, vectorStoreController.getDocs)

router.post('/markdown', middlewares.authWebMiddleware, middlewares.emailConfirmed, markDownController)

router.get('/historic', middlewares.authWebMiddleware, middlewares.emailConfirmed, getHistoricController)
router.get('/balance', middlewares.authWebMiddleware, middlewares.emailConfirmed, getBalanceController)
router.get('/balance/detailed', middlewares.authWebMiddleware, middlewares.emailConfirmed, getDetailedBalanceController)

// Pricing endpoints
router.post('/pricing/estimate', getPricingEstimates)
router.get('/pricing/fixed', getFixedPrices)
router.get('/pricing/tool-usage-averages', middlewares.authWebMiddleware, middlewares.emailConfirmed, getToolUsageCostAverages)
router.get('/pricing/products', getProductPricing)
router.post('/tools/cost-preview', middlewares.authWebMiddleware, middlewares.emailConfirmed, getToolCostPreview)

// Ebook cost estimation endpoints (frontend preview)
router.post('/ebook/generation/estimate', middlewares.authWebMiddleware, middlewares.emailConfirmed, estimateGenerationCost)
router.post('/ebook/image/estimate', middlewares.authWebMiddleware, middlewares.emailConfirmed, estimateImageCost)
router.post('/ebook/section/estimate', middlewares.authWebMiddleware, middlewares.emailConfirmed, estimateSectionCost)

// Ebook projects endpoints
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/projects', cors(corsOptions))
router.options('/ebook/projects/:id', cors(corsOptions))
router.options('/ebook/projects/:id/dna', cors(corsOptions))
router.options('/ebook/projects/:id/metadata', cors(corsOptions))
router.options('/ebook/projects/:id/structure', cors(corsOptions))
router.options('/ebook/projects/:id/duplicate', cors(corsOptions))

router.get('/ebook/projects', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.getProjects as unknown as express.RequestHandler)
router.get('/ebook/projects/:id', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.getProject as unknown as express.RequestHandler)
router.post('/ebook/projects', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.createProject as unknown as express.RequestHandler)
router.put('/ebook/projects/:id', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.updateProject as unknown as express.RequestHandler)
router.put('/ebook/projects/:id/dna', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.updateProjectDna as unknown as express.RequestHandler)
router.put('/ebook/projects/:id/metadata', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.updateProjectMetadata as unknown as express.RequestHandler)
router.put('/ebook/projects/:id/structure', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.updateProjectStructure as unknown as express.RequestHandler)
router.delete('/ebook/projects/:id', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.deleteProject as unknown as express.RequestHandler)
router.post('/ebook/projects/:id/duplicate', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.duplicateProject as unknown as express.RequestHandler)

// Ebook project reference files endpoints
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/projects/:projectId/reference-files', cors(corsOptions))
router.options('/ebook/projects/:projectId/reference-files/:fileId', cors(corsOptions))
router.options('/ebook/projects/:projectId/reference-suggestions', cors(corsOptions))

router.get('/ebook/projects/:projectId/reference-files', middlewares.authWebMiddleware, middlewares.emailConfirmed, projectReferenceController.getProjectReferenceFiles as unknown as express.RequestHandler)
router.post('/ebook/projects/:projectId/reference-files', middlewares.authWebMiddleware, middlewares.emailConfirmed, upload.single('file'), projectReferenceController.uploadProjectReferenceFile as unknown as express.RequestHandler)
router.put('/ebook/projects/:projectId/reference-files/:fileId', middlewares.authWebMiddleware, middlewares.emailConfirmed, projectReferenceController.updateProjectReferenceFile as unknown as express.RequestHandler)
router.delete('/ebook/projects/:projectId/reference-files/:fileId', middlewares.authWebMiddleware, middlewares.emailConfirmed, projectReferenceController.deleteProjectReferenceFile as unknown as express.RequestHandler)
router.post('/ebook/projects/:projectId/reference-suggestions', middlewares.authWebMiddleware, middlewares.emailConfirmed, projectReferenceController.getReferenceSuggestions as unknown as express.RequestHandler)

// Ebook temporary file uploads endpoints
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/temp-files', cors(corsOptions))
router.options('/ebook/temp-files/batch', cors(corsOptions))
router.options('/ebook/temp-files/:fileId', cors(corsOptions))

router.post('/ebook/temp-files', middlewares.authWebMiddleware, middlewares.emailConfirmed, upload.single('file'), tempFileController.uploadTempFile as unknown as express.RequestHandler)
router.post('/ebook/temp-files/batch', middlewares.authWebMiddleware, middlewares.emailConfirmed, upload.array('files', 10), tempFileController.uploadTempFiles as unknown as express.RequestHandler)
router.get('/ebook/temp-files/:fileId', middlewares.authWebMiddleware, middlewares.emailConfirmed, tempFileController.getTempFile as unknown as express.RequestHandler)
router.delete('/ebook/temp-files/:fileId', middlewares.authWebMiddleware, middlewares.emailConfirmed, tempFileController.deleteTempFile as unknown as express.RequestHandler)

// Ebook sections endpoints
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/projects/:projectId/sections', cors(corsOptions))
router.options('/ebook/sections/:id', cors(corsOptions))
router.options('/ebook/sections/:id/reorder', cors(corsOptions))
router.options('/ebook/sections/:id/duplicate', cors(corsOptions))

router.get('/ebook/projects/:projectId/sections', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.getSections as unknown as express.RequestHandler)
router.get('/ebook/sections/:id', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.getSection as unknown as express.RequestHandler)
router.post('/ebook/projects/:projectId/sections', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.createSection as unknown as express.RequestHandler)
router.put('/ebook/sections/:id', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.updateSection as unknown as express.RequestHandler)
router.put('/ebook/sections/:id/reorder', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.reorderSection as unknown as express.RequestHandler)
router.delete('/ebook/sections/:id', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.deleteSection as unknown as express.RequestHandler)
router.post('/ebook/sections/:id/duplicate', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.duplicateSection as unknown as express.RequestHandler)

// Ebook images endpoints
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/sections/:sectionId/sync-images', cors(corsOptions))
router.options('/ebook/projects/:projectId/cleanup-orphaned-images', cors(corsOptions))
router.options('/ebook/projects/:projectId/images', cors(corsOptions))
router.options('/ebook/sections/:sectionId/images', cors(corsOptions))
router.options('/ebook/images/:imageId', cors(corsOptions))

router.post('/ebook/sections/:sectionId/sync-images', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.syncSectionImages as unknown as express.RequestHandler)
router.post('/ebook/projects/:projectId/identify-orphaned-images', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.identifyOrphanedImages as unknown as express.RequestHandler)
router.get('/ebook/projects/:projectId/images', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.getProjectImages as unknown as express.RequestHandler)
router.get('/ebook/sections/:sectionId/images', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.getSectionImages as unknown as express.RequestHandler)
router.post('/ebook/sections/:sectionId/images', middlewares.authWebMiddleware, middlewares.emailConfirmed, upload.single('image'), ebookController.uploadSectionImage as unknown as express.RequestHandler)
router.delete('/ebook/images/:imageId', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.removeImage as unknown as express.RequestHandler)

// Ebook generation endpoints (via async jobs/socket)
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/generate/section', cors(corsOptions))
router.options('/ebook/generate/expand', cors(corsOptions))
router.options('/ebook/generate/rewrite', cors(corsOptions))
router.options('/ebook/generate/cover', cors(corsOptions))
router.options('/ebook/generate/image', cors(corsOptions))
router.options('/ebook/projects/:projectId/generate-toc', cors(corsOptions))
router.options('/ebook/sections/:sectionId/save-content', cors(corsOptions))

router.post('/ebook/generate/section', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.generateSection as unknown as express.RequestHandler)
router.post('/ebook/generate/expand', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.expandText as unknown as express.RequestHandler)
router.post('/ebook/generate/rewrite', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.rewriteText as unknown as express.RequestHandler)
router.post('/ebook/generate/cover', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.generateCover as unknown as express.RequestHandler)
router.post('/ebook/generate/image', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.generateImage as unknown as express.RequestHandler)
router.post('/ebook/projects/:projectId/generate-toc', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.generateTableOfContents as unknown as express.RequestHandler)
router.post('/ebook/sections/:sectionId/save-content', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.saveSectionContent as unknown as express.RequestHandler)

// Ebook synopsis generation endpoints
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/projects/:projectId/sections/:sectionId/generate-synopsis', cors(corsOptions))
router.options('/ebook/projects/:projectId/generate-all-synopses', cors(corsOptions))

router.post('/ebook/projects/:projectId/sections/:sectionId/generate-synopsis', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.generateSynopsis as unknown as express.RequestHandler)
router.post('/ebook/projects/:projectId/generate-all-synopses', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookController.generateAllSynopses as unknown as express.RequestHandler)

// Ebook export endpoints
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/projects/:projectId/export', cors(corsOptions))
router.options('/ebook/projects/:projectId/export/estimate', cors(corsOptions))
router.options('/ebook/exports/:jobId/status', cors(corsOptions))
router.options('/ebook/exports/:jobId/download', cors(corsOptions))
router.options('/ebook/exports/history', cors(corsOptions))
router.options('/ebook/export/formats', cors(corsOptions))

router.post('/ebook/projects/:projectId/export', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookExportController.exportEbook as unknown as express.RequestHandler)
router.post('/ebook/projects/:projectId/export/estimate', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookExportController.estimateExportCost as unknown as express.RequestHandler)
router.get('/ebook/exports/:jobId/status', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookExportController.getExportStatus as unknown as express.RequestHandler)
router.get('/ebook/exports/:jobId/download', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookExportController.downloadExportedFile as unknown as express.RequestHandler)
router.get('/ebook/exports/history', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookExportController.getExportHistory as unknown as express.RequestHandler)
router.get('/ebook/export/formats', middlewares.authWebMiddleware, middlewares.emailConfirmed, ebookExportController.getSupportedFormats as unknown as express.RequestHandler)

// PDF to DOCX conversion endpoint
router.post('/convert/pdf-to-docx', middlewares.authWebMiddleware, middlewares.emailConfirmed, upload.single('pdf'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const { EbookFormatConverterService } = await import('../services/ebook-format-converter.service');

    console.log(`🔄 Converting PDF to DOCX: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);

    const docxBuffer = await EbookFormatConverterService.pdfToDOCX(req.file.buffer);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${req.file.originalname.replace('.pdf', '.docx')}"`);
    res.send(docxBuffer);

  } catch (error) {
    console.error('❌ Error converting PDF to DOCX:', error);
    res.status(500).json({ error: 'Failed to convert PDF to DOCX' });
  }
});

// Ebook design endpoints (Hybrid Design System)
// Adiciona tratamento específico de CORS para preflight requests
router.options('/ebook/projects/:id/design/generate', cors(corsOptions))
router.options('/ebook/projects/:id/design/regenerate', cors(corsOptions))
router.options('/ebook/projects/:id/design/modify', cors(corsOptions))
router.options('/ebook/projects/:id/design', cors(corsOptions))
router.options('/ebook/projects/:id/preview', cors(corsOptions))
router.options('/ebook/projects/:id/preview/config', cors(corsOptions))

router.post('/ebook/projects/:id/design/generate', middlewares.authWebMiddleware, middlewares.emailConfirmed, EbookDesignController.generateDesign as unknown as express.RequestHandler)
router.post('/ebook/projects/:id/design/regenerate', middlewares.authWebMiddleware, middlewares.emailConfirmed, EbookDesignController.regenerateDesign as unknown as express.RequestHandler)
router.post('/ebook/projects/:id/design/modify', middlewares.authWebMiddleware, middlewares.emailConfirmed, EbookDesignController.modifyDesign as unknown as express.RequestHandler)
router.get('/ebook/projects/:id/design', middlewares.authWebMiddleware, middlewares.emailConfirmed, EbookDesignController.getDesign as unknown as express.RequestHandler)
router.post('/ebook/projects/:id/preview', middlewares.authWebMiddleware, middlewares.emailConfirmed, EbookDesignController.generatePreview as unknown as express.RequestHandler)
router.get('/ebook/projects/:id/preview/config', middlewares.authWebMiddleware, middlewares.emailConfirmed, EbookDesignController.getPreviewConfig as unknown as express.RequestHandler)
router.delete('/ebook/projects/:id/design', middlewares.authWebMiddleware, middlewares.emailConfirmed, EbookDesignController.deleteDesign as unknown as express.RequestHandler)

// Subscription endpoints
router.post('/subscription/add-credits', middlewares.authWebMiddleware, middlewares.emailConfirmed, addSubscriptionCredits)
router.post('/subscription/add-additional-credits', middlewares.authWebMiddleware, middlewares.emailConfirmed, addAdditionalCredits)

//USER ADMIN
router.get('/historic-system/:id', middlewares.authWebMiddleware, (req, res, next)=>{
    middlewares.allowedFunction(req, res, next, ['administrator'])
}, getUserHistoricController)
router.get('/balance-system/:id', middlewares.authWebMiddleware, (req, res, next)=>{
  middlewares.allowedFunction(req, res, next, ['administrator'])
}, getUserBalanceController)
router.post('/balance-system/:id', middlewares.authWebMiddleware, (req, res, next)=>{
  middlewares.allowedFunction(req, res, next, ['administrator'])
}, setUserBalanceController)
router.post('/user-by-email', middlewares.authWebMiddleware, (req, res, next)=>{
  middlewares.allowedFunction(req, res, next, ['administrator'])
}, getUserByEmailController)

//VERIFICAÇÃO E REENVIO DE EMAIL
router.post('/resend-email', middlewares.authWebMiddleware, resendEmailVerifyController)
router.post('/resend-code', middlewares.authWebMiddleware, resendCodeViaWebhookController)
router.post('/code-verify', middlewares.authWebMiddleware, codeVerifyController)

//WEBHOOKS WOOCOMMERCE/WORDPRESS
const WEBHOOK_SECRET = process.env.WOOCOMMERCE_SECRET
router.post('/remove-customer', removeCustomer)
router.post('/free-balance', initBalanceFree)
router.post('/webhook-order-updated', updateBalanceWebhook)
router.post('/webhook-email-verify', sendEmailVerifyController)


router.use((err: any, req: Request, res: Response, next: any) => {
  // Lida com erros aqui
  console.error(err)
  res.status(500).json({ error: { msg: err.msg } })
})

// Rotas:
router.use('/output-pdf', express.static(path.join(__dirname, '..', 'output-pdf')))

router.get('/fetch-models', async (req: Request, res: Response) => {
    res.json({ models })
})

export default router
