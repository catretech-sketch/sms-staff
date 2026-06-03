import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { asyncStore } from '@/lib/asyncStore';
import en from './resources/en.json';
import hi from './resources/hi.json';
import mr from './resources/mr.json';
import ta from './resources/ta.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'hi', native: 'हिंदी' },
  { code: 'mr', native: 'मराठी' },
  { code: 'ta', native: 'தமிழ்' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const LANG_KEY = 'sms_staff_lang';

export const i18n = i18next;

function isSupported(code: string | null): code is LanguageCode {
  return code != null && SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

let initPromise: Promise<void> | null = null;

async function doInit(): Promise<void> {
  const saved = await asyncStore.get<string>(LANG_KEY);
  const lng: LanguageCode = isSupported(saved) ? saved : 'en';
  await i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      ta: { translation: ta },
    },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    parseMissingKeyHandler: (key) => key,
  });
}

export function initI18n(): Promise<void> {
  if (i18next.isInitialized) return Promise.resolve();
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  // Persist first so a failed write never leaves UI and storage out of sync.
  await asyncStore.set(LANG_KEY, code);
  await i18next.changeLanguage(code);
}
