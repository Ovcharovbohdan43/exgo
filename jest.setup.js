// Mock AsyncStorage for Jest
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Suppress console warnings/errors in tests (optional, can be removed if you want to see them)
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

