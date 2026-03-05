import { Component, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthService } from './services/auth.service'
import { SocketService } from './services/socket.service'
import { NgxSpinnerService } from 'ngx-spinner'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private socketService: SocketService,
    private spinner: NgxSpinnerService,
    private route: ActivatedRoute,
    private router: Router
  ){}

  ngOnInit(): void {
    // Se vier um token via query param ?token=..., salvar no localStorage e limpar URL
    const tokenParam = this.route.snapshot.queryParams['token']
    if (tokenParam) {
      window.localStorage.setItem('user', JSON.stringify({ token: tokenParam }))
      this.router.navigate([], { queryParams: {}, replaceUrl: true })
    }

    this.fetchUser()
  }

  fetchUser(): void {
    this.spinner.show()
    this.auth.fetchUser()
      .then(success => {
        if (success) {
          this.socketService.setupSocketConnection()
          this.spinner.hide()
        } else {
          this.spinner.hide()
        }
      })
      .catch(_error => {
        this.spinner.hide()
        // Token inválido ou ausente → redirecionar para login externo
        window.location.href = 'https://redatudo.online/minha-conta?app_login=hub'
      })
      .finally(() => {
        this.spinner.hide()
      })
  }
}
