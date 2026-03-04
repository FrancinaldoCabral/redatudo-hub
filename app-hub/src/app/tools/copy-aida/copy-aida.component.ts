import { Component, OnInit, OnDestroy } from '@angular/core';
import { SocketService } from '../../services/socket.service';
import { HistoricService } from '../../services/historic.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

interface CopyResult {
  content: string;
  section: 'attention' | 'interest' | 'desire' | 'action';
  title: string;
}

@Component({
  selector: 'app-copy-aida',
  templateUrl: './copy-aida.component.html',
  styleUrls: ['./copy-aida.component.css']
})
export class CopyAidaComponent implements OnInit, OnDestroy {
  // Form data
  form = {
    product: '',
    target: '',
    benefit: '',
    urgency: true,
    tone: 'persuasivo'
  };

  // State
  results: CopyResult[] = [];
  isLoading: boolean = false;

  // Options
  tones = [
    { value: 'persuasivo', label: 'Persuasivo' },
    { value: 'profissional', label: 'Profissional' },
    { value: 'casual', label: 'Casual' },
    { value: 'urgente', label: 'Urgente' },
    { value: 'emocional', label: 'Emocional' }
  ];

  constructor(
    private socketService: SocketService,
    private historicService: HistoricService,
    private toastr: ToastrService
  ) {
    this.setupSocketListener();
  }

  ngOnInit(): void {
    // Shared header handles balance loading
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  setupSocketListener(): void {
    this.socketService.getResultSource$.subscribe(
      response => {
        if (response.status.toLowerCase() === 'completed' && response.result?.result?.content?.copy) {
          console.log('RESULT: ', response.result)
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

  getBalance(): void {
    this.historicService.getBalance().subscribe(
      success => {
        // Balance display handled by shared header
      },
      error => {
        console.log(error);
      }
    );
  }

  generateCopy(): void {
    if (!this.form.product.trim()) {
      this.toastr.error('Por favor, descreva o produto ou serviço');
      return;
    }

    if (!this.form.target.trim()) {
      this.toastr.error('Por favor, descreva o público-alvo');
      return;
    }

    this.isLoading = true;
    this.results = [];

    const prompt = this.buildPrompt();
    const messages = [{ role: 'user', content: prompt }];

    this.socketService.sendMessage(messages, 'auto', 'copy-aida');
  }

  private buildPrompt(): string {
    const { product, target, benefit, urgency, tone } = this.form;

    let prompt = `Crie uma copy seguindo a fórmula AIDA (Atenção, Interesse, Desejo, Ação) para:\n\n`;
    prompt += `Produto/Serviço: ${product}\n`;
    prompt += `Público-alvo: ${target}\n`;
    prompt += `Benefício principal: ${benefit}\n`;
    prompt += `Tom: ${this.getToneLabel(tone)}\n`;
    prompt += `Incluir urgência: ${urgency ? 'Sim' : 'Não'}\n\n`;

    prompt += `Estrutura AIDA:
    1. ATENÇÃO (Headline impactante que chame atenção)
    2. INTERESSE (Apresente o problema e solução)
    3. DESEJO (Destaque benefícios e prova social)
    4. AÇÃO (Call-to-action claro e urgente)

    Retorne cada seção separadamente com headers claros.`;

    return prompt;
  }

  private getToneLabel(tone: string): string {
    const toneObj = this.tones.find(t => t.value === tone);
    return toneObj ? toneObj.label.toLowerCase() : tone;
  }

  private handleSuccess(result: any): void {
    this.isLoading = false;

    if (result.copy) {
      // Parse AIDA sections from the response
      const sections = this.parseAIDAResponse(result.copy);

      this.results = sections.map((section: any, index: number) => ({
        content: section.content,
        section: section.type,
        title: section.title
      }));

      this.toastr.success('Copy AIDA gerada com sucesso!');
    } else {
      this.toastr.error('Formato de resposta inesperado');
    }
  }

  private parseAIDAResponse(response: string): any[] {
    // Simple parsing logic for AIDA structure
    const sections = [];
    const lines = response.split('\n');

    let currentSection = '';
    let currentContent = '';

    for (const line of lines) {
      if (line.toLowerCase().includes('atenção') || line.toLowerCase().includes('attention')) {
        if (currentContent) {
          sections.push({ type: 'attention', title: 'Atenção', content: currentContent.trim() });
        }
        currentSection = 'attention';
        currentContent = '';
      } else if (line.toLowerCase().includes('interesse') || line.toLowerCase().includes('interest')) {
        if (currentContent) {
          sections.push({ type: 'attention', title: 'Atenção', content: currentContent.trim() });
        }
        currentSection = 'interest';
        currentContent = '';
      } else if (line.toLowerCase().includes('desejo') || line.toLowerCase().includes('desire')) {
        if (currentContent) {
          sections.push({ type: 'interest', title: 'Interesse', content: currentContent.trim() });
        }
        currentSection = 'desire';
        currentContent = '';
      } else if (line.toLowerCase().includes('ação') || line.toLowerCase().includes('action')) {
        if (currentContent) {
          sections.push({ type: 'desire', title: 'Desejo', content: currentContent.trim() });
        }
        currentSection = 'action';
        currentContent = '';
      } else if (line.trim()) {
        currentContent += line + '\n';
      }
    }

    // Add the last section
    if (currentContent) {
      sections.push({
        type: currentSection as any,
        title: this.getSectionTitle(currentSection),
        content: currentContent.trim()
      });
    }

    return sections;
  }

  private getSectionTitle(section: string): string {
    const titles = {
      attention: 'Atenção',
      interest: 'Interesse',
      desire: 'Desejo',
      action: 'Ação'
    };
    return titles[section as keyof typeof titles] || section;
  }

  private handleError(error: any): void {
    this.isLoading = false;
    console.log('Erro:', error);

    let errorMessage = 'Erro ao gerar copy AIDA. Tente novamente.';

    if (error?.msg?.includes('no credit')) {
      errorMessage = 'Créditos insuficientes. Adicione mais créditos para continuar.';
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
    return this.form.product.trim().length > 0 &&
           this.form.target.trim().length > 0;
  }
}
