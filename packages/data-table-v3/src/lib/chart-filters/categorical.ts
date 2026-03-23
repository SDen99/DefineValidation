/**
 * Categorical distribution calculation for chart filters
 */

import type {
	ColumnMetadata,
	CategoricalDistribution,
	CategoricalItem,
	CategoricalOptions
} from './types';

export const DEFAULT_CATEGORICAL_OPTIONS: CategoricalOptions = {
	maxItems: 5,
	showAllCodelistValues: false,
	includeNulls: true
};

/**
 * Calculate categorical distribution for a column
 */
export function calculateCategoricalDistribution(
	data: Record<string, unknown>[],
	columnId: string,
	metadata: ColumnMetadata,
	options: CategoricalOptions = {}
): CategoricalDistribution {
	const opts = { ...DEFAULT_CATEGORICAL_OPTIONS, ...options };

	// Count occurrences
	const counts = new Map<string, number>();
	let nullCount = 0;

	for (const row of data) {
		const value = row[columnId];

		if (value === null || value === undefined || value === '') {
			nullCount++;
			if (opts.includeNulls) {
				counts.set('(empty)', (counts.get('(empty)') || 0) + 1);
			}
		} else {
			const strValue = String(value);
			counts.set(strValue, (counts.get(strValue) || 0) + 1);
		}
	}

	// Build items array
	let items: CategoricalItem[] = [];

	// If fixedValues provided (for ghost overlay alignment), use those in that order
	if (opts.fixedValues) {
		for (const value of opts.fixedValues) {
			const count = counts.get(value) || 0;
			const codeItem = metadata.codelist?.find((c) => c.codedValue === value);
			items.push({
				value,
				decode: value === '(empty)' ? 'Empty/Missing' : codeItem?.decode,
				count,
				percentage: data.length > 0 ? (count / data.length) * 100 : 0
			});
		}
	} else if (metadata.codelist && opts.showAllCodelistValues) {
		// If we have a codelist and want to show all values
		for (const codeItem of metadata.codelist) {
			const count = counts.get(codeItem.codedValue) || 0;
			items.push({
				value: codeItem.codedValue,
				decode: codeItem.decode,
				count,
				percentage: data.length > 0 ? (count / data.length) * 100 : 0
			});
		}

		// Add any values not in codelist
		for (const [value, count] of counts) {
			if (value !== '(empty)' && !metadata.codelist.some((c) => c.codedValue === value)) {
				items.push({
					value,
					decode: undefined,
					count,
					percentage: data.length > 0 ? (count / data.length) * 100 : 0
				});
			}
		}
	} else {
		// Just use what's in the data
		for (const [value, count] of counts) {
			if (value === '(empty)') continue; // Handle separately

			const codeItem = metadata.codelist?.find((c) => c.codedValue === value);
			items.push({
				value,
				decode: codeItem?.decode,
				count,
				percentage: data.length > 0 ? (count / data.length) * 100 : 0
			});
		}
	}

	// Sort by count descending (only if not using fixedValues)
	if (!opts.fixedValues) {
		items.sort((a, b) => b.count - a.count);
	}

	// Add (empty) at the end if present (only if not using fixedValues, which already includes it)
	if (!opts.fixedValues && opts.includeNulls && nullCount > 0) {
		items.push({
			value: '(empty)',
			decode: 'Empty/Missing',
			count: nullCount,
			percentage: data.length > 0 ? (nullCount / data.length) * 100 : 0
		});
	}

	// Store all items before truncating
	const allItems = [...items];

	// Check if we need to truncate
	const hasMore = items.length > (opts.maxItems || 5);

	// Truncate to top N for display
	let displayItems = items;
	if (opts.maxItems && items.length > opts.maxItems) {
		displayItems = items.slice(0, opts.maxItems);
	}

	return {
		type: 'categorical',
		columnId,
		items: displayItems,
		allItems,
		totalCount: data.length,
		nullCount,
		hasMore
	};
}
