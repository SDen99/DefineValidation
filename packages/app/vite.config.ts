import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import inspect from 'vite-plugin-inspect';

export default defineConfig({
	plugins: [
		sveltekit(),
		inspect()
	],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	worker: {
		format: 'es'
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
	},
	server: {
		fs: {
			allow: ['static']
		}
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				}
			}
		},
		sourcemap: 'hidden',
		minify: 'terser',
		terserOptions: {
			compress: {
				// Strip console.log/debug in production — keeps warn/error for diagnostics
				pure_funcs: ['console.log', 'console.debug']
			}
		}
	}
});
