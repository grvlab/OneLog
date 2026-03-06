import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    include: ['tests/**/*.test.{js,ts,tsx}'],
    environmentMatchGlobs: [
      ['tests/components/**', 'jsdom'],
    ],
  },
});
