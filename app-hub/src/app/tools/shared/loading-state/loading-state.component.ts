import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  templateUrl: './loading-state.component.html',
  styleUrls: ['./loading-state.component.css']
})
export class LoadingStateComponent {
  @Input() type: 'spinner' | 'skeleton' | 'pulse' | 'dots' = 'spinner';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() message?: string;
  @Input() showMessage: boolean = true;
  @Input() centered: boolean = true;
  @Input() fullHeight: boolean = false;

  get containerClass(): string {
    return `loading-container ${this.size} ${this.centered ? 'centered' : ''} ${this.fullHeight ? 'full-height' : ''}`.trim();
  }

  get defaultMessage(): string {
    if (this.message) return this.message;

    switch (this.type) {
      case 'spinner':
        return 'Carregando...';
      case 'skeleton':
        return 'Preparando conteúdo...';
      case 'pulse':
        return 'Processando...';
      case 'dots':
        return 'Aguarde...';
      default:
        return 'Carregando...';
    }
  }

  getMessageArray(): string[] {
    // Para casos onde queremos múltiplas mensagens rotativas
    return [
      'Analisando sua solicitação...',
      'Gerando conteúdo...',
      'Finalizando...',
      'Quase pronto!'
    ];
  }
}
