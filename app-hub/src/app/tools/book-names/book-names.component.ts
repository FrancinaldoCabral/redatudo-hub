import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface BookNamesForm {
  plotSummary: string;
  genre: string;
  length: 'curto' | 'medio' | 'longo';
  count: number;
}

interface BookNameResult {
  id?: string;
  title: string;
  subtitle?: string;
  creativityScore: number;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-book-names',
  templateUrl: './book-names.component.html',
  styleUrls: ['./book-names.component.css']
})
export class BookNamesComponent implements OnInit, OnDestroy {
  // Form data
  form: BookNamesForm = {
    plotSummary: '',
    genre: 'geral',
    length: 'medio',
    count: 12
  };

  // State
  results: BookNameResult[] = [];
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;
  showUpgradePrompt: boolean = false;

  // Genres
  genres = [
    { value: 'romance', label: 'Romance', emoji: '❤️' },
    { value: 'fantasia', label: 'Fantasia', emoji: '🧙‍♂️' },
    { value: 'suspense', label: 'Suspense', emoji: '🔪' },
    { value: 'ficcao-cientifica', label: 'Ficção Científica', emoji: '🚀' },
    { value: 'misterio', label: 'Mistério', emoji: '🔍' },
    { value: 'aventura', label: 'Aventura', emoji: '🏔️' },
    { value: 'drama', label: 'Drama', emoji: '🎭' },
    { value: 'terror', label: 'Terror', emoji: '👻' },
    { value: 'biografia', label: 'Biografia', emoji: '📖' },
    { value: 'autoajuda', label: 'Autoajuda', emoji: '💭' },
    { value: 'infantil', label: 'Infantil', emoji: '🧸' },
    { value: 'juvenil', label: 'Juvenil', emoji: '🌟' },
    { value: 'nao-ficcao', label: 'Não Ficção', emoji: '📈' },
    { value: 'historico', label: 'Histórico', emoji: '🏰' },
    { value: 'contemporaneo', label: 'Contemporâneo', emoji: '🌆' },
    { value: 'geral', label: 'Geral', emoji: '📚' }
  ];

