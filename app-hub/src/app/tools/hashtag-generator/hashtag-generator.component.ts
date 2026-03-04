import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface HashtagForm {
  description: string;
  niche: string;
  competition: 'all' | 'high' | 'medium' | 'low';
  count: number;
}

interface HashtagResult {
  id?: string;
  hashtag: string;
  volume: string;
  relevance: number;
  competition: 'high' | 'medium' | 'low';
  isFavorite?: boolean;
}

@Component({
  selector: 'app-hashtag-generator',
  templateUrl: './hashtag-generator.component.html',
  styleUrls: ['./hashtag-generator.component.css']
})
export class HashtagGeneratorComponent implements OnInit, OnDestroy {
  // Form data
  form: HashtagForm = {
    description: '',
    niche: 'geral',
    competition: 'all',
    count: 30
  };

  // State
  results: HashtagResult[] = [];
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;
  showUpgradePrompt: boolean = false;
  selectedHashtags: string[] = [];

  // Niches
  niches = [
    { value: 'geral', label: 'Geral' },
    { value: 'fitness', label: 'Fitness & Saúde' },
    { value: 'gastronomia', label: 'Gastronomia' },
    { value: 'moda', label: 'Moda & Beleza' },
    { value: 'tecnologia', label: 'Tecnologia' },
    { value: 'negocios', label: 'Negócios' },
    { value: 'viagem', label: 'Viagem' },
    { value: 'arte', label: 'Arte & Design' },
    { value: 'musica', label: 'Música' },
    { value: 'cinema', label: 'Cinema & TV' },
    { value: 'esportes', label: 'Esportes' },
    { value: 'educacao', label: 'Educação' },
    { value: 'sustentabilidade', label: 'Sustentabilidade' },
    { value: 'empreendedorismo', label: 'Empreendedorismo' },
    { value: 'saudemental', label: 'Saúde Mental' }
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
    this.analyticsService.trackToolUsed('hashtag-generator');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.hashtags) {
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
        this.showCreditWarning = this.balance < 0.5;
      },
      error => {
        console.log(error);
      }
    );
  }

  generateHashtags(): void {
    if (!this.form.description.trim()) {
      this.toastr.error('Por favor, descreva seu post ou conteúdo');
      return;
    }

    if (this.balance < 0.5) {
      this.toastr.error('Créditos insuficientes para gerar hashtags');
      this.showUpgradePrompt = true;
      return;
    }

    this.isLoading = true;
    this.results = [];
    this.selectedHashtags = [];

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'hashtag-generator');
  }

  private buildPrompt(): string {
    const { description, niche, count } = this.form;

    let prompt = `Gere ${count} hashtags relevantes para Instagram sobre: "${description}".\n\n`;

    if (niche !== 'geral') {
      prompt += `Nicho: ${this.getNicheLabel(niche)}\n`;
    }

    prompt += 'Distribua as hashtags em:\n';
    prompt += '- 10 hashtags de alta concorrência (100k+ posts)\n';
    prompt += '- 10 hashtags de média concorrência (10k-100k posts)\n';
    prompt += '- 10 hashtags de baixa concorrência (<10k posts)\n\n';

    prompt += 'Para cada hashtag inclua:\n';
    prompt += '- Volume estimado de posts\n';
    prompt += '- Nível de concorrência\n';
    prompt += '- Score de relevância (1-10)\n\n';

    prompt += 'Responda APENAS com um JSON válido:\n';
    prompt += '{\n';
    prompt += '  "hashtags": [\n';
    prompt += '    {\n';
    prompt += '      "hashtag": "#exemplo",\n';
    prompt += '      "volume": "150k",\n';
    prompt += '      "competition": "high",\n';
    prompt += '      "relevance": 8\n';
    prompt += '    }\n';
    prompt += '  ]\n';
    prompt += '}';

    return prompt;
  }

  private getNicheLabel(niche: string): string {
    const nicheObj = this.niches.find(n => n.value === niche);
    return nicheObj ? nicheObj.label : niche;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.hashtags && Array.isArray(result.hashtags)) {
      this.results = result.hashtags.map((hashtagData: any, index: number) => ({
        id: `hashtag_${Date.now()}_${index}`,
        hashtag: hashtagData.hashtag,
        volume: hashtagData.volume || '10k',
        relevance: hashtagData.relevance || Math.floor(Math.random() * 10) + 1,
        competition: hashtagData.competition || 'medium',
        isFavorite: false
      }));

      this.toastr.success(`${this.results.length} hashtags geradas com sucesso!`);
      this.analyticsService.trackToolUsed('hashtag-generator', {
        niche: this.form.niche,
        count: this.results.length
      });
    } else {
      this.toastr.error('Formato de resposta inesperado');
      this.analyticsService.trackError('hashtag-generator', 'Invalid response format');
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar hashtags. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
      this.showUpgradePrompt = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
    this.analyticsService.trackError('hashtag-generator', errorMessage);
  }

  toggleHashtagSelection(hashtag: string): void {
    const index = this.selectedHashtags.indexOf(hashtag);
    if (index > -1) {
      this.selectedHashtags.splice(index, 1);
    } else if (this.selectedHashtags.length < 30) {
      this.selectedHashtags.push(hashtag);
    }
  }

  isHashtagSelected(hashtag: string): boolean {
    return this.selectedHashtags.includes(hashtag);
  }

  copySelectedHashtags(): void {
    if (this.selectedHashtags.length === 0) {
      this.toastr.warning('Selecione pelo menos uma hashtag para copiar');
      return;
    }

    const hashtagsText = this.selectedHashtags.join(' ');
    navigator.clipboard.writeText(hashtagsText).then(() => {
      this.toastr.success(`${this.selectedHashtags.length} hashtags copiadas!`);
      this.analyticsService.trackResultCopied('hashtag-generator', this.selectedHashtags.length);
    }).catch(() => {
      this.toastr.error('Erro ao copiar hashtags');
    });
  }

  copyAllHashtags(): void {
    const allHashtags = this.results.map(h => h.hashtag).join(' ');
    navigator.clipboard.writeText(allHashtags).then(() => {
      this.toastr.success('Todas as hashtags copiadas!');
      this.analyticsService.trackResultCopied('hashtag-generator', this.results.length);
    }).catch(() => {
      this.toastr.error('Erro ao copiar hashtags');
    });
  }

  toggleFavorite(result: HashtagResult): void {
    if (!result.id) return;

    if (result.isFavorite) {
      this.favoritesService.removeFavorite(result.id);
      result.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('hashtag-generator');
      this.toastr.info('Hashtag removida dos favoritos');
    } else {
      this.favoritesService.addFavorite('hashtags', result.hashtag, result.hashtag, {
        volume: result.volume,
        competition: result.competition,
        relevance: result.relevance,
        niche: this.form.niche
      });
      result.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('hashtag-generator');
      this.toastr.success('Hashtag adicionada aos favoritos!');
    }
  }

  regenerateHashtags(): void {
    if (this.balance >= 0.5) {
      this.generateHashtags();
      this.analyticsService.trackRegeneration('hashtag-generator');
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
      this.showUpgradePrompt = true;
    }
  }

  canRegenerate(): boolean {
    return this.balance >= 0.5 && this.form.description.trim().length > 0;
  }

  // Getters para o template
  get getHighCompetitionHashtags(): HashtagResult[] {
    return this.results.filter(h => h.competition === 'high');
  }

  get getMediumCompetitionHashtags(): HashtagResult[] {
    return this.results.filter(h => h.competition === 'medium');
  }

  get getLowCompetitionHashtags(): HashtagResult[] {
    return this.results.filter(h => h.competition === 'low');
  }

  get getSelectedCount(): number {
    return this.selectedHashtags.length;
  }



  get canCopySelected(): boolean {
    return this.selectedHashtags.length > 0;
  }

  getFilteredHashtags(): HashtagResult[] {
    if (this.form.competition === 'all') {
      return this.results;
    }
    return this.results.filter(h => h.competition === this.form.competition);
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
