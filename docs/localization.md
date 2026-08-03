# Localization

Every user-facing string is stored as a translation key and resolved at render time. Adding a language is a data change: drop a JSON file into `public/languages/` and it appears in the language picker without touching component code.

## Language files

A language is a single JSON file in `public/languages/`, named after its code:

```json
{
  "code": "he",
  "name": "עברית",
  "direction": "rtl",
  "strings": {
    "common.cancel": "ביטול",
    "chat.tapToStart": "הקישו כדי להתחיל לשוחח"
  }
}
```

| Field | Meaning |
| --- | --- |
| `code` | Language code. Must match `/^[a-z0-9-]+$/i` and be unique across files. |
| `name` | Name shown in the language picker, written in the language itself. |
| `direction` | `ltr` or `rtl`. Applied to `document.documentElement.dir`. |
| `strings` | Flat map of translation key to translated text. |

`en.json` is required. The Electron main process loads the directory in `ipc/language.handler.ts`, skips files that are unreadable, invalid, or duplicate an existing code, and fills any key a language is missing from English. A translation file is therefore never required to be complete.

`en.json` is also imported directly by `LanguageService`, so English renders synchronously on the first paint and in browser-only unit tests, where no Electron IPC is available.

## Key naming

Keys are short dotted codes describing where the string lives, not the English sentence:

```
common.cancel
chat.tapToStart
settings.general.startAtLogin.label
settings.general.startAtLogin.description
```

Settings keys follow `settings.<section>.<row>.<label|description|confirmTitle|confirmMessage>`.

Do not use the English text as the key. Keys are identifiers: rewording the English copy should not require editing every other language file.

## Translating in templates

Use the `translate` pipe:

```html
<button>{{ 'common.cancel' | translate }}</button>
<span>{{ 'provider.connectProvider' | translate: { provider: provider.name } }}</span>
```

Placeholders are written as `{name}` in the language file and passed as the pipe's second argument.

## Translating in TypeScript

Inject `LanguageService` and call `translate`:

```ts
private readonly languageService = inject(LanguageService);

chatName(chat: Chat): string {
  return this.languageService.translate(chat.name());
}
```

An unknown key falls back to English, then to the key itself, so a missing translation degrades to a visible identifier instead of a blank UI.

## Domain state stores keys, not text

Chat `name`, `subtitle`, and `timeLabel` hold translation keys rather than translated text. A chat created while Hebrew is active still renders correctly in English later, and the stored value never depends on the language that happened to be active at creation time. Translate these values where they are displayed:

```ts
chatTimeLabel(chat: Chat): string {
  return this.languageService.translate(chat.timeLabel());
}
```

## How re-rendering works

`TranslatePipe` is pure, so Angular only re-runs it when its input key changes. Switching languages does not change any key, so translated text would go stale. Instead of paying the per-change-detection cost of an impure pipe, `App` keys the router outlet on the active language:

```ts
readonly activeLanguage = computed(() => [this.languageService.activeLanguageCode()]);
```

```html
@for (languageCode of activeLanguage(); track languageCode) {
  <router-outlet />
}
```

Switching languages rebuilds the routed view exactly once, which re-evaluates every pipe in it. Router state and the URL survive the rebuild; per-component view state such as scroll position does not.

Removing this `@for`, or marking the pipe `pure: false`, breaks language switching. `src/app/app-language.spec.ts` guards the behavior.

## Selecting a language

```ts
await this.languageService.selectLanguage('he');
```

`selectLanguage` sets `document.documentElement.lang` and `dir`, and persists the choice to `localStorage` under `ai-chat-language`. The stored code is restored on the next launch, defaulting to English.

Read `availableLanguages()` to populate a picker and `activeLanguageCode()` to mark the current entry. `isLoading()` is `true` until the language files have been read.

## Right-to-left layout

Because `dir` is set on the document element, use logical CSS properties so a layout mirrors automatically:

| Use | Instead of |
| --- | --- |
| `margin-inline-start` | `margin-left` |
| `padding-inline-end` | `padding-right` |
| `inset-inline-start` | `left` |
| `text-align: start` | `text-align: left` |

Reserve physical properties for things that must not mirror, such as an icon that always points the same way.

## Adding a language

1. Copy `public/languages/en.json` to `public/languages/<code>.json`.
2. Set `code`, `name`, and `direction`.
3. Translate the values in `strings`, leaving the keys untouched.
4. Restart the app. The language appears in the picker.

Untranslated keys fall back to English, so a partial file is safe to ship.
