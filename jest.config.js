module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Nested git worktrees under .worktrees/ carry their own node_modules (a second copy
  // of react et al.) — without this, jest's haste map picks up both copies and hooks
  // fail with "Cannot read properties of null (reading 'useState')".
  modulePathIgnorePatterns: ['<rootDir>/\\.worktrees/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/\\.worktrees/'],
  watchPathIgnorePatterns: ['<rootDir>/\\.worktrees/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|@tanstack/.*|i18next|react-i18next))',
  ],
};
