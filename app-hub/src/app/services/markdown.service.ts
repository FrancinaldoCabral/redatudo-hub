import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import env from './env'

@Injectable()
export class MarkdownService {
    apiUrl: string = env.apiHost

    constructor(private http: HttpClient) {}

    parse(text: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/markdown`, { text })
    }
    parseMessages(messages: any[]): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/markdown`, { messages })
    }

    
}