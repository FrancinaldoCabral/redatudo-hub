// pagination.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  private currentPage: number = 0;
  private totalPages: number = 1;

  constructor() { }

  setTotalPages(totalPages: number): void {
    this.totalPages = totalPages;
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  firstPage(): void {
    this.currentPage = 1;
  }

  lastPage(): void {
    this.currentPage = this.totalPages;
  }
}
