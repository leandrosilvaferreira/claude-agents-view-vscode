import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'out/**',
        'esbuild.js',
        'eslint.config.mjs',
        'scratch/**',
        'src/types.ts',
        'src/extension.ts',
        'src/sessionTreeDataProvider.ts',
        'src/treeItems.ts',
        'src/logger.ts',
      ],
    },
  },
});
