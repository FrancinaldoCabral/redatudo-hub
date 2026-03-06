# Internationalization (i18n) Implementation Guide

## Overview

The app now has a complete i18n (internationalization) system supporting 10 languages:
- English (en)
- Spanish (es)
- Chinese (zh)
- Hindi (hi)
- Arabic (ar)
- Brazilian Portuguese (pt-br)
- Bengali (bn)
- Russian (ru)
- Japanese (ja)
- French (fr)

## Setup

### 1. Module Configuration

The i18n module is already configured in `app.module.ts`:

```typescript
import { I18nModule } from './i18n/i18n.module'

@NgModule({
  imports: [
    I18nModule,
    // ... other imports
  ]
})
```

### 2. Services

#### LanguageService

Located at `src/app/services/language.service.ts`

```typescript
constructor(private languageService: LanguageService) { }

// Get supported languages
const languages = this.languageService.getSupportedLanguages()

// Set current language
this.languageService.setLanguage('es')

// Get current language
const lang = this.languageService.getCurrentLanguage()

// Get instant translation
const text = this.languageService.instant('common.loading')

// Subscribe to language changes
this.languageService.currentLanguage$.subscribe(lang => {
  console.log('Language changed to:', lang)
})
```

## Usage in Templates

### 1. Basic Translation

Use the `translate` pipe:

```html
<h1>{{ 'titles.welcome' | translate }}</h1>
<p>{{ 'messages.success' | translate }}</p>
```

### 2. Translation with Parameters

```html
<p>{{ 'welcome.message' | translate:{ name: userName } }}</p>
```

JSON:
```json
{
  "welcome.message": "Welcome, {{name}}!"
}
```

### 3. Language Selector Component

Add the language selector to your app header/navbar:

```html
<app-language-selector></app-language-selector>
```

This will display a dropdown with all supported languages with flags and native names.

## Usage in Components (TypeScript)

### 1. Using TranslateService (for dynamic text)

```typescript
import { TranslateService } from '@ngx-translate/core'

constructor(private translate: TranslateService) { }

ngOnInit() {
  // Translate a key
  this.translate.get('common.loading').subscribe(text => {
    console.log(text) // Gets translated text
  })
  
  // Translate multiple keys
  this.translate.get(['common.loading', 'common.error']).subscribe((res: any) => {
    console.log(res['common.loading'])
    console.log(res['common.error'])
  })
}
```

### 2. Using LanguageService (instant translation)

```typescript
import { LanguageService } from './services/language.service'

constructor(private languageService: LanguageService) { }

ngOnInit() {
  // Get instant translation (synchronous)
  const title = this.languageService.instant('page.title')
  
  // Use in templates with [title] binding
  this.pageTitle = this.languageService.instant('page.title')
}
```

### 3. Detect Language Changes

```typescript
ngOnInit() {
  // Subscribe to language changes
  this.languageService.currentLanguage$.subscribe(lang => {
    console.log('User switched to:', lang)
    // Reload data, refresh UI, etc.
  })
}
```

## Adding Translation Keys

### 1. Add to Base Language (en.json)

Edit `src/assets/i18n/en.json`:

```json
{
  "myComponent.title": "My Title",
  "myComponent.description": "My Description",
  "myComponent.button": "Click Me"
}
```

### 2. Generate Translations

Run the auto-translation script:

```bash
# Set your OpenRouter API key
$env:OPENROUTER_API_KEY="sk-or-v1-YOUR_KEY_HERE"

# Generate translations for all missing keys
node scripts/translate.js update

# Validate translations
node scripts/translate.js validate

# See missing keys
node scripts/translate.js missing
```

## Translation File Structure

Locate at: `src/assets/i18n/[language].json`

Example:
```json
{
  "nav.home": "Home",
  "nav.about": "About",
  "common.loading": "Loading...",
  "common.error": "Error",
  "components.header.title": "My App",
  "components.footer.copyright": "© 2024 My Company"
}
```

## Best Practices

### 1. Key Naming Convention

Use hierarchical naming with dots:

```
[feature].[component].[element].[status]

Examples:
- nav.home
- common.loading
- titleGenerator.title
- titleGenerator.generating
```

### 2. String Extraction

When working with hardcoded strings, extract them to translation keys:

**Before:**
```html
<h1>Creative Title Generator</h1>
<button>Generate Titles</button>
```

**After:**
```html
<h1>{{ 'titleGenerator.title' | translate }}</h1>
<button>{{ 'titleGenerator.generate' | translate }}</button>
```

### 3. Don't Translate

Don't translate:
- Brand names
- Technical terms (if consistent)
- Code snippets
- URLs

### 4. Consistency

Keep similar strings with similar keys:
- `common.save`
- `common.cancel`
- `common.delete`

### 5. Testing

Always test with different languages to ensure:
- Text fits in UI (some languages are longer)
- RTL support for Arabic
- Special characters render correctly

## Validation Scripts

### Check for Missing Keys

```bash
node scripts/translate.js missing
```

Shows all keys in English that are missing in other languages.

### Validate All Files

```bash
node scripts/translate.js validate
```

Validates:
- All required keys are present
- No orphaned keys (keys in language files not in en.json)
- JSON is valid

## Common Patterns

### 1. Pluralization in Template

```html
<span>{{ count }} {{ 'common.credit' | translate }}{{ count > 1 ? 's' : '' }}</span>
```

### 2. Conditional Translation

```html
<ng-container [ngSwitch]="status">
  <span *ngSwitchCase="'loading'">{{ 'common.loading' | translate }}</span>
  <span *ngSwitchCase="'error'">{{ 'common.error' | translate }}</span>
  <span *ngSwitchDefault>{{ 'common.success' | translate }}</span>
</ng-container>
```

### 3. Dynamic Element Attributes

```html
<input 
  type="text" 
  [placeholder]="'common.placeholder' | translate"
  [aria-label]="'accessibility.inputField' | translate">
```

## Troubleshooting

### 1. Missing Translations

If you see keys like `[common.loading]` in the UI:
- Check the key exists in en.json
- Run `node scripts/translate.js update` to auto-translate
- Ensure language file is valid JSON

### 2. Language Not Switching

- Check browser localStorage for `redatudo_language` key
- Verify language code is correct (en, es, zh, etc.)
- Check browser console for errors

### 3. Font/Rendering Issues

- For Arabic, RTL styling may be needed
- For Chinese/Japanese, ensure proper font is loaded
- Test in all target languages before deployment

## Performance Tips

1. **Lazy Load Translations**: TranslateHttpLoader loads files on demand
2. **Cache**: Translations are cached by ngx-translate
3. **Preload**: Preload common language on app startup if needed

## Future Enhancements

1. User language preference in database
2. Regional variants (pt-br vs pt-pt)
3. RTL support for Arabic/Hebrew
4. Pluralization rules per language
5. Date/time/number formatting per locale

## Support

For issues or missing translations:
1. Check `node scripts/translate.js validate` output
2. Review missing keys with `node scripts/translate.js missing`
3. Add key to `en.json` and re-run update script

---

Last Updated: 2024
Translation Keys: 100+
Supported Languages: 10
auto-translation enabled: Yes
