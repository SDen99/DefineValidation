/**
 * filterData - Pure stateless filter function
 *
 * Replaces the stateful FilterEngine class.
 * Takes data + filters in, returns filtered data out. No side effects.
 */

import type { DataRow } from '../types/core';
import type {
	Filter,
	TextFilter,
	NumericFilter,
	DateFilter,
	SetFilter,
	BooleanFilter,
	GlobalFilter,
	FilterCombination
} from '../types/filters';

export interface FilterDataOptions {
	globalFilter?: GlobalFilter;
	combination?: FilterCombination;
}

/**
 * Filter data using the provided filters.
 * Returns a new array containing only rows that pass all filters.
 */
export function filterData<T extends DataRow>(
	data: T[],
	filters: Filter[],
	options?: FilterDataOptions
): T[] {
	const combination = options?.combination ?? 'AND';
	const globalFilter = options?.globalFilter;

	// Separate column filters from global filters, skip disabled
	const columnFilters = filters.filter(
		(f): f is Exclude<Filter, GlobalFilter> => f.type !== 'global' && (f.enabled ?? true)
	);

	if (columnFilters.length === 0 && !globalFilter) {
		return data;
	}

	return data.filter((row) => {
		// Apply global filter first
		if (globalFilter && (globalFilter.enabled ?? true)) {
			if (!applyGlobalFilter(row, globalFilter)) {
				return false;
			}
		}

		// Apply column filters
		if (columnFilters.length === 0) {
			return true;
		}

		// Group filters by column
		const filtersByColumn = new Map<string, Filter[]>();
		for (const filter of columnFilters) {
			const existing = filtersByColumn.get(filter.columnId);
			if (existing) {
				existing.push(filter);
			} else {
				filtersByColumn.set(filter.columnId, [filter]);
			}
		}

		const columnResults: boolean[] = [];
		for (const [, colFilters] of filtersByColumn) {
			// Within a column, combine with AND
			const colResult = colFilters.every((filter) => applySingleFilter(row, filter));
			columnResults.push(colResult);
		}

		// Combine across columns
		return combination === 'AND'
			? columnResults.every((r) => r)
			: columnResults.some((r) => r);
	});
}

function applyGlobalFilter<T extends DataRow>(row: T, filter: GlobalFilter): boolean {
	const searchTerm = filter.caseSensitive ? filter.value : filter.value.toLowerCase();

	const columnsToSearch = filter.searchableColumns || Object.keys(row);

	return columnsToSearch.some((columnId) => {
		const value = row[columnId];
		if (value == null) return false;

		const stringValue = filter.caseSensitive ? String(value) : String(value).toLowerCase();

		return stringValue.includes(searchTerm);
	});
}

function applySingleFilter<T extends DataRow>(row: T, filter: Filter): boolean {
	if (filter.type === 'global') return true;

	const value = row[filter.columnId];

	switch (filter.type) {
		case 'text':
			return applyTextFilter(value, filter);
		case 'numeric':
			return applyNumericFilter(value, filter);
		case 'date':
			return applyDateFilter(value, filter);
		case 'set':
			return applySetFilter(value, filter);
		case 'boolean':
			return applyBooleanFilter(value, filter);
		default:
			return true;
	}
}

