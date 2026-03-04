import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ResultItem {
  id?: string;
  content: string;
  title?: string;
  metadata?: any;
  quality?: number;
  isFavorite?: boolean;
}

@Component({
  selector: 'app-result-grid',
  templateUrl: './result-grid.component.html',
  styleUrls: ['./result-grid.component.css']
})
export class ResultGridComponent {
  @Input() results: ResultItem[] = [];
  @Input() columns: number = 3;
  @Input() showQuality: boolean = true;
  @Input() showTitle: boolean = false;
  @Input() loading: boolean = false;
  @Input() error: string = '';

  @Input() actions: string[] = ['copy', 'favorite', 'download'];
  @Input() maxHeight?: string;

  @Output() onCopy = new EventEmitter<ResultItem>();
  @Output() onFavorite = new EventEmitter<ResultItem>();
  @Output() onDownload = new EventEmitter<ResultItem>();
  @Output() onRegenerate = new EventEmitter<void>();

  get gridTemplateColumns(): string {
    return `repeat(${this.columns}, 1fr)`;
  }

  get containerMaxHeight(): string {
    return this.maxHeight || 'none';
  }

  handleCopy(item: ResultItem): void {
    this.onCopy.emit(item);
  }

  handleFavorite(item: ResultItem): void {
    this.onFavorite.emit(item);
  }

  handleDownload(item: ResultItem): void {
    this.onDownload.emit(item);
  }

  handleRegenerate(): void {
    this.onRegenerate.emit();
  }

  hasAction(action: string): boolean {
    return this.actions.includes(action);
  }

  getQualityStars(quality?: number): number[] {
    if (!quality) return [];
    const stars = Math.round(quality / 20); // Converte 0-100 para 0-5
    return Array(5).fill(0).map((_, i) => i < stars ? 1 : 0);
  }

  getQualityColor(quality?: number): string {
    if (!quality) return '#6c757d';
    if (quality >= 80) return '#28a745';
    if (quality >= 60) return '#ffc107';
    return '#dc3545';
  }
}
