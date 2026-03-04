import { Component, Input, Output, EventEmitter } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-result-card',
  templateUrl: './result-card.component.html',
  styleUrls: ['./result-card.component.css']
})
export class ResultCardComponent {
  @Input() content: string = '';
  @Input() title: string = '';
  @Input() index: number = 0;
  @Input() showRegenerate: boolean = false;
  @Input() isLoading: boolean = false;

  @Output() copy = new EventEmitter<number>();
  @Output() regenerate = new EventEmitter<number>();
  @Output() favorite = new EventEmitter<number>();

  copySuccess: boolean = false;

  constructor(private sanitizer: DomSanitizer) {}

  onCopy(): void {
    this.copy.emit(this.index);

    // Visual feedback
    this.copySuccess = true;
    setTimeout(() => {
      this.copySuccess = false;
    }, 2000);
  }

  onRegenerate(): void {
    this.regenerate.emit(this.index);
  }

  onFavorite(): void {
    this.favorite.emit(this.index);
  }

  formatContent(content: string): SafeHtml {
    // Render markdown and sanitize
    const html = marked(content);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
