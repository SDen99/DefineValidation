// packages/app/src/lib/core/services/StorageServices.ts

// Define types based on your actual runes state structure
interface UIPreferences {
	leftSidebarOpen: boolean;
	rightSidebarOpen: boolean;
	leftSidebarWidth: number;
	rightSidebarWidth: number;
	viewMode: 'data' | 'metadata' | 'VLM';
	metadataViewMode: 'table' | 'card';
	SDTM: boolean;
	ADaM: boolean;
}

export interface MetadataViewState {
	expansions: Set<string>;
	searchTerm: string;
}

export interface SerializedMetadataViewState {
	expansions: string[];
	searchTerm: string;
}

export interface VLMViewState {
	columnWidths: Record<string, number>;
	columnOrder: string[];
	columnVisibility: Record<string, boolean>;
	expandedSections: string[];
	paramcdFilter: string;
}

export interface SerializedVLMViewState {
	columnWidths: Record<string, number>;
	columnOrder: string[];
	columnVisibility: Record<string, boolean>;
	expandedSections: string[];
	paramcdFilter: string;
}

// App persistent state interface
export interface AppPersistentState {
	uiPreferences: UIPreferences;
	metadataViews: Record<string, SerializedMetadataViewState>;
	vlmViews: Record<string, SerializedVLMViewState>;
	themePreferences: any;
}

export class StorageService {
	public static readonly STORAGE_KEY = 'sas-viewer-state';
	private static instance: StorageService | null = null;
	private storageAvailable: boolean = true;

	private constructor() {

		// TEST localStorage availability first
		try {
			const testKey = '__storage_test__';
			localStorage.setItem(testKey, 'test');
			localStorage.removeItem(testKey);

			// If we get here, localStorage works
			if (!localStorage.getItem(StorageService.STORAGE_KEY)) {
				this.saveState(this.getDefaultState());
			}
		} catch (error) {
			console.warn('localStorage not available, running in memory-only mode:', error);
			this.storageAvailable = false;
			// App will continue but won't persist state
		}
	}

	static getInstance(): StorageService {
		if (!StorageService.instance) {
			StorageService.instance = new StorageService();
		}
		return StorageService.instance;
	}

	private getDefaultState(): AppPersistentState {
		return {
			uiPreferences: {
				leftSidebarOpen: true,
				rightSidebarOpen: false,
				leftSidebarWidth: 320,
				rightSidebarWidth: 320,
				viewMode: 'data',
				metadataViewMode: 'table',
				SDTM: false,
				ADaM: false
			},
			themePreferences: {},
			metadataViews: {},
			vlmViews: {}
		};
	}

	loadState(): AppPersistentState {
		if (!this.storageAvailable) {
			return this.getDefaultState();
		}

		try {
			const stored = localStorage.getItem(StorageService.STORAGE_KEY);
			if (!stored) return this.getDefaultState();

			const parsed = JSON.parse(stored);

			// Validate that the parsed data has the expected structure
			if (!parsed || typeof parsed !== 'object') {
				console.warn('Invalid stored state, using defaults');
				return this.getDefaultState();
			}

			return { ...this.getDefaultState(), ...parsed };
		} catch (error) {
			console.warn('Failed to parse stored state, using defaults:', error);
			return this.getDefaultState();
		}
	}

	saveState(state: Partial<AppPersistentState>): void {
		if (!this.storageAvailable) {
			// Silently skip saving when storage is not available
			return;
		}

		try {
			const current = this.loadState();
			const updated = { ...current, ...state };
			localStorage.setItem(StorageService.STORAGE_KEY, JSON.stringify(updated));
		} catch (error) {
			console.warn('Failed to save state:', error);
			// Mark storage as unavailable if it starts failing
			this.storageAvailable = false;
		}
	}

	// Add a method to check if storage is working
	isStorageAvailable(): boolean {
		return this.storageAvailable;
	}

	/**
	 * Save VLM view state for a specific dataset
	 */
	public saveVLMViewState(datasetId: string, state: VLMViewState): void {
		if (!this.storageAvailable) {
			console.warn('[StorageService] Storage not available, skipping VLM view state save');
			return;
		}

		try {
			const serializedState: SerializedVLMViewState = {
				columnWidths: { ...state.columnWidths },
				columnOrder: [...state.columnOrder],
				columnVisibility: { ...state.columnVisibility },
				expandedSections: [...state.expandedSections],
				paramcdFilter: state.paramcdFilter
			};

			const currentState = this.loadState();
			currentState.vlmViews[datasetId] = serializedState;
			this.saveState(currentState);

			console.log(`[StorageService] Saved VLM view state for dataset: ${datasetId}`);
		} catch (error) {
			console.error('[StorageService] Error saving VLM view state:', error);
		}
	}

	/**
	 * Load VLM view state for a specific dataset
	 */
	public loadVLMViewState(datasetId: string): VLMViewState | null {
		if (!this.storageAvailable) {
			console.warn('[StorageService] Storage not available, returning null VLM view state');
			return null;
		}

		try {
			const state = this.loadState();
			const vlmState = state.vlmViews[datasetId];

			if (!vlmState) {
				console.log(`[StorageService] No VLM view state found for dataset: ${datasetId}`);
				return null;
			}

			const deserializedState: VLMViewState = {
				columnWidths: { ...vlmState.columnWidths },
				columnOrder: [...vlmState.columnOrder],
				columnVisibility: { ...vlmState.columnVisibility },
				expandedSections: [...vlmState.expandedSections],
				paramcdFilter: vlmState.paramcdFilter || ''
			};

			console.log(`[StorageService] Loaded VLM view state for dataset: ${datasetId}`);
			return deserializedState;
		} catch (error) {
			console.error('[StorageService] Error loading VLM view state:', error);
			return null;
		}
	}

	/**
	 * Clear VLM view state for a specific dataset
	 */
	public clearVLMViewState(datasetId: string): void {
		if (!this.storageAvailable) return;

		try {
			const currentState = this.loadState();
			delete currentState.vlmViews[datasetId];
			this.saveState(currentState);

			console.log(`[StorageService] Cleared VLM view state for dataset: ${datasetId}`);
		} catch (error) {
			console.error('[StorageService] Error clearing VLM view state:', error);
		}
	}

	/**
	 * Clear all VLM view states
	 */
	public clearAllVLMViewStates(): void {
		if (!this.storageAvailable) return;

		try {
			const currentState = this.loadState();
			currentState.vlmViews = {};
			this.saveState(currentState);

			console.log('[StorageService] Cleared all VLM view states');
		} catch (error) {
			console.error('[StorageService] Error clearing all VLM view states:', error);
		}
	}
}
