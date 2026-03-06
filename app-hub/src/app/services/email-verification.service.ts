import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, BehaviorSubject } from 'rxjs'
import env from './env'

export interface EmailVerificationResponse {
  confirmed: boolean
  message?: string
  result?: any
}

export interface ResendCodeResponse {
  result: any
  message: string
}

@Injectable({
  providedIn: 'root'
})
export class EmailVerificationService {
  
  private baseUrl = `${env.apiHost}/api`
  
  /** Subject to track if email verification is needed */
  private emailVerificationNeededSubject = new BehaviorSubject<boolean>(false)
  public emailVerificationNeeded$ = this.emailVerificationNeededSubject.asObservable()
  
  /** Subject to track user email */
  private userEmailSubject = new BehaviorSubject<string>('')
  public userEmail$ = this.userEmailSubject.asObservable()

  constructor(private http: HttpClient) {}

  /**
   * Verify the code sent to user's email
   */
  verifyCode(code: string): Observable<EmailVerificationResponse> {
    return this.http.post<EmailVerificationResponse>(
      `${this.baseUrl}/code-verify`,
      { code }
    )
  }

  /**
   * Resend verification code via standard email
   */
  resendCode(): Observable<ResendCodeResponse> {
    return this.http.post<ResendCodeResponse>(
      `${this.baseUrl}/resend-email`,
      {}
    )
  }

  /**
   * Resend verification code via n8n webhook
   */
  resendCodeViaWebhook(): Observable<ResendCodeResponse> {
    return this.http.post<ResendCodeResponse>(
      `${this.baseUrl}/resend-code`,
      {}
    )
  }

  /**
   * Set that email verification is needed
   */
  setEmailVerificationNeeded(needed: boolean, email: string = ''): void {
    this.emailVerificationNeededSubject.next(needed)
    if (email) {
      this.userEmailSubject.next(email)
    }
  }

  /**
   * Get current email verification status
   */
  isEmailVerificationNeeded(): boolean {
    return this.emailVerificationNeededSubject.value
  }

  /**
   * Get user email
   */
  getUserEmail(): string {
    return this.userEmailSubject.value
  }
}
