import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import onlyWarn from 'eslint-plugin-only-warn';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import turboPlugin from 'eslint-plugin-turbo';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
    js.configs.recommended,
    eslintConfigPrettier,
    ...tseslint.configs.recommended,
    {
        plugins: {
            turbo: turboPlugin,
            'simple-import-sort': simpleImportSort,
            'unused-imports': unusedImports,
        },
        rules: {
            'turbo/no-undeclared-env-vars': 'warn',

            // Best Practices & Safety
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'object-shorthand': 'error',
            'prefer-template': 'warn',

            // TypeScript Rules
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'off',

            // Automatically sort imports
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',

            // Remove unused imports
            'unused-imports/no-unused-imports': 'error',

            // warn for unused variables
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        plugins: {
            onlyWarn,
        },
    },
    {
        ignores: ['dist/**'],
    },
];
