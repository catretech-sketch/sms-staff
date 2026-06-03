import '@testing-library/react-native';

// Silence reanimated in tests
global.__reanimatedWorkletInit = () => {};
