/* global jest */
import '@testing-library/react-native';

// Silence reanimated in tests
global.__reanimatedWorkletInit = () => {};

// Mock AsyncStorage globally so ThemeProvider (used in renderWithTheme) works in all tests.
jest.mock('@react-native-async-storage/async-storage', () => {
  let mem = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k) => Promise.resolve(mem[k] ?? null)),
      setItem: jest.fn((k, v) => { mem[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k) => { delete mem[k]; return Promise.resolve(); }),
    },
  };
});
