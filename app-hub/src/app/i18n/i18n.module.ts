import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../services/language.service';
import { LanguageSelectorComponent } from '../components/language-selector/language-selector.component';

/**
 * Internationalization (i18n) Module
 * 
 * Provides translation services and language selector component
 * 
 * Usage in AppModule:
 *   import { I18nModule } from './i18n/i18n.module';
 *   
 *   @NgModule({
 *     imports: [I18nModule],
 *   })
 * 
 * Usage in components:
 *   <div>{{ 'common.loading' | translate }}</div>
 */
@NgModule({
  declarations: [
    LanguageSelectorComponent
  ],
  imports: [
    CommonModule,
    TranslateModule
  ],
  providers: [
    LanguageService
  ],
  exports: [
    LanguageSelectorComponent,
    TranslateModule
  ]
})
export class I18nModule { }
