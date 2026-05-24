import { computed, effect, Injectable, signal } from '@angular/core';

export type AppLanguage = 'en' | 'he';
export type AppDirection = 'ltr' | 'rtl';

export interface AppLanguageOption {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  direction: AppDirection;
}

const STORAGE_KEY = 'ai-chat-language';

const EN_TRANSLATIONS = {
  'app.menu': 'Menu',
  'app.whatsappLogoAlt': 'WhatsApp logo',
  'tabs.primarySections': 'Primary sections',
  'tabs.profile': 'Profile',
  'tabs.chats': 'Chats',
  'tabs.calls': 'Calls',
  'placeholder.selectChatTitle': 'Select a chat',
  'placeholder.selectChatBody': 'Pick an existing conversation or create a new one from the sidebar.',
  'menu.enterFullscreen': 'Enter fullscreen',
  'menu.exitFullscreen': 'Exit fullscreen',
  'language.english': 'English',
  'language.hebrew': 'Hebrew',
  'profile.username': 'User name',
  'profile.computerName': 'Computer name',
  'profile.ipAddress': 'IP address',
  'profile.languageLabel': 'Language',
  'profile.currentLanguage': 'Current language',
  'chatList.searchPlaceholder': 'Search or start a new chat',
  'chatList.empty': 'No chats match your search.',
  'chatList.newChat': 'New chat',
  'chatList.startConversation': 'Start the conversation',
  'chat.newChatTitle': 'New chat',
  'chat.onlineNow': 'Online now',
  'chat.tapToStart': 'Tap to start chatting',
  'chat.now': 'now',
  'chat.noMessages': 'No messages yet',
  'chat.scrollToBottom': 'Scroll to bottom',
  'chat.typeMessage': 'Type a message',
  'chat.editMessagePlaceholder': 'Edit message',
  'chat.messageOptions': 'Message options',
  'chat.backToConversation': 'Back to conversation',
  'chat.back': 'Back',
  'chat.editMessage': 'Edit message',
  'chat.edit': 'Edit',
  'chat.deleteMessage': 'Delete message',
  'chat.delete': 'Delete',
  'chat.searchNavigation': 'Search navigation',
  'chat.previousMatch': 'Previous match',
  'chat.nextMatch': 'Next match',
  'chat.searchInChat': 'Search in chat',
  'chat.closeSearch': 'Close search',
  'chat.backToChatList': 'Back to chat list',
  'chat.actions': 'Chat actions',
  'chat.searchConversation': 'Search conversation',
  'chat.actionsMenu': 'Chat actions menu',
  'chat.deleteChat': 'Delete chat',
  'composer.attachFile': 'Attach file',
  'composer.emoji': 'Emoji',
  'composer.sendMessage': 'Send message',
  'message.openOptions': 'Open message options',
  'message.optionsTitle': 'Message options',
  'message.openAttachment': 'Open attachment',
  'message.edited': 'edited',
  'filePreview.close': 'Close file preview',
  'filePreview.size': 'Size',
  'filePreview.type': 'Type',
  'filePreview.loading': 'Loading...',
} as const;

export type TranslationKey = keyof typeof EN_TRANSLATIONS;

