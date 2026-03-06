import { Injectable } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, Observable } from 'rxjs'

export interface LanguageOption {
  code: string
  name: string
  nativeName: string
  flag: string
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  
  private readonly SUPPORTED_LANGUAGES: LanguageOption[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
    { code: 'pt-br', name: 'Portuguese (BR)', nativeName: 'Português (BR)', flag: '🇧🇷' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
  ]

  private readonly DEFAULT_LANGUAGE = 'en'
  private readonly STORAGE_KEY = 'redatudo_language'
  
  private currentLanguageSubject: BehaviorSubject<string>
  public currentLanguage$: Observable<string>

  constructor(private translateService: TranslateService) {
    this.currentLanguageSubject = new BehaviorSubject<string>(
      this.getStoredLanguage()
    )
    this.currentLanguage$ = this.currentLanguageSubject.asObservable()
    
    // Initialize translate service
    this.initializeTranslations()
  }

  /**
   * Initialize ngx-translate with support for all languages
   */
  private initializeTranslations(): void {
    // Add all supported languages
    const langCodes = this.SUPPORTED_LANGUAGES.map(lang => lang.code)
    this.translateService.addLangs(langCodes)
    
    // Set default language
    this.translateService.setDefaultLang(this.DEFAULT_LANGUAGE)
    
    // Get stored language or use browser language
    const currentLang = this.getStoredLanguage()
    this.setLanguage(currentLang)
  }

  /**
   * Get stored language from localStorage or default
   */
  private getStoredLanguage(): string {
    const stored = window?.localStorage?.getItem(this.STORAGE_KEY)
    if (stored && this.SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
      return stored
    }
    
    // Try to detect browser language
    const browserLang = this.detectBrowserLanguage()
    if (browserLang) {
      return browserLang
    }
    
    return this.DEFAULT_LANGUAGE
  }

  /**
   * Detect browser language and map to supported language
   */
  private detectBrowserLanguage(): string | null {
    const browserLang = (navigator.language || navigator.languages[0] || '').split('-')[0]
    
    // Direct match
    if (this.SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
      return browserLang
    }
    
    // Map pt to pt-br
    if (browserLang === 'pt') {
      return 'pt-br'
    }
    
    // Map zh to zh (simplified)
    if (browserLang === 'zh') {
      return 'zh'
    }
    
    return null
  }

  /**
   * Update current language
   */
  setLanguage(languageCode: string): void {
    if (!this.SUPPORTED_LANGUAGES.some(l => l.code === languageCode)) {
      console.warn(`Language ${languageCode} not supported, using ${this.DEFAULT_LANGUAGE}`)
      languageCode = this.DEFAULT_LANGUAGE
    }

    this.translateService.use(languageCode)
    window?.localStorage?.setItem(this.STORAGE_KEY, languageCode)
    this.currentLanguageSubject.next(languageCode)
  }

  /**
   * Get current language code
   */
  getCurrentLanguageCode(): string {
    return this.currentLanguageSubject.value
  }

  /**
   * Get current language details
   */
  getCurrentLanguage(): LanguageOption {
    const code = this.getCurrentLanguageCode()
    return this.SUPPORTED_LANGUAGES.find(l => l.code === code) || this.SUPPORTED_LANGUAGES[0]
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): LanguageOption[] {
    return [...this.SUPPORTED_LANGUAGES]
  }

  /**
   * Get language by code
   */
  getLanguageByCode(code: string): LanguageOption | undefined {
    return this.SUPPORTED_LANGUAGES.find(l => l.code === code)
  }

  /**
   * Get instant translation
   */
  instant(key: string, params?: any): string {
    return this.translateService.instant(key, params)
  }
}