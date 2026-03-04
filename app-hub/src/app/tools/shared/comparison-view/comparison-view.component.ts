import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-comparison-view',
  templateUrl: './comparison-view.component.html',
  styleUrls: ['./comparison-view.component.css']
})
export class ComparisonViewComponent {
  @Input() leftTitle: string = 'Texto Original';
  @Input() rightTitle: string = 'Texto Processado';
  @Input() leftContent: string = '';
  @Input() rightContent: string = '';
  @Input() showDiff: boolean = true;
  @Input() similarity?: number;
  @Input() loading: boolean = false;

  @Output() onLeftChange = new EventEmitter<string>();
  @Output() onRightChange = new EventEmitter<string>();
  @Output() onSwap = new EventEmitter<void>();
  @Output() onCopyLeft = new EventEmitter<void>();
  @Output() onCopyRight = new EventEmitter<void>();

  get similarityColor(): string {
    if (!this.similarity) return '#6c757d';
    if (this.similarity >= 80) return '#28a745';
    if (this.similarity >= 60) return '#ffc107';
    return '#dc3545';
  }

  get similarityText(): string {
    if (!this.similarity) return '';
    if (this.similarity >= 80) return 'Muito Similar';
    if (this.similarity >= 60) return 'Similar';
    return 'Diferente';
  }

  handleLeftChange(event: any): void {
    const value = event?.target?.value || '';
    this.onLeftChange.emit(value);
  }

  handleRightChange(event: any): void {
    const value = event?.target?.value || '';
    this.onRightChange.emit(value);
  }

  handleSwap(): void {
    this.onSwap.emit();
  }

  handleCopyLeft(): void {
    this.onCopyLeft.emit();
  }

  handleCopyRight(): void {
    this.onCopyRight.emit();
  }

  // Calcula diferença entre textos (simplificado)
  getDiffStats(): { added: number; removed: number; total: number } {
    if (!this.leftContent || !this.rightContent) {
      return { added: 0, removed: 0, total: 0 };
    }

    const leftWords = this.getWordCount(this.leftContent);
    const rightWords = this.getWordCount(this.rightContent);
    const total = Math.max(leftWords, rightWords);

    return {
      added: Math.max(0, rightWords - leftWords),
      removed: Math.max(0, leftWords - rightWords),
      total: total
    };
  }

  // Conta palavras em um texto
  getWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}
