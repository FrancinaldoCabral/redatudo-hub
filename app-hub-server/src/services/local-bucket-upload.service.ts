import { Client } from 'minio'
import * as uuid from 'uuid'
import PDFDocument from 'pdfkit';

import fs from 'fs'
import path from 'path'

export const bucketName = 'storage'
export const storageHost = process.env.MINIO_SERVER_URL || process.env.APP_BASE_URL || 'http://localhost:5000'

const hasMinio = !!process.env.MINIO_SERVER_HOST && !!process.env.MINIO_ACCESS_KEY && !!process.env.MINIO_SECRET_KEY
let minio: any = undefined
if (hasMinio) {
  minio = new Client({
    endPoint: process.env.MINIO_SERVER_HOST,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    useSSL:true
  })
} else {
  // Ensure local upload dir exists
  const localUploads = path.join(process.cwd(), 'public', 'uploads')
  if (!fs.existsSync(localUploads)) fs.mkdirSync(localUploads, { recursive: true })
}

// 'minio' client is conditionally created above when MinIO env vars exist

const uploadFile = async (file: any, userId: any, dirName: string): Promise<string> => {
    const sanitizedFileName = sanitizeFileName(file.originalname);
    const userDirectory = `public/${userId}/${dirName}`;
    const fileCloudPath = `${userDirectory}/${sanitizedFileName}`;
    
    // Mapeamento de extensões para Content-Types
    const extension = sanitizedFileName.split('.').pop()?.toLowerCase() || '';
    const contentTypeMap: Record<string, string> = {
        // HTML
        'html': 'text/html',
        'htm': 'text/html',
        
        // Office/LibreOffice
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'odt': 'application/vnd.oasis.opendocument.text',
        'ods': 'application/vnd.oasis.opendocument.spreadsheet',
        'odp': 'application/vnd.oasis.opendocument.presentation',
        
        // PDF
        'pdf': 'application/pdf',
        
        // Imagens
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        
        // Texto
        'txt': 'text/plain',
        'csv': 'text/csv',
        
        // JavaScript/CSS
        'js': 'application/javascript',
        'css': 'text/css',
        
        // Compactados
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed'
    };

    const contentType = contentTypeMap[extension] || 'application/octet-stream';

    // Metadados com Content-Type e permissões públicas
    const metaData = {
        'Content-Type': contentType,
    };

      if (hasMinio) {
        // Upload to MinIO
        await minio.putObject(
          bucketName,
          fileCloudPath,
          file.buffer,
          file.size, // tamanho do arquivo
          metaData
        );

        try {
          await minio.setObjectTagging(bucketName, fileCloudPath, {
            acl: 'public-read'
          });
        } catch (e) {
          // ignore tagging errors
        }

        return `${storageHost}/${bucketName}/${fileCloudPath}`;
      } else {
        // Fallback local: save file under public/uploads/{userId}/{dirName}/{filename}
        const baseDir = path.join(process.cwd(), 'public', String(userId), dirName)
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true })
        const outPath = path.join(baseDir, sanitizedFileName)
        fs.writeFileSync(outPath, file.buffer)
        // Return a public URL pointing to the static served path
        return `${storageHost}/${path.posix.join('public', String(userId), dirName, sanitizedFileName)}`;
      }
};

const createAndUploadHtml = async (htmlContent: string, userId: string, fileName: string, directory: string = 'html_pages'): Promise<string> => {
    // 1. Criar um buffer/stream a partir da string HTML
    const FILE_NAME = `${fileName.replace('', '-').toLowerCase()}-${uuid.v4()}`
    const buffer = Buffer.from(htmlContent, 'utf-8');
    
    // 2. Criar um objeto de "arquivo" falso que simula o Multer/Express-fileupload
    const htmlFile = {
        originalname: `${FILE_NAME}.html`, // Nome do arquivo com extensão
        buffer: buffer,                  // Conteúdo do arquivo
        size: buffer.length,             // Tamanho em bytes
        mimetype: 'text/html'            // Tipo MIME
    };
    
    // 3. Usar a função uploadFile existente
    return await uploadFile(htmlFile, userId, directory);
}

