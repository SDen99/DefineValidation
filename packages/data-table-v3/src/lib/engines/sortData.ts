/**
 * sortData - Pure stateless sort function
 *
 * Replaces the stateful SortEngine class.
 * Takes data + sort configs in, returns sorted data out. No side effects.
 */

import type { DataRow } from '../types/core';
import type { SortConfig, SortDirection, SortOptions } from '../types/sorting';

/**
 * Sort data using the provided sort configurations.
 * Returns a new sorted array. Does not mutate the input.
 */
export function sortData<T extends DataRow>(
	data: T[],
	sortConfigs: SortConfig[],
	options?: SortOptions
): T[] {
	const opts: SortOptions = {
		clinicalMode: false,
		stable: true,
		caseSensitive: false,
		nullHandling: 'last',
		...options
	};

	if (sortConfigs.length === 0 && !opts.clinicalMode && !opts.priorityColumn) {
		return [...data];
	}

	// Store original indices for stable sorting
	const originalIndices = new Map<T, number>();
	data.forEach((row, index) => {
		originalIndices.set(row, index);
	});

	const sorted = [...data];

	sorted.sort((a, b) => {
		// Clinical mode: Prioritize USUBJID (or priority column)
		if (opts.clinicalMode || opts.priorityColumn) {
			const priorityCol = opts.priorityColumn || 'USUBJID';
			const userSortingPriorityCol = sortConfigs.find((c) => c.columnId === priorityCol);

			if (a[priorityCol] != null || b[priorityCol] != null) {
				const direction = userSortingPriorityCol ? userSortingPriorityCol.direction : 'asc';
				const priorityResult = compareValues(a[priorityCol], b[priorityCol], direction, opts);
				if (priorityResult !== 0) return priorityResult;
			}

			if (userSortingPriorityCol) {
				// Apply other sorts (excluding the priority column since we already handled it)
				for (const config of sortConfigs) {
					if (config.columnId === priorityCol) continue;
					const result = compareValues(
						a[config.columnId],
						b[config.columnId],
						config.direction,
						opts
					);
					if (result !== 0) return result;
				}

				if (opts.stable) {
					return (originalIndices.get(a) || 0) - (originalIndices.get(b) || 0);
				}
				return 0;
			}
		}

		// Apply configured sorts in priority order
		for (const config of sortConfigs) {
			const result = compareValues(
				a[config.columnId],
				b[config.columnId],
				config.direction,
				opts
			);
			if (result !== 0) return result;
		}

		// Stable sort: preserve original order for equal elements
		if (opts.stable) {
			return (originalIndices.get(a) || 0) - (originalIndices.get(b) || 0);
		}

		return 0;
	});

	return sorted;
}

function compareValues(
	a: unknown,
	b: unknown,
	direction: SortDirection,
	opts: SortOptions
): number {
	// Handle null/undefined
	if (a == null && b == null) return 0;
	if (a == null) return opts.nullHandling === 'first' ? -1 : 1;
	if (b == null) return opts.nullHandling === 'first' ? 1 : -1;

	const typeA = typeof a;
	const typeB = typeof b;

	let result = 0;

	// Both numbers
	if (typeA === 'number' && typeB === 'number') {
		result = (a as number) - (b as number);
	}
	// Both booleans
	else if (typeA === 'boolean' && typeB === 'boolean') {
		result = a === b ? 0 : a ? 1 : -1;
	}
	// Both dates (check if string looks like date)
	else if (isDateString(a) && isDateString(b)) {
		const dateA = new Date(String(a));
		const dateB = new Date(String(b));
		result = dateA.getTime() - dateB.getTime();
	}
	// String comparison (default)
	else {
		const strA = String(a);
		const strB = String(b);

		if (opts.caseSensitive) {
			if (strA < strB) result = -1;
			else if (strA > strB) result = 1;
			else result = 0;
		} else {
			result = strA.toLowerCase().localeCompare(strB.toLowerCase());
		}
	}

	return direction === 'asc' ? result : -result;
}

function isDateString(value: unknown): boolean {
	if (typeof value !== 'string') return false;

	const datePattern = /^\d{4}-\d{2}-\d{2}/;
	if (!datePattern.test(value)) return false;

	const date = new Date(value);
	return !isNaN(date.getTime());
}
