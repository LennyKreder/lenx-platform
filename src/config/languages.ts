export const languages = {
  en: {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: 'EN',
    hasWeekStartOption: true,
    hasTimeFormatOption: true,
    defaultWeekStart: 'monday' as const,
    defaultTimeFormat: '24h' as const,
  },
  nl: {
    id: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    hasWeekStartOption: false,
    hasTimeFormatOption: false,
    defaultWeekStart: 'monday' as const,
    defaultTimeFormat: '24h' as const,
  },
} as const;

export type LanguageId = keyof typeof languages;
export type Language = (typeof languages)[LanguageId];

export type WeekStart = 'monday' | 'sunday';
export type TimeFormat = '24h' | 'ampm';
export type CalendarIntegration = 'none' | 'google' | 'apple';
