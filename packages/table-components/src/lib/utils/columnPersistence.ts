// Column state persistence utilities
export interface ColumnState {
	visibleColumns?: string[];
	columnWidths?: Record<string, number>;
	sort?: Array<{ column: string; direction: 'asc' | 'desc' }>;
}

/**
 * Persists column state to localStorage for a specific dataset
 */
export function persistColumnState(datasetId: string, state: ColumnState): void {
	try {
		if (!datasetId) return;

		console.log(`[columnPersistence] Persisting state for ${datasetId}:`, {
			visibleColumnsCount: state.visibleColumns?.length ?? 0,
			columnWidthsCount: Object.keys(state.columnWidths ?? {}).length,
			sortCount: state.sort?.length ?? 0
		});

		localStorage.setItem(`table-state-${datasetId}`, JSON.stringify(state));
		console.log(`[columnPersistence] Successfully persisted state for ${datasetId}`);
	} catch (error) {
		console.error(`[columnPersistence] Failed to persist state:`, error);
	}
}

/**
 * Restores column state from localStorage for a specific dataset
 */
export function restoreColumnState(datasetId: string): ColumnState | null {
	try {
		const saved = localStorage.getItem(`table-state-${datasetId}`);
		if (!saved) {
			console.log(`[columnPersistence] No persisted state for ${datasetId}`);
			return null;
		}

		const state = JSON.parse(saved) as ColumnState;
		console.log(`[columnPersistence] Loading persisted state:`, state);
		return state;
	} catch (error) {
		console.error(`[columnPersistence] Failed to load persisted state:`, error);
		return null;
	}
}

/**
 * Calculates column widths based on available container width and column count
 */
export function calculateColumnWidths(columns: string[], containerWidth: number): Record<string, number> {
	const minColumnWidth = 150;
	const maxColumnWidth = 300;
	const defaultColumnWidth = 200;
	
	if (columns.length === 0) return {};
	
	// Calculate ideal width per column
	const idealWidth = containerWidth / columns.length;
	
	// Clamp to min/max bounds
	const columnWidth = Math.max(minColumnWidth, Math.min(maxColumnWidth, idealWidth));
	
	// Return record with all columns set to the calculated width
	const result: Record<string, number> = {};
	columns.forEach(column => {
		result[column] = columnWidth;
	});
	
	return result;
}