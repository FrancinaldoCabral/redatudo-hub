import { Injectable } from '@angular/core'
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http'
import { Observable, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { EmailVerificationService } from '../services/email-verification.service'
import { AuthService } from '../services/auth.service'

/**
 * HTTP Interceptor to handle email verification errors
 * When a 401 error with code 'email_unverified' is received,
 * it shows the email verification modal instead of redirecting to login
 */
@Injectable()
export class EmailVerificationInterceptor implements HttpInterceptor {
  
  constructor(
    private emailVerificationService: EmailVerificationService,
    private authService: AuthService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 errors that require email verification
        if (error.status === 401) {
          const errorResponse = error.error as any
          
          // Check if this is an email verification error
          if (errorResponse?.code === 'email_unverified') {
            const userEmail = this.authService.getEmail?.() || ''
            
            // Show email verification modal
            this.emailVerificationService.setEmailVerificationNeeded(true, userEmail)
            
            // Don't propagate the error - let the modal handle it
            return throwError(() => error)
          }
          
          // Regular authentication error - redirect to login
          if (errorResponse?.code === 'auth') {
            this.authService.logout()
          }
        }
        
        return throwError(() => error)
      })
    )
  }
}
