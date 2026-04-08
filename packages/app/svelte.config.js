// packages/app/svelte.config.js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter({ precompress: true }),
        paths: {
            base: process.env.BASE_PATH || ''
        }
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
