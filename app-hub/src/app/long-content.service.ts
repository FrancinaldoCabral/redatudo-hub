import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SocketService } from './services/socket.service';

// A interface pode ser movida para um arquivo separado (ex: models.ts) em um projeto real
export interface StructureItem {
  id: number;
  type: string; // Será sempre 'Seção'
  title: string;
  content?: string;
  isLoading?: boolean;
}

@Injectable({
  providedIn: 'root' // O serviço será injetável em toda a aplicação
})
export class LongContentService {

  private nextItemId = 0;

  constructor(private socketService: SocketService) { }

  /**
   * Simula uma chamada de API para gerar a estrutura do conteúdo.
   * Retorna um Observable para imitar uma operação assíncrona.
   * @param contentType O tipo de conteúdo (ebook, roteiro, etc.) para contextualizar a geração.
   * @param prompt A descrição do usuário.
   * @returns Um Observable que emite um array de StructureItem.
   */
  getStructure(contentType: string, prompt: string): Observable<StructureItem[]> {
    console.log(`[MockService] Gerando estrutura para tipo: ${contentType} com prompt: "${prompt}"`);
    this.nextItemId = 0;
    let titles: string[] = [];

    

    const structure: StructureItem[] = titles.map(title => ({
      id: this.nextItemId++,
      type: 'Section', // Padronizado para 'Seção'
      title: title
    }));

    // Simula a latência da rede com um delay de 1.5 segundos
    return of(structure).pipe(delay(1500));
  }

  /**
   * Simula uma chamada de API para gerar o conteúdo de uma seção específica.
   * @param item O item da estrutura para o qual o conteúdo será gerado.
   * @returns Um Observable que emite o texto gerado.
   */
  getContent(item: StructureItem): Observable<string> {
    console.log(`[MockService] Gerando conteúdo para: "${item.title}"`);
    const generatedText = `Este é um texto de exemplo gerado para a seção "${item.title}". O conteúdo aqui seria criado dinamicamente por um LLM, levando em consideração todo o contexto do projeto. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.`;
    
    // Simula a latência da rede com um delay de 2 segundos
    return of(generatedText).pipe(delay(2000));
  }
}
