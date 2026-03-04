import { Component, OnInit, OnDestroy } from '@angular/core';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { FavoritesService } from '../../services/favorites.service';
import { AnalyticsService } from '../../services/analytics.service';
import { Router } from '@angular/router'; // Adicionado Router

interface ProductForm {
  step: 1 | 2 | 3;
  category: string;
  productName: string;
  features: string[];
  targetAudience: string;
  tone: 'luxo' | 'acessivel' | 'jovem' | 'corporativo';
}

interface ProductResult {
  id?: string;
  seoTitle: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  isFavorite?: boolean;
}

@Component({
  selector: 'app-product-descriptions',
  templateUrl: './product-descriptions.component.html',
  styleUrls: ['./product-descriptions.component.css']
})
export class ProductDescriptionsComponent implements OnInit, OnDestroy {
  // Form data
  form: ProductForm = {
    step: 1,
    category: '',
    productName: '',
    features: [],
    targetAudience: '',
    tone: 'acessivel'
  };

  // State
  result: ProductResult | null = null;
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;
  showUpgradePrompt: boolean = false;

  // Categories
  categories = [
    { value: 'moda', label: 'Moda & Acessórios', icon: '👕' },
    { value: 'eletronicos', label: 'Eletrônicos', icon: '📱' },
    { value: 'casa', label: 'Casa & Decoração', icon: '🏠' },
    { value: 'beleza', label: 'Beleza & Saúde', icon: '💄' },
    { value: 'esportes', label: 'Esportes & Lazer', icon: '⚽' },
    { value: 'livros', label: 'Livros & Papelaria', icon: '📚' },
    { value: 'alimentos', label: 'Alimentos & Bebidas', icon: '🍎' },
    { value: 'outros', label: 'Outros', icon: '📦' }
  ];

  // Tones
  tones = [
    { value: 'luxo', label: 'Luxo & Premium' },
    { value: 'acessivel', label: 'Acessível & Popular' },
    { value: 'jovem', label: 'Jovem & Descolado' },
    { value: 'corporativo', label: 'Corporativo & Profissional' }
  ];

  // Audiences
  audiences = [
    'Público geral',
    'Homens adultos',
    'Mulheres adultas',
    'Jovens (18-25)',
    'Crianças e adolescentes',
    'Profissionais',
    'Atletas e esportistas',
    'Pessoas preocupadas com saúde'
  ];

  // Features suggestions
  featureSuggestions = [
    'Material premium',
    'Tecnologia avançada',
    'Design exclusivo',
    'Fácil de usar',
    'Durabilidade',
    'Garantia estendida',
    'Entrega rápida',
    'Suporte técnico',
    'Sustentável',
    'Preço acessível'
  ];

  private authSubscription?: Subscription;

  constructor(
    private socketService: SocketService,
    private historicService: HistoricService,
    private toastr: ToastrService,
    private authService: AuthService,
    private favoritesService: FavoritesService,
    private analyticsService: AnalyticsService,
    private router: Router // Injetado Router
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
    this.analyticsService.trackToolUsed('product-descriptions');
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.seoTitle) {
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

  nextStep(): void {
    if (this.form.step < 3) {
      this.form.step++;
    }
  }

  prevStep(): void {
    if (this.form.step > 1) {
      this.form.step--;
    }
  }

  canProceedToStep2(): boolean {
    return this.form.category.trim().length > 0;
  }

  canProceedToStep3(): boolean {
    return this.form.productName.trim().length > 0 &&
           this.form.features.length > 0 &&
           this.form.targetAudience.trim().length > 0;
  }

  canGenerate(): boolean {
    return this.form.productName.trim().length > 0 &&
           this.form.features.length > 0 &&
           this.balance >= 1;
  }

  generateDescriptions(): void {
    if (this.balance < 1) { // Mover verificação de saldo para o início
      this.toastr.error('Créditos insuficientes para gerar descrições');
      this.showUpgradePrompt = true;
      return;
    }

    if (!this.canGenerate()) {
      this.toastr.error('Por favor, preencha todas as informações do produto');
      return;
    }

    this.isLoading = true;
    this.result = null;

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'product-descriptions');
    this.form.step = 3; // Avança para o passo 3 após disparar a geração
  }

