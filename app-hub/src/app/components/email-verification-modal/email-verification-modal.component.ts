import { Component, OnInit, OnDestroy } from '@angular/core'
import { EmailVerificationService } from '../../services/email-verification.service'
import { ToastrService } from 'ngx-toastr'
import { Subject } from 'rxjs'
import { takeUntil } from 'rxjs/operators'

@Component({
  selector: 'app-email-verification-modal',
  templateUrl: './email-verification-modal.component.html',
  styleUrls: ['./email-verification-modal.component.css']
})
export class EmailVerificationModalComponent implements OnInit, OnDestroy {
  
  isVisible = false
  userEmail = ''
  verificationCode = ''
  isLoading = false
  isResending = false
  resendCountdown = 0
  showResendButton = true
  attemptCount = 0
  maxAttempts = 5
  
  private destroy$ = new Subject<void>()
  private resendTimer: any

  constructor(
    private emailVerificationService: EmailVerificationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Subscribe to email verification needed status
    this.emailVerificationService.emailVerificationNeeded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(needed => {
        this.isVisible = needed
        if (needed) {
          this.userEmail = this.emailVerificationService.getUserEmail()
          this.verificationCode = ''
          this.attemptCount = 0
          this.resetResendButton()
        }
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
    if (this.resendTimer) {
      clearInterval(this.resendTimer)
    }
  }

  /**
   * Submit verification code
   */
  submitCode(): void {
    if (!this.verificationCode.trim()) {
      this.toastr.error('Please enter the verification code')
      return
    }

    if (this.attemptCount >= this.maxAttempts) {
      this.toastr.error('Too many failed attempts. Please resend the code.')
      return
    }

    this.isLoading = true
    this.emailVerificationService.verifyCode(this.verificationCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false
          if (response.confirmed) {
            this.toastr.success('Email verified successfully!')
            this.closeModal()
            // Reload page or navigate to dashboard
            window.location.reload()
          } else {
            this.attemptCount++
            this.toastr.error('Invalid verification code. Please try again.')
            this.verificationCode = ''
          }
        },
        error: (error) => {
          this.isLoading = false
          this.attemptCount++
          const message = error?.error?.msg || 'Failed to verify code'
          this.toastr.error(message)
          this.verificationCode = ''
        }
      })
  }

  /**
   * Resend verification code via webhook
   */
  resendCode(): void {
    if (this.isResending || !this.showResendButton) {
      return
    }

    this.isResending = true
    this.emailVerificationService.resendCodeViaWebhook()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isResending = false
          this.toastr.success('Verification code resent to your email')
          this.startResendCountdown()
          this.verificationCode = ''
          this.attemptCount = 0
        },
        error: (error) => {
          this.isResending = false
          const message = error?.error?.msg || 'Failed to resend code'
          this.toastr.error(message)
        }
      })
  }

  /**
   * Start countdown for resend button
   */
  private startResendCountdown(): void {
    this.showResendButton = false
    this.resendCountdown = 60

    this.resendTimer = setInterval(() => {
      this.resendCountdown--
      if (this.resendCountdown <= 0) {
        clearInterval(this.resendTimer)
        this.showResendButton = true
      }
    }, 1000)
  }

  /**
   * Reset resend button state
   */
  private resetResendButton(): void {
    this.showResendButton = true
    this.resendCountdown = 0
    if (this.resendTimer) {
      clearInterval(this.resendTimer)
    }
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.emailVerificationService.setEmailVerificationNeeded(false)
    this.isVisible = false
  }

  /**
   * Get masked email for display
   */
  getMaskedEmail(): string {
    if (!this.userEmail) return ''
    const [local, domain] = this.userEmail.split('@')
    const maskedLocal = local.substring(0, 2) + '*'.repeat(Math.max(0, local.length - 2))
    return `${maskedLocal}@${domain}`
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    return Math.max(0, this.maxAttempts - this.attemptCount)
  }

  /**
   * Check if code input is valid (basic validation)
   */
  isCodeValid(): boolean {
    return this.verificationCode.trim().length > 0
  }
}
