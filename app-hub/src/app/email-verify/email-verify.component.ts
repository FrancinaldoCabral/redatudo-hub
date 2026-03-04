import { Component } from '@angular/core'
import { AuthService } from '../services/auth.service'
import { EmailService } from '../services/email.service'
import { ToastrService } from 'ngx-toastr'

@Component({ 
    selector: 'app-email-verify', 
    template: `
        <!-- Button trigger modal -->
        <button type="button" 
        id="email_button"
        class="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#emailVerifyModal">
        </button>

        <!-- Modal -->
        <div class="modal fade" id="emailVerifyModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="emailVerifyModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header text-secondary">
                        <h1 class="modal-title fs-5" id="emailVerifyModalLabel">Confirm your email.</h1>
                        <!-- <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button> -->
                    </div>
                    <div class="modal-body text-secondary">
                        <p>
                        We have sent a verification code to the email <strong>{{getEmail()}}</strong> with sender <strong>{{'suporte@redatudo.online'}}</strong>. Paste the code in the field below and click verify.
                        </p>
                        <form>
                            <div class="m-1">
                                <div class="form-floating">
                                    <input type="text" name="yourCode" class="form-control form-control-sm" id="yourCode" #yourCode>
                                    <label for="yourCode" class="form-label">Paste the code</label>
                                </div>
                            </div>
                            <div class="m-1">
                                <button class="form-control form-control-sm btn btn-primary text-center" 
                                style="font-size: small" (click)="codeVerify(yourCode.value)">
                                    <span *ngIf="!codeVerifySpinner">
                                        Verify
                                    </span>
                                    <span *ngIf="codeVerifySpinner">
                                        <div class="spinner-border spinner-border-sm" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        Verify...
                                    </span>
                                </button>
                            </div>
                        </form>
                        <p>
                            Didn't receive the email? 
                            <a class="cursor" (click)="resendEmail()">
                                <span *ngIf="!resendSpinner">
                                    Click here to resend it.
                                </span>
                                <span *ngIf="resendSpinner">
                                    <div class="spinner-border spinner-border-sm" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    Resend...
                                </span>
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    ` 
}) 
export class EmailVerifyComponent {
    resendSpinner: boolean = false
    codeVerifySpinner: boolean = false
    code:string = ''

    constructor(
        private auth: AuthService,
        private emailService: EmailService,
        private toastr: ToastrService
    ){}

    getEmail(): string {
        return this.auth.getUser()?.email
    }
    
    resendEmail(): void {
        this.resendSpinner = true
        this.emailService.emailResend().subscribe(
            success => {
                if(success.result==='OK') this.toastr.success('Email sent.')
                else this.toastr.warning('Sorry. Please try again later.')
                this.resendSpinner = false
            },
            error => {
                this.resendSpinner = false
                console.log(error)
                this.toastr.error('Please contact support.')
            }
        )
    }

    codeVerify(code:string): void {
        this.codeVerifySpinner = true
        this.emailService.codeVerify(code).subscribe(
            success => {
                this.codeVerifySpinner = false
                if(success.confirmed) {
                    this.toastr.success('Email verified successfully.')
                    this.emailService.setConfirmed(success.confirmed)
                    this.closeModal()
                }
                else this.toastr.warning('Sorry. Please wait a moment or resend the email to generate another unique code.')
            },
            error => {
                this.codeVerifySpinner = false
                console.log(error)
                this.toastr.error('Please contact support.')
            }
        )
    }

    closeModal(): void {
        const modalElement = document.getElementById('emailVerifyModal') // Substitua 'modalId' pelo ID do seu modal
        
        // Verifica se o modal está ativo e possui a classe 'show'
        if (modalElement?.classList.contains('show')) {
            modalElement.classList.remove('show'); // Remove a classe 'show'
            modalElement.setAttribute('aria-hidden', 'true'); // Define o atributo 'aria-hidden' como verdadeiro
            modalElement.style.display = 'none'; // Define o estilo display como 'none'
            document.body.classList.remove('modal-open'); // Remove a classe 'modal-open' do body
            document.querySelector('.modal-backdrop')?.remove(); // Remove o backdrop do modal
        }
    }
}