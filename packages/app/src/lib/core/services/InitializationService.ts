// packages/app/src/lib/core/services/InitializationService.ts
import { ServiceContainer } from './ServiceContainer';
import { statePersistenceService } from './StatePersistenceService';
import type { ServiceContainer as ServiceContainerType, Dataset } from '$lib/core/types/types';
import type { AppPersistentState } from '$lib/core/services/StorageServices';

export interface InitialAppState {
	container: ServiceContainerType;
	existingDatasets: Record<string, Dataset>;
	savedUiState: AppPersistentState | null;
}

/**
 * A pure data fetching service. It gathers all necessary data from storage
 * but does NOT modify any application state.
 */
export async function initializeApplication(): Promise<InitialAppState> {
	try {
		console.log('INIT: 1. Initializing services...');
		const container = await ServiceContainer.initialize();
		console.log('INIT: 2. Services initialized. Fetching stored data...');

		const datasetService = container.getDatasetService();
		const existingDatasets = await datasetService.getAllDatasets();
		console.log(`INIT: 3. Found ${Object.keys(existingDatasets).length} datasets.`);

		const savedUiState = statePersistenceService.loadAllState();
		console.log('INIT: 4. Loaded UI state from storage.');

		// Return a single object with all the raw data.
		return { container, existingDatasets, savedUiState };
	} catch (error) {
		console.error('INIT: CRITICAL FAILURE during data fetching.', error);
		throw error;
	}
}
