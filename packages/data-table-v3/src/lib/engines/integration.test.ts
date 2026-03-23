import { describe, it, expect } from 'vitest';
import { filterData } from './filterData';
import { sortData } from './sortData';
import type { TextFilter, NumericFilter, BooleanFilter, DateFilter } from '../types/filters';

/**
 * Integration tests for filterData + sortData
 * Tests realistic scenarios where filtering and sorting work together
 */
describe('filterData + sortData Integration', () => {
	const testData = [
		{
			USUBJID: 'SUBJ-005',
			AGE: 42,
			SEX: 'M',
			RACE: 'White',
			ACTIVE: true,
			JOINED: new Date('2018-08-22'),
			SCORE: 78
		},
		{
			USUBJID: 'SUBJ-001',
			AGE: 30,
			SEX: 'F',
			RACE: 'Asian',
			ACTIVE: false,
			JOINED: new Date('2020-01-15'),
			SCORE: 92
		},
		{
			USUBJID: 'SUBJ-003',
			AGE: 35,
			SEX: 'M',
			RACE: 'Black',
			ACTIVE: true,
			JOINED: new Date('2019-11-05'),
			SCORE: 85
		},
		{
			USUBJID: 'SUBJ-002',
			AGE: 25,
			SEX: 'F',
			RACE: 'White',
			ACTIVE: true,
			JOINED: new Date('2021-03-20'),
			SCORE: 88
		},
		{
			USUBJID: 'SUBJ-004',
			AGE: 28,
			SEX: 'M',
			RACE: 'Asian',
			ACTIVE: false,
			JOINED: new Date('2022-06-10'),
			SCORE: 85
		}
	];

	describe('Filter Then Sort Workflow', () => {
		it('should filter data and then sort the filtered results', () => {
			const activeFilter: BooleanFilter = {
				type: 'boolean',
				columnId: 'ACTIVE',
				operator: 'equals',
				value: true,
				enabled: true
			};

			const filtered = filterData(testData, [activeFilter]);

			// Should have 3 active subjects
			expect(filtered).toHaveLength(3);
			expect(filtered.every((row) => row.ACTIVE === true)).toBe(true);

			// Now sort the filtered data by AGE ascending
			const sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'asc' }]);

			expect(sorted).toHaveLength(3);
			expect(sorted[0].AGE).toBe(25); // SUBJ-002
			expect(sorted[1].AGE).toBe(35); // SUBJ-003
			expect(sorted[2].AGE).toBe(42); // SUBJ-005
		});

		it('should handle multiple filters before sorting', () => {
			const sexFilter: TextFilter = {
				type: 'text',
				columnId: 'SEX',
				operator: 'equals',
				value: 'M',
				enabled: true
			};

			const ageFilter: NumericFilter = {
				type: 'numeric',
				columnId: 'AGE',
				operator: 'greaterThan',
				value: 30,
				enabled: true
			};

			const filtered = filterData(testData, [sexFilter, ageFilter]);

			// Should have 2 males with age > 30 (SUBJ-005: 42, SUBJ-003: 35)
			expect(filtered).toHaveLength(2);

			const sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'desc' }]);

			expect(sorted[0].USUBJID).toBe('SUBJ-005'); // Age 42
			expect(sorted[1].USUBJID).toBe('SUBJ-003'); // Age 35
		});

		it('should handle multi-column sorting on filtered data', () => {
			const scoreFilter: NumericFilter = {
				type: 'numeric',
				columnId: 'SCORE',
				operator: 'greaterThanOrEqual',
				value: 85,
				enabled: true
			};

			const filtered = filterData(testData, [scoreFilter]);

			// Should have 4 subjects with score >= 85
			expect(filtered).toHaveLength(4);

			const sorted = sortData(filtered, [
				{ columnId: 'SCORE', direction: 'desc' },
				{ columnId: 'AGE', direction: 'asc' }
			]);

			expect(sorted[0].SCORE).toBe(92);
			expect(sorted[1].SCORE).toBe(88);
			expect(sorted[2].SCORE).toBe(85);
			expect(sorted[2].AGE).toBe(28);
			expect(sorted[3].SCORE).toBe(85);
			expect(sorted[3].AGE).toBe(35);
		});
	});

	describe('Sort Then Filter Workflow', () => {
		it('should sort data first and then filter', () => {
			const sorted = sortData(testData, [{ columnId: 'AGE', direction: 'asc' }]);

			const ageFilter: NumericFilter = {
				type: 'numeric',
				columnId: 'AGE',
				operator: 'between',
				value: 25,
				value2: 35,
				enabled: true
			};

			const filtered = filterData(sorted, [ageFilter]);

			// Should maintain sort order after filtering
			expect(filtered).toHaveLength(4);
			expect(filtered[0].AGE).toBe(25);
			expect(filtered[1].AGE).toBe(28);
			expect(filtered[2].AGE).toBe(30);
			expect(filtered[3].AGE).toBe(35);
		});
	});

	describe('Dynamic Filter/Sort Updates', () => {
		it('should handle adding filter to already sorted data', () => {
			const sorted = sortData(testData, [{ columnId: 'USUBJID', direction: 'asc' }]);

			expect(sorted[0].USUBJID).toBe('SUBJ-001');
			expect(sorted[4].USUBJID).toBe('SUBJ-005');

			const sexFilter: TextFilter = {
				type: 'text',
				columnId: 'SEX',
				operator: 'equals',
				value: 'F',
				enabled: true
			};

			const filtered = filterData(sorted, [sexFilter]);

			// Should maintain sort order among females
			expect(filtered).toHaveLength(2);
			expect(filtered[0].USUBJID).toBe('SUBJ-001');
			expect(filtered[1].USUBJID).toBe('SUBJ-002');
		});

		it('should handle removing filter and re-sorting', () => {
			// Filter first
			const activeFilter: BooleanFilter = {
				type: 'boolean',
				columnId: 'ACTIVE',
				operator: 'equals',
				value: true,
				enabled: true
			};

			let filtered = filterData(testData, [activeFilter]);
			expect(filtered).toHaveLength(3);

			// Sort filtered data
			let sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'asc' }]);
			expect(sorted).toHaveLength(3);

			// Remove filter (pass empty filters)
			filtered = filterData(testData, []);
			expect(filtered).toHaveLength(5);

			// Re-sort with all data
			sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'asc' }]);
			expect(sorted).toHaveLength(5);
			expect(sorted[0].AGE).toBe(25);
		});

		it('should handle changing sort direction on filtered data', () => {
			const ageFilter: NumericFilter = {
				type: 'numeric',
				columnId: 'AGE',
				operator: 'greaterThan',
				value: 27,
				enabled: true
			};

			const filtered = filterData(testData, [ageFilter]);

			// Sort ascending
			let sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'asc' }]);
			expect(sorted[0].AGE).toBe(28);

			// Change to descending
			sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'desc' }]);
			expect(sorted[0].AGE).toBe(42);
		});
	});

	describe('Complex Real-World Scenarios', () => {
		it('should handle text filter + date filter + multi-column sort', () => {
			const raceFilter: TextFilter = {
				type: 'text',
				columnId: 'RACE',
				operator: 'notEquals',
				value: 'Black',
				enabled: true
			};

			const dateFilter: DateFilter = {
				type: 'date',
				columnId: 'JOINED',
				operator: 'after',
				value: new Date('2019-01-01'),
				enabled: true
			};

			const filtered = filterData(testData, [raceFilter, dateFilter]);

			// Should have 3 subjects (SUBJ-001, SUBJ-002, SUBJ-004)
			expect(filtered).toHaveLength(3);

			const sorted = sortData(filtered, [
				{ columnId: 'RACE', direction: 'asc' },
				{ columnId: 'SCORE', direction: 'desc' }
			]);

			// Asian comes first alphabetically, sorted by score desc
			expect(sorted[0].RACE).toBe('Asian');
			expect(sorted[0].SCORE).toBe(92); // SUBJ-001
			expect(sorted[1].RACE).toBe('Asian');
			expect(sorted[1].SCORE).toBe(85); // SUBJ-004
			// Then White subject
			expect(sorted[2].RACE).toBe('White');
			expect(sorted[2].SCORE).toBe(88); // SUBJ-002
		});

		it('should handle disabled filter in filter+sort pipeline', () => {
			const activeFilter: BooleanFilter = {
				type: 'boolean',
				columnId: 'ACTIVE',
				operator: 'equals',
				value: true,
				enabled: true
			};

			const ageFilter: NumericFilter = {
				type: 'numeric',
				columnId: 'AGE',
				operator: 'lessThan',
				value: 30,
				enabled: false
			};

			const filtered = filterData(testData, [activeFilter, ageFilter]);

			// Should only have active subjects (age filter disabled)
			expect(filtered).toHaveLength(3);

			const sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'asc' }]);

			// All ages should be included (not filtered by age < 30)
			expect(sorted.some((row) => row.AGE >= 30)).toBe(true);
		});

		it('should handle empty filter result before sorting', () => {
			const impossibleFilter: NumericFilter = {
				type: 'numeric',
				columnId: 'AGE',
				operator: 'greaterThan',
				value: 100,
				enabled: true
			};

			const filtered = filterData(testData, [impossibleFilter]);
			expect(filtered).toHaveLength(0);

			const sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'asc' }]);
			expect(sorted).toHaveLength(0);
		});

		it('should maintain data integrity through multiple filter/sort cycles', () => {
			const originalDataIds = testData.map((row) => row.USUBJID).sort();

			// Cycle 1: Filter + Sort
			let filtered = filterData(testData, [
				{
					type: 'text',
					columnId: 'SEX',
					operator: 'equals',
					value: 'M',
					enabled: true
				}
			]);
			let result = sortData(filtered, [{ columnId: 'AGE', direction: 'asc' }]);

			// Cycle 2: Different filter + sort
			filtered = filterData(testData, [
				{
					type: 'boolean',
					columnId: 'ACTIVE',
					operator: 'equals',
					value: true,
					enabled: true
				}
			]);
			result = sortData(filtered, [{ columnId: 'SCORE', direction: 'desc' }]);

			// Cycle 3: Clear all filters and sorts
			filtered = filterData(testData, []);
			result = sortData(filtered, []);

			// Should have all original data back
			const finalDataIds = result.map((row) => row.USUBJID).sort();
			expect(finalDataIds).toEqual(originalDataIds);
		});
	});

	describe('Edge Cases', () => {
		it('should handle null values in filtered and sorted data', () => {
			const dataWithNulls = [
				{ id: 1, name: 'Alice', age: null, active: true },
				{ id: 2, name: null, age: 30, active: true },
				{ id: 3, name: 'Charlie', age: 35, active: false },
				{ id: 4, name: 'David', age: null, active: true }
			];

			const filtered = filterData(dataWithNulls, [
				{
					type: 'boolean',
					columnId: 'active',
					operator: 'equals',
					value: true,
					enabled: true
				}
			]);
			expect(filtered).toHaveLength(3);

			const sorted = sortData(filtered, [{ columnId: 'age', direction: 'asc' }]);

			// Non-null age should come first
			expect(sorted[0].age).toBe(30);
			expect(sorted[1].age).toBeNull();
			expect(sorted[2].age).toBeNull();
		});

		it('should handle single row after filtering and sorting', () => {
			const filtered = filterData(testData, [
				{
					type: 'text',
					columnId: 'USUBJID',
					operator: 'equals',
					value: 'SUBJ-001',
					enabled: true
				}
			]);
			expect(filtered).toHaveLength(1);

			const sorted = sortData(filtered, [{ columnId: 'AGE', direction: 'asc' }]);

			expect(sorted).toHaveLength(1);
			expect(sorted[0].USUBJID).toBe('SUBJ-001');
		});
	});
});
