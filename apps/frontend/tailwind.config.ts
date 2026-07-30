import { content } from '@shipu/tailwind-config/content';

const config = {
    content: [
        './app/**/*.{ts,tsx,js,jsx,mdx}',
        './components/**/*.{ts,tsx,js,jsx,mdx}',
        '../../packages/ui/src/**/*.{ts,js,tsx,jsx,mdx}',
        ...content,
    ],
};

export default config;
