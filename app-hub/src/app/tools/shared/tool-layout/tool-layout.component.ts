import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HistoricService } from '../../../services/historic.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tool-layout',
  templateUrl: './tool-layout.component.html',
  styleUrls: ['./tool-layout.component.css']
})
export class ToolLayoutComponent implements OnInit, OnDestroy {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() icon: string = '';
  @Input() creditCost: number = 1;

  balance: number = 0;
  isLoading: boolean = false;
  showCreditWarning: boolean = false;
  private authSubscription?: Subscription;

  constructor(
    private router: Router,
    private historicService: HistoricService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Só busca o balance se já estiver autenticado
    if (this.authService.getAuthenticate()) {
      this.fetchBalance();
    }

    // Se inscreve para mudanças no estado de autenticação
    this.authSubscription = this.authService.getAuthenticateAsObservable().subscribe(
      authenticated => {
        if (authenticated) {
          this.fetchBalance();
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  fetchBalance(): void {
    this.historicService.getBalance().subscribe(
      success => {
        this.balance = parseFloat(success.balance);
        this.showCreditWarning = this.balance < this.creditCost;
      },
      error => {
        console.log(error);
      }
    );
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToCredits(): void {
    // Abrir modal de checkout ou redirecionar para página de créditos
    const modal = document.getElementById('checkoutModal');
    if (modal) {
      modal.classList.add('show');
      modal.style.display = 'block';
    }
  }
}
