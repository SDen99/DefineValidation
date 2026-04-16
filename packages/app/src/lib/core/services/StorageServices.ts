// packages/app/src/lib/core/services/StorageServices.ts

// Define types based on your actual runes state structure
export interface UIPreferences {
	leftSidebarOpen: boolean;
	rightSidebarOpen: boolean;
	leftSidebarWidth: number;
	rightSidebarWidth: number;
	viewMode: 'data' | 'metadata';
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

// App persistent state interface
export interface AppPersistentState {
	uiPreferences: UIPreferences;
	metadataViews: Record<string, SerializedMetadataViewState>;
	themePreferences: ThemePreferences;
}

export interface ThemePreferences {
	mode: 'light' | 'dark' | 'system';
	followSystem?: boolean;
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
			themePreferences: { mode: 'system' },
			metadataViews: {}
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

			if (!parsed || typeof parsed !== 'object') {
				console.warn('Invalid stored state, using defaults');
				return this.getDefaultState();
			}

			const defaults = this.getDefaultState();

			return {
				uiPreferences:
					parsed.uiPreferences && typeof parsed.uiPreferences === 'object'
						? { ...defaults.uiPreferences, ...parsed.uiPreferences }
						: defaults.uiPreferences,
				themePreferences:
					parsed.themePreferences && typeof parsed.themePreferences === 'object'
						? { ...defaults.themePreferences, ...parsed.themePreferences }
						: defaults.themePreferences,
				metadataViews:
					parsed.metadataViews && typeof parsed.metadataViews === 'object'
						? parsed.metadataViews
						: defaults.metadataViews
			};
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

}
