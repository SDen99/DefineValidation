import { describe, it, expect } from 'vitest';
import { filterData } from './filterData';
import type { TextFilter, NumericFilter, DateFilter, BooleanFilter } from '../types/filters';

describe('filterData', () => {
	const testData = [
		{ id: 1, name: 'John Doe', age: 30, active: true, joined: new Date('2020-01-15') },
		{ id: 2, name: 'Jane Smith', age: 25, active: false, joined: new Date('2021-03-20') },
		{ id: 3, name: 'Bob Johnson', age: 35, active: true, joined: new Date('2019-11-05') },
		{ id: 4, name: 'Alice Brown', age: 28, active: true, joined: new Date('2022-06-10') },
		{ id: 5, name: 'Charlie Wilson', age: 42, active: false, joined: new Date('2018-08-22') }
	];

	describe('Basic Operations', () => {
		it('should return all data with empty filters', () => {
			expect(filterData(testData, [])).toEqual(testData);
		});

		it('should handle empty data array', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'contains',
				value: 'test',
				enabled: true
			};
			expect(filterData([], [filter])).toEqual([]);
		});
	});

	describe('Text Filters', () => {
		it('should filter with "contains" operator (case insensitive)', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'contains',
				value: 'john',
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('John Doe');
			expect(result[1].name).toBe('Bob Johnson');
		});

		it('should filter with "contains" operator (case sensitive)', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'contains',
				value: 'Doe',
				caseSensitive: true,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('John Doe');
		});

		it('should filter with "equals" operator', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'equals',
				value: 'Jane Smith',
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Jane Smith');
		});

		it('should filter with "startsWith" operator', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'startsWith',
				value: 'Bob',
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Bob Johnson');
		});

		it('should filter with "endsWith" operator', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'endsWith',
				value: 'son',
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Bob Johnson');
			expect(result[1].name).toBe('Charlie Wilson');
		});

		it('should filter with "notContains" operator', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'notContains',
				value: 'John',
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(3);
			expect(result.find((r) => r.name.includes('John'))).toBeUndefined();
		});

		it('should filter with "notEquals" operator', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'notEquals',
				value: 'Jane Smith',
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(4);
			expect(result.find((r) => r.name === 'Jane Smith')).toBeUndefined();
		});
	});

	describe('Numeric Filters', () => {
		it('should filter with "equals" operator', () => {
			const filter: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'equals',
				value: 30,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(1);
			expect(result[0].age).toBe(30);
		});

		it('should filter with "greaterThan" operator', () => {
			const filter: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'greaterThan',
				value: 30,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(2);
			expect(result.every((r) => r.age > 30)).toBe(true);
		});

		it('should filter with "lessThan" operator', () => {
			const filter: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'lessThan',
				value: 30,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(2);
			expect(result.every((r) => r.age < 30)).toBe(true);
		});

		it('should filter with "greaterThanOrEqual" operator', () => {
			const filter: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'greaterThanOrEqual',
				value: 30,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(3);
			expect(result.every((r) => r.age >= 30)).toBe(true);
		});

		it('should filter with "lessThanOrEqual" operator', () => {
			const filter: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'lessThanOrEqual',
				value: 30,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(3);
			expect(result.every((r) => r.age <= 30)).toBe(true);
		});

		it('should filter with "between" operator', () => {
			const filter: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'between',
				value: 25,
				value2: 35,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(4);
			expect(result.every((r) => r.age >= 25 && r.age <= 35)).toBe(true);
		});
	});

	describe('Date Filters', () => {
		it('should filter with "equals" operator', () => {
			const filter: DateFilter = {
				type: 'date',
				columnId: 'joined',
				operator: 'equals',
				value: new Date('2020-01-15'),
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(1);
		});

		it('should filter with "before" operator', () => {
			const filter: DateFilter = {
				type: 'date',
				columnId: 'joined',
				operator: 'before',
				value: new Date('2020-01-01'),
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(2);
			expect(result.every((r) => r.joined < new Date('2020-01-01'))).toBe(true);
		});

		it('should filter with "after" operator', () => {
			const filter: DateFilter = {
				type: 'date',
				columnId: 'joined',
				operator: 'after',
				value: new Date('2021-01-01'),
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(2);
			expect(result.every((r) => r.joined > new Date('2021-01-01'))).toBe(true);
		});

		it('should filter with "between" operator', () => {
			const filter: DateFilter = {
				type: 'date',
				columnId: 'joined',
				operator: 'between',
				value: new Date('2019-01-01'),
				value2: new Date('2021-01-01'),
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(2);
			expect(
				result.every(
					(r) => r.joined >= new Date('2019-01-01') && r.joined <= new Date('2021-01-01')
				)
			).toBe(true);
		});
	});

	describe('Boolean Filters', () => {
		it('should filter true values', () => {
			const filter: BooleanFilter = {
				type: 'boolean',
				columnId: 'active',
				operator: 'equals',
				value: true,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(3);
			expect(result.every((r) => r.active === true)).toBe(true);
		});

		it('should filter false values', () => {
			const filter: BooleanFilter = {
				type: 'boolean',
				columnId: 'active',
				operator: 'equals',
				value: false,
				enabled: true
			};

			const result = filterData(testData, [filter]);

			expect(result).toHaveLength(2);
			expect(result.every((r) => r.active === false)).toBe(true);
		});
	});

	describe('Multi-Filter Combinations', () => {
		it('should combine multiple filters with AND logic', () => {
			const nameFilter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'contains',
				value: 'o',
				enabled: true
			};

			const ageFilter: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'greaterThan',
				value: 30,
				enabled: true
			};

			const result = filterData(testData, [nameFilter, ageFilter]);

			// Only "Bob Johnson" (age 35) and "Charlie Wilson" (age 42) have 'o' AND age > 30
			expect(result).toHaveLength(2);
			expect(result.every((r) => r.name.toLowerCase().includes('o') && r.age > 30)).toBe(
				true
			);
		});

		it('should handle disabled filters', () => {
			const filter1: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'contains',
				value: 'John',
				enabled: true
			};

			const filter2: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'equals',
				value: 30,
				enabled: false // Disabled!
			};

			const result = filterData(testData, [filter1, filter2]);

			// Only name filter should apply
			expect(result).toHaveLength(2);
			expect(result.every((r) => r.name.includes('John'))).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle null/undefined values in data', () => {
			const dataWithNulls = [
				{ id: 1, name: 'John', age: null },
				{ id: 2, name: null, age: 25 },
				{ id: 3, name: 'Jane', age: 30 }
			];

			const filter: NumericFilter = {
				type: 'numeric',
				columnId: 'age',
				operator: 'greaterThan',
				value: 20,
				enabled: true
			};

			const result = filterData(dataWithNulls, [filter]);

			expect(result).toHaveLength(2);
			expect(result.every((r) => r.age !== null && r.age > 20)).toBe(true);
		});

		it('should handle empty filter value', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'name',
				operator: 'contains',
				value: '',
				enabled: true
			};

			const result = filterData(testData, [filter]);

			// Empty string should match all
			expect(result).toHaveLength(5);
		});

		it('should handle filtering on non-existent column', () => {
			const filter: TextFilter = {
				type: 'text',
				columnId: 'nonExistent',
				operator: 'contains',
				value: 'test',
				enabled: true
			};

			const result = filterData(testData, [filter]);

			// Should return empty array (no matches)
			expect(result).toHaveLength(0);
		});
	});
});
