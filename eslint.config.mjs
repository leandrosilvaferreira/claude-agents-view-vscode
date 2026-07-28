import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'out/**',
      'node_modules/**',
      'esbuild.js',
      'eslint.config.mjs',
      'vitest.config.ts',
      'coverage/**',
      'scratch/**',
      // Tooling outside the extension source (not in tsconfig) — the typed config
      // can't parse them and they follow their own conventions.
      '.claude/**',
      '.agents/**',
      'scripts/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      sonarjs,
      prettier,
      'import-x': importX,
    },
    rules: {
      // Auto formatting
      'prettier/prettier': 'error',

      // Max lines per file
      'max-lines': [
        'error',
        {
          max: 355,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // Complexity
      complexity: ['error', 10], // Cyclomatic complexity
      'sonarjs/cognitive-complexity': ['error', 15], // Cognitive complexity

      // Circular dependencies
      'import-x/no-cycle': 'error',

      // Strict TypeScript / Clean Code
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/max-params': ['error', { max: 3 }],
    },
  },
  eslintConfigPrettier,
);
