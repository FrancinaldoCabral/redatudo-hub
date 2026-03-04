import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

// Interfaces para tipagem forte
interface AbntForm {
  text: string;
  mode: 'academico' | 'formal' | 'casual';
  checkCitations: boolean;
  checkFormatting: boolean;
  checkGrammar: boolean;
}

interface Correction {
  type: 'ortografia' | 'gramatica' | 'abnt' | 'melhoria';
  original: string;
  suggestion: string;
  explanation: string;
  position: number;
}

interface AbntResult {
  id?: string;
  correctedText: string;
  errors: Correction[];
  qualityScore: number;
  abntCompliant: boolean;
  isFavorite?: boolean;
}

// Configuração dos modos de correção
const CORRECTION_MODES = [
  { value: 'academico', label: 'Acadêmico', description: 'Correção completa para trabalhos acadêmicos' },
  { value: 'formal', label: 'Formal', description: 'Linguagem profissional e corporativa' },
  { value: 'casual', label: 'Casual', description: 'Texto descontraído e acessível' }
];

@Component({
  selector: 'app-abnt-corrector',
  templateUrl: './abnt-corrector.component.html',
  styleUrls: ['./abnt-corrector.component.css']
})
export class AbntCorrectorComponent implements OnInit, OnDestroy {
  // Dados do formulário
  form: AbntForm = {
    text: '',
    mode: 'academico',
    checkCitations: true,
    checkFormatting: true,
    checkGrammar: true
  };

  // Estado da aplicação
  result: AbntResult | null = null;
  isLoading = false;
  balance = 0;
  modes = CORRECTION_MODES;

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
    if (this.authService.getAuthenticate()) {
      this.fetchBalance();
    }

    this.authSubscription = this.authService.getAuthenticateAsObservable().subscribe(
      authenticated => {
        if (authenticated) this.fetchBalance();
      }
    );

