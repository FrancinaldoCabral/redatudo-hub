import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface QuoteForm {
  theme: string;
  style: 'curta' | 'media' | 'com-pergunta' | 'com-emoji';
  count: number;
}

interface MotivationalQuote {
  id?: string;
  text: string;
  theme: string;
  style: string;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-motivational-quotes',
  templateUrl: './motivational-quotes.component.html',
  styleUrls: ['./motivational-quotes.component.css']
})
export class MotivationalQuotesComponent implements OnInit, OnDestroy {
  // Form data
  form: QuoteForm = {
    theme: 'motivacao',
    style: 'media',
    count: 8
  };

  // State
  quotes: MotivationalQuote[] = [];
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;
  showUpgradePrompt: boolean = false;

  // Themes
  themes = [
    { value: 'motivacao', label: 'Motivação Geral', emoji: '💪' },
    { value: 'sucesso', label: 'Sucesso', emoji: '🏆' },
    { value: 'perseveranca', label: 'Perseverança', emoji: '🚀' },
    { value: 'lideranca', label: 'Liderança', emoji: '👑' },
    { value: 'trabalho', label: 'Trabalho', emoji: '💼' },
    { value: 'bem-estar', label: 'Bem-estar', emoji: '🌿' },
    { value: 'financas', label: 'Finanças', emoji: '💰' },
    { value: 'relacionamentos', label: 'Relacionamentos', emoji: '❤️' },
    { value: 'aprendizado', label: 'Aprendizado', emoji: '📚' },
    { value: 'criatividade', label: 'Criatividade', emoji: '🎨' },
    { value: 'mudancas', label: 'Mudanças', emoji: '🔄' },
    { value: 'gratidao', label: 'Gratidão', emoji: '🙏' },
    { value: 'familia', label: 'Família', emoji: '👨‍👩‍👧‍👦' },
    { value: 'amizade', label: 'Amizade', emoji: '👫' },
    { value: 'fe', label: 'Fé', emoji: '✝️' },
    { value: 'esporte', label: 'Esporte', emoji: '⚽' },
    { value: 'empresas', label: 'Empreendedorismo', emoji: '🚀' },
    { value: 'vida', label: 'Vida', emoji: '🌟' }
  ];

  // Styles
  styles = [
    { value: 'curta', label: 'Frase Curta', description: 'Impactante e direta' },
    { value: 'media', label: 'Média', description: 'Balanceada' },
    { value: 'com-pergunta', label: 'Com Pergunta', description: 'Reflexiva' },
    { value: 'com-emoji', label: 'Com Emojis', description: 'Expressiva' }
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
    this.analyticsService.trackToolUsed('motivational-quotes');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.quotes) {
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

  generateQuotes(): void {
    if (this.balance < 1) {
      this.toastr.error('Créditos insuficientes para gerar frases motivacionais');
      this.showUpgradePrompt = true;
      return;
    }

    this.isLoading = true;
    this.quotes = [];

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'motivational-quotes');
  }

  private buildPrompt(): string {
    const { theme, style, count } = this.form;

    let prompt = `Gere ${count} frases motivacionais sobre "${this.getThemeLabel(theme)}".\n\n`;

    prompt += `Estilo: ${this.getStyleLabel(style)}\n\n`;

    prompt += 'Diretrizes:\n';
    prompt += '- Seja inspirador e positivo\n';
    prompt += '- Use linguagem empática\n';
    prompt += '- Foque no empoderamento\n';
    prompt += '- Mantenha autenticidade\n';
    if (style === 'com-emoji') {
      prompt += '- Inclua emojis relevantes\n';
    }
    if (style === 'com-pergunta') {
      prompt += '- Inclua perguntas reflexivas\n';
    }

    prompt += '\nEstrutura cada frase como um JSON:\n';
    prompt += '{\n';
    prompt += '  "quotes": [\n';
    prompt += '    {\n';
    prompt += '      "text": "Frase motivacional aqui",\n';
    prompt += '      "theme": "motivacao",\n';
    prompt += '      "style": "media"\n';
    prompt += '    }\n';
    prompt += '  ]\n';
    prompt += '}';

    return prompt;
  }

  private getThemeLabel(theme: string): string {
    const themeObj = this.themes.find(t => t.value === theme);
    return themeObj ? themeObj.label : theme;
  }

