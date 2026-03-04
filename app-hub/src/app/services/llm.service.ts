import { HttpClient } from '@angular/common/http'
import { Injectable, OnInit } from '@angular/core'
import { Observable } from 'rxjs'
import env from './env'

@Injectable()
export class ModelService {
    llmsNames: string [] = ['Full', 'Mini', 'Nano']
    //llmsModel: string [] = ['gpt-4-turbo', 'gpt-4o-2024-08-06', 'gpt-4o-mini-2024-07-18', ]
    actualLlmModel: string

    openroutersLlmModels: string [] = []

    constructor(
        private http: HttpClient
    ){
        //this.actualLlmModel =  window.localStorage.getItem('model') || 'Nano'
        //openai/gpt-4.1-nano
        this.actualLlmModel =  window.localStorage.getItem('model') || 'openai/gpt-4.1-nano'
    }

    getOpenrouterModels(supported_parameters?: string[]): Observable<any> {
        let query='?'
        if(supported_parameters && supported_parameters.length>0){
            supported_parameters.forEach(p => query += `${p}=true`)
            return this.http.get(`${env.apiHost}/api/fetch-models${query}`)    
        }
        return this.http.get(`${env.apiHost}/api/fetch-models`)
    }

    getLlmModels(): string [] {
        return this.llmsNames
    }

    getActualModel(): string {
        return this.actualLlmModel
    }

    setCurrentModel(model:string): void {
        window.localStorage.setItem('model', model)
        this.actualLlmModel = model
    }
}