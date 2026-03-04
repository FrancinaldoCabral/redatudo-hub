import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface ConclusionForm {
  introduction: string;
  mainPoints: string[];
  type: 'tcc' | 'artigo' | 'dissertacao' | 'redacao';
  wordCount: number;
  tone: 'neutro' | 'propositivo' | 'critico';
  includeCitation: boolean;
}

interface ConclusionResult {
  id?: string;
  conclusion: string;
  structure: {
    thesis: string;
    synthesis: string;
    closing: string;
    futureResearch?: string;
  };
  isFavorite?: boolean;
}

@Component({
  selector: 'app-academic-conclusion',
  templateUrl: './academic-conclusion.component.html',
  styleUrls: ['./academic-conclusion.component.css']
})
export class AcademicConclusionComponent implements OnInit, OnDestroy {
  // Form data
  form: ConclusionForm = {
    introduction: '',
    mainPoints: [],
    type: 'tcc',
    wordCount: 300,
    tone: 'neutro',
    includeCitation: false
  };

  // State
  result: ConclusionResult | null = null;
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;
  showUpgradePrompt: boolean = false;

  // Types
  types = [
    { value: 'tcc', label: 'TCC (Trabalho de Conclusão de Curso)' },
    { value: 'artigo', label: 'Artigo Científico' },
    { value: 'dissertacao', label: 'Dissertação de Mestrado' },
    { value: 'redacao', label: 'Redação ENEM/Vestibular' }
  ];

  // Tones
  tones = [
    { value: 'neutro', label: 'Neutro e Acadêmico' },
    { value: 'propositivo', label: 'Propositivo e Inovador' },
    { value: 'critico', label: 'Crítico e Reflexivo' }
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
    this.analyticsService.trackToolUsed('academic-conclusion');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.conclusion) {
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

  generateConclusion(): void {
    if (!this.form.introduction.trim()) {
      this.toastr.error('Por favor, cole a introdução do seu trabalho');
      return;
    }

    if (this.form.mainPoints.length === 0) {
      this.toastr.error('Por favor, adicione pelo menos um ponto principal');
      return;
    }

    if (this.balance < 1) {
      this.toastr.error('Créditos insuficientes para gerar conclusão');
      this.showUpgradePrompt = true;
      return;
    }

    this.isLoading = true;
    this.result = null;

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'academic-conclusion');
  }

  private buildPrompt(): string {
    const { introduction, mainPoints, type, wordCount, tone, includeCitation } = this.form;

    let prompt = `Gere uma conclusão acadêmica para ${this.getTypeLabel(type)}.\n\n`;

    prompt += `Introdução do trabalho:\n"${introduction}"\n\n`;

    prompt += `Pontos principais desenvolvidos:\n`;
    mainPoints.forEach((point, index) => {
      prompt += `${index + 1}. ${point}\n`;
    });
    prompt += '\n';

    prompt += `Número de palavras desejado: ${wordCount}\n`;
    prompt += `Tom: ${this.getToneLabel(tone)}\n`;
    if (includeCitation) {
      prompt += 'Inclua uma citação de autor relevante.\n';
    }

    prompt += '\nEstrutura da conclusão:\n';
    prompt += '1. Retomada da tese/objetivo\n';
    prompt += '2. Síntese dos argumentos principais\n';
    prompt += '3. Considerações finais\n';
    if (type !== 'redacao') {
      prompt += '4. Sugestões para pesquisas futuras\n';
    }

    prompt += '\nResponda APENAS com um JSON válido:\n';
    prompt += '{\n';
    prompt += '  "conclusion": "texto da conclusão completo",\n';
    prompt += '  "structure": {\n';
    prompt += '    "thesis": "retomada da tese",\n';
    prompt += '    "synthesis": "síntese dos argumentos",\n';
    prompt += '    "closing": "considerações finais",\n';
    prompt += '    "futureResearch": "sugestões para pesquisas futuras"\n';
    prompt += '  }\n';
    prompt += '}';

    return prompt;
  }

  private getTypeLabel(type: string): string {
    const typeObj = this.types.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  private getToneLabel(tone: string): string {
    const toneObj = this.tones.find(t => t.value === tone);
    return toneObj ? toneObj.label : tone;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.conclusion) {
      this.result = {
        id: `conclusion_${Date.now()}`,
        conclusion: result.conclusion,
        structure: result.structure || {
          thesis: '',
          synthesis: '',
          closing: '',
          futureResearch: ''
        },
        isFavorite: false
      };

      this.toastr.success('Conclusão gerada com sucesso!');

      this.analyticsService.trackToolUsed('academic-conclusion', {
        type: this.form.type,
        wordCount: this.form.wordCount
      });
    } else {
      this.toastr.error('Formato de resposta inesperado');
      this.analyticsService.trackError('academic-conclusion', 'Invalid response format');
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar conclusão. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
      this.showUpgradePrompt = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
    this.analyticsService.trackError('academic-conclusion', errorMessage);
  }

  addMainPoint(point: string): void {
    if (point && !this.form.mainPoints.includes(point)) {
      this.form.mainPoints.push(point);
    }
  }

  removeMainPoint(point: string): void {
    this.form.mainPoints = this.form.mainPoints.filter(p => p !== point);
  }

  onMainPointKeyPress(event: any): void {
    if (event.key === 'Enter') {
      this.addMainPoint(event.target.value);
      event.target.value = '';
    }
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Conclusão copiada para a área de transferência!');
      this.analyticsService.trackResultCopied('academic-conclusion', 0);
    }).catch(() => {
      this.toastr.error('Erro ao copiar conclusão');
    });
  }

  toggleFavorite(): void {
    if (!this.result) return;

    if (this.result.isFavorite) {
      this.favoritesService.removeFavorite(this.result.id!);
      this.result.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('academic-conclusion');
      this.toastr.info('Conclusão removida dos favoritos');
    } else {
      this.favoritesService.addFavorite('conclusoes', this.result.conclusion, 'Conclusão Acadêmica', {
        type: this.form.type,
        wordCount: this.form.wordCount,
        tone: this.form.tone,
        mainPointsCount: this.form.mainPoints.length
      });
      this.result.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('academic-conclusion');
      this.toastr.success('Conclusão adicionada aos favoritos!');
    }
  }

  regenerateConclusion(): void {
    if (this.balance >= 1) {
      this.generateConclusion();
      this.analyticsService.trackRegeneration('academic-conclusion');
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
      this.showUpgradePrompt = true;
    }
  }

  canRegenerate(): boolean {
    return this.balance >= 1 &&
           this.form.introduction.trim().length > 0 &&
           this.form.mainPoints.length > 0;
  }

  // Getters para o template
  get currentTypeLabel(): string {
    return this.getTypeLabel(this.form.type);
  }

  get currentToneLabel(): string {
    return this.getToneLabel(this.form.tone);
  }

  get wordCountRange(): { min: number; max: number } {
    return { min: 150, max: 500 };
  }

  goBackToHub(): void {
    // Navigate back to main hub
    this.router.navigate(['/']);
  }

  rechargeCredits(): void {
    // Open credits recharge modal/page
    this.toastr.info('Redirecionando para recarga de créditos...');
    setTimeout(() => {
      this.router.navigate(['/credits']);
    }, 1000);
  }

  upgradePlan(): void {
    // Open upgrade modal/page
    this.toastr.info('Redirecionando para planos...');
    setTimeout(() => {
      this.router.navigate(['/upgrade']);
    }, 1000);
  }
}
