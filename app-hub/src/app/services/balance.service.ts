import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HistoricService } from './historic.service';

/**
 * Serviço centralizado de gerenciamento de saldo
 * Mantém o saldo atualizado para todos os componentes
 */
@Injectable({
  providedIn: 'root'
})
export class BalanceService {
  private balanceSubject = new BehaviorSubject<number>(0);
  public balance$: Observable<number> = this.balanceSubject.asObservable();

  constructor(private historicService: HistoricService) {}

  /**
   * Carrega o saldo do servidor e atualiza todos os observadores
   */
  refreshBalance(): void {
    this.historicService.getBalance().subscribe(
      success => {
        const balance = parseFloat(success.balance || '0');
        this.balanceSubject.next(balance);
      },
      error => {
        console.error('Erro ao atualizar saldo:', error);
      }
    );
  }

  /**
   * Retorna o valor atual do saldo (snapshot)
   */
  getCurrentBalance(): number {
    return this.balanceSubject.value;
  }

  /**
   * Subtrai créditos localmente (otimista) antes da confirmação do servidor
   */
  subtractCredits(amount: number): void {
    const current = this.balanceSubject.value;
    this.balanceSubject.next(Math.max(0, current - amount));
  }

  /**
   * Adiciona créditos localmente
   */
  addCredits(amount: number): void {
    const current = this.balanceSubject.value;
    this.balanceSubject.next(current + amount);
  }
}
