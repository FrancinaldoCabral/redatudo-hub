import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

interface UsernameResult {
  username: string;
  available: boolean;
  score: number;
}

@Component({
  selector: 'app-username-generator',
  templateUrl: './username-generator.component.html',
  styleUrls: ['./username-generator.component.css']
})
export class UsernameGeneratorComponent implements OnInit, OnDestroy {
  // Form data
  form = {
    keywords: '',
    style: 'short',
    includeNumbers: true,
    platform: 'instagram'
  };

  // State
  results: UsernameResult[] = [];
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;

  // Options
  styles = [
    { value: 'short', label: 'Curto e Memorável' },
    { value: 'creative', label: 'Criativo e Único' },
    { value: 'professional', label: 'Profissional' },
    { value: 'funny', label: 'Divertido' }
  ];

  platforms = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'twitter', label: 'Twitter/X' },
    { value: 'youtube', label: 'YouTube' }
  ];

  private authSubscription?: Subscription;

  constructor(
    private router: Router,
    private socketService: SocketService,
    private historicService: HistoricService,
    private toastr: ToastrService,
    private authService: AuthService
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
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.usernames) {
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

  generateUsernames(): void {
    if (!this.form.keywords.trim()) {
      this.toastr.error('Por favor, insira palavras-chave para gerar usernames');
      return;
    }

    if (this.balance < 0.5) {
      this.toastr.error('Créditos insuficientes para gerar usernames');
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'username-generator');
  }

  private buildPrompt(): string {
    const { keywords, style, includeNumbers, platform } = this.form;

    let prompt = `Gere 10 usernames únicos e criativos para ${platform} baseados nas palavras-chave: "${keywords}".\n\n`;

    prompt += `Estilo: ${this.getStyleLabel(style)}\n`;
    prompt += `Incluir números: ${includeNumbers ? 'Sim' : 'Não'}\n\n`;

    prompt += `Requisitos:
    - Cada username deve ter entre 8-20 caracteres
    - Use apenas letras, números e underscore
    - Deve ser fácil de lembrar e pronunciar
    - Evite caracteres especiais
    - Considere a plataforma: ${platform}
    - Retorne apenas a lista de usernames, um por linha`;

    return prompt;
  }

  private getStyleLabel(style: string): string {
    const styleObj = this.styles.find(s => s.value === style);
    return styleObj ? styleObj.label.toLowerCase() : style;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.usernames && Array.isArray(result.usernames)) {
      this.results = result.usernames.map((username: string, index: number) => ({
        username: username.trim(),
        available: Math.random() > 0.3, // Simulação de disponibilidade
        score: Math.floor(Math.random() * 40) + 60 // Score simulado
      }));

      this.toastr.success(`${this.results.length} usernames gerados com sucesso!`);
    } else {
      this.toastr.error('Formato de resposta inesperado');
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar usernames. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
  }

  copyToClipboard(username: string): void {
    navigator.clipboard.writeText(username).then(() => {
      this.toastr.success('Username copiado para a área de transferência!');
    }).catch(() => {
      this.toastr.error('Erro ao copiar username');
    });
  }

  canGenerate(): boolean {
    return this.form.keywords.trim().length > 0 && this.balance >= 0.5;
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