const createAndUploadTxt = async (content: string, userId: string, fileName: string, directory: string = 'html_pages'): Promise<string> => {
    // 1. Criar um buffer/stream a partir da string HTML
    const FILE_NAME = `${fileName.replace('', '-').toLowerCase()}-${uuid.v4()}`
    const buffer = Buffer.from(content, 'utf-8');
    
    // 2. Criar um objeto de "arquivo" falso que simula o Multer/Express-fileupload
    const htmlFile = {
        originalname: `${FILE_NAME}.txt`, // Nome do arquivo com extensão
        buffer: buffer,                  // Conteúdo do arquivo
        size: buffer.length,             // Tamanho em bytes
        mimetype: 'text/plain'            // Tipo MIME
    };
    
    // 3. Usar a função uploadFile existente
    return await uploadFile(htmlFile, userId, directory);
}

import puppeteer, { PaperFormat, PDFMargin } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';

const createAndUploadPdf = async (
  htmlContent: string,  // HTML completo com CSS incluso
  format: PaperFormat,
  margin: PDFMargin,
  landscape:boolean,
  userId: string,
  fileName: string,
  directory: string = 'html_pages'
): Promise<string> => {
  const FILE_NAME = `${fileName.replace(/\s+/g, '-').toLowerCase()}-${uuidv4()}`;
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROME_BIN,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security' // Permite carregar recursos externos se necessário
    ]
  });

  const page = await browser.newPage();

  // Configuração para garantir que todos os recursos sejam carregados
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    // Permite todos os tipos de requisição (fontes, imagens, CSS, etc.)
    request.continue();
  });

      // Define o conteúdo HTML e espera pelos recursos
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0', 'domcontentloaded']
    });

    // Espera adicional por fontes customizadas e recursos assíncronos
    await page.evaluate(async () => {
      const selectors = Array.from(document.querySelectorAll('*'));
      await Promise.all(
        selectors.map((selector) => {
          if (window.getComputedStyle(selector).fontFamily.includes('loading')) {
            return new Promise((resolve) => {
              (selector as HTMLElement).addEventListener('load', resolve);
              (selector as HTMLElement).addEventListener('error', resolve);
            });
          }
          return Promise.resolve();
        })
      );
    });

    // Gera o PDF buffer
    const pdfBuffer = await page.pdf({
      format: format,
      printBackground: true,
      margin: margin,
      landscape: landscape,
      preferCSSPageSize: true // Respeita @page no CSS
    });

    await browser.close();

    const pdfFile = {
      originalname: `${FILE_NAME}.pdf`,
      buffer: pdfBuffer,
      size: pdfBuffer.length,
      mimetype: 'application/pdf'
    };

    return await uploadFile(pdfFile, userId, directory);
};

const listFiles = async (userId:any):Promise<any> => {
    const prefix = `public/${userId}/`
    return new Promise(async (resolve, reject)=>{
        const stream = minio.listObjects(bucketName, prefix, true)
        const dataList = []
        stream.on('data', function (data:any) {
            if(data!=undefined) dataList.push(data)
        })
        stream.on('end', function (data:any) {
            resolve(dataList)
        })
        stream.on('error', function (err) {
        //    console.log('err minio: ', err)
            reject(err)
        })

    })
}

const checkFilesSize = async (userId:any): Promise<number> => {
    const files = await listFiles(userId)
    let size: number = 0
    files.forEach(file=>{ size+= file.size})
    return size
}

const deleteFile = async (pathName:string): Promise<any> => {
    //const result = await storage.bucket(bucketName).file(pathName).delete()
    if (hasMinio) {
      const result = await minio.removeObject(bucketName, pathName)
      return result
    } else {
      // pathName expected to be like public/{userId}/{dir}/{file}
      const localPath = path.join(process.cwd(), path.normalize(pathName))
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath)
      return true
    }
}

const sanitizeFileName = (originalFileName: string): string => {
    // Remove acentuação, converte para minúsculas e substitui espaços por "-"
    const sanitizedName = originalFileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-');
  
    return sanitizedName;
}

export { uploadFile, listFiles, deleteFile, sanitizeFileName, checkFilesSize, createAndUploadHtml, createAndUploadTxt, createAndUploadPdf }
  
  
  