  private getStyleLabel(style: string): string {
    const styleObj = this.styles.find(s => s.value === style);
    return styleObj ? styleObj.label : style;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.quotes && Array.isArray(result.quotes)) {
      this.quotes = result.quotes.map((quoteData: any, index: number) => ({
        id: `quote_${Date.now()}_${index}`,
        text: quoteData.text,
        theme: quoteData.theme || this.form.theme,
        style: quoteData.style || this.form.style,
        isFavorite: false
      }));

      // Trigger animation by resetting quotes array briefly
      setTimeout(() => {
        this.triggerCardAnimation();
      }, 100);

      this.toastr.success(`${this.quotes.length} frases geradas com sucesso!`);

      this.analyticsService.trackToolUsed('motivational-quotes', {
        theme: this.form.theme,
        style: this.form.style,
        count: this.quotes.length
      });
    } else {
      this.toastr.error('Formato de resposta inesperado');
      this.analyticsService.trackError('motivational-quotes', 'Invalid response format');
    }
  }

  private triggerCardAnimation(): void {
    // Force re-render to trigger animations
    this.quotes = [...this.quotes];
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar frases motivacionais. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
      this.showUpgradePrompt = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
    this.analyticsService.trackError('motivational-quotes', errorMessage);
  }

  copyToClipboard(content: string): void {
    this.addButtonClickEffect('copy-btn');
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Frase copiada para a área de transferência!');
      this.analyticsService.trackResultCopied('motivational-quotes', 0);
    }).catch(() => {
      this.toastr.error('Erro ao copiar frase');
    });
  }

  copyAllQuotes(): void {
    const allQuotes = this.quotes.map(q => q.text).join('\n\n');
    navigator.clipboard.writeText(allQuotes).then(() => {
      this.toastr.success('Todas as frases copiadas!');
      this.analyticsService.trackResultCopied('motivational-quotes', this.quotes.length);
    }).catch(() => {
      this.toastr.error('Erro ao copiar frases');
    });
  }

  shareQuote(quote: MotivationalQuote): void {
    this.addButtonClickEffect('share-btn');

    const shareText = `"${quote.text}"\n\nFrase motivacional gerada por RedaTudo AI`;

    if (navigator.share) {
      navigator.share({
        title: 'Frase Motivacional',
        text: shareText,
        url: window.location.href
      }).then(() => {
        this.analyticsService.trackToolUsed('motivational-quotes', { action: 'share' });
      }).catch(() => {
        this.fallbackShare(shareText);
      });
    } else {
      this.fallbackShare(shareText);
    }
  }

  private fallbackShare(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success('Texto copiado! Compartilhe onde desejar.');
      this.analyticsService.trackToolUsed('motivational-quotes', { action: 'share_fallback' });
    }).catch(() => {
      this.toastr.error('Erro ao copiar texto');
    });
  }

  downloadQuotes(): void {
    if (this.quotes.length === 0) return;

    let content = 'Frases Motivacionais\n';
    content += `${this.getThemeLabel(this.form.theme)}\n`;
    content += `${new Date().toLocaleDateString()}\n\n`;

    this.quotes.forEach((quote, index) => {
      content += `${index + 1}. ${quote.text}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frases-motivacionais-${this.form.theme}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    this.toastr.success('Frases baixadas com sucesso!');
  }

  toggleFavorite(quote: MotivationalQuote): void {
    this.addButtonClickEffect('favorite-btn');

    if (!quote.id) return;

    if (quote.isFavorite) {
      this.favoritesService.removeFavorite(quote.id);
      quote.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('motivational-quotes');
      this.toastr.info('Frase removida dos favoritos');
    } else {
      this.favoritesService.addFavorite('frases', quote.text, quote.text, {
        theme: this.form.theme,
        style: this.form.style,
        category: 'motivacional'
      });
      quote.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('motivational-quotes');
      this.toastr.success('Frase adicionada aos favoritos!');
    }
  }

  regenerateQuotes(): void {
    if (this.balance >= 1) {
      this.isLoading = true;
      this.quotes = [];
      this.addButtonClickEffect('regenerate-btn');
      this.generateQuotes();
      this.analyticsService.trackRegeneration('motivational-quotes');
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
      this.showUpgradePrompt = true;
    }
  }

  canRegenerate(): boolean {
    return this.balance >= 1;
  }

  // Getters para o template
  get currentThemeEmoji(): string {
    const themeObj = this.themes.find(t => t.value === this.form.theme);
    return themeObj ? themeObj.emoji : '🌟';
  }

  get currentThemeLabel(): string {
    return this.getThemeLabel(this.form.theme);
  }

  get currentStyleDescription(): string {
    const styleObj = this.styles.find(s => s.value === this.form.style);
    return styleObj ? styleObj.description : '';
  }

  private addButtonClickEffect(buttonClass: string): void {
    // Add visual feedback for button clicks
    const buttons = document.querySelectorAll(`.${buttonClass}`);
    buttons.forEach(button => {
      button.classList.add('clicked');
      setTimeout(() => {
        button.classList.remove('clicked');
      }, 300);
    });
  }

  goBackToHub(): void {
    this.addButtonClickEffect('nav-back-btn');
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 300);
  }

  rechargeCredits(): void {
    this.addButtonClickEffect('credits-recharge-btn');
    this.toastr.info('Redirecionando para recarga de créditos...');
    setTimeout(() => {
      this.router.navigate(['/credits']);
    }, 1000);
  }

  upgradePlan(): void {
    this.addButtonClickEffect('credits-upgrade-btn');
    this.toastr.info('Redirecionando para planos...');
    setTimeout(() => {
      this.router.navigate(['/upgrade']);
    }, 1000);
  }
}
