import { config as baseConfig } from './packages/eslint-config/base.js';
import { config as reactConfig } from './packages/eslint-config/react-internal.js';

/**
 * Global ESLint Configuration for ShipU Logistics monorepo.
 * Applies across all files in apps/, packages/, and root.
 */
export default [
    // 1. Workspace-wide Global Ignores
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.next/**',
            '**/.turbo/**',
            '**/build/**',
            '**/out/**',
            '**/coverage/**',
            '**/bun.lock',
            '**/generated/**',
            '**/prisma/generated/**',
        ],
    },

    // 2. Base Configuration (Applied globally to all TypeScript/JavaScript files)
    // Includes: TypeScript-ESLint, Prettier, Turbo, Import Sorting, Unused Imports
    ...baseConfig,

    // 3. React-specific rules for Frontend and UI packages
    ...reactConfig.map((cfg) => ({
        ...cfg,
        files: ['apps/frontend/**/*.{ts,tsx,js,jsx}', 'packages/ui/**/*.{ts,tsx,js,jsx}'],
    })),
];
