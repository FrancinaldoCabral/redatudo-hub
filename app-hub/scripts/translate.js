#!/usr/bin/env node

/**
 * Automatic i18n Translation Script
 * Generates and validates translations for 10 languages using OpenRouter API
 * Usage: node scripts/translate.js [update|validate|missing]
 */

const fs = require('fs');
const path = require('path');

const LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
  hi: 'Hindi',
  ar: 'Arabic',
  'pt-br': 'Brazilian Portuguese',
  bn: 'Bengali',
  ru: 'Russian',
  ja: 'Japanese',
  fr: 'French'
};

const I18N_DIR = path.join(__dirname, '../src/assets/i18n');
const BASE_LANG = 'en';

// Ensure i18n directory exists
if (!fs.existsSync(I18N_DIR)) {
  fs.mkdirSync(I18N_DIR, { recursive: true });
}

/**
 * Load translation file
 */
function loadTranslations(lang) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`Error parsing ${lang}.json:`, e.message);
      return {};
    }
  }
  return {};
}

/**
 * Save translation file
 */
function saveTranslations(lang, translations) {
  const filePath = path.join(I18N_DIR, `${lang}.json`);
  fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n');
  console.log(`✅ Saved ${lang}.json (${Object.keys(translations).length} keys)`);
}

/**
 * Call OpenRouter API for translation
 */
async function translateWithOpenRouter(text, targetLanguage) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable not set');
  }

  const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translated text, nothing else.

Text: "${text}"

Translation:`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'i18n-translator'
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    }
    throw new Error('Unexpected API response format');
  } catch (error) {
    console.error(`Translation error for "${text}":`, error.message);
    return null;
  }
}

/**
 * Translate a batch of keys
 */
async function translateBatch(keys, targetLanguage, delayMs = 500) {
  const translations = {};
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const baseText = baseTranslations[key];
    
    console.log(`[${i + 1}/${keys.length}] Translating "${key}" to ${targetLanguage}...`);
    
    const translated = await translateWithOpenRouter(baseText, targetLanguage);
    if (translated) {
      translations[key] = translated;
    } else {
      translations[key] = baseText; // Fallback to English
    }
    
    // Delay to avoid rate limiting
    if (i < keys.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return translations;
}

/**
 * Get missing keys for a language
 */
function getMissingKeys(lang) {
  const langTranslations = loadTranslations(lang);
  const baseKeys = Object.keys(baseTranslations);
  return baseKeys.filter(key => !langTranslations.hasOwnProperty(key));
}

/**
 * Get orphaned keys (exist in translation but not in base)
 */
function getOrphanedKeys(lang) {
  const langTranslations = loadTranslations(lang);
  const baseKeys = Object.keys(baseTranslations);
  return Object.keys(langTranslations).filter(key => !baseKeys.includes(key));
}

/**
 * Validate all translation files
 */
async function validateAll() {
  console.log('\n🔍 Validating all translation files...\n');
  
  let hasIssues = false;
  const baseKeys = Object.keys(baseTranslations);
  
  for (const lang of Object.keys(LANGUAGES)) {
    if (lang === BASE_LANG) continue;
    
    const missing = getMissingKeys(lang);
    const orphaned = getOrphanedKeys(lang);
    
    if (missing.length === 0 && orphaned.length === 0) {
      console.log(`✅ ${lang.toUpperCase()}: Complete and valid`);
    } else {
      hasIssues = true;
      if (missing.length > 0) {
        console.log(`⚠️  ${lang.toUpperCase()}: Missing ${missing.length} keys`);
        console.log(`   Keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
      }
      if (orphaned.length > 0) {
        console.log(`⚠️  ${lang.toUpperCase()}: ${orphaned.length} orphaned keys`);
        console.log(`   Keys: ${orphaned.slice(0, 5).join(', ')}${orphaned.length > 5 ? '...' : ''}`);
      }
    }
  }
  
  console.log(`\n📊 Summary: Base language has ${baseKeys.length} translation keys`);
  return !hasIssues;
}

/**
 * Update translations for missing keys
 */
async function updateMissing() {
  console.log('\n🚀 Updating missing translations...\n');
  
  for (const lang of Object.keys(LANGUAGES)) {
    if (lang === BASE_LANG) continue;
    
    const missing = getMissingKeys(lang);
    
    if (missing.length === 0) {
      console.log(`✅ ${lang.toUpperCase()}: All keys present`);
      continue;
    }
    
    console.log(`\n📝 Translating ${missing.length} missing keys for ${lang.toUpperCase()}...`);
    
    const langTranslations = loadTranslations(lang);
    const newTranslations = await translateBatch(missing, LANGUAGES[lang]);
    
    // Merge with existing translations
    const merged = { ...langTranslations, ...newTranslations };
    
    // Sort keys alphabetically
    const sorted = Object.keys(merged)
      .sort()
      .reduce((acc, key) => {
        acc[key] = merged[key];
        return acc;
      }, {});
    
    saveTranslations(lang, sorted);
  }
}

/**
 * Generate missing translation files
 */
async function generateMissing() {
  console.log('\n🌍 Generating missing language files...\n');
  
  for (const lang of Object.keys(LANGUAGES)) {
    if (lang === BASE_LANG) continue;
    
    const filePath = path.join(I18N_DIR, `${lang}.json`);
    
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${lang.toUpperCase()}: File exists`);
      continue;
    }
    
    console.log(`\n📝 Creating ${lang.toUpperCase()} file with ${Object.keys(baseTranslations).length} keys...`);
    
    const newTranslations = await translateBatch(
      Object.keys(baseTranslations),
      LANGUAGES[lang],
      300 // Faster for new files
    );
    
    saveTranslations(lang, newTranslations);
  }
}

/**
 * Show missing keys report
 */
function showMissing() {
  console.log('\n📋 Missing translations report:\n');
  
  const baseKeys = Object.keys(baseTranslations);
  
  for (const lang of Object.keys(LANGUAGES)) {
    if (lang === BASE_LANG) continue;
    
    const missing = getMissingKeys(lang);
    if (missing.length > 0) {
      console.log(`\n${lang.toUpperCase()}: ${missing.length} missing keys`);
      missing.forEach(key => {
        console.log(`  - ${key}: "${baseTranslations[key]}"`);
      });
    }
  }
  
  console.log(`\n✅ Total keys to translate: ${baseKeys.length}`);
}

// Main execution
const baseTranslations = loadTranslations(BASE_LANG);

if (Object.keys(baseTranslations).length === 0) {
  console.error('❌ Base English translations (en.json) not found or empty!');
  process.exit(1);
}

const command = process.argv[2] || 'validate';

(async () => {
  try {
    switch (command) {
      case 'validate':
        const isValid = await validateAll();
        process.exit(isValid ? 0 : 1);
        break;
      case 'update':
      case 'gen':
        await generateMissing();
        await updateMissing();
        await validateAll();
        break;
      case 'missing':
        showMissing();
        break;
      default:
        console.log(`
Usage: node scripts/translate.js [command]

Commands:
  validate        Validate all translation files (default)
  update/gen      Generate and update all translations
  missing         Show missing translation keys

Environment:
  OPENROUTER_API_KEY  Your OpenRouter API key (required for update/gen)
  
Examples:
  node scripts/translate.js validate
  OPENROUTER_API_KEY=sk-... node scripts/translate.js update
        `);
    }
  } catch (error) {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  }
})();