  // Length options
  lengths = [
    { value: 'curto', label: '1-3 palavras', description: 'Nomes curtos e impactantes' },
    { value: 'medio', label: '4-7 palavras', description: 'Balanceado e descritivo' },
    { value: 'longo', label: '8+ palavras', description: 'Muito descritivo' }
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
    this.analyticsService.trackToolUsed('book-names');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.bookNames) {
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

  generateBookNames(): void {
    if (!this.form.plotSummary.trim()) {
      this.toastr.error('Por favor, descreva o enredo ou conceito do livro');
      return;
    }

    if (this.balance < 1) {
      this.toastr.error('Créditos insuficientes para gerar nomes de livro');
      this.showUpgradePrompt = true;
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'book-names');
  }

  private buildPrompt(): string {
    const { plotSummary, genre, length, count } = this.form;

    let prompt = `Gere ${count} títulos criativos e únicos para um livro baseado na seguinte descrição:\n\n"${plotSummary}"\n\n`;

    if (genre !== 'geral') {
      prompt += `Gênero: ${this.getGenreLabel(genre)}\n`;
    }

    prompt += `Comprimento desejado: ${this.getLengthLabel(length)}\n\n`;

    prompt += 'Diretrizes para os títulos:\n';
    prompt += '- Sejam únicos e originais\n';
    prompt += '- Refletam bem o tema/conceito\n';
    prompt += '- Tenham apelo comercial\n';
    prompt += '- Incluam alguns títulos principais e outros com subtítulos\n';
    prompt += '- Variem em estilo e tom\n\n';

    prompt += 'Responda APENAS com um JSON válido:\n';
    prompt += '{\n';
    prompt += '  "bookNames": [\n';
    prompt += '    {\n';
    prompt += '      "title": "Título Principal do Livro",\n';
    prompt += '      "subtitle": "Subtítulo opcional aqui",\n';
    prompt += '      "creativityScore": 8\n';
    prompt += '    }\n';
    prompt += '  ]\n';
    prompt += '}';

    return prompt;
  }

  private getGenreLabel(genre: string): string {
    const genreObj = this.genres.find(g => g.value === genre);
    return genreObj ? genreObj.label : genre;
  }

  private getLengthLabel(length: string): string {
    const lengthObj = this.lengths.find(l => l.value === length);
    return lengthObj ? lengthObj.label : length;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.bookNames && Array.isArray(result.bookNames)) {
      this.results = result.bookNames.map((nameData: any, index: number) => ({
        id: `bookname_${Date.now()}_${index}`,
        title: nameData.title,
        subtitle: nameData.subtitle,
        creativityScore: nameData.creativityScore || Math.floor(Math.random() * 6) + 5, // 5-10
        isFavorite: false
      }));

      this.toastr.success(`${this.results.length} nomes de livros gerados com sucesso!`);

      this.analyticsService.trackToolUsed('book-names', {
        genre: this.form.genre,
        count: this.results.length
      });
    } else {
      this.toastr.error('Formato de resposta inesperado');
      this.analyticsService.trackError('book-names', 'Invalid response format');
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar nomes de livros. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
      this.showUpgradePrompt = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
    this.analyticsService.trackError('book-names', errorMessage);
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Nome do livro copiado para a área de transferência!');
      this.analyticsService.trackResultCopied('book-names', 0);
    }).catch(() => {
      this.toastr.error('Erro ao copiar nome do livro');
    });
  }

  copyAllBookNames(): void {
    const allNames = this.results.map(name => `${name.title}${name.subtitle ? ` - ${name.subtitle}` : ''}`).join('\n');
    navigator.clipboard.writeText(allNames).then(() => {
      this.toastr.success('Todos os nomes copiados!');
      this.analyticsService.trackResultCopied('book-names', this.results.length);
    }).catch(() => {
      this.toastr.error('Erro ao copiar nomes');
    });
  }

  downloadBookNames(): void {
    if (this.results.length === 0) return;

    let content = 'Nomes de Livros\n';
    content += `${this.getGenreLabel(this.form.genre)} - ${new Date().toLocaleDateString()}\n\n`;
    content += `Enredo/Conceito: ${this.form.plotSummary}\n\n`;
    content += 'SUGESTÕES:\n\n';

    this.results.forEach((name, index) => {
      content += `${index + 1}. ${name.title}\n`;
      if (name.subtitle) {
        content += `   ${name.subtitle}\n`;
      }
      content += `   Criatividade: ${name.creativityScore}/10\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomes-livro-${this.form.genre}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.toastr.success('Nomes baixados com sucesso!');
  }

  toggleFavorite(bookName: BookNameResult): void {
    if (!bookName.id) return;

    if (bookName.isFavorite) {
      this.favoritesService.removeFavorite(bookName.id);
      bookName.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('book-names');
      this.toastr.info('Nome removido dos favoritos');
    } else {
      this.favoritesService.addFavorite('nomes_livros', `${bookName.title}${bookName.subtitle ? `: ${bookName.subtitle}` : ''}`, bookName.title, {
        subtitle: bookName.subtitle,
        genre: this.form.genre,
        creativityScore: bookName.creativityScore,
        plotSummary: this.form.plotSummary
      });
      bookName.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('book-names');
      this.toastr.success('Nome adicionado aos favoritos!');
    }
  }

  regenerateBookNames(): void {
    if (this.balance >= 1) {
      this.generateBookNames();
      this.analyticsService.trackRegeneration('book-names');
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
      this.showUpgradePrompt = true;
    }
  }

  canRegenerate(): boolean {
    return this.balance >= 1 && this.form.plotSummary.trim().length > 0;
  }

  // Getters para o template
  get currentGenreEmoji(): string {
    const genreObj = this.genres.find(g => g.value === this.form.genre);
    return genreObj ? genreObj.emoji : '📚';
  }

  get currentGenreLabel(): string {
    return this.getGenreLabel(this.form.genre);
  }

  get resultsCount(): number {
    return this.results.length;
  }

  getFilteredResults(): BookNameResult[] {
    return this.results.sort((a, b) => b.creativityScore - a.creativityScore);
  }

  getCreativityEmoji(score: number): string {
    if (score >= 9) return '🔥';
    if (score >= 7) return '⭐';
    if (score >= 5) return '👍';
    return '😕';
  }

  getLengthDescription(): string {
    const lengthObj = this.lengths.find(l => l.value === this.form.length);
    return lengthObj ? lengthObj.description : '';
  }

  goBackToHub(): void {
    this.router.navigate(['/']);
  }

  rechargeCredits(): void {
    this.toastr.info('Redirecionando para recarga de créditos...');
    setTimeout(() => {
      this.router.navigate(['/credits']);
    }, 1000);
  }

  upgradePlan(): void {
    this.toastr.info('Redirecionando para planos...');
    setTimeout(() => {
      this.router.navigate(['/upgrade']);
    }, 1000);
  }
}
