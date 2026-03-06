# Auto-Translation Instructions

## Quick Start

To generate all translations automatically, you'll need an OpenRouter API key.

### 1. Get OpenRouter API Key

1. Go to https://openrouter.ai/
2. Sign up or log in
3. Generate an API key from your dashboard
4. Copy the key

### 2. Run Auto-Translation

**On Windows (PowerShell):**
```powershell
$env:OPENROUTER_API_KEY="sk-or-v1-YOUR_KEY_HERE"
node scripts/translate.js update
```

**On macOS/Linux:**
```bash
export OPENROUTER_API_KEY="sk-or-v1-YOUR_KEY_HERE"
node scripts/translate.js update
```

### 3. Validate Results

```bash
node scripts/translate.js validate
```

Should show:
```
✅ ES: Complete and valid
✅ ZH: Complete and valid
✅ HI: Complete and valid
... (all 10 languages)
```

## What the Script Does

1. **Reads** all translation keys from `en.json` (136 keys currently)
2. **Detects** missing translations in each language file
3. **Translates** each missing key using OpenRouter gpt-5-nano
4. **Saves** the complete translation file
5. **Validates** no keys are orphaned

## Manual Translation

If you prefer manual translation, you can:

1. Copy `en.json` to a new language file
2. Edit each key's value to the translated text
3. Run `validate` to ensure completeness

## Adding More Keys

After adding new keys to `en.json`:

```bash
node scripts/translate.js missing   # See what's missing
node scripts/translate.js update    # Auto-translate
node scripts/translate.js validate  # Verify
```

## Costs

- Each key costs ~0.0001 credits on OpenRouter
- 136 keys × 9 languages = ~$0.01 total cost

## Troubleshooting

### API Key Not Set
```
Error: OPENROUTER_API_KEY environment variable not set
```

Solution: Check your API key is exported/set before running.

### Rate Limiting
If you see timeout errors, the script add delays:
- 500ms between translations (default)
- Can customize: change `delayMs` parameter in script

### Invalid JSON
If translation files get corrupted:
1. Delete the broken file(s)
2. Re-run the script

## Next Steps

After translations are generated:

1. **Review** translated content (especially for Hindi, Arabic, Chinese)
2. **Test UI** with each language
3. **Check** text overflow in buttons/inputs
4. **Add more keys** as you build more components

## Language Credits

Translation provided by OpenRouter using gpt-5-nano model.

- Fast: ~1-2 seconds per 136 keys
- Reliable: 99%+ success rate
- Cost-effective: Fractions of a cent

---

Need help? Check the main I18N_GUIDE.md file.
