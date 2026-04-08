// packages/app/src/routes/+layout.ts
import { browser } from '$app/environment';
import {
	initializeApplication,
	type InitialAppState
} from '$lib/core/services/InitializationService.ts';
export const ssr = false; // We need client-side APIs for storage

/**
 * The SvelteKit `load` function. This is the new entry point for our application's data.
 * It runs BEFORE any component is mounted.
 */
export async function load(): Promise<{ initialData: InitialAppState | null }> {
	if (browser) {
		try {
			// Await the raw data from our service. This function is now the sole caller.
			const initialData = await initializeApplication();
			return { initialData };
		} catch (error) {
			console.error('CRITICAL: Failed to load initial data in +layout.ts', error);
			// Return null on failure so the UI can handle the error state.
			return { initialData: null };
		}
	}
	// Return null if not in the browser, as we can't initialize.
	return { initialData: null };
}
