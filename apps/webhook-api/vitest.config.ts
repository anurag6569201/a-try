import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@preview-qa/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@preview-qa/schemas': path.resolve(__dirname, '../../packages/schemas/src/index.ts'),
      '@preview-qa/db': path.resolve(__dirname, '../../packages/db/src/index.ts'),
      '@preview-qa/observability': path.resolve(__dirname, '../../packages/observability/src/index.ts'),
    },
  },
  test: {
    include: ['src/__tests__/**/*.test.ts'],
  },
});
