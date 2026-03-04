import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BalanceService } from '../../services/balance.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

/**
 * Componente compartilhado de header para ferramentas
 * Exibe navegação, breadcrumb e saldo de créditos
 */
@Component({
  selector: 'app-tool-header',
  templateUrl: './tool-header.component.html',
  styleUrls: ['./tool-header.component.css']
})
export class ToolHeaderComponent implements OnInit, OnDestroy {
  @Input() toolName: string = '';
  @Input() toolDescription?: string;
  
  @Output() creditClicked = new EventEmitter<void>();

  balance: number = 0;
  showCreditWarning: boolean = false;

  private balanceSubscription?: Subscription;
  private authSubscription?: Subscription;

  constructor(
    private router: Router,
    private balanceService: BalanceService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.authService.getAuthenticate()) {
      this.balanceService.refreshBalance();
    }

    // Observar mudanças no saldo
    this.balanceSubscription = this.balanceService.balance$.subscribe(
      balance => {
        this.balance = balance;
        this.showCreditWarning = this.balance < 1;
      }
    );

    // Observar mudanças na autenticação
    this.authSubscription = this.authService.getAuthenticateAsObservable().subscribe(
      authenticated => {
        if (authenticated) {
          this.balanceService.refreshBalance();
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.balanceSubscription) {
      this.balanceSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  goBackToHub(): void {
    this.router.navigate(['/']);
  }

  onCreditClick(): void {
    this.creditClicked.emit();
  }
}
