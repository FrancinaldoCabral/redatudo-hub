import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-upgrade-prompt',
  templateUrl: './upgrade-prompt.component.html',
  styleUrls: ['./upgrade-prompt.component.css']
})
export class UpgradePromptComponent {
  @Input() show: boolean = false;
  @Input() variant: 'banner' | 'card' | 'modal' | 'inline' = 'banner';
  @Input() currentLimit: string = '5/dia';
  @Input() proLimit: string = 'ilimitado';
  @Input() feature: string = 'esta ferramenta';
  @Input() price: string = 'R$ 9/mês';
  @Input() title?: string;
  @Input() description?: string;
  @Input() dismissible: boolean = true;

  @Output() onUpgrade = new EventEmitter<void>();
  @Output() onDismiss = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  isVisible: boolean = false;
  isDismissed: boolean = false;

  ngOnChanges(): void {
    if (this.show && !this.isDismissed) {
      this.isVisible = true;
    } else if (!this.show) {
      this.isVisible = false;
    }
  }

  handleUpgrade(): void {
    this.onUpgrade.emit();
  }

  handleDismiss(): void {
    this.isVisible = false;
    this.isDismissed = true;
    this.onDismiss.emit();
  }

  handleClose(): void {
    this.isVisible = false;
    this.onClose.emit();
  }

  get containerClass(): string {
    return `upgrade-prompt ${this.variant} ${this.isVisible ? 'visible' : ''}`.trim();
  }

  get defaultTitle(): string {
    return this.title || `Use ${this.feature} sem limites`;
  }

  get defaultDescription(): string {
    return this.description ||
      `Você usou seu limite gratuito de ${this.currentLimit}. Faça upgrade para ${this.proLimit} com o plano Pro.`;
  }
}
