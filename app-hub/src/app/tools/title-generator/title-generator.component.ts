import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface TitleForm {
  topic: string;
  type: 'livro' | 'blog' | 'youtube' | 'tcc' | 'produto';
  tone: number; // 1-10
  numberOfTitles: number;
}

interface TitleResult {
  id?: string;
  title: string;
  creativity: number;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-title-generator',
  templateUrl: './title-generator.component.html',
  styleUrls: ['./title-generator.component.css']
})
export class TitleGeneratorComponent implements OnInit, OnDestroy {
  // Form data
  form: TitleForm = {
    topic: '',
    type: 'blog',
    tone: 5,
    numberOfTitles: 9
  };

  // State
  results: TitleResult[] = [];
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;
  showUpgradePrompt: boolean = false;

  // Options
  types = [
    { value: 'livro', label: 'Livro' },
    { value: 'blog', label: 'Post Blog' },
    { value: 'youtube', label: 'Vídeo YouTube' },
    { value: 'tcc', label: 'TCC' },
    { value: 'produto', label: 'Produto' }
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
    this.analyticsService.trackToolUsed('title-generator');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.titles) {
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

  generateTitles(): void {
    if (!this.form.topic.trim()) {
      this.toastr.error('Por favor, descreva o tema do seu conteúdo');
      return;
    }

    if (this.balance < 1) {
      this.toastr.error('Créditos insuficientes para gerar títulos');
      this.showUpgradePrompt = true;
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'title-generator');
  }

  private buildPrompt(): string {
    const { topic, type, tone, numberOfTitles } = this.form;

    let prompt = `Gere ${numberOfTitles} títulos criativos para: "${topic}".\n\n`;
    prompt += `Tipo de conteúdo: ${this.getTypeLabel(type)}\n`;
    prompt += `Tom desejado: ${this.getToneLabel(tone)} (nível ${tone}/10)\n\n`;

    prompt += 'Requisitos:\n';
    prompt += '- Cada título deve ser único e impactante\n';
    prompt += '- Considere técnicas de copywriting\n';
    prompt += '- Otimize para curiosidade e engajamento\n';
    prompt += '- Mantenha o tom apropriado para o tipo de conteúdo\n\n';

    prompt += 'Responda APENAS com um JSON válido:\n';
    prompt += '{\n';
    prompt += '  "titles": [\n';
    prompt += '    {"title": "Título exemplo", "creativity": 8},\n';
    prompt += '    {"title": "Outro título", "creativity": 7}\n';
    prompt += '  ]\n';
    prompt += '}';

    return prompt;
  }

  private getTypeLabel(type: string): string {
    const typeObj = this.types.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  private getToneLabel(tone: number): string {
    if (tone <= 3) return 'Formal e conservador';
    if (tone <= 6) return 'Equilibrado e profissional';
    return 'Criativo e ousado';
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.titles && Array.isArray(result.titles)) {
      this.results = result.titles.map((titleData: any, index: number) => ({
        id: `title_${Date.now()}_${index}`,
        title: titleData.title,
        creativity: titleData.creativity || Math.floor(Math.random() * 10) + 1,
        isFavorite: false
      }));

      this.toastr.success(`${this.results.length} títulos gerados com sucesso!`);
      // Não precisa mais chamar fetchBalance() - o BalanceService atualiza automaticamente via socket
      this.analyticsService.trackToolUsed('title-generator', { titlesCount: this.results.length });
    } else {
      this.toastr.error('Formato de resposta inesperado');
      this.analyticsService.trackError('title-generator', 'Invalid response format');
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar títulos. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
      this.showUpgradePrompt = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
    this.analyticsService.trackError('title-generator', errorMessage);
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Título copiado para a área de transferência!');
      this.analyticsService.trackResultCopied('title-generator', 0);
    }).catch(() => {
      this.toastr.error('Erro ao copiar título');
    });
  }

  toggleFavorite(mappedResult: any): void {
    // Converte o ResultItem de volta para TitleResult
    const result: TitleResult = {
      id: mappedResult.id,
      title: mappedResult.content,
      creativity: mappedResult.metadata?.creativity || 5,
      isFavorite: mappedResult.isFavorite
    };

    if (!result.id) return;

    if (result.isFavorite) {
      this.favoritesService.removeFavorite(result.id);
      result.isFavorite = false;
      // Atualiza no array de resultados
      const originalResult = this.results.find(r => r.id === result.id);
      if (originalResult) originalResult.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('title-generator');
      this.toastr.info('Título removido dos favoritos');
    } else {
      this.favoritesService.addFavorite('titulos', result.title, result.title, {
        creativity: result.creativity,
        type: this.form.type,
        tone: this.form.tone
      });
      result.isFavorite = true;
      // Atualiza no array de resultados
      const originalResult = this.results.find(r => r.id === result.id);
      if (originalResult) originalResult.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('title-generator');
      this.toastr.success('Título adicionado aos favoritos!');
    }
  }

  regenerateTitles(): void {
    if (this.balance >= 1) {
      this.generateTitles();
      this.analyticsService.trackRegeneration('title-generator');
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
      this.showUpgradePrompt = true;
    }
  }

  canRegenerate(): boolean {
    return this.balance >= 1 && this.form.topic.trim().length > 0;
  }

  onToneChange(value: number): void {
    this.form.tone = value;
  }

  getToneDescription(): string {
    return this.getToneLabel(this.form.tone);
  }

  // Getters para o template
  get minTone(): number { return 1; }
  get maxTone(): number { return 10; }
  get toneStep(): number { return 1; }

  get mappedResults(): any[] {
    return this.results.map(result => ({
      id: result.id,
      content: result.title,
      title: result.title,
      metadata: { creativity: result.creativity },
      quality: result.creativity * 10, // Converte 1-10 para 10-100
      isFavorite: result.isFavorite
    }));
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
