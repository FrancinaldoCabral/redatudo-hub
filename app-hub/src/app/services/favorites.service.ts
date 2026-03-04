import { Injectable } from '@angular/core';

export interface Favorite {
  id: string;
  category: string;  // 'titulos', 'temas', 'posts', etc
  content: string;
  title?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private storageKey = 'redatudo_favorites';

  constructor() {}

  /**
   * Adiciona um item aos favoritos
   */
  addFavorite(category: string, content: string, title?: string, metadata?: any): string {
    const favorites = this.getFavorites();
    const id = this.generateId();

    const favorite: Favorite = {
      id,
      category,
      content,
      title,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    favorites.push(favorite);
    this.saveFavorites(favorites);

    return id;
  }

  /**
   * Remove um item dos favoritos
   */
  removeFavorite(id: string): boolean {
    const favorites = this.getFavorites();
    const filteredFavorites = favorites.filter(fav => fav.id !== id);

    if (filteredFavorites.length !== favorites.length) {
      this.saveFavorites(filteredFavorites);
      return true;
    }

    return false;
  }

  /**
   * Verifica se um item está nos favoritos
   */
  isFavorite(id: string): boolean {
    const favorites = this.getFavorites();
    return favorites.some(fav => fav.id === id);
  }

  /**
   * Obtém todos os favoritos ou filtrados por categoria
   */
  getFavorites(category?: string): Favorite[] {
    const stored = localStorage.getItem(this.storageKey);
    let favorites: Favorite[] = [];

    if (stored) {
      try {
        favorites = JSON.parse(stored).map((fav: any) => ({
          ...fav,
          createdAt: new Date(fav.createdAt),
          updatedAt: new Date(fav.updatedAt)
        }));
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        favorites = [];
      }
    }

    if (category) {
      return favorites.filter(fav => fav.category === category);
    }

    return favorites;
  }

  /**
   * Obtém favoritos por categoria com estatísticas
   */
  getFavoritesByCategory(): { [category: string]: Favorite[] } {
    const favorites = this.getFavorites();
    return favorites.reduce((acc, fav) => {
      if (!acc[fav.category]) {
        acc[fav.category] = [];
      }
      acc[fav.category].push(fav);
      return acc;
    }, {} as { [category: string]: Favorite[] });
  }

  /**
   * Remove todos os favoritos de uma categoria
   */
  clearCategory(category: string): number {
    const favorites = this.getFavorites();
    const filteredFavorites = favorites.filter(fav => fav.category !== category);
    const removedCount = favorites.length - filteredFavorites.length;

    this.saveFavorites(filteredFavorites);
    return removedCount;
  }

  /**
   * Remove todos os favoritos
   */
  clearAll(): number {
    const favorites = this.getFavorites();
    const removedCount = favorites.length;

    localStorage.removeItem(this.storageKey);
    return removedCount;
  }

  /**
   * Obtém estatísticas dos favoritos
   */
  getStats(): { total: number; byCategory: { [category: string]: number } } {
    const favorites = this.getFavorites();
    const byCategory = favorites.reduce((acc, fav) => {
      acc[fav.category] = (acc[fav.category] || 0) + 1;
      return acc;
    }, {} as { [category: string]: number });

    return {
      total: favorites.length,
      byCategory
    };
  }

  /**
   * Exporta favoritos como texto
   */
  exportToText(): string {
    const favorites = this.getFavorites();
    const byCategory = this.getFavoritesByCategory();

    let exportText = '# Meus Favoritos - RedaTudo\n\n';
    exportText += `Total: ${favorites.length} favoritos\n`;
    exportText += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

    Object.keys(byCategory).forEach(category => {
      exportText += `## ${this.getCategoryLabel(category)}\n\n`;
      byCategory[category].forEach(fav => {
        exportText += `### ${fav.title || 'Sem título'}\n`;
        exportText += `${fav.content}\n`;
        if (fav.metadata) {
          exportText += `**Dados adicionais:** ${JSON.stringify(fav.metadata)}\n`;
        }
        exportText += `Adicionado em: ${fav.createdAt.toLocaleString('pt-BR')}\n\n`;
        exportText += '---\n\n';
      });
    });

    return exportText;
  }

  /**
   * Importa favoritos de texto (formato de exportação)
   */
  importFromText(text: string): { success: number; errors: string[] } {
    const errors: string[] = [];
    let success = 0;

    try {
      const lines = text.split('\n');
      let currentCategory = '';
      let currentTitle = '';
      let currentContent = '';
      let inContent = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('## ')) {
          // Salva o favorito anterior se existir
          if (currentContent && currentCategory) {
            try {
              this.addFavorite(currentCategory, currentContent, currentTitle);
              success++;
            } catch (error) {
              errors.push(`Erro ao salvar favorito: ${currentTitle}`);
            }
          }

          // Nova categoria
          currentCategory = this.parseCategoryFromLabel(line.substring(3));
          currentTitle = '';
          currentContent = '';
          inContent = false;
        } else if (line.startsWith('### ')) {
          // Salva o favorito anterior se existir
          if (currentContent && currentCategory) {
            try {
              this.addFavorite(currentCategory, currentContent, currentTitle);
              success++;
            } catch (error) {
              errors.push(`Erro ao salvar favorito: ${currentTitle}`);
            }
          }

          // Novo título
          currentTitle = line.substring(4);
          currentContent = '';
          inContent = true;
        } else if (line === '---') {
          // Fim do conteúdo atual
          if (currentContent && currentCategory) {
            try {
              this.addFavorite(currentCategory, currentContent, currentTitle);
              success++;
            } catch (error) {
              errors.push(`Erro ao salvar favorito: ${currentTitle}`);
            }
          }
          currentTitle = '';
          currentContent = '';
          inContent = false;
        } else if (inContent && line) {
          // Acumula conteúdo
          currentContent += line + '\n';
        }
      }

      // Salva o último favorito
      if (currentContent && currentCategory) {
        try {
          this.addFavorite(currentCategory, currentContent, currentTitle);
          success++;
        } catch (error) {
          errors.push(`Erro ao salvar favorito: ${currentTitle}`);
        }
      }

    } catch (error) {
      errors.push(`Erro ao processar texto: ${error}`);
    }

