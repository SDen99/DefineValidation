// packages/app/svelte.config.js
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter(),
    },

    vitePlugin: {
        inspector: {
            toggleKeyCombo: 'meta-shift',
            showToggleButton: 'never',
            toggleButtonPos: 'top-left'
        }
    }
};

export default config;
