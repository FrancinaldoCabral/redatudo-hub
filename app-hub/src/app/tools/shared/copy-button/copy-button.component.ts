import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-copy-button',
  templateUrl: './copy-button.component.html',
  styleUrls: ['./copy-button.component.css']
})
export class CopyButtonComponent {
  @Input() text: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'primary' | 'secondary' | 'outline' = 'outline';
  @Input() disabled: boolean = false;
  @Input() showLabel: boolean = true;
  @Input() label: string = 'Copiar';
  @Input() successText: string = 'Copiado!';
  @Input() errorText: string = 'Erro ao copiar';

  @Output() onCopy = new EventEmitter<boolean>();
  @Output() onSuccess = new EventEmitter<void>();
  @Output() onError = new EventEmitter<void>();

  isLoading: boolean = false;
  showSuccess: boolean = false;

  async copyToClipboard(): Promise<void> {
    if (!this.text || this.disabled || this.isLoading) return;

    this.isLoading = true;

    try {
      await navigator.clipboard.writeText(this.text);
      this.showSuccess = true;
      this.onCopy.emit(true);
      this.onSuccess.emit();

      // Esconde mensagem de sucesso após 2 segundos
      setTimeout(() => {
        this.showSuccess = false;
      }, 2000);

    } catch (error) {
      console.error('Erro ao copiar:', error);
      this.onCopy.emit(false);
      this.onError.emit();
    } finally {
      this.isLoading = false;
    }
  }

  get buttonClass(): string {
    return `copy-button ${this.size} ${this.variant} ${this.isLoading ? 'loading' : ''}`.trim();
  }

  get iconClass(): string {
    if (this.isLoading) return 'bi bi-hourglass-split';
    if (this.showSuccess) return 'bi bi-check-circle';
    return 'bi bi-clipboard';
  }

  get buttonText(): string {
    if (this.showSuccess) return this.successText;
    if (this.isLoading) return 'Copiando...';
    return this.label;
  }
}
