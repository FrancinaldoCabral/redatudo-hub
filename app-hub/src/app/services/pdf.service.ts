import { Injectable } from '@angular/core'
import { HttpClient, HttpHeaders } from '@angular/common/http'
import { Observable } from 'rxjs'
import html2PDF from 'jspdf-html2canvas'
import env from './env'

@Injectable()
export class PdfService {
    apiUrl: string = env.apiHost
    
    constructor(private http: HttpClient) {}
    
    htmlToPDF(completedHTML:HTMLElement): Promise<any> {
/*         const element = document.createElement('div');
        element.innerHTML = completedHTML; */
        return html2PDF(completedHTML, {
            jsPDF: {
              format: 'a4',
            },
            imageType: 'image/jpeg',
            output: './pdf/generate.pdf'
        })
    }
    fetchHtml(url: string) {
        return this.http.get(url, { responseType: 'text' })
    }
    redirectHtml(url: string) {
        return this.http.get(`${this.apiUrl}/api/fetch-html?url=${url}`)
    }
    generatePdfByHtml(html:string): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/generate-pdf`, { html }/* , {
            responseType: 'arraybuffer', // Indica que a resposta é binária
            headers: new HttpHeaders({
              'Accept': 'application/pdf' // Opcional: informa ao servidor que queremos PDF
            })
        } */)
    }
    generatePdfByUrl(url:string): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/generate-pdf`, { url })
    }
}