import { describe, it, expect } from 'vitest';
import {
	OPERATOR_NEGATION_MAP,
	isNegatedOperator,
	toggleFilterNegation
} from '../filterNegation';
import type {
	TextFilter,
	NumericFilter,
	DateFilter,
	SetFilter
} from '../../types/filters';

describe('OPERATOR_NEGATION_MAP', () => {
	it('should be bidirectional for all entries', () => {
		for (const [op, negated] of Object.entries(OPERATOR_NEGATION_MAP)) {
			expect(OPERATOR_NEGATION_MAP[negated]).toBe(op);
		}
	});

	it('should map text operators correctly', () => {
		expect(OPERATOR_NEGATION_MAP['contains']).toBe('notContains');
		expect(OPERATOR_NEGATION_MAP['equals']).toBe('notEquals');
		expect(OPERATOR_NEGATION_MAP['startsWith']).toBe('notStartsWith');
		expect(OPERATOR_NEGATION_MAP['endsWith']).toBe('notEndsWith');
		expect(OPERATOR_NEGATION_MAP['isEmpty']).toBe('isNotEmpty');
	});

	it('should map numeric operators correctly', () => {
		expect(OPERATOR_NEGATION_MAP['greaterThan']).toBe('lessThanOrEqual');
		expect(OPERATOR_NEGATION_MAP['greaterThanOrEqual']).toBe('lessThan');
		expect(OPERATOR_NEGATION_MAP['between']).toBe('notBetween');
	});

	it('should map set operators correctly', () => {
		expect(OPERATOR_NEGATION_MAP['in']).toBe('notIn');
		expect(OPERATOR_NEGATION_MAP['notIn']).toBe('in');
	});

	it('should map date operators correctly', () => {
		expect(OPERATOR_NEGATION_MAP['before']).toBe('after');
		expect(OPERATOR_NEGATION_MAP['after']).toBe('before');
	});
});

describe('isNegatedOperator', () => {
	it('should return true for negated text operators', () => {
		expect(isNegatedOperator('notContains')).toBe(true);
		expect(isNegatedOperator('notEquals')).toBe(true);
		expect(isNegatedOperator('notStartsWith')).toBe(true);
		expect(isNegatedOperator('notEndsWith')).toBe(true);
		expect(isNegatedOperator('isNotEmpty')).toBe(true);
	});

	it('should return true for negated numeric operators', () => {
		expect(isNegatedOperator('lessThan')).toBe(true);
		expect(isNegatedOperator('lessThanOrEqual')).toBe(true);
		expect(isNegatedOperator('notBetween')).toBe(true);
	});

	it('should return true for negated set operators', () => {
		expect(isNegatedOperator('notIn')).toBe(true);
	});

	it('should return true for negated date operators', () => {
		expect(isNegatedOperator('after')).toBe(true);
	});

	it('should return false for positive operators', () => {
		expect(isNegatedOperator('contains')).toBe(false);
		expect(isNegatedOperator('equals')).toBe(false);
		expect(isNegatedOperator('startsWith')).toBe(false);
		expect(isNegatedOperator('endsWith')).toBe(false);
		expect(isNegatedOperator('isEmpty')).toBe(false);
		expect(isNegatedOperator('greaterThan')).toBe(false);
		expect(isNegatedOperator('greaterThanOrEqual')).toBe(false);
		expect(isNegatedOperator('between')).toBe(false);
		expect(isNegatedOperator('in')).toBe(false);
		expect(isNegatedOperator('before')).toBe(false);
	});
});

describe('toggleFilterNegation', () => {
	it('should toggle a text contains filter', () => {
		const filter: TextFilter = {
			type: 'text',
			columnId: 'NAME',
			operator: 'contains',
			value: 'John'
		};
		const result = toggleFilterNegation(filter);
		expect(result.operator).toBe('notContains');
		expect(result.value).toBe('John');
	});

	it('should toggle back from negated to positive', () => {
		const filter: TextFilter = {
			type: 'text',
			columnId: 'NAME',
			operator: 'notContains',
			value: 'John'
		};
		const result = toggleFilterNegation(filter);
		expect(result.operator).toBe('contains');
	});

	it('should toggle numeric between to notBetween', () => {
		const filter: NumericFilter = {
			type: 'numeric',
			columnId: 'AGE',
			operator: 'between',
			value: 10,
			value2: 50
		};
		const result = toggleFilterNegation(filter);
		expect(result.operator).toBe('notBetween');
		expect(result.value).toBe(10);
		expect(result.value2).toBe(50);
	});

	it('should toggle greaterThan to lessThanOrEqual', () => {
		const filter: NumericFilter = {
			type: 'numeric',
			columnId: 'AGE',
			operator: 'greaterThan',
			value: 35
		};
		const result = toggleFilterNegation(filter);
		expect(result.operator).toBe('lessThanOrEqual');
	});

	it('should toggle date before to after', () => {
		const filter: DateFilter = {
			type: 'date',
			columnId: 'RFSTDTC',
			operator: 'before',
			value: '2024-01-01'
		};
		const result = toggleFilterNegation(filter);
		expect(result.operator).toBe('after');
	});

	it('should toggle set in to notIn', () => {
		const filter: SetFilter = {
			type: 'set',
			columnId: 'SEX',
			operator: 'in',
			values: ['M', 'F']
		};
		const result = toggleFilterNegation(filter);
		expect(result.operator).toBe('notIn');
		expect(result.values).toEqual(['M', 'F']);
	});

	it('should return new object without mutating original', () => {
		const filter: TextFilter = {
			type: 'text',
			columnId: 'NAME',
			operator: 'contains',
			value: 'John'
		};
		const result = toggleFilterNegation(filter);
		expect(result).not.toBe(filter);
		expect(filter.operator).toBe('contains');
	});
});
