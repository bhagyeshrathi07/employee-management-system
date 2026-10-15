import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount React trees after every test so DOM state never leaks between cases.
afterEach(() => {
  cleanup();
});

// jsdom does not implement these browser APIs used by the download helper and layout code.
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    Object.defineProperty(window.URL, 'createObjectURL', { value: () => 'blob:mock', writable: true });
  }
  if (!window.URL.revokeObjectURL) {
    Object.defineProperty(window.URL, 'revokeObjectURL', { value: () => undefined, writable: true });
  }
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }
}
