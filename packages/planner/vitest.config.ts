import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@preview-qa/domain': path.resolve(__dirname, '../domain/src/index.ts'),
      '@preview-qa/db': path.resolve(__dirname, '../db/src/index.ts'),
      '@preview-qa/parser': path.resolve(__dirname, '../parser/src/index.ts'),
      '@preview-qa/ai': path.resolve(__dirname, '../ai/src/index.ts'),
    },
  },
  test: {
    include: ['src/__tests__/**/*.test.ts'],
  },
});
