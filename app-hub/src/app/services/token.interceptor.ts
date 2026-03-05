import { HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest, HttpErrorResponse} from '@angular/common/http'
import { Injectable } from '@angular/core'
import { catchError, Observable, tap, throwError } from 'rxjs'
import { AuthService } from './auth.service'

 
@Injectable()
export class TokenInterceptor implements HttpInterceptor {
    constructor(private auth: AuthService){}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
       // All HTTP requests are going to go through this method
        console.log('TokenInterceptor - Request URL:', req.url)
        console.log('TokenInterceptor - User authenticated:', this.auth.getAuthenticate())
        console.log('TokenInterceptor - Has token:', !!this.auth.getToken())

        if(this.auth.getAuthenticate() && this.auth.getUser() && this.auth.getToken()){
            console.log('TokenInterceptor - Adding token to request')
            const authReq = req.clone({
                headers: new HttpHeaders({
                'Authorization': `Bearer ${this.auth.getToken()}`
                })
            })
            console.log('TokenInterceptor - Token added:', this.auth.getToken().substring(0, 20) + '...')
            return next.handle(authReq).pipe(
                catchError((errorResponse: HttpErrorResponse) => {
                  if(errorResponse.status === 401 && errorResponse.error.code === 'auth') {
                    window.location.href = 'https://redatudo.online/minha-conta?login_app=hub'
                    return throwError(() => errorResponse.error.msg)
                  }else if(errorResponse.status === 401 && errorResponse.error.code === 'email'){
                    this.auth.emailShow()
                    return throwError(() => errorResponse.error.msg)
                  }else{
                    return throwError(() => errorResponse.error.msg)
                  }
                })
            )
        }else{
            return next.handle(req)
        }
    }
}
