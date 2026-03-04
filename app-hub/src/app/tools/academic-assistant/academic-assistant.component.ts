import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

interface AcademicResult {
  content: string;
  type: 'introduction' | 'conclusion' | 'formatted';
  title: string;
}

@Component({
  selector: 'app-academic-assistant',
  templateUrl: './academic-assistant.component.html',
  styleUrls: ['./academic-assistant.component.css']
})
export class AcademicAssistantComponent implements OnInit, OnDestroy {
  activeTab: 'introduction' | 'conclusion' | 'formatter' = 'introduction';

  // Form data for introduction
  introForm = {
    topic: '',
    academicType: 'tcc',
    context: '',
    keywords: ''
  };

  // Form data for conclusion
  conclusionForm = {
    mainPoints: '',
    conclusionType: 'sintese',
    contribution: ''
  };

  // Form data for formatter
  formatterForm = {
    text: '',
    formatType: 'abnt'
  };

  // State
  results: AcademicResult[] = [];
  isLoading: boolean = false;
  balance: number = 0;
  showCreditWarning: boolean = false;

  // Options
  academicTypes = [
    { value: 'tcc', label: 'TCC (Trabalho de Conclusão de Curso)' },
    { value: 'artigo', label: 'Artigo Científico' },
    { value: 'monografia', label: 'Monografia' },
    { value: 'dissertacao', label: 'Dissertação' },
    { value: 'tese', label: 'Tese' },
    { value: 'relatorio', label: 'Relatório Técnico' }
  ];

  conclusionTypes = [
    { value: 'sintese', label: 'Síntese dos Resultados' },
    { value: 'proposicao', label: 'Proposição de Melhorias' },
    { value: 'reflexao', label: 'Reflexão Crítica' },
    { value: 'recomendacao', label: 'Recomendações' }
  ];

  formatTypes = [
    { value: 'abnt', label: 'ABNT (Associação Brasileira de Normas Técnicas)' },
    { value: 'apa', label: 'APA (American Psychological Association)' },
    { value: 'mla', label: 'MLA (Modern Language Association)' },
    { value: 'vancouver', label: 'Vancouver' }
  ];