    return { success, errors };
  }

  /**
   * Busca favoritos por termo
   */
  searchFavorites(term: string, category?: string): Favorite[] {
    const favorites = this.getFavorites(category);
    const searchTerm = term.toLowerCase();

    return favorites.filter(fav =>
      fav.content.toLowerCase().includes(searchTerm) ||
      (fav.title && fav.title.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Obtém favoritos recentes (últimos 30 dias)
   */
  getRecentFavorites(days: number = 30): Favorite[] {
    const favorites = this.getFavorites();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return favorites.filter(fav => fav.createdAt >= cutoffDate);
  }

  /**
   * Gera ID único para favorito
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Salva favoritos no localStorage
   */
  private saveFavorites(favorites: Favorite[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(favorites));
    } catch (error) {
      console.error('Erro ao salvar favoritos:', error);
    }
  }

  /**
   * Converte label de categoria para código
   */
  private parseCategoryFromLabel(label: string): string {
    const categoryMap: { [key: string]: string } = {
      'Títulos': 'titulos',
      'Temas': 'temas',
      'Posts': 'posts',
      'Descrições': 'descricoes',
      'Frases': 'frases',
      'Nomes': 'nomes',
      'Ideias': 'ideias'
    };

    return categoryMap[label] || label.toLowerCase();
  }

  /**
   * Converte código de categoria para label
   */
  private getCategoryLabel(category: string): string {
    const labelMap: { [key: string]: string } = {
      'titulos': 'Títulos',
      'temas': 'Temas',
      'posts': 'Posts',
      'descricoes': 'Descrições',
      'frases': 'Frases',
      'nomes': 'Nomes',
      'ideias': 'Ideias'
    };

    return labelMap[category] || category;
  }
}
