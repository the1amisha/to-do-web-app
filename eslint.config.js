import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Warnings (informative, don't fail CI)
      'no-unused-vars': 'warn',

      // Disabled (intentional project decisions)
      //
      // no-console: Storage module intentionally logs errors on
      // corrupt data so developers can diagnose localStorage issues.
      'no-console': 'off',
    },
  },
  {
    // Don't lint third-party code or config files
    ignores: ['node_modules/', 'download/'],
  },
]