const TRANSLATIONS: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: EN_TRANSLATIONS,
  he: {
    'app.menu': 'תפריט',
    'app.whatsappLogoAlt': 'לוגו WhatsApp',
    'tabs.primarySections': 'אזורים ראשיים',
    'tabs.profile': 'פרופיל',
    'tabs.chats': 'צ׳אטים',
    'tabs.calls': 'שיחות',
    'placeholder.selectChatTitle': 'בחרו צ׳אט',
    'placeholder.selectChatBody': 'בחרו שיחה קיימת או צרו שיחה חדשה מהסרגל הצדדי.',
    'menu.enterFullscreen': 'כניסה למסך מלא',
    'menu.exitFullscreen': 'יציאה ממסך מלא',
    'language.english': 'אנגלית',
    'language.hebrew': 'עברית',
    'profile.username': 'שם משתמש',
    'profile.computerName': 'שם מחשב',
    'profile.ipAddress': 'כתובת IP',
    'profile.languageLabel': 'שפה',
    'profile.currentLanguage': 'השפה הנוכחית',
    'chatList.searchPlaceholder': 'חיפוש או התחלת צ׳אט חדש',
    'chatList.empty': 'לא נמצאו צ׳אטים שתואמים לחיפוש.',
    'chatList.newChat': 'צ׳אט חדש',
    'chatList.startConversation': 'התחילו את השיחה',
    'chat.newChatTitle': 'צ׳אט חדש',
    'chat.onlineNow': 'מחובר עכשיו',
    'chat.tapToStart': 'הקישו כדי להתחיל לצ׳וטט',
    'chat.now': 'עכשיו',
    'chat.noMessages': 'אין הודעות עדיין',
    'chat.scrollToBottom': 'גלילה לתחתית',
    'chat.typeMessage': 'הקלידו הודעה',
    'chat.editMessagePlaceholder': 'עריכת הודעה',
    'chat.messageOptions': 'אפשרויות הודעה',
    'chat.backToConversation': 'חזרה לשיחה',
    'chat.back': 'חזרה',
    'chat.editMessage': 'עריכת הודעה',
    'chat.edit': 'עריכה',
    'chat.deleteMessage': 'מחיקת הודעה',
    'chat.delete': 'מחיקה',
    'chat.searchNavigation': 'ניווט בחיפוש',
    'chat.previousMatch': 'תוצאה קודמת',
    'chat.nextMatch': 'תוצאה הבאה',
    'chat.searchInChat': 'חיפוש בצ׳אט',
    'chat.closeSearch': 'סגירת החיפוש',
    'chat.backToChatList': 'חזרה לרשימת הצ׳אטים',
    'chat.actions': 'פעולות צ׳אט',
    'chat.searchConversation': 'חיפוש בשיחה',
    'chat.actionsMenu': 'תפריט פעולות צ׳אט',
    'chat.deleteChat': 'מחיקת צ׳אט',
    'composer.attachFile': 'צירוף קובץ',
    'composer.emoji': 'אימוג׳י',
    'composer.sendMessage': 'שליחת הודעה',
    'message.openOptions': 'פתיחת אפשרויות הודעה',
    'message.optionsTitle': 'אפשרויות הודעה',
    'message.openAttachment': 'פתיחת קובץ מצורף',
    'message.edited': 'נערכה',
    'filePreview.close': 'סגירת תצוגת הקובץ',
    'filePreview.size': 'גודל',
    'filePreview.type': 'סוג',
    'filePreview.loading': 'טוען...',
  },
};

const LANGUAGE_OPTIONS: AppLanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr' },
  { code: 'he', label: 'Hebrew', nativeLabel: 'עברית', direction: 'rtl' },
];

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  readonly languageOptions = LANGUAGE_OPTIONS;

  private readonly languageSignal = signal<AppLanguage>(this.getInitialLanguage());

  readonly language = this.languageSignal.asReadonly();
  readonly direction = computed(() => this.currentOption.direction);
  readonly isRtl = computed(() => this.direction() === 'rtl');

  constructor() {
    effect(() => {
      const language = this.language();
      const direction = this.direction();

      this.persistLanguage(language);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
        document.documentElement.dir = direction;
        document.body.dir = direction;
      }
    });
  }

  setLanguage(language: AppLanguage): void {
    if (!this.languageOptions.some((option) => option.code === language)) {
      return;
    }

    this.languageSignal.set(language);
  }

  t(key: TranslationKey): string {
    return TRANSLATIONS[this.language()][key];
  }

  get currentOption(): AppLanguageOption {
    return this.languageOptions.find((option) => option.code === this.language()) ?? this.languageOptions[0]!;
  }

  private getInitialLanguage(): AppLanguage {
    if (typeof localStorage === 'undefined') {
      return 'en';
    }

    const storedLanguage = localStorage.getItem(STORAGE_KEY);
    return storedLanguage === 'he' || storedLanguage === 'en' ? storedLanguage : 'en';
  }

  private persistLanguage(language: AppLanguage): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, language);
  }
}
