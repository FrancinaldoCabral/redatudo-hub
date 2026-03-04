import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FavoritesService } from '../../../services/favorites.service';

@Component({
  selector: 'app-favorite-button',
  templateUrl: './favorite-button.component.html',
  styleUrls: ['./favorite-button.component.css']
})
export class FavoriteButtonComponent implements OnInit {
  @Input() itemId: string = '';
  @Input() category: string = '';
  @Input() content: string = '';
  @Input() title?: string;
  @Input() metadata?: any;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'icon' | 'button' = 'icon';
  @Input() disabled: boolean = false;

  @Output() onFavoriteChange = new EventEmitter<boolean>();
  @Output() onAdd = new EventEmitter<void>();
  @Output() onRemove = new EventEmitter<void>();

  isFavorite: boolean = false;
  isLoading: boolean = false;

  constructor(private favoritesService: FavoritesService) {}

  ngOnInit(): void {
    this.checkFavoriteStatus();
  }

  private checkFavoriteStatus(): void {
    if (this.itemId) {
      this.isFavorite = this.favoritesService.isFavorite(this.itemId);
    }
  }

  async toggleFavorite(): Promise<void> {
    if (this.disabled || this.isLoading) return;

    this.isLoading = true;

    try {
      let success = false;

      if (this.isFavorite) {
        success = this.favoritesService.removeFavorite(this.itemId);
        if (success) {
          this.isFavorite = false;
          this.onFavoriteChange.emit(false);
          this.onRemove.emit();
        }
      } else {
        const id = this.favoritesService.addFavorite(
          this.category,
          this.content,
          this.title,
          this.metadata
        );
        if (id) {
          this.itemId = id; // Atualiza o ID se foi gerado
          this.isFavorite = true;
          this.onFavoriteChange.emit(true);
          this.onAdd.emit();
          success = true;
        }
      }

      if (!success) {
        console.error('Erro ao alterar favorito');
      }

    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
    } finally {
      this.isLoading = false;
    }
  }

  get buttonClass(): string {
    return `favorite-button ${this.size} ${this.variant} ${this.isFavorite ? 'active' : ''} ${this.isLoading ? 'loading' : ''}`.trim();
  }

  get iconClass(): string {
    if (this.isLoading) return 'bi bi-hourglass-split';
    return this.isFavorite ? 'bi bi-heart-fill' : 'bi bi-heart';
  }

  get buttonText(): string {
    if (this.variant === 'icon') return '';
    if (this.isLoading) return 'Processando...';
    return this.isFavorite ? 'Favoritado' : 'Favoritar';
  }

  get titleText(): string {
    if (this.isLoading) return 'Processando...';
    return this.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  }
}
