/**
 * Jest setup file.
 * This file is run before each test file.
 */

// Mock XMLHttpRequest for defaultLoadFunction tests
(global as any).XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  responseType: '',
  timeout: 0,
  onload: null,
  onerror: null,
  ontimeout: null,
  onloadstart: null,
  status: 200,
  response: null,
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
(global as any).URL.createObjectURL = jest.fn(() => 'blob:mock-url');
(global as any).URL.revokeObjectURL = jest.fn();

// Suppress console.log in tests unless debugging
// Uncomment the next line to silence console output during tests
// global.console.log = jest.fn();