  private buildPrompt(): string {
    const { productName, category, features, targetAudience, tone } = this.form;

    let prompt = `Crie descrições completas para produto de e-commerce:\n\n`;
    prompt += `Produto: ${productName}\n`;
    prompt += `Categoria: ${this.getCategoryLabel(category)}\n`;
    prompt += `Características: ${features.join(', ')}\n`;
    prompt += `Público-alvo: ${targetAudience}\n`;
    prompt += `Tom: ${this.getToneLabel(tone)}\n\n`;

    prompt += 'Crie:\n';
    prompt += '1. Título SEO otimizado (máx 60 caracteres)\n';
    prompt += '2. Descrição curta (2-3 linhas, máx 200 caracteres)\n';
    prompt += '3. Descrição longa (páragrafo completo)\n';
    prompt += '4. 5 bullet points com benefícios\n\n';

    prompt += 'Responda APENAS com um JSON válido:\n';
    prompt += '{\n';
    prompt += '  "seoTitle": "Título otimizado para SEO",\n';
    prompt += '  "shortDescription": "Descrição curta impactante",\n';
    prompt += '  "longDescription": "Descrição longa detalhada",\n';
    prompt += '  "bulletPoints": [\n';
    prompt += '    "Benefício 1",\n';
    prompt += '    "Benefício 2",\n';
    prompt += '    "Benefício 3",\n';
    prompt += '    "Benefício 4",\n';
    prompt += '    "Benefício 5"\n';
    prompt += '  ]\n';
    prompt += '}';

    return prompt;
  }

  getCategoryLabel(category: string): string {
    const categoryObj = this.categories.find(c => c.value === category);
    return categoryObj ? categoryObj.label : category;
  }

  private getToneLabel(tone: string): string {
    const toneObj = this.tones.find(t => t.value === tone);
    return toneObj ? toneObj.label : tone;
  }

  private handleSuccess(content: any): void {
    this.isLoading = false;

    if (!content || !content.seoTitle || !content.shortDescription) {
        this.toastr.error('Formato de resposta inesperado: Conteúdo vazio ou incompleto.');
        this.analyticsService.trackError('product-descriptions', 'Invalid content received');
        return;
    }

    this.result = {
      id: `product_${Date.now()}`,
      seoTitle: content.seoTitle,
      shortDescription: content.shortDescription,
      longDescription: content.longDescription || '',
      bulletPoints: content.bulletPoints || [],
      isFavorite: false
    };

    this.toastr.success('Descrições geradas com sucesso!');
    this.analyticsService.trackToolUsed('product-descriptions', {
      category: this.form.category,
      featuresCount: this.form.features.length
    });
  }

  private handleError(error: any): void {
    this.isLoading = false;
    // console.log('Erro do socketService:', error); // Removido log após depuração

    let errorMessage = 'Erro ao gerar descrições. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
      this.showUpgradePrompt = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
    this.analyticsService.trackError('product-descriptions', errorMessage);
  }

  addFeature(feature: string): void {
    if (feature && !this.form.features.includes(feature)) {
      this.form.features.push(feature);
    }
  }

  addFeatureFromInput(inputElement: HTMLInputElement): void {
    const value = inputElement.value.trim();
    if (value && !this.form.features.includes(value)) {
      this.form.features.push(value);
      inputElement.value = '';
    } else if (value) {
      inputElement.value = ''; // Clear anyway
    }
  }

