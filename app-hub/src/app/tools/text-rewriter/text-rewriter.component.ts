import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface RewriteResult {
  content: string;
  originalLength: number;
  rewrittenLength: number;
  changesCount: number;
}

@Component({
  selector: 'app-text-rewriter',
  templateUrl: './text-rewriter.component.html',
  styleUrls: ['./text-rewriter.component.css']
})
export class TextRewriterComponent implements OnInit, OnDestroy {
  // Form data
  form = {
    originalText: '',
    objective: 'parafrasear',
    rewriteLevel: 'medio',
    maintainKeywords: true,
    keywords: ''
  };

  // State
  result: RewriteResult | null = null;
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;

  // Options
  objectives = [
    { value: 'parafrasear', label: 'Parafrasear', description: ' Reescrever mantendo o mesmo significado' },
    { value: 'formalizar', label: 'Formalizar', description: 'Tornar o texto mais profissional e formal' },
    { value: 'simplificar', label: 'Simplificar', description: 'Usar linguagem mais simples e acessível' },
    { value: 'humanizar', label: 'Humanizar IA', description: 'Tornar texto de IA mais natural' },
    { value: 'academico', label: 'Acadêmico', description: 'Adaptar para linguagem acadêmica' },
    { value: 'marketing', label: 'Marketing', description: 'Otimizado para vendas e persuasão' }
  ];

  rewriteLevels = [
    { value: 'leve', label: 'Leve', description: 'Poucas alterações' },
    { value: 'medio', label: 'Médio', description: 'Alterações moderadas' },
    { value: 'intenso', label: 'Intenso', description: 'Reformulação completa' }
  ];

  private authSubscription?: Subscription;

  constructor(
    private router: Router,
    private socketService: SocketService,
    private historicService: HistoricService,
    private toastr: ToastrService,
    private authService: AuthService,
    private favoritesService: FavoritesService,
    private analyticsService: AnalyticsService
  ) {
    this.setupSocketListener();
  }

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

    // Marca ferramenta como usada
    this.analyticsService.trackToolUsed('text-rewriter');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.rewrittenText) {
          this.handleSuccess(response.result.result.content);
        } else if (response.status.toLowerCase() === 'error' || response.status.toLowerCase() === 'failed') {
          this.handleError(response.result);
        }
      },
      error => {
        this.handleError(error);
      }
    );
  }

  fetchBalance(): void {
    this.historicService.getBalance().subscribe(
      success => {
        this.balance = parseFloat(success.balance);
        this.showCreditWarning = this.balance < this.getCreditCost();
      },
      error => {
        console.log(error);
      }
    );
  }

  getCreditCost(): number {
    const textLength = this.form.originalText.length;
    return textLength > 1000 ? 2 : 1;
  }

  rewriteText(): void {
    if (!this.form.originalText.trim()) {
      this.toastr.error('Por favor, insira o texto que deseja reescrever');
      return;
    }

    const creditCost = this.getCreditCost();
    if (this.balance < creditCost) {
      this.toastr.error(`Créditos insuficientes. Esta operação custa ${creditCost} crédito(s)`);
      return;
    }

    this.isLoading = true;
    this.result = null;

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'text-rewriter');
  }

  private buildPrompt(): string {
    const { originalText, objective, rewriteLevel, maintainKeywords, keywords } = this.form;

    let prompt = `Reescreva o seguinte texto com o objetivo de ${this.getObjectiveLabel(objective)}.\n\n`;
    prompt += `Texto original:\n"${originalText}"\n\n`;

    if (objective === 'parafrasear') {
      prompt += `Nível de reformulação: ${this.getRewriteLevelLabel(rewriteLevel)}.\n`;
    }

    if (maintainKeywords && keywords.trim()) {
      prompt += `Mantenha as seguintes palavras-chave: ${keywords}\n`;
    }

    prompt += 'Mantenha o significado original, mas torne o texto único e natural.';

    return prompt;
  }

  private getObjectiveLabel(objective: string): string {
    const obj = this.objectives.find(o => o.value === objective);
    return obj ? obj.label.toLowerCase() : objective;
  }

  private getRewriteLevelLabel(level: string): string {
    const levelObj = this.rewriteLevels.find(l => l.value === level);
    return levelObj ? levelObj.label.toLowerCase() : level;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.rewrittenText) {
      const originalLength = this.form.originalText.length;
      const rewrittenLength = result.rewrittenText.length;
      const changesCount = this.calculateChanges();

      this.result = {
        content: result.rewrittenText,
        originalLength,
        rewrittenLength,
        changesCount
      };

      this.toastr.success('Texto reescrito com sucesso!');
    } else {
      this.toastr.error('Formato de resposta inesperado');
    }
  }

  private calculateChanges(): number {
    // Simples cálculo de mudanças baseado no tamanho
    if (!this.result?.content) return 0;
    const lengthDiff = Math.abs(this.form.originalText.length - this.result.content.length);
    return Math.floor(lengthDiff / 10); // Estimativa simples
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao reescrever texto. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
  }

  copyToClipboard(): void {
    if (this.result) {
      navigator.clipboard.writeText(this.result.content).then(() => {
        this.toastr.success('Texto copiado para a área de transferência!');
      }).catch(() => {
        this.toastr.error('Erro ao copiar texto');
      });
    }
  }

  canRewrite(): boolean {
    return this.form.originalText.trim().length > 0 && this.balance >= this.getCreditCost();
  }

  getTextStats(): { words: number; characters: number; readingTime: number } {
    const words = this.form.originalText.trim().split(/\s+/).length;
    const characters = this.form.originalText.length;
    const readingTime = Math.ceil(words / 200); // Média de 200 palavras por minuto

    return { words, characters, readingTime };
  }

  onTextChange(): void {
    this.showCreditWarning = this.balance < this.getCreditCost();
  }

  getCurrentObjective(): any {
    return this.objectives.find(obj => obj.value === this.form.objective);
  }

  getCurrentRewriteLevel(): any {
    return this.rewriteLevels.find(level => level.value === this.form.rewriteLevel);
  }

  goBackToHub(): void {
    // Navigate back to main hub
    this.router.navigate(['/']);
  }

  rechargeCredits(): void {
    this.toastr.info('Integrar com sistema de recarga de créditos');
  }

  upgradePlan(): void {
    this.toastr.info('Entre em contato para conhecer promoções especiais');
  }
}
