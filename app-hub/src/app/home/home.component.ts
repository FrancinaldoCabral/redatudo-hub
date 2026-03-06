import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { BalanceService } from '../services/balance.service';
import { AuthService } from '../services/auth.service';
import { PricingService, PricingData, PricingProduct } from '../services/pricing.service';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CreditsModalComponent } from '../components/credits-modal/credits-modal.component';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  featured: boolean;
  category: string;
  creditCost: number;
  isExternal?: boolean;
  badge?: string;
  highlight?: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('creditsModal') creditsModal!: CreditsModalComponent;

  balance: number = 0;
  isLoading: boolean = true;
  private balanceSubscription?: Subscription;
  private authSubscription?: Subscription;

  // Propriedades para saldo detalhado (apenas créditos)
  rechargeBalance: number = 0;
  totalBalance: number = 0;
  showDetailedBalance: boolean = false;

  // Propriedades para controle dos modais
  showReloadModal: boolean = false;
  // Propriedades para dados de pricing dinâmicos (apenas créditos)
  credits: PricingProduct[] = [];
  pricingLoading: boolean = true;

  tools: Tool[] = [
    {
      id: 'ebook-studio',
      name: 'Gerador de Ebook',
      description: 'Crie ebooks completos com capítulos, imagens e formatação profissional em 10 minutos',
      icon: '📚',
      route: `https://ebook.redatudo.online?token=${this.authService.getToken()}`,
      featured: true,
      category: 'Premium',
      creditCost: 0,
      isExternal: true,
      badge: '🔥 Mais Usado',
      highlight: true
    },
    {
      id: 'title-generator',
      name: 'Gerador de Títulos',
      description: 'Títulos criativos para livros, vídeos, posts e TCCs que chamam atenção',
      icon: '💡',
      route: '/gerador-titulos',
      featured: true,
      category: 'Texto',
      creditCost: 1,
      badge: '🔥 Popular'
    },
    {
      id: 'instagram-captions',
      name: 'Legendas Instagram',
      description: 'Legendas virais com hashtags estratégicas para bombar seu perfil',
      icon: '📸',
      route: '/legendas-instagram',
      featured: true,
      category: 'Redes Sociais',
      creditCost: 1
    },
    {
      id: 'academic-assistant',
      name: 'Gerador de Introdução',
      description: 'Introduções acadêmicas prontas para TCCs, artigos e trabalhos',
      icon: '🎓',
      route: '/assistente-academico',
      featured: true,
      category: 'Acadêmico',
      creditCost: 2,
      badge: '✨ Novo'
    },
    {
      id: 'ai-humanizer',
      name: 'Humanizador de Texto',
      description: 'Transforme texto de IA em conteúdo natural e autêntico',
      icon: '✍️',
      route: '/humanizador-texto',
      featured: true,
      category: 'Texto',
      creditCost: 2,
      badge: '✨ Novidade'
    },
    {
      id: 'product-descriptions',
      name: 'ShopCopy',
      description: 'Descrições de produtos irresistíveis para e-commerce',
      icon: '🛍️',
      route: '/gerador-descricoes-produtos',
      featured: true,
      category: 'E-commerce',
      creditCost: 1
    },
    {
      id: 'tcc-themes',
      name: 'Gerador de Temas TCC',
      description: 'Encontre o tema perfeito com justificativa e relevância acadêmica',
      icon: '📋',
      route: '/gerador-temas-tcc',
      featured: true,
      category: 'Acadêmico',
      creditCost: 1
    },
    {
      id: 'text-rewriter',
      name: 'Reformulador',
      description: 'Reescreva textos mantendo a mensagem, evitando plágio',
      icon: '🔄',
      route: '/reformular-texto',
      featured: true,
      category: 'Texto',
      creditCost: 1
    },
    {
      id: 'copy-aida',
      name: 'Gerador Copy AIDA',
      description: 'Copies de vendas prontas no método AIDA que convertem',
      icon: '📝',
      route: '/copy-aida',
      featured: true,
      category: 'Marketing',
      creditCost: 1
    },
    {
      id: 'abnt-corrector',
      name: 'Corretor ABNT',
      description: 'Corrija e formate textos no padrão ABNT automaticamente',
      icon: '✅',
      route: '/corretor-texto-abnt',
      featured: true,
      category: 'Acadêmico',
      creditCost: 1
    },
    {
      id: 'hashtag-generator',
      name: 'Gerador de Hashtags',
      description: 'Hashtags estratégicas para Instagram baseadas em análise de tendências',
      icon: '#️⃣',
      route: '/gerador-hashtags-instagram',
      featured: true,
      category: 'Redes Sociais',
      creditCost: 0.5
    },
    {
      id: 'academic-conclusion',
      name: 'Gerador de Conclusão',
      description: 'Conclusões acadêmicas estruturadas para TCCs e artigos',
      icon: '🏁',
      route: '/gerador-conclusao',
      featured: true,
      category: 'Acadêmico',
      creditCost: 1
    },
    {
      id: 'motivational-quotes',
      name: 'Frases Motivacionais',
      description: 'Frases únicas e inspiradoras para posts de Instagram',
      icon: '💬',
      route: '/frases-motivacionais',
      featured: true,
      category: 'Redes Sociais',
      creditCost: 1
    },
    {
      id: 'book-names',
      name: 'Nomes de Livros',
      description: 'Títulos criativos e cativantes para seu livro ou romance',
      icon: '📖',
      route: '/nomes-livros',
      featured: true,
      category: 'Texto',
      creditCost: 1
    },
    {
      id: 'username-generator',
      name: 'Gerador de Username',
      description: 'Usernames criativos e disponíveis para Instagram',
      icon: '@',
      route: '/username-instagram',
      featured: true,
      category: 'Redes Sociais',
      creditCost: 0.5
    },
    {
      id: 'image-editor',
      name: 'Editor de Imagens IA',
      description: 'Crie ou edite imagens usando Ideogram AI com controle total',
      icon: '🎨',
      route: '/editor-imagens',
      featured: true,
      category: 'IA',
      creditCost: 60,
      badge: '✨ Novo'
    },
  ];

  constructor(
    private router: Router,
    private balanceService: BalanceService,
    public authService: AuthService,
    private pricingService: PricingService
  ) {}

  ngOnInit(): void {
    // fetchPricingData removido — endpoint api/products não é mais necessário

    // Observar mudanças no saldo
    this.balanceSubscription = this.balanceService.balance$.subscribe(
      balance => {
        this.balance = balance;
        this.totalBalance = balance;
        this.rechargeBalance = balance;
        this.isLoading = false;
      }
    );

    // Se inscreve para mudanças no estado de autenticação
    this.authSubscription = this.authService.getAuthenticateAsObservable().subscribe(
      authenticated => {
        if (authenticated) {
          this.balanceService.refreshBalance();
        }
      }
    );

    // Inicializar animações e funcionalidades do novo design
    this.initializeAnimations();
  }

  ngOnDestroy(): void {
    if (this.balanceSubscription) {
      this.balanceSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  fetchPricingData(): void {
    this.pricingLoading = true;
    this.pricingService.getPricingData().subscribe(
      (data: PricingData) => {
        // Ordenar créditos por preço (menor para maior)
        this.credits = data.credits.sort((a, b) => {
          const priceA = parseFloat(a.price || '0');
          const priceB = parseFloat(b.price || '0');
          return priceA - priceB;
        });

        this.pricingLoading = false;
      },
      error => {
        console.error('Erro ao buscar dados de pricing:', error);
        this.pricingLoading = false;
      }
    );
  }



  goToTool(route: string): void {
    if (route.startsWith('http')) {
      // Link externo - abre em nova aba
      window.open(route, '_blank');
    } else {
      // Link interno - usa router nativo do Angular
      this.router.navigate([route]);
    }
  }

  getToolRating(toolId: string): string {
    const ratings: { [key: string]: string } = {
      'ebook-studio': '4.9',
      'title-generator': '4.9',
      'instagram-captions': '4.8',
      'academic-assistant': '4.8',
      'ai-humanizer': '4.9',
      'product-descriptions': '4.7',
      'tcc-themes': '4.8',
      'text-rewriter': '4.7',
      'copy-aida': '4.8',
      'abnt-corrector': '4.6',
      'hashtag-generator': '4.7',
      'academic-conclusion': '4.8',
      'motivational-quotes': '4.9',
      'book-names': '4.7',
      'username-generator': '4.6',
      'image-editor': '4.8'
    };
    return ratings[toolId] || '4.8';
  }

  getToolUsage(toolId: string): string {
    const usages: { [key: string]: string } = {
      'ebook-studio': '18.7k gerações hoje',
      'title-generator': '12.4k gerações hoje',
      'instagram-captions': '8.9k gerações hoje',
      'academic-assistant': '7.2k gerações hoje',
      'ai-humanizer': '5.8k gerações hoje',
      'product-descriptions': '4.3k gerações hoje',
      'tcc-themes': '3.1k gerações hoje',
      'text-rewriter': '6.7k gerações hoje',
      'copy-aida': '2.8k gerações hoje',
      'abnt-corrector': '4.9k gerações hoje',
      'hashtag-generator': '3.5k gerações hoje',
      'academic-conclusion': '2.1k gerações hoje',
      'motivational-quotes': '1.9k gerações hoje',
      'book-names': '1.2k gerações hoje',
      'username-generator': '2.4k gerações hoje',
      'image-editor': '1.8k gerações hoje'
    };
    return usages[toolId] || '2.1k gerações hoje';
  }

  private initializeAnimations(): void {
    // Inicializar animações quando o componente carrega
    setTimeout(() => {
      this.animateStats();
      this.initializeScrollAnimations();
    }, 100);
  }

  private animateStats(): void {
    // Animação dos números de estatísticas
    const stats = document.querySelectorAll('.stat strong');
    stats.forEach((stat, index) => {
      const target = stat.textContent;
      if (target && /^\d/.test(target)) {
        this.animateNumber(stat as HTMLElement, target, index * 200);
      }
    });
  }

  private animateNumber(element: HTMLElement, target: string, delay: number = 0): void {
    setTimeout(() => {
      const number = parseInt(target.replace(/[^\d]/g, ''));
      const suffix = target.replace(/[\d.]/g, '');
      let current = 0;
      const increment = number / 50;

      const timer = setInterval(() => {
        current += increment;
        if (current >= number) {
          element.textContent = target;
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current).toLocaleString() + suffix;
        }
      }, 30);
    }, delay);
  }

  getToolLink(toolId: string): string {
    const tool = this.tools.find(t => t.id === toolId);
    return tool?.route || '/';
  }

  private initializeScrollAnimations(): void {
    // Animações de scroll para elementos
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, observerOptions);

    // Observar cards de ferramentas
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
      observer.observe(card);
    });

    // Observar cards de casos
    const caseCards = document.querySelectorAll('.caso-card');
    caseCards.forEach(card => {
      observer.observe(card);
    });

    // Observar cards de avaliações
    const reviewCards = document.querySelectorAll('.avaliacao-card');
    reviewCards.forEach(card => {
      observer.observe(card);
    });
  }

  // Métodos para controle dos modais
  openReloadModal(): void {
    this.creditsModal.open();
  }

  closeReloadModal(): void {
    this.creditsModal.close();
  }

  // Método para obter ferramentas (agora sempre retorna todas)
  getDisplayTools(): Tool[] {
    return this.tools;
  }

  // Métodos para obter cores e ícones das categorias
  getCategoryColor(category: string): string {
    const categoryColors: { [key: string]: string } = {
      'Texto': '#6366F1',
      'Acadêmico': '#3B82F6',
      'Redes Sociais': '#EC4899',
      'Marketing': '#7C3AED',
      'E-commerce': '#10B981',
      'Premium': '#F59E0B',
      'IA': '#8B5CF6'
    };
    return categoryColors[category] || '#7C3AED';
  }

  getCategoryIcon(category: string): string {
    const categoryIcons: { [key: string]: string } = {
      'Texto': '✍️',
      'Acadêmico': '🎓',
      'Redes Sociais': '📱',
      'Marketing': '📝',
      'E-commerce': '🛍️',
      'Premium': '⭐',
      'IA': '🤖'
    };
    return categoryIcons[category] || '🎯';
  }

  calculateCost(price: string, rate: number): string {
    return (parseFloat(price) * rate).toFixed(2);
  }

  // Métodos para saldo detalhado
  toggleBalanceView(): void {
    this.showDetailedBalance = !this.showDetailedBalance;
  }

  getCreditLink(credit: PricingProduct): string {
    return 'https://redatudo.online/checkout/?add-to-cart=' + credit.id;
  }

  getCreditButtonText(credit: PricingProduct): string {
    return 'Comprar Créditos';
  }

  getCreditTitle(credit: PricingProduct): string {
    return `${credit.credito} Créditos`;
  }
}
