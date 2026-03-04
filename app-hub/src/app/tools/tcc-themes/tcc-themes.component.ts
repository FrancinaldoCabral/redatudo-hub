import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';

interface ThemeForm {
  type: 'tcc' | 'dissertacao' | 'artigo' | 'enem';
  area: string;
  keywords: string[];
  difficulty: 'facil' | 'medio' | 'avancado';
  year: '2024' | '2025';
}

interface ThemeResult {
  id?: string;
  title: string;
  justification: string;
  relevance: number; // 1-5 estrelas
  difficulty: string;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-tcc-themes',
  templateUrl: './tcc-themes.component.html',
  styleUrls: ['./tcc-themes.component.css']
})
export class TccThemesComponent implements OnInit, OnDestroy {
  // Form data
  form: ThemeForm = {
    type: 'tcc',
    area: '',
    keywords: [],
    difficulty: 'medio',
    year: '2025'
  };

  // State
  results: ThemeResult[] = [];
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;
  showUpgradePrompt: boolean = false;

  // Areas de conhecimento
  areas = [
    'Administração',
    'Direito',
    'Engenharia',
    'Medicina',
    'Enfermagem',
    'Psicologia',
    'Educação',
    'Tecnologia da Informação',
    'Ciências Contábeis',
    'Marketing',
    'Recursos Humanos',
    'Logística',
    'Meio Ambiente',
    'Ciências Sociais',
    'Comunicação',
    'Design',
    'Arquitetura',
    'Economia',
    'Matemática',
    'Física',
    'Química',
    'Biologia',
    'História',
    'Geografia',
    'Filosofia',
    'Letras',
    'Artes',
    'Música',
    'Teatro',
    'Cinema'
  ];

  // Types
  types = [
    { value: 'tcc', label: 'TCC (Trabalho de Conclusão de Curso)' },
    { value: 'dissertacao', label: 'Dissertação de Mestrado' },
    { value: 'artigo', label: 'Artigo Científico' },
    { value: 'enem', label: 'Redação ENEM' }
  ];

  // Difficulties
  difficulties = [
    { value: 'facil', label: 'Fácil', description: 'Tema acessível, bibliografia abundante' },
    { value: 'medio', label: 'Médio', description: 'Tema equilibrado, pesquisa moderada' },
    { value: 'avancado', label: 'Avançado', description: 'Tema complexo, pesquisa aprofundada' }
  ];

