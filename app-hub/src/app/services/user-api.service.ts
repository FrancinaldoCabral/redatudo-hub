import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import env from './env'
import { AuthService } from './auth.service'

@Injectable()
export class UserApiService {
    apiUrl: string = env.apiHost

    constructor(private http: HttpClient, private authService: AuthService) {}

    getProvider(providerId:any): Observable<any> {
        return this.http.get(`${this.apiUrl}/api/providers/${providerId}`)
    }
    getProviders(): Observable<any> {
        return this.http.get(`${this.apiUrl}/api/providers`)
    }
    saveAndUpdate(provider:any): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/providers`, provider)
    }
    removeProvider(providerId:any): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/providers/${providerId}`)
    }
    validate(provider:any): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/validate-provider`, provider)
    }
}
