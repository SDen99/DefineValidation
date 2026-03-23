import { describe, it, expect } from 'vitest';
import { sortData } from './sortData';

describe('sortData', () => {
	const testData = [
		{ id: 3, name: 'Charlie', age: 35, score: 85, USUBJID: 'SUBJ-003' },
		{ id: 1, name: 'Alice', age: 28, score: 92, USUBJID: 'SUBJ-001' },
		{ id: 5, name: 'Eve', age: 42, score: 78, USUBJID: 'SUBJ-005' },
		{ id: 2, name: 'Bob', age: 35, score: 88, USUBJID: 'SUBJ-002' },
		{ id: 4, name: 'David', age: 31, score: 85, USUBJID: 'SUBJ-004' }
	];

	describe('Basic Operations', () => {
		it('should return a copy with no sort configs', () => {
			const result = sortData(testData, []);
			expect(result).toEqual(testData);
			expect(result).not.toBe(testData); // New array
		});

		it('should handle empty data array', () => {
			expect(sortData([], [{ columnId: 'name', direction: 'asc' }])).toEqual([]);
		});
	});

	describe('Single Column Sorting', () => {
		it('should sort ascending by name', () => {
			const result = sortData(testData, [{ columnId: 'name', direction: 'asc' }]);

			expect(result[0].name).toBe('Alice');
			expect(result[1].name).toBe('Bob');
			expect(result[2].name).toBe('Charlie');
			expect(result[3].name).toBe('David');
			expect(result[4].name).toBe('Eve');
		});

		it('should sort descending by name', () => {
			const result = sortData(testData, [{ columnId: 'name', direction: 'desc' }]);

			expect(result[0].name).toBe('Eve');
			expect(result[1].name).toBe('David');
			expect(result[2].name).toBe('Charlie');
			expect(result[3].name).toBe('Bob');
			expect(result[4].name).toBe('Alice');
		});

		it('should sort ascending by number', () => {
			const result = sortData(testData, [{ columnId: 'age', direction: 'asc' }]);

			expect(result[0].age).toBe(28);
			expect(result[1].age).toBe(31);
			expect(result[2].age).toBe(35);
			expect(result[3].age).toBe(35);
			expect(result[4].age).toBe(42);
		});

		it('should sort descending by number', () => {
			const result = sortData(testData, [{ columnId: 'age', direction: 'desc' }]);

			expect(result[0].age).toBe(42);
			expect(result[1].age).toBe(35);
			expect(result[2].age).toBe(35);
			expect(result[3].age).toBe(31);
			expect(result[4].age).toBe(28);
		});
	});

	describe('Multi-Column Sorting', () => {
		it('should sort by multiple columns (age asc, name asc)', () => {
			const result = sortData(testData, [
				{ columnId: 'age', direction: 'asc' },
				{ columnId: 'name', direction: 'asc' }
			]);

			// Age 28: Alice
			expect(result[0].name).toBe('Alice');
			expect(result[0].age).toBe(28);

			// Age 31: David
			expect(result[1].name).toBe('David');
			expect(result[1].age).toBe(31);

			// Age 35: Bob, Charlie (sorted by name)
			expect(result[2].name).toBe('Bob');
			expect(result[2].age).toBe(35);
			expect(result[3].name).toBe('Charlie');
			expect(result[3].age).toBe(35);

			// Age 42: Eve
			expect(result[4].name).toBe('Eve');
			expect(result[4].age).toBe(42);
		});

		it('should sort by multiple columns (score desc, name asc)', () => {
			const result = sortData(testData, [
				{ columnId: 'score', direction: 'desc' },
				{ columnId: 'name', direction: 'asc' }
			]);

			// Score 92: Alice
			expect(result[0].score).toBe(92);
			expect(result[0].name).toBe('Alice');

			// Score 88: Bob
			expect(result[1].score).toBe(88);
			expect(result[1].name).toBe('Bob');

			// Score 85: Charlie, David (sorted by name)
			expect(result[2].score).toBe(85);
			expect(result[2].name).toBe('Charlie');
			expect(result[3].score).toBe(85);
			expect(result[3].name).toBe('David');

			// Score 78: Eve
			expect(result[4].score).toBe(78);
			expect(result[4].name).toBe('Eve');
		});
	});

	describe('Stable Sorting', () => {
		it('should maintain original order for equal values', () => {
			const dataWithDuplicates = [
				{ id: 1, value: 'A', order: 1 },
				{ id: 2, value: 'B', order: 2 },
				{ id: 3, value: 'A', order: 3 },
				{ id: 4, value: 'B', order: 4 },
				{ id: 5, value: 'A', order: 5 }
			];

			const result = sortData(dataWithDuplicates, [{ columnId: 'value', direction: 'asc' }], {
				stable: true
			});

			// All 'A' values should come first, in original order
			expect(result[0].order).toBe(1);
			expect(result[1].order).toBe(3);
			expect(result[2].order).toBe(5);

			// All 'B' values should come next, in original order
			expect(result[3].order).toBe(2);
			expect(result[4].order).toBe(4);
		});
	});

	describe('Null Handling', () => {
		it('should sort nulls last by default', () => {
			const dataWithNulls = [
				{ id: 1, value: 'A' },
				{ id: 2, value: null },
				{ id: 3, value: 'C' },
				{ id: 4, value: null },
				{ id: 5, value: 'B' }
			];

			const result = sortData(
				dataWithNulls,
				[{ columnId: 'value', direction: 'asc' }],
				{ nullHandling: 'last' }
			);

			expect(result[0].value).toBe('A');
			expect(result[1].value).toBe('B');
			expect(result[2].value).toBe('C');
			expect(result[3].value).toBeNull();
			expect(result[4].value).toBeNull();
		});

		it('should sort nulls first when configured', () => {
			const dataWithNulls = [
				{ id: 1, value: 'A' },
				{ id: 2, value: null },
				{ id: 3, value: 'C' },
				{ id: 4, value: null },
				{ id: 5, value: 'B' }
			];

			const result = sortData(
				dataWithNulls,
				[{ columnId: 'value', direction: 'asc' }],
				{ nullHandling: 'first' }
			);

			expect(result[0].value).toBeNull();
			expect(result[1].value).toBeNull();
			expect(result[2].value).toBe('A');
			expect(result[3].value).toBe('B');
			expect(result[4].value).toBe('C');
		});
	});

	describe('Clinical Data Mode', () => {
		it('should prioritize USUBJID when in clinical mode', () => {
			const result = sortData(
				testData,
				[{ columnId: 'name', direction: 'asc' }],
				{ clinicalMode: true }
			);

			// Should sort by USUBJID first (implicit), then by name
			expect(result[0].USUBJID).toBe('SUBJ-001');
			expect(result[1].USUBJID).toBe('SUBJ-002');
			expect(result[2].USUBJID).toBe('SUBJ-003');
			expect(result[3].USUBJID).toBe('SUBJ-004');
			expect(result[4].USUBJID).toBe('SUBJ-005');
		});
	});

	describe('Case Sensitivity', () => {
		it('should sort case-insensitive by default', () => {
			const mixedCaseData = [
				{ id: 1, name: 'alice' },
				{ id: 2, name: 'Bob' },
				{ id: 3, name: 'CHARLIE' },
				{ id: 4, name: 'david' }
			];

			const result = sortData(
				mixedCaseData,
				[{ columnId: 'name', direction: 'asc' }],
				{ caseSensitive: false }
			);

			expect(result[0].name.toLowerCase()).toBe('alice');
			expect(result[1].name.toLowerCase()).toBe('bob');
			expect(result[2].name.toLowerCase()).toBe('charlie');
			expect(result[3].name.toLowerCase()).toBe('david');
		});

		it('should sort case-sensitive when configured', () => {
			const mixedCaseData = [
				{ id: 1, name: 'alice' },
				{ id: 2, name: 'Bob' },
				{ id: 3, name: 'CHARLIE' },
				{ id: 4, name: 'David' }
			];

			const result = sortData(
				mixedCaseData,
				[{ columnId: 'name', direction: 'asc' }],
				{ caseSensitive: true }
			);

			// Capital letters come before lowercase in ASCII
			expect(result[0].name).toBe('Bob');
			expect(result[1].name).toBe('CHARLIE');
			expect(result[2].name).toBe('David');
			expect(result[3].name).toBe('alice');
		});
	});

	describe('Edge Cases', () => {
		it('should handle sorting on non-existent column', () => {
			const result = sortData(testData, [{ columnId: 'nonExistent', direction: 'asc' }]);

			// Should return original order when column doesn't exist
			expect(result).toEqual(testData);
		});

		it('should handle undefined values', () => {
			const dataWithUndefined = [
				{ id: 1, value: 'A' },
				{ id: 2, value: undefined },
				{ id: 3, value: 'B' }
			];

			const result = sortData(dataWithUndefined, [{ columnId: 'value', direction: 'asc' }]);

			// Undefined should be treated similar to null
			expect(result[0].value).toBe('A');
			expect(result[1].value).toBe('B');
			expect(result[2].value).toBeUndefined();
		});

		it('should handle mixed types gracefully', () => {
			const mixedData = [
				{ id: 1, value: 'string' },
				{ id: 2, value: 123 },
				{ id: 3, value: true },
				{ id: 4, value: null }
			];

			const result = sortData(mixedData, [{ columnId: 'value', direction: 'asc' }]);

			// Should not throw, and should handle mixed types
			expect(result).toHaveLength(4);
		});

		it('should handle single item array', () => {
			const singleItem = [{ id: 1, name: 'Only' }];

			const result = sortData(singleItem, [{ columnId: 'name', direction: 'asc' }]);
			expect(result).toEqual(singleItem);
		});

		it('should maintain object references (no cloning)', () => {
			const result = sortData(testData, [{ columnId: 'name', direction: 'asc' }]);

			// Objects should be the same references, just reordered
			expect(testData.every((item) => result.includes(item))).toBe(true);
		});
	});
});
