import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'lib'),
			'$app/environment': path.resolve(__dirname, '__mocks__/app-environment.ts')
		}
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			include: ['src/lib/services/**/*.ts'],
			exclude: ['src/lib/services/**/*.test.ts']
		}
	}
});
