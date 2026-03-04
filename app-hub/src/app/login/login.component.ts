import { Component, OnInit, OnDestroy } from '@angular/core'
import { AuthService } from '../services/auth.service'
import { Subscription } from 'rxjs'

@Component({
    selector: 'app-login',
    template: `
        <!-- Button trigger modal -->
        <button type="button"
        id="login_button"
        class="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#loginModal">
        </button>

        <!-- Modal - só mostra se não estiver autenticado -->
        <div *ngIf="!isAuthenticated" class="modal fade" id="loginModal" data-bs-backdrop="static"
        data-bs-keyboard="false" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true"
        style="z-index: 100000;">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header text-dark">
                        <h1 class="modal-title fs-5" id="loginModalLabel">Login</h1>
                    </div>
                    <div class="modal-body text-dark">
                        <div *ngIf="errorMessage" class="alert alert-danger" role="alert">
                            {{ errorMessage }}
                        </div>
                        <form (ngSubmit)="login()">
                            <div class="form-group mb-3">
                                <label for="email">Email</label>
                                <input 
                                    type="email" 
                                    class="form-control" 
                                    id="email"
                                    [(ngModel)]="email" 
                                    name="email"
                                    required
                                    placeholder="Digite seu email">
                            </div>
                            <div class="form-group mb-3">
                                <label for="password">Senha</label>
                                <input 
                                    type="password" 
                                    class="form-control" 
                                    id="password"
                                    [(ngModel)]="password" 
                                    name="password"
                                    required
                                    placeholder="Digite sua senha">
                            </div>
                            <div class="form-group mb-3">
                                <div class="form-check">
                                    <input 
                                        type="checkbox" 
                                        class="form-check-input" 
                                        id="rememberMe"
                                        [(ngModel)]="rememberMe"
                                        name="rememberMe">
                                    <label class="form-check-label" for="rememberMe">
                                        Lembrar-me
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <button 
                                    type="submit"
                                    class="btn btn-primary form-control"
                                    [disabled]="isLoading">
                                    {{ isLoading ? 'Entrando...' : 'Entrar' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class LoginComponent implements OnInit, OnDestroy {
    isAuthenticated: boolean = false
    private authSubscription?: Subscription
    
    email: string = ''
    password: string = ''
    rememberMe: boolean = false
    isLoading: boolean = false
    errorMessage: string = ''

    constructor(private authService: AuthService){}

    ngOnInit(): void {
        // Verifica o estado inicial de autenticação
        this.isAuthenticated = this.authService.getAuthenticate()

        // Se inscreve para mudanças no estado de autenticação
        this.authSubscription = this.authService.getAuthenticateAsObservable().subscribe(
            authenticated => {
                this.isAuthenticated = authenticated
                console.log('Authentication state changed:', authenticated)
            }
        )

        // Se não estiver autenticado, tenta buscar o usuário do localStorage
        if (!this.isAuthenticated) {
            this.authService.fetchUser().catch(error => {
                console.log('User not authenticated, showing login modal')
            })
        }
    }

    ngOnDestroy(): void {
        if (this.authSubscription) {
            this.authSubscription.unsubscribe()
        }
    }

    login(): void {
        if (!this.email || !this.password) {
            this.errorMessage = 'Por favor, preencha todos os campos'
            return
        }

        this.isLoading = true
        this.errorMessage = ''
        
        this.authService.loginWithCredentials(this.email, this.password, this.rememberMe).subscribe({
            next: (response) => {
                this.isLoading = false
                // O modal será fechado automaticamente quando o estado de autenticação mudar
                const modalElement = document.getElementById('loginModal')
                if (modalElement) {
                    const modal = (window as any).bootstrap.Modal.getInstance(modalElement)
                    if (modal) {
                        modal.hide()
                    }
                }
            },
            error: (error) => {
                this.isLoading = false
                this.errorMessage = error.message || 'Erro ao fazer login. Verifique suas credenciais.'
                console.error('Login error:', error)
            }
        })
    }
}
