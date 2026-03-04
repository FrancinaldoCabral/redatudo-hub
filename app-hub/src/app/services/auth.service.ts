import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
 
  private authenticate = new BehaviorSubject<boolean>(false)
  user: any = null
  lembrarMe: boolean = false

  constructor(
    private http: HttpClient,
    private activedRouter: ActivatedRoute
  ) { }

  changeLembrarMe(): void {
    this.lembrarMe = !this.lembrarMe
  }

  setLembrarMe(lembreMe: boolean): void {
    this.lembrarMe = lembreMe
  }

  getLembrarMe(): boolean {
    return this.lembrarMe
  }

  lembreMeAqui(): void {
    if(this.lembrarMe){
      window.localStorage.setItem('user', JSON.stringify(this.user))
    }
  }

  setUser(user: any): void {
    this.user = user
    this.lembreMeAqui()
  }

  getUser(): any {
    return this.user
  }

  getAuthenticate(): boolean {
    return this.authenticate.getValue()
  }

  getAuthenticateAsObservable(): Observable<boolean>{
    return this.authenticate.asObservable()
  }

  setAuthenticate(authenticate: boolean): void {
    this.authenticate.next(authenticate)
  }

  getToken(): string {
    return this.user?.token
  }

  async fetchUser(): Promise<boolean> {
    return new Promise((resolve, reject)=>{
      try {
        const storageUser = window.localStorage.getItem('user')
        if(!storageUser) {
          reject(new Error('No user found in localStorage'))
          return
        }

        let user: any = null
        try {
          user = JSON.parse(storageUser)
        } catch (parseError) {
          console.error('Error parsing user from localStorage:', parseError)
          window.localStorage.removeItem('user')
          reject(new Error('Invalid user data in localStorage'))
          return
        }

        if(!user || !user.token) {
          reject(new Error('No token found'))
          return
        }

        // Valida o token
        this.isValidate(user.token).subscribe({
          next: (validationResult) => {
            if(validationResult && validationResult.code === 'jwt_auth_valid_token'){
              // Token válido, busca dados do usuário
              this.me(user.token).subscribe({
                next: (userUpdate) => {
                  try {
                    userUpdate.token = user.token
                    this.setUser(userUpdate)
                    this.setAuthenticate(true)
                    resolve(true)
                  } catch (error) {
                    console.error('Error setting user data:', error)
                    reject(new Error('Error processing user data'))
                  }
                },
                error: (error) => {
                  console.error('Error fetching user data:', error)
                  // Se não conseguir buscar dados do usuário mesmo com token válido, ainda considera autenticado
                  this.setUser(user)
                  this.setAuthenticate(true)
                  resolve(true)
                }
              })
            } else {
              console.error('Token validation failed:', validationResult)
              reject(new Error('Token validation failed'))
            }
          },
          error: (error) => {
            console.error('Token validation error:', error)
            reject(new Error('Token validation error'))
          }
        })
      } catch (error) {
        console.error('Unexpected error in fetchUser:', error)
        reject(error)
      }
    })
  }

      
  isModalActive(modalId:string): boolean {
    const modalElement = document.getElementById(modalId); // Substitua 'modalId' pelo ID do seu modal
    return modalElement?.classList.contains('show') ?? false;
  }

  login(): void {
    if(!this.isModalActive('loginModal')) document.getElementById('login_button')?.click()
  }

  emailShow(): void {
    if(!this.isModalActive('emailVerifyModal')) document.getElementById('email_button')?.click()
  }

  logout(): void {
    this.user = null
    this.authenticate.next(false)
    window.localStorage.clear()
    this.login()
  }

  loginWithCredentials(email: string, password: string, rememberMe: boolean = false): Observable<any> {
    return new Observable((observer) => {
      this.http.post('https://redatudo.online/wp-json/jwt-auth/v1/token', {
        username: email,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).subscribe({
        next: (response: any) => {
          if (response && response.token) {
            // Busca os dados completos do usuário
            this.me(response.token).subscribe({
              next: (userData) => {
                userData.token = response.token
                this.setUser(userData)
                this.setLembrarMe(rememberMe)
                this.lembreMeAqui()
                this.setAuthenticate(true)
                observer.next(userData)
                observer.complete()
              },
              error: (error) => {
                // Se falhar ao buscar dados do usuário, ainda assim autentica com os dados do token
                this.setUser(response)
                this.setLembrarMe(rememberMe)
                this.lembreMeAqui()
                this.setAuthenticate(true)
                observer.next(response)
                observer.complete()
              }
            })
          } else {
            observer.error(new Error('Token não recebido'))
          }
        },
        error: (error) => {
          console.error('Login error:', error)
          observer.error(new Error('Credenciais inválidas'))
        }
      })
    })
  }

  isValidate(token: string): Observable<any> {
    if (!token) {
      console.error('Token is required for validation')
      throw new Error('Token is required')
    }

    console.log('Validating token...')
    return this.http.post('https://redatudo.online/wp-json/jwt-auth/v1/token/validate', {}, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
  }

  me(token: string): Observable<any> {
    if (!token) {
      console.error('Token is required for me endpoint')
      throw new Error('Token is required')
    }

    console.log('Fetching user data...')
    return this.http.get('https://redatudo.online/wp-json/api/v1/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
  }
}
