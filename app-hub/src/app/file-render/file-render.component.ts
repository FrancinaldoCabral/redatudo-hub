import { Component, Input } from '@angular/core'
import { FileRenderService } from '../services/file-render.service'

@Component({
  selector: 'app-file-render',
  templateUrl: './file-render.component.html',
  styleUrls: ['./file-render.component.css']
})
export class FileRenderComponent {
  @Input() fileUrl: string = ''
  constructor(private fileRenderService: FileRenderService){}
  
  getFileType(url: string): string {
    return this.fileRenderService.getFileType(url)
  }
}
