import { defineConfig } from 'vitest/config';

export default defineConfig({
  // One chunk, so the modulepreload polyfill has nothing to preload, and its fetch() would be refused
  // by connect-src 'none' anyway.
  build: { target: 'es2020', sourcemap: false, modulePreload: { polyfill: false } },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/perf/**/*.test.ts'],
    environment: 'node',
  },
});