  tabs = [
    { id: 'introduction', label: 'Introdução', icon: '📚' },
    { id: 'conclusion', label: 'Conclusão', icon: '✍️' },
    { id: 'formatter', label: 'Formatador', icon: '⚙️' }
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
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.academicContent) {
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
        this.showCreditWarning = this.balance < 2;
      },
      error => {
        console.log(error);
      }
    );
  }

  setActiveTab(tabId: string): void {
    if (tabId === 'introduction' || tabId === 'conclusion' || tabId === 'formatter') {
      this.activeTab = tabId;
      this.results = [];
    }
  }

  generateIntroduction(): void {
    if (!this.introForm.topic.trim()) {
      this.toastr.error('Por favor, descreva o tema do seu trabalho acadêmico');
      return;
    }

    if (this.balance < 2) {
      this.toastr.error('Créditos insuficientes para gerar introdução');
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildIntroductionPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'academic-assistant');
  }

  generateConclusion(): void {
    if (!this.conclusionForm.mainPoints.trim()) {
      this.toastr.error('Por favor, descreva os pontos principais do seu trabalho');
      return;
    }

    if (this.balance < 2) {
      this.toastr.error('Créditos insuficientes para gerar conclusão');
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildConclusionPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'academic-assistant');
  }

  formatText(): void {
    if (!this.formatterForm.text.trim()) {
      this.toastr.error('Por favor, insira o texto que deseja formatar');
      return;
    }

    if (this.balance < 2) {
      this.toastr.error('Créditos insuficientes para formatar texto');
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildFormatterPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'academic-assistant');
  }

  private buildIntroductionPrompt(): string {
    const { topic, academicType, context, keywords } = this.introForm;

    let prompt = `Escreva uma introdução acadêmica para um ${this.getAcademicTypeLabel(academicType)} sobre o tema: "${topic}".\n\n`;

    if (context.trim()) {
      prompt += `Contexto adicional: ${context}\n\n`;
    }

    if (keywords.trim()) {
      prompt += `Palavras-chave importantes: ${keywords}\n\n`;
    }

    prompt += `A introdução deve seguir estas características de um ${this.getAcademicTypeLabel(academicType)}:
    - Apresentar claramente o tema e sua relevância
    - Contextualizar o problema de pesquisa
    - Apresentar os objetivos
    - Delinear a estrutura do trabalho
    - Manter tom acadêmico e formal
    - Ter entre 300-500 palavras
    - Incluir referências bibliográficas básicas se necessário`;

    return prompt;
  }

  private buildConclusionPrompt(): string {
    const { mainPoints, conclusionType, contribution } = this.conclusionForm;

    let prompt = `Escreva uma conclusão acadêmica baseada nos seguintes pontos principais: "${mainPoints}".\n\n`;

    prompt += `Tipo de conclusão: ${this.getConclusionTypeLabel(conclusionType)}\n\n`;

    if (contribution.trim()) {
      prompt += `Contribuição do trabalho: ${contribution}\n\n`;
    }

    prompt += `A conclusão deve:
    - Sintetizar os principais achados
    - Relacionar com os objetivos propostos
    - Discutir implicações e limitações
    - Sugerir direções para pesquisas futuras
    - Manter tom acadêmico e formal
    - Ter entre 200-400 palavras`;

    return prompt;
  }

  private buildFormatterPrompt(): string {
    const { text, formatType } = this.formatterForm;

    let prompt = `Formate o seguinte texto acadêmico segundo as normas ${this.getFormatTypeLabel(formatType)}.\n\n`;
    prompt += `Texto a ser formatado:\n"${text}"\n\n`;

    prompt += `Aplique as regras de formatação de ${this.getFormatTypeLabel(formatType)} incluindo:
    - Estrutura de parágrafos adequada
    - Uso correto de maiúsculas e minúsculas
    - Formatação de citações e referências
    - Espaçamento entre linhas
    - Uso de itálico e negrito quando apropriado
    - Organização lógica do conteúdo`;

    return prompt;
  }

  private getAcademicTypeLabel(type: string): string {
    const typeObj = this.academicTypes.find(t => t.value === type);
    return typeObj ? typeObj.label.toLowerCase() : type;
  }

  private getConclusionTypeLabel(type: string): string {
    const typeObj = this.conclusionTypes.find(t => t.value === type);
    return typeObj ? typeObj.label.toLowerCase() : type;
  }

  private getFormatTypeLabel(type: string): string {
    const typeObj = this.formatTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.academicContent) {
      const newResult: AcademicResult = {
        content: result.academicContent,
        type: this.activeTab === 'formatter' ? 'formatted' : this.activeTab,
        title: this.getResultTitle()
      };

      this.results = [newResult];
      this.toastr.success('Conteúdo acadêmico gerado com sucesso!');
    } else {
      this.toastr.error('Formato de resposta inesperado');
    }
  }

  private getResultTitle(): string {
    switch (this.activeTab) {
      case 'introduction':
        return `Introdução - ${this.getAcademicTypeLabel(this.introForm.academicType)}`;
      case 'conclusion':
        return `Conclusão - ${this.getConclusionTypeLabel(this.conclusionForm.conclusionType)}`;
      case 'formatter':
        return `Texto Formatado - ${this.getFormatTypeLabel(this.formatterForm.formatType)}`;
      default:
        return 'Resultado Acadêmico';
    }
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar conteúdo acadêmico. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
      this.showCreditWarning = true;
    } else if (error?.msg?.includes('API key')) {
      errorMessage = 'Erro na chave da API. Contate o suporte.';
    }

    this.toastr.error(errorMessage);
  }

  copyToClipboard(content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.toastr.success('Texto copiado para a área de transferência!');
    }).catch(() => {
      this.toastr.error('Erro ao copiar texto');
    });
  }

  canGenerate(): boolean {
    return this.balance >= 2 && this.getCurrentForm().trim().length > 0;
  }

  getCurrentForm(): string {
    switch (this.activeTab) {
      case 'introduction':
        return this.introForm.topic;
      case 'conclusion':
        return this.conclusionForm.mainPoints;
      case 'formatter':
        return this.formatterForm.text;
      default:
        return '';
    }
  }

  getCurrentPlaceholder(): string {
    switch (this.activeTab) {
      case 'introduction':
        return 'Ex: "A influência das redes sociais no comportamento do consumidor brasileiro: um estudo de caso no e-commerce..."';
      case 'conclusion':
        return 'Ex: "Os resultados mostraram que as redes sociais impactam significativamente as decisões de compra, especialmente entre jovens de 18-25 anos..."';
      case 'formatter':
        return 'Cole aqui o texto acadêmico que deseja formatar segundo as normas ABNT...';
      default:
        return '';
    }
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
