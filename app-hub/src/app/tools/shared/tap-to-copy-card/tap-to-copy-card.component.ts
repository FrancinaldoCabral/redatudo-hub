import { Component, Input } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

/**
 * Card simples que copia conteúdo ao clicar
 * Substitui o result-card complexo para melhor UX
 */
@Component({
  selector: 'app-tap-to-copy-card',
  templateUrl: './tap-to-copy-card.component.html',
  styleUrls: ['./tap-to-copy-card.component.css']
})
export class TapToCopyCardComponent {
  @Input() content: string = '';
  @Input() title: string = '';
  @Input() index: number = 0;
  @Input() showCopyIcon: boolean = true;

  copied: boolean = false;

  constructor(private toastr: ToastrService) {}

  async copyContent(): Promise<void> {
    if (!this.content || this.copied) return;

    try {
      await navigator.clipboard.writeText(this.content);
      this.copied = true;
      this.toastr.success('Copiado!', '', { timeOut: 1500 });

      setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      this.toastr.error('Erro ao copiar');
    }
  }
}
