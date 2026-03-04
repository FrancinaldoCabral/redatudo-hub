import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface HumanizerForm {
  originalText: string;
  level: 'leve' | 'medio' | 'agressivo';
  keepTechnicalTerms: boolean;
}

interface HumanizerResult {
  id?: string;
  humanizedText: string;
  aiDetectionBefore: number;
  aiDetectionAfter: number;
  wordsChanged: number;
  totalWords: number;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-ai-humanizer',
  templateUrl: './ai-humanizer.component.html',
  styleUrls: ['./ai-humanizer.component.css']
})
export class AiHumanizerComponent implements OnInit, OnDestroy {
  // Form data
  form: HumanizerForm = {
    originalText: '',
    level: 'medio',
    keepTechnicalTerms: false
  };

  // State
  result: HumanizerResult | null = null;
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;
  showUpgradePrompt: boolean = false;

  // Options
  levels = [
    { value: 'leve', label: 'Leve (30%)', description: 'Humanização sutil' },
    { value: 'medio', label: 'Médio (60%)', description: 'Humanização moderada' },
    { value: 'agressivo', label: 'Agressivo (90%)', description: 'Humanização intensa' }
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
    this.analyticsService.trackToolUsed('ai-humanizer');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.humanizedText) {
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
        this.showCreditWarning = this.balance < 2;
      },
      error => {
        console.log(error);
      }
    );
  }

  humanizeText(): void {
    if (!this.form.originalText.trim()) {
      this.toastr.error('Por favor, cole o texto que deseja humanizar');
      return;
    }

    if (this.balance < 2) {
      this.toastr.error('Créditos insuficientes para humanizar texto');
      this.showUpgradePrompt = true;
      return;
    }

    this.isLoading = true;
    this.result = null;

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'ai-humanizer');
  }

  private buildPrompt(): string {
    const { originalText, level, keepTechnicalTerms } = this.form;

    let prompt = `Humanize o seguinte texto gerado por IA:\n\n"${originalText}"\n\n`;

    prompt += `Nível de humanização: ${this.getLevelLabel(level)}\n`;
    if (keepTechnicalTerms) {
      prompt += 'Mantenha termos técnicos e linguagem especializada.\n';
    }

    prompt += '\nInstruções:\n';
    prompt += '- Reescreva de forma natural, como se fosse escrito por um humano\n';
    prompt += '- Varie a estrutura das frases\n';
    prompt += '- Use linguagem conversacional quando apropriado\n';
    prompt += '- Mantenha o significado original\n';
    prompt += '- Elimine padrões típicos de IA\n\n';

    prompt += 'Responda APENAS com um JSON válido:\n';
    prompt += '{\n';
    prompt += '  "humanizedText": "texto humanizado aqui",\n';
    prompt += '  "aiDetectionBefore": 85,\n';
    prompt += '  "aiDetectionAfter": 12,\n';
    prompt += '  "wordsChanged": 47,\n';
    prompt += '  "totalWords": 120\n';
    prompt += '}';

    return prompt;
  }

  private getLevelLabel(level: string): string {
    const levelObj = this.levels.find(l => l.value === level);
    return levelObj ? levelObj.label : level;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.humanizedText) {
      this.result = {
        id: `humanized_${Date.now()}`,
        humanizedText: result.humanizedText,
        aiDetectionBefore: result.aiDetectionBefore || 85,
        aiDetectionAfter: result.aiDetectionAfter || 15,
        wordsChanged: result.wordsChanged || 0,
        totalWords: result.totalWords || this.form.originalText.split(/\s+/).length,
        isFavorite: false
      };

      this.toastr.success('Texto humanizado com sucesso!');
      this.analyticsService.trackToolUsed('ai-humanizer', {
        level: this.form.level,
        wordsCount: this.result.totalWords
      });
    } else {
      this.toastr.error('Formato de resposta inesperado');
      this.analyticsService.trackError('ai-humanizer', 'Invalid response format');
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao humanizar texto. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
      this.showUpgradePrompt = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
    this.analyticsService.trackError('ai-humanizer', errorMessage);
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Texto copiado para a área de transferência!');
      this.analyticsService.trackResultCopied('ai-humanizer', 0);
    }).catch(() => {
      this.toastr.error('Erro ao copiar texto');
    });
  }

  toggleFavorite(): void {
    if (!this.result) return;

    if (this.result.isFavorite) {
      this.favoritesService.removeFavorite(this.result.id!);
      this.result.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('ai-humanizer');
      this.toastr.info('Texto removido dos favoritos');
    } else {
      this.favoritesService.addFavorite('humanizados', this.result.humanizedText, 'Texto Humanizado', {
        level: this.form.level,
        aiDetectionBefore: this.result.aiDetectionBefore,
        aiDetectionAfter: this.result.aiDetectionAfter,
        wordsChanged: this.result.wordsChanged,
        totalWords: this.result.totalWords
      });
      this.result.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('ai-humanizer');
      this.toastr.success('Texto adicionado aos favoritos!');
    }
  }

  regenerateText(): void {
    if (this.balance >= 2) {
      this.humanizeText();
      this.analyticsService.trackRegeneration('ai-humanizer');
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
      this.showUpgradePrompt = true;
    }
  }

  canRegenerate(): boolean {
    return this.balance >= 2 && this.form.originalText.trim().length > 0;
  }

  swapTexts(): void {
    if (this.result) {
      this.form.originalText = this.result.humanizedText;
      this.result = null;
    }
  }

  onOriginalTextChange(value: string): void {
    this.form.originalText = value;
  }

  onHumanizedTextChange(value: string): void {
    if (this.result) {
      this.result.humanizedText = value;
    }
  }

  // Getters para o template
  get currentLevelDescription(): string {
    const levelObj = this.levels.find(l => l.value === this.form.level);
    return levelObj ? levelObj.description : '';
  }

  get similarityPercentage(): number {
    if (!this.result) return 0;
    return Math.max(0, 100 - this.result.aiDetectionAfter);
  }

  get improvementText(): string {
    if (!this.result) return '';
    const improvement = this.result.aiDetectionBefore - this.result.aiDetectionAfter;
    return `-${improvement}% detecção de IA`;
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
