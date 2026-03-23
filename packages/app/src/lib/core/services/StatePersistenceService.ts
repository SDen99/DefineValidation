// packages/app/src/lib/core/services/StatePersistenceService.ts
import { StorageService, type AppPersistentState } from './StorageServices';

export class StatePersistenceService {
	private storage: StorageService;

	constructor() {
		this.storage = StorageService.getInstance();
	}

	/**
	 * Loads the entire state object from storage and returns it.
	 * It no longer has any side effects.
	 */
	public loadAllState(): AppPersistentState | null {
		try {
			const savedState = this.storage.loadState();
			// DO NOT restore app state here. Return the raw data.
			return savedState;
		} catch (error) {
			console.error('Failed to load state:', error);
			return null;
		}
	}

	/**
	 * Saves a partial state object by merging it with the existing state.
	 * This is the primary method for persisting changes.
	 */
	public saveState(state: Partial<AppPersistentState>): void {
		try {
			const currentState = this.storage.loadState();
			const newState = { ...currentState, ...state };
			this.storage.saveState(newState);
		} catch (error) {
			console.error('Failed to save state:', error);
		}
	}
}

export const statePersistenceService = new StatePersistenceService();
