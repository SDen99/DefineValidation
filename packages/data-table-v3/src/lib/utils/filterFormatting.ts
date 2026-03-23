/**
 * Filter formatting utilities for compact chip display text.
 */

import type {
	Filter,
	TextFilter,
	NumericFilter,
	DateFilter,
	SetFilter,
	BooleanFilter
} from '../types/filters';
import type { ColumnConfig } from '../types/columns';

/**
 * Format a filter into compact chip display text.
 * Negated operators show positive notation — the chip icon indicates negation visually.
 */
export function formatFilterChip(
	filter: Exclude<Filter, { type: 'global' }>,
	column: ColumnConfig
): string {
	const name = column.header;

	switch (filter.type) {
		case 'text':
			return formatTextFilter(name, filter);
		case 'numeric':
			return formatNumericFilter(name, filter);
		case 'date':
			return formatDateFilter(name, filter);
		case 'set':
			return formatSetFilter(name, filter);
		case 'boolean':
			return formatBooleanFilter(name, filter);
		default:
			return name;
	}
}

function formatTextFilter(name: string, filter: TextFilter): string {
	switch (filter.operator) {
		case 'contains':
		case 'notContains':
			return `${name} ~ "${filter.value}"`;
		case 'equals':
		case 'notEquals':
			return `${name} = "${filter.value}"`;
		case 'startsWith':
		case 'notStartsWith':
			return `${name} ^= "${filter.value}"`;
		case 'endsWith':
		case 'notEndsWith':
			return `${name} $= "${filter.value}"`;
		case 'isEmpty':
			return `${name} is empty`;
		case 'isNotEmpty':
			return `${name} is not empty`;
		case 'in':
			return `${name} in (${filter.value})`;
		default:
			return name;
	}
}

function formatNumericFilter(name: string, filter: NumericFilter): string {
	switch (filter.operator) {
		case 'equals':
		case 'notEquals':
			return `${name} = ${filter.value}`;
		case 'greaterThan':
			return `${name} > ${filter.value}`;
		case 'greaterThanOrEqual':
			return `${name} >= ${filter.value}`;
		case 'lessThan':
			return `${name} < ${filter.value}`;
		case 'lessThanOrEqual':
			return `${name} <= ${filter.value}`;
		case 'between':
		case 'notBetween':
			return `${filter.value} < ${name} < ${filter.value2 ?? '?'}`;
		case 'isEmpty':
			return `${name} is empty`;
		case 'isNotEmpty':
			return `${name} is not empty`;
		default:
			return name;
	}
}

function formatDateFilter(name: string, filter: DateFilter): string {
	const formatDate = (d: Date | string): string => {
		if (d instanceof Date) return d.toISOString().split('T')[0];
		return String(d).split('T')[0];
	};

	switch (filter.operator) {
		case 'equals':
		case 'notEquals':
			return `${name} = ${formatDate(filter.value)}`;
		case 'before':
			return `${name} < ${formatDate(filter.value)}`;
		case 'after':
			return `${name} > ${formatDate(filter.value)}`;
		case 'between':
		case 'notBetween':
			return `${name}: ${formatDate(filter.value)} to ${filter.value2 ? formatDate(filter.value2) : '?'}`;
		case 'isEmpty':
			return `${name} is empty`;
		case 'isNotEmpty':
			return `${name} is not empty`;
		default:
			return name;
	}
}

function formatSetFilter(name: string, _filter: SetFilter): string {
	return `${name}:`;
}

function formatBooleanFilter(name: string, filter: BooleanFilter): string {
	return `${name} = ${filter.value ? 'Y' : 'N'}`;
}

/**
 * Get the display values for a set filter's sub-chips.
 */
export function getSetFilterSubChips(filter: SetFilter): string[] {
	return filter.values.map((v) => (v === null || v === undefined ? '(empty)' : String(v)));
}
