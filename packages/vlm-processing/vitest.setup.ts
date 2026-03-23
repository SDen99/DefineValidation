/**
 * Vitest Setup for VLM Processing Package
 */

// Mock Svelte 5 runtime for testing
globalThis.$state = (initial: any) => {
  let value = initial;
  return {
    get value() { return value; },
    set value(newValue) { value = newValue; }
  };
};

globalThis.$derived = (fn: () => any) => {
  return {
    get value() { return fn(); }
  };
};

globalThis.$effect = (fn: () => void) => {
  // Mock effect - just run the function once for testing
  fn();
};

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only show non-test-related errors
  const message = args[0];
  if (typeof message === 'string' && message.includes('[CRITICAL] No PARAMCD mapping found!')) {
    // Suppress expected test warnings
    return;
  }
  originalConsoleError(...args);
};