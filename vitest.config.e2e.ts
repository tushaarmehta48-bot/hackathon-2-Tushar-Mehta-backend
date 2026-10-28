import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    globalSetup: ['./test/global-setup-e2e.ts'],
  },
});
