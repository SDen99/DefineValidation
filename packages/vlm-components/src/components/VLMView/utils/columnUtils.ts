import { getColumnWidth as getVLMColumnWidth } from '@sden99/vlm-processing';

/**
 * Gets the column width from the VLM store
 */
export function getColumnWidth(datasetName: string, column: string): number {
	if (!column || !datasetName) return 150;
	// Use the new state module's getter
	return getVLMColumnWidth(datasetName, column, 150);
}

// DOM manipulation functions removed - using pure Svelte reactivity instead
// Column widths are now handled through reactive $derived state in components

/**
 * Helper function to format comparators
 */
export function formatComparator(comparator: string): string {
	switch (comparator) {
		case 'EQ':
			return '=';
		case 'NE':
			return '≠';
		case 'LT':
			return '<';
		case 'LE':
			return '≤';
		case 'GT':
			return '>';
		case 'GE':
			return '≥';
		case 'IN':
			return 'in';
		case 'NOTIN':
			return 'not in';
		default:
			return comparator;
	}
}

/**
 * Generate a unique ID for each section
 */
export function getSectionId(paramcd: string, column: string, sectionType: string): string {
	return `${paramcd}_${column}_${sectionType}`;
}
