import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		package: {
			dir: 'dist',
			exports: {
				include: ['**'],
				exclude: ['**/*.test.*', '**/*.spec.*']
			},
			files: {
				include: ['**']
			}
		}
	}
};

export default config;