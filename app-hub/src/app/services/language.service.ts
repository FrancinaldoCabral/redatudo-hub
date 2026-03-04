import { Injectable, OnInit } from '@angular/core'


@Injectable()
export class LanguageService  {
    
    languages: string[] = [
        '🇬🇧 English',
        '🇪🇸 Spanish',
        '🇫🇷 French',
        '🇩🇪 German',
        '🇮🇹 Italian',
        '🇵🇹 Portuguese (Brazilian)',
        '🇵🇹 Portuguese (European)',
        '🇳🇱 Dutch',
        '🇷🇺 Russian',
        '🇨🇳 Chinese (Simplified)',
        '🇨🇳 Chinese (Traditional)',
        '🇯🇵 Japanese',
        '🇰🇷 Korean',
        '🇸🇦 Arabic',
        '🇮🇱 Hebrew',
        '🇮🇳 Hindi',
        '🇧🇩 Bengali',
        '🇵🇰 Urdu',
        '🇹🇷 Turkish',
        '🇬🇷 Greek',
        '🇹🇭 Thai',
        '🇮🇩 Indonesian'
    ]
    currentLanguage: string

    setLanguage(language:string): void {
        this.currentLanguage = language
        window.localStorage.setItem('language', language)
    }

    getLanguage(): string {
        return this.currentLanguage
    }

    getLanguages(): string [] {
        return this.languages
    }

    getCurrentLanguage(): string {
        return this.currentLanguage
    }

    constructor(){
        this.currentLanguage = window.localStorage.getItem('language') || '🇵🇹 Portuguese (Brazilian)'
    }
}