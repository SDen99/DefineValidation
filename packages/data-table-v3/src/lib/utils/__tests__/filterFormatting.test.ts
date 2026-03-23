import { describe, it, expect } from 'vitest';
import { formatFilterChip, getSetFilterSubChips } from '../filterFormatting';
import type {
	TextFilter,
	NumericFilter,
	DateFilter,
	SetFilter,
	BooleanFilter
} from '../../types/filters';
import type { ColumnConfig } from '../../types/columns';

function makeColumn(id: string, header?: string): ColumnConfig {
	return {
		id,
		header: header ?? id,
		dataType: 'string',
		visible: true,
		sortable: true,
		filterable: true,
		resizable: true,
		order: 0
	};
}

describe('formatFilterChip', () => {
	describe('text filters', () => {
		it('should format contains', () => {
			const filter: TextFilter = { type: 'text', columnId: 'NAME', operator: 'contains', value: 'John' };
			expect(formatFilterChip(filter, makeColumn('NAME'))).toBe('NAME ~ "John"');
		});

		it('should format notContains same as contains', () => {
			const filter: TextFilter = { type: 'text', columnId: 'NAME', operator: 'notContains', value: 'John' };
			expect(formatFilterChip(filter, makeColumn('NAME'))).toBe('NAME ~ "John"');
		});

		it('should format equals', () => {
			const filter: TextFilter = { type: 'text', columnId: 'NAME', operator: 'equals', value: 'John' };
			expect(formatFilterChip(filter, makeColumn('NAME'))).toBe('NAME = "John"');
		});

		it('should format startsWith', () => {
			const filter: TextFilter = { type: 'text', columnId: 'NAME', operator: 'startsWith', value: 'Jo' };
			expect(formatFilterChip(filter, makeColumn('NAME'))).toBe('NAME ^= "Jo"');
		});

		it('should format notStartsWith same as startsWith', () => {
			const filter: TextFilter = { type: 'text', columnId: 'NAME', operator: 'notStartsWith', value: 'Jo' };
			expect(formatFilterChip(filter, makeColumn('NAME'))).toBe('NAME ^= "Jo"');
		});

		it('should format endsWith', () => {
			const filter: TextFilter = { type: 'text', columnId: 'NAME', operator: 'endsWith', value: 'hn' };
			expect(formatFilterChip(filter, makeColumn('NAME'))).toBe('NAME $= "hn"');
		});

		it('should format isEmpty', () => {
			const filter: TextFilter = { type: 'text', columnId: 'NAME', operator: 'isEmpty', value: '' };
			expect(formatFilterChip(filter, makeColumn('NAME'))).toBe('NAME is empty');
		});

		it('should format isNotEmpty', () => {
			const filter: TextFilter = { type: 'text', columnId: 'NAME', operator: 'isNotEmpty', value: '' };
			expect(formatFilterChip(filter, makeColumn('NAME'))).toBe('NAME is not empty');
		});

		it('should use column header instead of id', () => {
			const filter: TextFilter = { type: 'text', columnId: 'SUBJID', operator: 'contains', value: '001' };
			expect(formatFilterChip(filter, makeColumn('SUBJID', 'Subject ID'))).toBe('Subject ID ~ "001"');
		});
	});

	describe('numeric filters', () => {
		it('should format equals', () => {
			const filter: NumericFilter = { type: 'numeric', columnId: 'AGE', operator: 'equals', value: 35 };
			expect(formatFilterChip(filter, makeColumn('AGE'))).toBe('AGE = 35');
		});

		it('should format greaterThan', () => {
			const filter: NumericFilter = { type: 'numeric', columnId: 'AGE', operator: 'greaterThan', value: 35 };
			expect(formatFilterChip(filter, makeColumn('AGE'))).toBe('AGE > 35');
		});

		it('should format lessThanOrEqual', () => {
			const filter: NumericFilter = { type: 'numeric', columnId: 'AGE', operator: 'lessThanOrEqual', value: 65 };
			expect(formatFilterChip(filter, makeColumn('AGE'))).toBe('AGE <= 65');
		});

		it('should format between', () => {
			const filter: NumericFilter = { type: 'numeric', columnId: 'AGE', operator: 'between', value: 34.86, value2: 48.57 };
			expect(formatFilterChip(filter, makeColumn('AGE'))).toBe('34.86 < AGE < 48.57');
		});

		it('should format notBetween same as between', () => {
			const filter: NumericFilter = { type: 'numeric', columnId: 'AGE', operator: 'notBetween', value: 10, value2: 50 };
			expect(formatFilterChip(filter, makeColumn('AGE'))).toBe('10 < AGE < 50');
		});

		it('should handle missing value2 in between', () => {
			const filter: NumericFilter = { type: 'numeric', columnId: 'AGE', operator: 'between', value: 10 };
			expect(formatFilterChip(filter, makeColumn('AGE'))).toBe('10 < AGE < ?');
		});

		it('should format isEmpty', () => {
			const filter: NumericFilter = { type: 'numeric', columnId: 'AGE', operator: 'isEmpty', value: 0 };
			expect(formatFilterChip(filter, makeColumn('AGE'))).toBe('AGE is empty');
		});
	});

	describe('date filters', () => {
		it('should format before', () => {
			const filter: DateFilter = { type: 'date', columnId: 'RFSTDTC', operator: 'before', value: '2009-08-16' };
			expect(formatFilterChip(filter, makeColumn('RFSTDTC'))).toBe('RFSTDTC < 2009-08-16');
		});

		it('should format after', () => {
			const filter: DateFilter = { type: 'date', columnId: 'RFSTDTC', operator: 'after', value: '2009-08-16' };
			expect(formatFilterChip(filter, makeColumn('RFSTDTC'))).toBe('RFSTDTC > 2009-08-16');
		});

		it('should format between', () => {
			const filter: DateFilter = { type: 'date', columnId: 'RFSTDTC', operator: 'between', value: '2009-08-16', value2: '2010-02-09' };
			expect(formatFilterChip(filter, makeColumn('RFSTDTC'))).toBe('RFSTDTC: 2009-08-16 to 2010-02-09');
		});

		it('should format equals with Date object', () => {
			const filter: DateFilter = { type: 'date', columnId: 'DT', operator: 'equals', value: new Date('2024-03-15') };
			expect(formatFilterChip(filter, makeColumn('DT'))).toBe('DT = 2024-03-15');
		});
	});

	describe('set filters', () => {
		it('should format set filter with colon', () => {
			const filter: SetFilter = { type: 'set', columnId: 'SEX', operator: 'in', values: ['M', 'F'] };
			expect(formatFilterChip(filter, makeColumn('SEX'))).toBe('SEX:');
		});
	});

	describe('boolean filters', () => {
		it('should format true as Y', () => {
			const filter: BooleanFilter = { type: 'boolean', columnId: 'SAFFL', operator: 'equals', value: true };
			expect(formatFilterChip(filter, makeColumn('SAFFL'))).toBe('SAFFL = Y');
		});

		it('should format false as N', () => {
			const filter: BooleanFilter = { type: 'boolean', columnId: 'SAFFL', operator: 'equals', value: false };
			expect(formatFilterChip(filter, makeColumn('SAFFL'))).toBe('SAFFL = N');
		});
	});
});

describe('getSetFilterSubChips', () => {
	it('should return string values', () => {
		const filter: SetFilter = { type: 'set', columnId: 'SEX', operator: 'in', values: ['M', 'F'] };
		expect(getSetFilterSubChips(filter)).toEqual(['M', 'F']);
	});

	it('should handle null values as (empty)', () => {
		const filter: SetFilter = { type: 'set', columnId: 'STATUS', operator: 'in', values: [null, 'Active'] };
		expect(getSetFilterSubChips(filter)).toEqual(['(empty)', 'Active']);
	});

	it('should handle undefined values as (empty)', () => {
		const filter: SetFilter = { type: 'set', columnId: 'STATUS', operator: 'in', values: [undefined, 'Done'] };
		expect(getSetFilterSubChips(filter)).toEqual(['(empty)', 'Done']);
	});

	it('should convert numeric values to strings', () => {
		const filter: SetFilter = { type: 'set', columnId: 'VISITNUM', operator: 'in', values: [1, 2, 3] };
		expect(getSetFilterSubChips(filter)).toEqual(['1', '2', '3']);
	});
});
