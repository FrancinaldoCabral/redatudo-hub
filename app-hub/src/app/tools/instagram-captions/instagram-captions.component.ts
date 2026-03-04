import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface CaptionResult {
  content: string;
  hashtags?: string;
  cta?: string;
  characterCount: number;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-instagram-captions',
  templateUrl: './instagram-captions.component.html',
  styleUrls: ['./instagram-captions.component.css']
})
export class InstagramCaptionsComponent implements OnInit, OnDestroy {
  // Form data
  form = {
    topic: '',
    niche: 'geral',
    tone: 'profissional',
    includeHashtags: true,
    includeCTA: true,
    numberOfCaptions: 3
  };

  // State
  results: CaptionResult[] = [];
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;

  // Options
  niches = [
    { value: 'geral', label: 'Geral' },
    { value: 'fitness', label: 'Fitness & Saúde' },
    { value: 'gastronomia', label: 'Gastronomia' },
    { value: 'moda', label: 'Moda & Beleza' },
    { value: 'tecnologia', label: 'Tecnologia' },
    { value: 'negocios', label: 'Negócios' },
    { value: 'viagem', label: 'Viagem' },
    { value: 'arte', label: 'Arte & Design' }
  ];

  tones = [
    { value: 'profissional', label: 'Profissional' },
    { value: 'casual', label: 'Casual' },
    { value: 'engraçado', label: 'Engraçado' },
    { value: 'inspirador', label: 'Inspirador' },
    { value: 'vendas', label: 'Foco em Vendas' },
    { value: 'educativo', label: 'Educativo' }
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
    this.analyticsService.trackToolUsed('instagram-captions');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.captions) {
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
        this.showCreditWarning = this.balance < 1;
      },
      error => {
        console.log(error);
      }
    );
  }

  generateCaptions(): void {
    if (!this.form.topic.trim()) {
      this.toastr.error('Por favor, descreva o tema da sua postagem');
      return;
    }

    if (this.balance < 1) {
      this.toastr.error('Créditos insuficientes para gerar legendas');
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'instagram-captions');
  }

  private buildPrompt(): string {
    const { topic, niche, tone, includeHashtags, includeCTA, numberOfCaptions } = this.form;

    let prompt = `Crie ${numberOfCaptions} legendas para Instagram sobre: "${topic}".`;

    if (niche !== 'geral') {
      prompt += ` Nicho: ${this.getNicheLabel(niche)}.`;
    }

    prompt += ` Tom: ${this.getToneLabel(tone)}.`;

    if (includeHashtags) {
      prompt += ' Inclua hashtags relevantes no final de cada legenda.';
    }

    if (includeCTA) {
      prompt += ' Inclua uma chamada para ação (CTA) em cada legenda.';
    }

    prompt += ' Cada legenda deve ser única e ter no máximo 2200 caracteres (limite do Instagram).';

    return prompt;
  }

  private getNicheLabel(niche: string): string {
    const nicheObj = this.niches.find(n => n.value === niche);
    return nicheObj ? nicheObj.label : niche;
  }

  private getToneLabel(tone: string): string {
    const toneObj = this.tones.find(t => t.value === tone);
    return toneObj ? toneObj.label : tone;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.captions && Array.isArray(result.captions)) {
      this.results = result.captions.map((caption: string, index: number) => ({
        content: caption,
        characterCount: caption.length,
        isFavorite: false
      }));

      this.toastr.success(`${this.results.length} legendas geradas com sucesso!`);
    } else {
      this.toastr.error('Formato de resposta inesperado');
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar legendas. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Legenda copiada para a área de transferência!');
      this.analyticsService.trackResultCopied('instagram-captions', 0);
    }).catch(() => {
      this.toastr.error('Erro ao copiar legenda');
    });
  }

  toggleFavorite(result: CaptionResult, index: number): void {
    const favoriteId = `caption_${Date.now()}_${index}`;

    if (result.isFavorite) {
      this.favoritesService.removeFavorite(favoriteId);
      result.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('instagram-captions');
      this.toastr.info('Legenda removida dos favoritos');
    } else {
      this.favoritesService.addFavorite('legendas', result.content, result.content, {
        niche: this.form.niche,
        tone: this.form.tone,
        characterCount: result.characterCount
      });
      result.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('instagram-captions');
      this.toastr.success('Legenda adicionada aos favoritos!');
    }
  }

  regenerateCaptions(): void {
    if (this.balance >= 1) {
      this.generateCaptions();
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
    }
  }

  canRegenerate(): boolean {
    return this.balance >= 1 && this.form.topic.trim().length > 0;
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
