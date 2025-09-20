// Fix: Removed triple-slash directive to resolve type definition error.
// The `defineConfig` import provides sufficient type information for this file.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
});
