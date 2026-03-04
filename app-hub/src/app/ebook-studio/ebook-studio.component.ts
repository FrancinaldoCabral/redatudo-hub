// src/app/ebook-studio/ebook-studio.component.ts
import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { SocketService } from '../services/socket.service';

// Interfaces para a estrutura de dados
interface Step {
  id: number;
  name: string;
}

interface Chapter {
  id: number;
  title: string;
}

interface Template {
  id: string;
  name: string;
  thumbnailUrl: string;
}

@Component({
  selector: 'app-ebook-studio',
  templateUrl: './ebook-studio.component.html',
  styleUrls: ['./ebook-studio.component.css'],
  animations: [
    // Animação para o conteúdo de cada passo
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class EbookStudioComponent implements OnInit {
  // --- PROPRIEDADES DE ESTADO ---
  public currentStep: number = 1;
  public isLoading: boolean = false;
  public highestStepReached: number = 1;

  public status: string = ''
  private job: any = {}

  // --- DADOS DO EBOOK ---
  public ebookIdea: string = '';
  public summary: Chapter[] = [];
  public ebookContent: string = '';
  public availableTemplates: Template[] = [];
  public selectedTemplateId: string | null = null;

  readonly steps: Step[] = [
    { id: 1, name: 'Briefing' },
    { id: 2, name: 'Sumário' },
    { id: 3, name: 'Conteúdo' },
    { id: 4, name: 'Estilo' },
    { id: 5, name: 'Finalizar' },
  ];

  constructor(
    private socketService: SocketService
  ) {
            this.socketService.getResultSource$.subscribe(
            response => {
                if(response.status.toLowerCase()=='completed' && response.result.summary){ 
                    const { result } = response        
                    const { summary } = result
                    console.log(summary)
                    this.summary = summary
                    this.isLoading = false
                }else if(response.status.toLowerCase()=='error' || response.status.toLowerCase()=='failed'){
                    const { result } = response 
                    console.log('RESULT ERROR: ', result)       
                    const { msg } = result


                    if(msg==='Error message: \n      Message: \"no credit\"\n      '){

                    }else if((msg as string).includes('Incorrect API key provided') && (msg as string).includes('https://platform.openai.com/account')){

                    }else if(msg.includes('Job cancelled')){

                      
                    }else {

                    }

                }else if (
                    response.status.toLowerCase()=='active' || 
                    response.status.toLowerCase()=='wait' ||
                    response.status.toLowerCase()=='delayed' ||
                    response.status.toLowerCase()=='processing...' 
                ) {
                    this.job.id = response.result.id
                }else if(response.status.toLowerCase()=='cancel'){
                    this.status = 'Canceling...'
                }
            },
            error => {
                console.log(error)
            }
        )
  }

  ngOnInit(): void {
    // Inicializa os dados falsos quando o componente é carregado
    this.populateTemplates();
  }

  // --- NAVEGAÇÃO ENTRE PASSOS ---

  public async nextStep(): Promise<void> {
    if (this.currentStep >= this.steps.length) return;

    // Lógica específica para cada transição de passo
    if (this.currentStep === 1 && this.ebookIdea.trim().length > 0) {
      await this.generateSummary();
    } else if (this.currentStep === 2) {
      await this.generateContent();
    }

    this.currentStep++;
    if (this.currentStep > this.highestStepReached) {
      this.highestStepReached = this.currentStep;
    }
  }

  public previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  public goToStep(stepId: number): void {
    if (stepId <= this.highestStepReached) {
      this.currentStep = stepId;
    }
  }

  // --- LÓGICA DE GERAÇÃO DE DADOS (SIMULAÇÃO) ---

  private async generateSummary(): Promise<void> {
    this.isLoading = true;
    // Simula uma chamada de API para a IA
    const messages = [
      { role: 'user', content: this.ebookIdea }
    ]
    this.socketService.sendMessage(messages, 'auto', 'ebook-structure')
    //await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Dados falsos para o sumário
    /* this.summary = [
      { id: 1, title: 'Introdução: O Cenário Atual do SEO' },
      { id: 2, title: 'Capítulo 1: Pesquisa de Palavras-chave Estratégicas' },
      { id: 3, title: 'Capítulo 2: Otimização On-Page Essencial' },
      { id: 4, title: 'Capítulo 3: Link Building e Autoridade de Domínio' },
      { id: 5, title: 'Capítulo 4: SEO Técnico para E-commerce' },
      { id: 6, title: 'Conclusão: Próximos Passos para o Sucesso' },
    ]; */
    //this.isLoading = false;
  }

  private async generateContent(): Promise<void> {
    this.isLoading = true;
    // Simula uma chamada de API para a IA
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Conteúdo falso (Lorem Ipsum)
    this.ebookContent = `Baseado no sumário, aqui está o conteúdo gerado para o seu ebook:\n\n## Introdução: O Cenário Atual do SEO\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim.\n\nPellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh.\n\n## Capítulo 1: Pesquisa de Palavras-chave Estratégicas\n\nMauris ac mauris sed pede pellentesque fermentum. Maecenas adipiscing ante non diam. Sorbi et morbi. Vestibulum contignissim. Morbi commodo, ipsum sed pharetra gravida, orci magna rhoncus neque, id pulvinar odio lorem non turpis. Nullam sit amet enim. Suspendisse id velit vitae ligula volutpat condimentum. Aliquam erat volutpat. Sed quis velit. Nulla facilisi. Integer lacinia sollicitudin massa. Cras metus. Sed aliquet risus a tortor. Integer id quam. Morbi mi. Quisque nisl felis, venenatis tristique, dignissim in, ultrices sit amet, augue. Proin sodales libero eget ante.`;
    this.isLoading = false;
  }

  private populateTemplates(): void {
      // Dados falsos para os templates visuais
      this.availableTemplates = [
        { id: 'minimalist', name: 'Minimalista', thumbnailUrl: 'https://placehold.co/400x500/161b22/c9d1d9?text=Minimalista' },
        { id: 'corporate', name: 'Corporativo', thumbnailUrl: 'https://placehold.co/400x500/ffffff/1a202c?text=Corporativo' },
        { id: 'creative', name: 'Criativo', thumbnailUrl: 'https://placehold.co/400x500/4a5568/ffffff?text=Criativo' },
        { id: 'modern', name: 'Moderno', thumbnailUrl: 'https://placehold.co/400x500/2d3748/f0f6fc?text=Moderno' },
      ];
  }

  // --- MÉTODOS AUXILIARES PARA O TEMPLATE ---

  public getStepStatus(stepId: number): string {
    if (stepId === this.currentStep) return 'active';
    if (stepId < this.highestStepReached) return 'completed';
    return 'pending';
  }

  public getProgressPercentage(): number {
    if (this.currentStep === 1) return 0;
    return ((this.currentStep - 1) / (this.steps.length - 1)) * 100;
  }

  public drop(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.summary, event.previousIndex, event.currentIndex);
  }

  public selectTemplate(templateId: string): void {
    this.selectedTemplateId = templateId;
  }
}