    this.analyticsService.trackToolUsed('abnt-corrector');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe({
      next: (response) => {
        const status = response.status.toLowerCase();
        
        if (status === 'completed' && response.result?.result?.content?.correctedText) {
          this.handleSuccess(response.result.result.content);
        } else if (status === 'error' || status === 'failed') {
          this.handleError(response.result);
        }
      },
      error: (error) => this.handleError(error)
    });
  }

  fetchBalance(): void {
    this.historicService.getBalance().subscribe({
      next: (success) => this.balance = parseFloat(success.balance),
      error: (error) => console.error('Erro ao buscar saldo:', error)
    });
  }

  correctText(): void {
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.result = null;

    const messages = [{ role: 'user', content: this.buildPrompt() }];
    this.socketService.sendMessage(messages, 'auto', 'abnt-corrector');
  }

  private validateForm(): boolean {
    if (!this.form.text.trim()) {
      this.toastr.error('Por favor, insira o texto que deseja corrigir');
      return false;
    }

    if (this.balance < 1) {
      this.toastr.error('Créditos insuficientes para corrigir texto');
      return false;
    }

    return true;
  }

  private buildPrompt(): string {
    const { text, mode, checkCitations, checkFormatting, checkGrammar } = this.form;
    const modeLabel = this.modes.find(m => m.value === mode)?.label || mode;

    const checks = [
      checkGrammar && '✓ Ortografia e gramática',
      checkCitations && '✓ Citações e referências ABNT',
      checkFormatting && '✓ Formatação acadêmica',
      '✓ Melhores práticas de redação'
    ].filter(Boolean).join('\n');

    return `Corrija o seguinte texto segundo as normas ABNT e português brasileiro:

"${text}"

Modo: ${modeLabel}

Verificações a realizar:
${checks}

Para cada correção encontrada, forneça:
- Tipo de erro (ortografia, gramatica, abnt, melhoria)
- Texto original
- Sugestão de correção
- Explicação da correção

Responda APENAS com um JSON válido:
{
  "correctedText": "texto corrigido completo",
  "errors": [
    {
      "type": "ortografia",
      "original": "texto errado",
      "suggestion": "texto correto",
      "explanation": "explicação da correção"
    }
  ],
  "qualityScore": 85,
  "abntCompliant": true
}`;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (!result.correctedText) {
      this.toastr.error('Formato de resposta inesperado');
      this.analyticsService.trackError('abnt-corrector', 'Invalid response format');
      return;
    }

    this.result = {
      id: `abnt_${Date.now()}`,
      correctedText: result.correctedText,
      errors: result.errors || [],
      qualityScore: result.qualityScore || 85,
      abntCompliant: result.abntCompliant || false,
      isFavorite: false
    };

    this.toastr.success('Texto corrigido com sucesso!');
    this.analyticsService.trackToolUsed('abnt-corrector', {
      mode: this.form.mode,
      errorsCount: this.result.errors.length
    });
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.error('Erro ao corrigir texto:', error);

    const errorMessage = this.getErrorMessage(error);
    this.toastr.error(errorMessage);
    this.analyticsService.trackError('abnt-corrector', errorMessage);
  }

  private getErrorMessage(error: any): string {
    if (error?.msg?.includes('no credit')) {
      return 'Créditos insuficientes. Adicione mais créditos para continuar.';
    }
    if (error?.msg?.includes('API key')) {
      return 'Erro na chave da API. Contate o suporte.';
    }
    return 'Erro ao corrigir texto. Tente novamente.';
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content)
      .then(() => {
        this.toastr.success('Texto copiado!');
        this.analyticsService.trackResultCopied('abnt-corrector', 0);
      })
      .catch(() => this.toastr.error('Erro ao copiar texto'));
  }

  toggleFavorite(): void {
    if (!this.result) return;

    if (this.result.isFavorite) {
      this.favoritesService.removeFavorite(this.result.id!);
      this.result.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('abnt-corrector');
      this.toastr.info('Texto removido dos favoritos');
    } else {
      this.favoritesService.addFavorite('corretor', this.result.correctedText, 'Texto Corrigido ABNT', {
        mode: this.form.mode,
        qualityScore: this.result.qualityScore,
        abntCompliant: this.result.abntCompliant,
        errorsCount: this.result.errors.length
      });
      this.result.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('abnt-corrector');
      this.toastr.success('Texto adicionado aos favoritos!');
    }
  }

  regenerateText(): void {
    if (!this.canRegenerate()) {
      this.toastr.error('Créditos insuficientes para corrigir novamente');
      return;
    }
    
    this.correctText();
    this.analyticsService.trackRegeneration('abnt-corrector');
  }

  canRegenerate(): boolean {
    return this.balance >= 1 && this.form.text.trim().length > 0;
  }

  // Propriedades calculadas para o template
  get errorCount(): number {
    return this.result?.errors.length || 0;
  }

  get qualityColor(): string {
    if (!this.result) return '#6b7280';
    const score = this.result.qualityScore;
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  get complianceIcon(): string {
    return this.result?.abntCompliant ? 'bi-check-circle' : 'bi-exclamation-triangle';
  }

  get complianceColor(): string {
    return this.result?.abntCompliant ? '#10b981' : '#f59e0b';
  }

  get complianceText(): string {
    return this.result?.abntCompliant ? 'Em conformidade ABNT' : 'Revisar conforme ABNT';
  }

  // Mapeamento de ícones e cores por tipo de erro
  private readonly errorConfig = {
    ortografia: { icon: 'bi-spellcheck', color: '#ef4444' },
    gramatica: { icon: 'bi-grammar', color: '#f59e0b' },
    abnt: { icon: 'bi-book', color: '#8b5cf6' },
    melhoria: { icon: 'bi-lightbulb', color: '#10b981' }
  };

  getErrorIcon(type: string): string {
    return this.errorConfig[type as keyof typeof this.errorConfig]?.icon || 'bi-exclamation-triangle';
  }

  getErrorColor(type: string): string {
    return this.errorConfig[type as keyof typeof this.errorConfig]?.color || '#6b7280';
  }

  goBackToHub(): void {
    this.router.navigate(['/']);
  }

  rechargeCredits(): void {
    this.toastr.info('Redirecionando para recarga de créditos...');
    setTimeout(() => window.location.href = '/credits', 1000);
  }

  upgradePlan(): void {
    this.toastr.info('Redirecionando para planos...');
    setTimeout(() => window.location.href = '/upgrade', 1000);
  }
}
