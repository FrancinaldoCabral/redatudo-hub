import { Component, OnInit } from '@angular/core';
import { LanguageService, LanguageOption } from '../../services/language.service';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.css']
})
export class LanguageSelectorComponent implements OnInit {
  
  languages: LanguageOption[] = [];
  currentLanguage: LanguageOption | null = null;
  isOpen = false;

  constructor(public languageService: LanguageService) {}

  ngOnInit(): void {
    this.languages = this.languageService.getSupportedLanguages();
    this.currentLanguage = this.languageService.getCurrentLanguage();
    
    // Subscribe to language changes
    this.languageService.currentLanguage$.subscribe(() => {
      this.currentLanguage = this.languageService.getCurrentLanguage();
    });
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  /**
   * Select a language
   */
  selectLanguage(language: LanguageOption): void {
    this.languageService.setLanguage(language.code);
    this.isOpen = false;
  }

  /**
   * Check if language is current
   */
  isCurrentLanguage(language: LanguageOption): boolean {
    return language.code === this.currentLanguage?.code;
  }

  /**
   * Close dropdown when clicking outside
   */
  closeDropdown(): void {
    this.isOpen = false;
  }
}
