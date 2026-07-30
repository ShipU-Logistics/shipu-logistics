import { config as reactConfig } from '@shipu/eslint-config/react-internal';
import reactRefresh from 'eslint-plugin-react-refresh';

/** @type {import("eslint").Linter.Config[]} */
export default [
    ...reactConfig,
    {
        plugins: {
            'react-refresh': reactRefresh,
        },
        rules: {
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        },
    },
];
