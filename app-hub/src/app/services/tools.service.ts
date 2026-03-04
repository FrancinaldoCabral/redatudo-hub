import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import env from './env'
import { AuthService } from './auth.service'

export interface Tool {
    title:string,
    description:string,
    schema:any
    icon:string
    toolsNames?:string[]
}

@Injectable()
export class ToolsService {
    apiUrl: string = env.apiHost
    actualAgent: string

    constructor(private http: HttpClient, private authService: AuthService) {
        this.actualAgent = window.localStorage.getItem('actualAgent') || 'Assistant'
    }

    getActualAgent(): string {
        return this.actualAgent
    }

    setActualAgent(actualAgent:string): void {
        this.actualAgent = actualAgent
        window.localStorage.setItem('actualAgent', this.actualAgent)
    }

    getTools(): Observable<any> {
        return this.http.get(`${this.apiUrl}/api/tools`)
    }
    getAgents(): Observable<any> {
        return this.http.get(`${this.apiUrl}/api/agents`)
    }
    activateTool(toolName:string): Observable<any> {
        return this.http.put(`${this.apiUrl}/api/activated-tool`, { toolName })
    }
    getActivateTool(): Observable<any> {
        return this.http.get(`${this.apiUrl}/api/activated-tool`)
    }
}