  removeFeature(feature: string): void {
    this.form.features = this.form.features.filter(f => f !== feature);
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Texto copiado para a área de transferência!');
      this.analyticsService.trackResultCopied('product-descriptions', 0);
    }).catch(() => {
      this.toastr.error('Erro ao copiar texto');
    });
  }

  copyAllDescriptions(): void {
    if (!this.result) return;

    let allText = `TÍTULO SEO:\n${this.result.seoTitle}\n\n`;
    allText += `DESCRIÇÃO CURTA:\n${this.result.shortDescription}\n\n`;
    allText += `DESCRIÇÃO LONGA:\n${this.result.longDescription}\n\n`;
    allText += `BULLET POINTS:\n`;
    this.result.bulletPoints.forEach((point, index) => {
      allText += `${index + 1}. ${point}\n`;
    });

    this.copyToClipboard(allText);
  }

  toggleFavoriteResult(productResult: ProductResult, fieldName: 'seoTitle' | 'shortDescription' | 'longDescription' | 'bulletPoints'): void {
    if (!productResult || !productResult.id) return;

    let contentToFavorite: string;
    let itemId: string;
    let favoritesType = 'descricoes';

    switch (fieldName) {
      case 'seoTitle':
        contentToFavorite = productResult.seoTitle;
        itemId = `${productResult.id}_seoTitle`;
        break;
      case 'shortDescription':
        contentToFavorite = productResult.shortDescription;
        itemId = `${productResult.id}_shortDescription`;
        break;
      case 'longDescription':
        contentToFavorite = productResult.longDescription;
        itemId = `${productResult.id}_longDescription`;
        break;
      case 'bulletPoints':
        contentToFavorite = productResult.bulletPoints.join('\n');
        itemId = `${productResult.id}_bulletPoints`;
        break;
      default:
        return;
    }

    const currentFavoriteState = this.favoritesService.isFavorite(itemId);

    if (currentFavoriteState) {
      this.favoritesService.removeFavorite(itemId);
      this.analyticsService.trackFavoriteRemoved('product-descriptions', fieldName);
      this.toastr.info('Campo removido dos favoritos');
    } else {
      this.favoritesService.addFavorite(favoritesType, itemId, contentToFavorite, {
        category: this.form.category,
        fieldName: fieldName
      });
      this.analyticsService.trackFavoriteAdded('product-descriptions', fieldName);
      this.toastr.success('Campo adicionado aos favoritos!');
    }
    // For simplicity, isFavorite state is managed per field now from the service.
    // The main `result.isFavorite` will still track the overall product favorite status.
  }

  toggleFavorite(): void {
    if (!this.result || !this.result.id) return;

    if (this.result.isFavorite) {
      this.favoritesService.removeFavorite(this.result.id);
      this.result.isFavorite = false;
      this.analyticsService.trackFavoriteRemoved('product-descriptions', 'full-product');
      this.toastr.info('Descrições removidas dos favoritos');
    } else {
      this.favoritesService.addFavorite('descricoes', this.result.id, this.result.seoTitle, {
        category: this.form.category,
        features: this.form.features,
        tone: this.form.tone,
        targetAudience: this.form.targetAudience
      });
      this.result.isFavorite = true;
      this.analyticsService.trackFavoriteAdded('product-descriptions', 'full-product');
      this.toastr.success('Descrições adicionadas aos favoritos!');
    }
  }

  regenerateDescriptions(): void {
    if (this.balance >= 1) {
      this.generateDescriptions();
      this.analyticsService.trackRegeneration('product-descriptions');
    } else {
      this.toastr.error('Créditos insuficientes para regenerar');
      this.showUpgradePrompt = true;
    }
  }

  // Getters para o template
  get currentCategoryIcon(): string {
    const categoryObj = this.categories.find(c => c.value === this.form.category);
    return categoryObj ? categoryObj.icon : '📦';
  }

  get currentToneLabel(): string {
    const toneObj = this.tones.find(t => t.value === this.form.tone);
    return toneObj ? toneObj.label : this.form.tone;
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
