// src/app/ebook-studio/ebook-state.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { Ebook, StructureItem } from './ebook.model';

// Cria um estado inicial para o ebook.
const initialEbookState: Ebook = {
  prompt: '',
  structure: [],
  fullHtmlContent: '',
  selectedStyleId: 'modern',
};

@Injectable({
  providedIn: 'root'
})
export class EbookStateService {
  // BehaviorSubjects para gerenciar o estado de forma reativa.
  private readonly ebookState = new BehaviorSubject<Ebook>(initialEbookState);
  private readonly currentStep = new BehaviorSubject<number>(1);
  private readonly isLoading = new BehaviorSubject<boolean>(false);

  // Observables públicos para os componentes se inscreverem.
  public readonly ebook$ = this.ebookState.asObservable();
  public readonly currentStep$ = this.currentStep.asObservable();
  public readonly isLoading$ = this.isLoading.asObservable();

  private nextId = 0;

  constructor() { }

  // --- MÉTODOS DE CONTROLE DE FLUXO ---

  goToStep(step: number): void {
    // Adicionar lógica de validação se necessário
    this.currentStep.next(step);
  }

  nextStep(): void {
    this.currentStep.next(this.currentStep.getValue() + 1);
  }
 
  previousStep(): void {
    this.currentStep.next(this.currentStep.getValue() - 1);
  }

  // --- MÉTODOS DE ATUALIZAÇÃO DE ESTADO ---

  updatePrompt(prompt: string): void {
    const state = this.ebookState.getValue();
    this.ebookState.next({ ...state, prompt });
  }

  updateStructure(structure: StructureItem[]): void {
    const state = this.ebookState.getValue();
    this.ebookState.next({ ...state, structure });
  }

  updateSelectedStyle(styleId: string): void {
    const state = this.ebookState.getValue();
    this.ebookState.next({ ...state, selectedStyleId: styleId });
  }

  // --- MÉTODOS DE LÓGICA DE NEGÓCIO (CHAMADAS DE IA) ---

  generateStructure() {
    this.isLoading.next(true);
    const currentPrompt = this.ebookState.getValue().prompt;
    const mockTitles = ['Introdução', `Capítulo 1: ${currentPrompt.substring(0, 20)}...`, 'Capítulo 2: Aprofundando o Tema', 'Conclusão'];

    return of(mockTitles).pipe(
      delay(1500),
      tap(titles => {
        const newStructure: StructureItem[] = titles.map(title => ({
          id: this.nextId++,
          title: title,
          includeImages: title.toLowerCase().includes('capítulo'),
          isGeneratingContent: false
        }));
        this.updateStructure(newStructure);
        this.isLoading.next(false);
        this.nextStep(); // Avança para a próxima etapa após a conclusão
      })
    );
  }

  generateAllContent() {
    this.isLoading.next(true);
    const currentState = this.ebookState.getValue();
    let fullHtml = '';

    currentState.structure.forEach(item => {
        const imageHtml = item.includeImages ? `<p><img src="https://placehold.co/600x400/EEE/333?text=${encodeURIComponent(item.title)}" alt="${item.title}"></p>` : '';
        const textContent = `<p>Este é o conteúdo gerado para <strong>${item.title}</strong>. O texto seria muito mais longo e detalhado...</p>`;
        fullHtml += `<h2>${item.title}</h2>${imageHtml}${textContent}`;
    });

    return of(fullHtml).pipe(
        delay(2500),
        tap(finalHtml => {
            this.ebookState.next({ ...currentState, fullHtmlContent: finalHtml });
            this.isLoading.next(false);
            this.nextStep();
        })
    );
  }
}
