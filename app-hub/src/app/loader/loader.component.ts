import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css']
})
export class LoaderComponent implements AfterViewInit {
  typingText = 'Conectando você ao futuro...';
  typingWidth = 0;
  @ViewChild('typingTextEl') typingTextEl!: ElementRef;

  ngAfterViewInit() {
    // Mede o tamanho real do texto
    const el = this.typingTextEl.nativeElement;
    this.typingWidth = el.scrollWidth;
    // Força a animação
    el.style.width = '0px';
    setTimeout(() => {
      el.style.transition = 'width 2.2s steps(' + this.typingText.length + ', end)';
      el.style.width = this.typingWidth + 'px';
    }, 100);
  }
}