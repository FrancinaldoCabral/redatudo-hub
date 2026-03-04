import { errorToText } from '../../services/axios-errors.service'
import { addLog } from '../../services/audit.service'
import { FilesService } from '../../services/files.service'
import * as uploadService from '../../services/local-bucket-upload.service'
import { QdrantVectorService } from '../../services/qdrant-vector.service'
import { badRequest, successRequest } from '../protocols'
const qdrantService = new QdrantVectorService()
const filesService = new FilesService()
import path from 'path'


const uploadFileController = async (req, res) => {
    
    const { file } = req
    const userId = req.user.id

    try {
        if (!file) badRequest(res, 400, new Error('File is required.'))
        const checkFilesSize = await uploadService.checkFilesSize(userId)
        const userLimitSize = await filesService.checkFileLimit(userId)
        const limit = userLimitSize - checkFilesSize
        if(file.size > limit) badRequest(res, 400, new Error('File upload limit reached.')) 
        const response = await uploadService.uploadFile(file, userId, 'uploads')
        successRequest(res, 201, { url: response })
    } catch (error) {
        await addLog(userId, errorToText(error), {})
        badRequest(res, 500, error)
    }
}

const getFilesController = async (req, res) => {
    const userId = req.user.id
    const offset = parseInt(req.query.offset) || 0
    const limit = parseInt(req.query.limit) || 2
    const fileFilterInput = req.query.fileFilterInput || ''
    const contentTypeFilter = req.query.contentTypeFilter || 'all'
    const locFiles = req.query.locFiles || 'uploads/'

    try {
        const files = await uploadService.listFiles(userId)
        const response = files.map(file => {
            const userFileName = file.name.replace(`public/${userId}/`,'')
            const contentType = path.extname(userFileName)
            return {
                contentType: contentType,
                publicLink: `${uploadService.storageHost}/${uploadService.bucketName}/${file.name}`,
                fileName: userFileName,
                pathName: file.name,
                downloadLink: `${uploadService.storageHost}/${uploadService.bucketName}/${file.name}`,
                size: file.size,
                timeCreated: file.lastModified
            }
        })
        
        const result = filterFiles(response, fileFilterInput, contentTypeFilter, locFiles)

        //console.log('FILES PAGINADOS: ', files.length, response)
        successRequest(res, 200, { files: result.filter((fileFilter:any, index:number, arr:any[])=>{
            return index >= offset && index < offset + limit;
        }), count: result.length, filterFilesType: filterFilesType(response) })
    } catch (error) {
        await addLog(userId, errorToText(error), {})
        badRequest(res, 500, error)
    }
}


function filterFilesType(FILES: any[]): string[] {
    return FILES.map(file=>{return file.contentType}).filter((item, index) => FILES.map(file=>{return file.contentType}).indexOf(item) === index)
}

function filterLocFile(myFiles:any[], locFiles:string):any[]{
    return myFiles.filter(f=>{return f.publicLink.includes(locFiles)})
}

function filterFiles(FILES: any[], fileFilterInput:string, contentTypeFilter:string, locFiles:string): any[]{
    let myFiles
    if(contentTypeFilter === 'all') myFiles = filterLocFile(FILES, locFiles)
    else myFiles = filterLocFile(FILES, locFiles).filter(file=>{return file.contentType === contentTypeFilter})
    if(fileFilterInput.length>0) myFiles = filterLocFile(FILES, locFiles).filter(file=>{return file.fileName.includes(fileFilterInput) || file.contentType.includes(fileFilterInput) || file.publicLink.includes(fileFilterInput)})
    
    return myFiles
}

const deleteFilesController = async (req, res) => {
    const pathName = req.query.pathName
    const userId = req.user.id
    if(!pathName) badRequest(res, 404, new Error('File name is required.'))
    try {
        const result = await uploadService.deleteFile(pathName)

        //REMOVE INDEXES
        const docUrl = `https://bucket-s3-api.redatudo.online/storage/${pathName}`
        await qdrantService.deleteDocs(userId, docUrl)
        successRequest(res, 204, result)
    } catch (error) {
        await addLog(userId, errorToText(error), {})
        badRequest(res, 500, error)
    }
}

export { uploadFileController, getFilesController, deleteFilesController }