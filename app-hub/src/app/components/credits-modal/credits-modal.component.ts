import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { HistoricService } from '../../services/historic.service';
import { Subscription } from 'rxjs';

interface HistoryEntry {
  description: string;
  total: number;
  operation: string;
  createdAt: string;
}

/**
 * Modal que exibe saldo de créditos, opção de compra e histórico
 */
@Component({
  selector: 'app-credits-modal',
  templateUrl: './credits-modal.component.html',
  styleUrls: ['./credits-modal.component.css']
})
export class CreditsModalComponent implements OnInit, OnDestroy {
  @ViewChild('modal') modalElement?: ElementRef;

  balance: number = 0;
  history: HistoryEntry[] = [];
  isLoading: boolean = false;
  isVisible: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private historicService: HistoricService
  ) {}

  ngOnInit(): void {
    // Carrega dados quando abrir o modal
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Abre o modal e carrega saldo + histórico
   */
  open(): void {
    this.isVisible = true;
    this.isLoading = true;
    this.loadData();
  }

  /**
   * Fecha o modal
   */
  close(): void {
    this.isVisible = false;
  }

  /**
   * Carrega saldo e histórico
   */
  private loadData(): void {
    // Carrega saldo
    const balanceSub = this.historicService.getBalance().subscribe(
      success => {
        this.balance = parseFloat(success.balance);
        this.isLoading = false;
      },
      error => {
        console.error('Erro ao carregar saldo:', error);
        this.isLoading = false;
      }
    );

    // Carrega histórico
    const historySub = this.historicService.getHistoric(0, 30).subscribe(
      success => {
        const entries = success?.result || [];
        this.history = entries.map((entry: any) => ({
          description: entry.description || entry.action || 'Operação',
          total: parseFloat(entry.total?.toString() || '0'),
          operation: entry.operation || 'debit',
          createdAt: new Date(entry.createdAt).toLocaleDateString('pt-BR')
        }));
      },
      error => {
        console.error('Erro ao carregar histórico:', error);
      }
    );

    this.subscriptions.push(balanceSub, historySub);
  }

  /**
   * Abre link para comprar créditos
   */
  buyCredits(): void {
    window.open('https://redatudo.online/product/ai-hub-credits/', '_blank');
  }

  /**
   * Fecha modal ao clicar no overlay
   */
  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
