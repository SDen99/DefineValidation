/**
 * GlobalStateProvider implementation for VLM Processing Package
 * Provides dependency injection interface for VLM processing service
 */

import type { GlobalStateProvider } from '@sden99/vlm-processing';
import * as dataState from './dataState.svelte.js';

/**
 * Implementation of GlobalStateProvider interface for the app's data state
 */
export class AppGlobalStateProvider implements GlobalStateProvider {
	getSelectedDomain(): string | null {
		return dataState.getSelectedDomain();
	}

	getSelectedDatasetId(): string | null {
		return dataState.getSelectedDatasetId();
	}

	getDefineXmlInfo(): any {
		return dataState.getDefineXmlInfo();
	}

	getDatasets(): any {
		return dataState.getDatasets();
	}
}

// Export a singleton instance
export const globalStateProvider = new AppGlobalStateProvider();
