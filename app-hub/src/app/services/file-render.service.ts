import { Injectable, OnInit } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileRenderService {
    getFileType(url: string): string {
        const extension = url.split('.').pop()?.toLowerCase()
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico']
        const videoExtensions = ['mp4', 'webm', 'ogg']
        const audioExtensions = ['mp3', 'wav', 'ogg']
        const pdfExtensions = ['pdf']
        const textExtensions = ['txt']
        const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'odt', 'ods', 'ods', 'odp', 'odp']
        const htmlExtensions = ['html']
        if (imageExtensions.includes(extension!)) return 'image'
        if (videoExtensions.includes(extension!)) return 'video'
        if (audioExtensions.includes(extension!)) return 'audio'
        if (pdfExtensions.includes(extension!)) return 'pdf'
        if (textExtensions.includes(extension!)) return 'text'
        if (officeExtensions.includes(extension!)) return 'office'
        if (htmlExtensions.includes(extension!)) return 'html'
    
        return 'unknown'
    }

    getIconByTypeFile(type: string): string {
        let imageExcessions = ['.webp', '.tiff']
        if(type){
            if(imageExcessions.includes(type)) return `bi bi-image-alt`
            return `bi bi-filetype${type.replace('.', '-')}`
        }else{
            return `bi bi-files-alt`
        }
    }
}