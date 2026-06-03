const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  { ignores: ['docs/**', 'dist/**', 'node_modules/**'] },
  ...expoConfig,
];
