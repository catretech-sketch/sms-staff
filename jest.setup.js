/* global jest */
import '@testing-library/react-native';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './src/i18n/resources/en.json';
import hi from './src/i18n/resources/hi.json';
import mr from './src/i18n/resources/mr.json';
import ta from './src/i18n/resources/ta.json';

// Silence reanimated in tests
global.__reanimatedWorkletInit = () => {};

// Initialise i18n synchronously so t('common.retry') returns 'Retry' in tests.
if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      ta: { translation: ta },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

// Mock AsyncStorage globally so ThemeProvider (used in renderWithTheme) works in all tests.
jest.mock('@react-native-async-storage/async-storage', () => {
  let mem = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k, v) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k) => { delete mem[k]; return Promise.resolve(); }),
      clear: jest.fn(() => { mem = {}; return Promise.resolve(); }),
    },
  };
});
