/**
 * Filter negation utilities for toggling filter operators between positive and negative forms.
 */

import type {
	Filter,
	FilterOperator,
	TextFilter,
	NumericFilter,
	DateFilter,
	SetFilter
} from '../types/filters';

/**
 * Bidirectional operator negation map.
 * Each entry maps a positive operator to its negative counterpart and vice versa.
 */
export const OPERATOR_NEGATION_MAP: Record<string, FilterOperator> = {
	// Text operators
	contains: 'notContains',
	notContains: 'contains',
	equals: 'notEquals',
	notEquals: 'equals',
	startsWith: 'notStartsWith',
	notStartsWith: 'startsWith',
	endsWith: 'notEndsWith',
	notEndsWith: 'endsWith',
	isEmpty: 'isNotEmpty',
	isNotEmpty: 'isEmpty',

	// Numeric operators
	greaterThan: 'lessThanOrEqual',
	lessThanOrEqual: 'greaterThan',
	greaterThanOrEqual: 'lessThan',
	lessThan: 'greaterThanOrEqual',
	between: 'notBetween',
	notBetween: 'between',

	// Set operators
	in: 'notIn',
	notIn: 'in',

	// Date operators
	before: 'after',
	after: 'before'
};

const NEGATED_OPERATORS = new Set<string>([
	'notContains',
	'notEquals',
	'notStartsWith',
	'notEndsWith',
	'isNotEmpty',
	'notIn',
	'notBetween',
	'lessThan',
	'lessThanOrEqual',
	'after'
]);

/**
 * Returns true if the operator represents a negated/negative form.
 */
export function isNegatedOperator(operator: FilterOperator): boolean {
	return NEGATED_OPERATORS.has(operator);
}

/**
 * Returns a new filter with the operator toggled to its negation.
 * If no negation exists for the operator, returns the filter unchanged.
 */
export function toggleFilterNegation<T extends Exclude<Filter, { type: 'global' }>>(
	filter: T
): T {
	const negated = OPERATOR_NEGATION_MAP[filter.operator];
	if (!negated) return filter;

	switch (filter.type) {
		case 'text':
			return { ...filter, operator: negated } as T;
		case 'numeric':
			return { ...filter, operator: negated } as T;
		case 'date':
			return { ...filter, operator: negated } as T;
		case 'set':
			return { ...filter, operator: negated } as T;
		default:
			return filter;
	}
}