  // Trending topics
  trendingTopics = [
    'Inteligência Artificial',
    'Sustentabilidade',
    'Saúde Mental',
    'Educação Digital',
    'Inovação Tecnológica',
    'Empreendedorismo',
    'Diversidade e Inclusão',
    'Economia Circular',
    'Telemedicina',
    'Educação Inclusiva',
    'Energias Renováveis',
    'Transformação Digital',
    'Bem-estar no Trabalho',
    'Cidades Inteligentes',
    'Machine Learning',
    'Big Data',
    'Blockchain',
    'Realidade Virtual',
    'Cybersegurança',
    'E-commerce'
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
    this.analyticsService.trackToolUsed('tcc-themes');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.themes) {
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

  generateThemes(): void {
    if (!this.form.area.trim()) {
      this.toastr.error('Por favor, selecione uma área de conhecimento');
      return;
    }

    if (this.balance < 1) {
      this.toastr.error('Créditos insuficientes para gerar temas');
      this.showUpgradePrompt = true;
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'tcc-themes');
  }

  private buildPrompt(): string {
    const { type, area, keywords, difficulty, year } = this.form;

    let prompt = `Gere 10 temas acadêmicos relevantes para ${year}.\n\n`;
    prompt += `Tipo de trabalho: ${this.getTypeLabel(type)}\n`;
    prompt += `Área de conhecimento: ${area}\n`;
    if (keywords.length > 0) {
      prompt += `Palavras-chave: ${keywords.join(', ')}\n`;
    }
    prompt += `Nível de dificuldade: ${this.getDifficultyLabel(difficulty)}\n\n`;

    prompt += 'Requisitos para cada tema:\n';
    prompt += '- Título claro e objetivo\n';
    prompt += '- Justificativa (2-3 linhas)\n';
    prompt += '- Relevância atual (⭐⭐⭐⭐☆)\n';
    prompt += '- Indicação de dificuldade\n\n';

    prompt += 'Temas devem ser:\n';
    prompt += '- Originais e inovadores\n';
    prompt += '- Relevantes para o contexto atual\n';
    prompt += '- Viáveis para pesquisa acadêmica\n';
    prompt += '- Alinhados com tendências\n\n';

    prompt += 'Responda APENAS com um JSON válido:\n';
    prompt += '{\n';
    prompt += '  "themes": [\n';
    prompt += '    {\n';
    prompt += '      "title": "Título do tema",\n';
    prompt += '      "justification": "Justificativa em 2-3 linhas",\n';
    prompt += '      "relevance": 4,\n';
    prompt += '      "difficulty": "medio"\n';
    prompt += '    }\n';
    prompt += '  ]\n';
    prompt += '}';

    return prompt;
  }

  private getTypeLabel(type: string): string {
    const typeObj = this.types.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  private getDifficultyLabel(difficulty: string): string {
    const difficultyObj = this.difficulties.find(d => d.value === difficulty);
    return difficultyObj ? difficultyObj.label : difficulty;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.themes && Array.isArray(result.themes)) {
      this.results = result.themes.map((themeData: any, index: number) => ({
        id: `theme_${Date.now()}_${index}`,
        title: themeData.title,
        justification: themeData.justification,
        relevance: themeData.relevance || Math.floor(Math.random() * 5) + 1,
        difficulty: themeData.difficulty || this.form.difficulty,
        isFavorite: false
      }));

      this.toastr.success(`${this.results.length} temas gerados com sucesso!`);
      this.analyticsService.trackToolUsed('tcc-themes', {
        type: this.form.type,
        area: this.form.area,
        themesCount: this.results.length
      });
    } else {
      this.toastr.error('Formato de resposta inesperado');
      this.analyticsService.trackError('tcc-themes', 'Invalid response format');
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar temas. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
      this.showUpgradePrompt = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
    this.analyticsService.trackError('tcc-themes', errorMessage);
  }

  addKeyword(keyword: string): void {
    if (keyword && !this.form.keywords.includes(keyword) && this.form.keywords.length < 5) {
      this.form.keywords.push(keyword);
    }
  }

  removeKeyword(keyword: string): void {
    this.form.keywords = this.form.keywords.filter(k => k !== keyword);
  }

  onKeywordKeyPress(event: any): void {
    if (event.key === 'Enter') {
      this.addKeyword(event.target.value);
      event.target.value = '';
    }
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Tema copiado para a área de transferência!');
      this.analyticsService.trackResultCopied('tcc-themes', 0);
    }).catch(() => {
      this.toastr.error('Erro ao copiar tema');
    });
  }

  toggleFavorite(result: ThemeResult): void {
    if (!result.id) return;

    if (result.isFavorite) {
      this.favoritesService.removeFavorite(result.id);
      result.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('tcc-themes');
      this.toastr.info('Tema removido dos favoritos');
    } else {
      this.favoritesService.addFavorite('temas', result.title, result.title, {
        justification: result.justification,
        relevance: result.relevance,
        difficulty: result.difficulty,
        type: this.form.type,
        area: this.form.area
      });
      result.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('tcc-themes');
      this.toastr.success('Tema adicionado aos favoritos!');
    }
  }

  regenerateThemes(): void {
    if (this.balance >= 1) {
      this.generateThemes();
      this.analyticsService.trackRegeneration('tcc-themes');
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
      this.showUpgradePrompt = true;
    }
  }

  canRegenerate(): boolean {
    return this.balance >= 1 && this.form.area.trim().length > 0;
  }

  // Getters para o template
  get currentTypeLabel(): string {
    return this.getTypeLabel(this.form.type);
  }

  get currentDifficultyDescription(): string {
    const difficultyObj = this.difficulties.find(d => d.value === this.form.difficulty);
    return difficultyObj ? difficultyObj.description : '';
  }

  get relevanceStars(): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'facil': return '#10b981';
      case 'medio': return '#f59e0b';
      case 'avancado': return '#ef4444';
      default: return '#6b7280';
    }
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