function applyTextFilter(value: unknown, filter: TextFilter): boolean {
	if (filter.operator === 'isEmpty') {
		return value == null || String(value).trim() === '';
	}
	if (filter.operator === 'isNotEmpty') {
		return value != null && String(value).trim() !== '';
	}

	// For null values: negative operators should return true, positive operators should return false
	if (value == null) {
		return (
			filter.operator === 'notContains' ||
			filter.operator === 'notEquals' ||
			filter.operator === 'notStartsWith' ||
			filter.operator === 'notEndsWith'
		);
	}

	const stringValue = filter.caseSensitive ? String(value) : String(value).toLowerCase();
	const filterValue = filter.caseSensitive ? filter.value : filter.value.toLowerCase();

	// Whole word matching uses regex with word boundaries
	if (filter.wholeWord) {
		try {
			const escapedValue = filterValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const flags = filter.caseSensitive ? '' : 'i';

			switch (filter.operator) {
				case 'contains': {
					const regex = new RegExp(`\\b${escapedValue}\\b`, flags);
					return regex.test(String(value));
				}
				case 'notContains': {
					const regex = new RegExp(`\\b${escapedValue}\\b`, flags);
					return !regex.test(String(value));
				}
				case 'equals': {
					const regex = new RegExp(`^${escapedValue}$`, flags);
					return regex.test(String(value));
				}
				case 'notEquals': {
					const regex = new RegExp(`^${escapedValue}$`, flags);
					return !regex.test(String(value));
				}
				case 'startsWith': {
					const regex = new RegExp(`^${escapedValue}\\b`, flags);
					return regex.test(String(value));
				}
				case 'notStartsWith': {
					const regex = new RegExp(`^${escapedValue}\\b`, flags);
					return !regex.test(String(value));
				}
				case 'endsWith': {
					const regex = new RegExp(`\\b${escapedValue}$`, flags);
					return regex.test(String(value));
				}
				case 'notEndsWith': {
					const regex = new RegExp(`\\b${escapedValue}$`, flags);
					return !regex.test(String(value));
				}
				default:
					return true;
			}
		} catch {
			// If regex fails, fall back to non-whole-word matching
		}
	}

	// Standard string matching (non-whole-word)
	switch (filter.operator) {
		case 'contains':
			return stringValue.includes(filterValue);
		case 'notContains':
			return !stringValue.includes(filterValue);
		case 'equals':
			return stringValue === filterValue;
		case 'notEquals':
			return stringValue !== filterValue;
		case 'startsWith':
			return stringValue.startsWith(filterValue);
		case 'notStartsWith':
			return !stringValue.startsWith(filterValue);
		case 'endsWith':
			return stringValue.endsWith(filterValue);
		case 'notEndsWith':
			return !stringValue.endsWith(filterValue);
		default:
			return true;
	}
}

function applyNumericFilter(value: unknown, filter: NumericFilter): boolean {
	if (filter.operator === 'isEmpty') {
		return value == null;
	}
	if (filter.operator === 'isNotEmpty') {
		return value != null;
	}

	if (value == null) return false;
	const numValue = Number(value);
	if (isNaN(numValue)) return false;

	switch (filter.operator) {
		case 'equals':
			return numValue === filter.value;
		case 'notEquals':
			return numValue !== filter.value;
		case 'greaterThan':
			return numValue > filter.value;
		case 'greaterThanOrEqual':
			return numValue >= filter.value;
		case 'lessThan':
			return numValue < filter.value;
		case 'lessThanOrEqual':
			return numValue <= filter.value;
		case 'between':
			return filter.value2 != null && numValue >= filter.value && numValue <= filter.value2;
		case 'notBetween':
			return filter.value2 != null && !(numValue >= filter.value && numValue <= filter.value2);
		default:
			return true;
	}
}

function applyDateFilter(value: unknown, filter: DateFilter): boolean {
	if (filter.operator === 'isEmpty') {
		return value == null;
	}
	if (filter.operator === 'isNotEmpty') {
		return value != null;
	}

	if (value == null) return false;

	const dateValue = value instanceof Date ? value : new Date(String(value));
	if (isNaN(dateValue.getTime())) return false;

	const filterDate = filter.value instanceof Date ? filter.value : new Date(filter.value);

	switch (filter.operator) {
		case 'equals':
			return dateValue.toDateString() === filterDate.toDateString();
		case 'notEquals':
			return dateValue.toDateString() !== filterDate.toDateString();
		case 'before':
			return dateValue < filterDate;
		case 'after':
			return dateValue > filterDate;
		case 'between': {
			if (filter.value2 == null) return false;
			const filterDate2 =
				filter.value2 instanceof Date ? filter.value2 : new Date(filter.value2);
			return dateValue >= filterDate && dateValue <= filterDate2;
		}
		case 'notBetween': {
			if (filter.value2 == null) return false;
			const filterDate2 =
				filter.value2 instanceof Date ? filter.value2 : new Date(filter.value2);
			return !(dateValue >= filterDate && dateValue <= filterDate2);
		}
		default:
			return true;
	}
}

function applySetFilter(value: unknown, filter: SetFilter): boolean {
	const valueStr = value === null || value === undefined ? '' : String(value);
	const filterValuesStr = filter.values.map((v) =>
		v === null || v === undefined ? '' : String(v)
	);

	return filter.operator === 'in'
		? filterValuesStr.includes(valueStr)
		: !filterValuesStr.includes(valueStr);
}

function applyBooleanFilter(value: unknown, filter: BooleanFilter): boolean {
	return Boolean(value) === filter.value;
}
