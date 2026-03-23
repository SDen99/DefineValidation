import type { ColumnConfig } from '../types/columns';

/**
 * Serializable column state for localStorage
 */
export interface ColumnState {
	id: string;
	visible: boolean;
	width?: number;
	order: number;
}

/**
 * Options for state management
 */
export interface StateManagerOptions {
	/** Unique key for localStorage */
	storageKey: string;
	/** Enable debug logging */
	debug?: boolean;
}

/**
 * ColumnStateManager
 *
 * Manages persistence of column configuration to localStorage.
 * Stores only essential state (visibility, width, order) without
 * duplicating configuration like dataType, formatter, etc.
 */
export class ColumnStateManager {
	private storageKey: string;
	private debug: boolean;

	constructor(options: StateManagerOptions) {
		this.storageKey = options.storageKey;
		this.debug = options.debug || false;
	}

	/**
	 * Save column state to localStorage
	 */
	saveState(columns: ColumnConfig[]): void {
		try {
			// Extract only state properties
			const state: ColumnState[] = columns.map((col) => ({
				id: col.id,
				visible: col.visible,
				width: col.width,
				order: col.order
			}));

			localStorage.setItem(this.storageKey, JSON.stringify(state));

			if (this.debug) {
				console.log('[ColumnStateManager] Saved state:', state);
			}
		} catch (error) {
			console.error('[ColumnStateManager] Failed to save state:', error);
		}
	}

	/**
	 * Load column state from localStorage
	 * Returns null if no saved state exists
	 */
	loadState(): ColumnState[] | null {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) return null;

			const state = JSON.parse(stored) as ColumnState[];

			if (this.debug) {
				console.log('[ColumnStateManager] Loaded state:', state);
			}

			return state;
		} catch (error) {
			console.error('[ColumnStateManager] Failed to load state:', error);
			return null;
		}
	}

	/**
	 * Merge saved state with column configurations
	 * Preserves configuration (dataType, formatter, etc.) while applying saved state
	 */
	mergeState(columns: ColumnConfig[], savedState: ColumnState[]): ColumnConfig[] {
		// Create a map of saved state by column ID
		const stateMap = new Map(savedState.map((state) => [state.id, state]));

		// Merge state into columns
		const merged = columns.map((col) => {
			const state = stateMap.get(col.id);
			if (!state) return col;

			return {
				...col,
				visible: state.visible,
				width: state.width ?? col.width,
				order: state.order
			};
		});

		// Sort by order
		merged.sort((a, b) => a.order - b.order);

		if (this.debug) {
			console.log('[ColumnStateManager] Merged state with columns:', merged);
		}

		return merged;
	}

	/**
	 * Restore column state from localStorage
	 * Returns columns with applied state, or original columns if no state exists
	 */
	restoreState(columns: ColumnConfig[]): ColumnConfig[] {
		const savedState = this.loadState();
		if (!savedState) {
			if (this.debug) {
				console.log('[ColumnStateManager] No saved state, using defaults');
			}
			return columns;
		}

		return this.mergeState(columns, savedState);
	}

	/**
	 * Clear saved state from localStorage
	 */
	clearState(): void {
		try {
			localStorage.removeItem(this.storageKey);
			if (this.debug) {
				console.log('[ColumnStateManager] Cleared state');
			}
		} catch (error) {
			console.error('[ColumnStateManager] Failed to clear state:', error);
		}
	}

	/**
	 * Check if saved state exists
	 */
	hasState(): boolean {
		try {
			return localStorage.getItem(this.storageKey) !== null;
		} catch {
			return false;
		}
	}

	/**
	 * Validate that saved state matches current columns
	 * Returns true if all column IDs in saved state exist in current columns
	 */
	validateState(columns: ColumnConfig[], savedState: ColumnState[]): boolean {
		const columnIds = new Set(columns.map((c) => c.id));
		const savedIds = savedState.map((s) => s.id);

		// Check if all saved IDs exist in current columns
		const allExist = savedIds.every((id) => columnIds.has(id));

		if (this.debug) {
			console.log('[ColumnStateManager] State validation:', {
				valid: allExist,
				columnIds: Array.from(columnIds),
				savedIds
			});
		}

		return allExist;
	}

	/**
	 * Auto-save functionality
	 * Returns a function that saves state with debouncing
	 */
	createAutoSave(
		columns: () => ColumnConfig[],
		debounceMs: number = 500
	): () => void {
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			timeoutId = setTimeout(() => {
				this.saveState(columns());
				if (this.debug) {
					console.log('[ColumnStateManager] Auto-saved');
				}
			}, debounceMs);
		};
	}
}

/**
 * Create a column state manager instance
 */
export function createColumnStateManager(options: StateManagerOptions): ColumnStateManager {
	return new ColumnStateManager(options);
}
