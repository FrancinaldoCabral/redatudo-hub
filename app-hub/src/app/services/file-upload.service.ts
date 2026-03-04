// app.service.ts
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import env from './env'

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {

  apiUrl: string = env.apiHost

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<any> {
    const formData: FormData = new FormData()
    formData.append('file', file, file.name)
    return this.http.post(`${this.apiUrl}/api/file`, formData)
  }

  getFiles(offset:number, limit:number, fileFilterInput:string, contentTypeFilter:string, locFiles:string): Observable<any>{
    return this.http.get(`${this.apiUrl}/api/file?offset=${offset}&limit=${limit}&fileFilterInput=${fileFilterInput}&contentTypeFilter=${contentTypeFilter}&locFiles=${locFiles}`)
  }

  deleteFiles(pathName: string): Observable<any>{
    return this.http.delete(`${this.apiUrl}/api/file?pathName=${pathName}`)
  }

  indexFile(docUrl: string): Observable<any>{
    return this.http.post(`${this.apiUrl}/api/file-index`, { docUrl })
  }

  deleteIndexFile(docUrl: string): Observable<any>{
    return this.http.post(`${this.apiUrl}/api/file-remove`, { docUrl })
  }

  getFilesUrl(): Observable<any>{
    return this.http.get(`${this.apiUrl}/api/file-index`)
  }
}
