import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@preview-qa/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@preview-qa/runner-playwright': path.resolve(__dirname, '../../packages/runner-playwright/src/index.ts'),
    },
  },
  test: {
    include: ['src/__tests__/**/*.test.ts'],
  },
});
