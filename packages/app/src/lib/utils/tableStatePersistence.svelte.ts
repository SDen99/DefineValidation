/**
 * Table State Persistence Utilities
 *
 * Provides localStorage persistence for data table filters and sorting
 * using Svelte 5 runes pattern with controlled component architecture.
 *
 * Used by ClinicalDataTableV3 for per-dataset state persistence.
 */

import type { SerializedFilter, SortConfig } from '@sden99/data-table-v3';

export interface TablePersistedState {
	filters?: SerializedFilter[];
	sort?: SortConfig[];
	columnWidths?: Record<string, number>;
}

const STORAGE_KEY_PREFIX = 'clinical-table-v3-state';

/**
 * Load persisted table state from localStorage for a specific dataset
 *
 * @param datasetId - Unique dataset identifier
 * @returns Persisted filter and sort state, or empty object if none found
 */
export function loadTableState(datasetId: string): TablePersistedState {
	if (typeof window === 'undefined') {
		return {}; // SSR safety
	}

	try {
		const key = `${STORAGE_KEY_PREFIX}-${datasetId}`;
		const stored = localStorage.getItem(key);

		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error('[TablePersistence] Failed to load state for', datasetId, error);
	}

	return {};
}

/**
 * Save table state to localStorage for a specific dataset
 *
 * @param datasetId - Unique dataset identifier
 * @param filters - Array of serialized filters
 * @param sorts - Array of sort configurations
 * @param columnWidths - Optional column width configuration
 */
export function saveTableState(
	datasetId: string,
	filters: SerializedFilter[],
	sorts: SortConfig[],
	columnWidths?: Record<string, number>
): void {
	if (typeof window === 'undefined') {
		return; // SSR safety
	}

	try {
		const key = `${STORAGE_KEY_PREFIX}-${datasetId}`;
		const state: TablePersistedState = {
			filters,
			sort: sorts,
			columnWidths
		};
		localStorage.setItem(key, JSON.stringify(state));
	} catch (error) {
		console.error('[TablePersistence] Failed to save state for', datasetId, error);
	}
}

/**
 * Clear persisted state for a specific dataset
 *
 * @param datasetId - Unique dataset identifier
 */
export function clearTableState(datasetId: string): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		const key = `${STORAGE_KEY_PREFIX}-${datasetId}`;
		localStorage.removeItem(key);
	} catch (error) {
		console.error('[TablePersistence] Failed to clear state for', datasetId, error);
	}
}

/**
 * Clear all persisted table states
 * Useful for debugging or resetting the application
 */
export function clearAllTableStates(): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		const keys = Object.keys(localStorage);
		keys.forEach(key => {
			if (key.startsWith(STORAGE_KEY_PREFIX)) {
				localStorage.removeItem(key);
			}
		});
	} catch (error) {
		console.error('[TablePersistence] Failed to clear all states', error);
	}
}
