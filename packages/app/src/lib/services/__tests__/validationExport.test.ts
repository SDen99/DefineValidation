import { describe, it, expect } from 'vitest';
import { exportResultsAsCSV, exportAllResultsAsCSV } from '../validationExport';
import type { ValidationResult } from '@sden99/validation-engine';
import type { ValidationCacheEntry } from '../validationService.svelte';

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
	return {
		ruleId: 'AUTO.CL.DM.SEX',
		columnId: 'SEX',
		severity: 'error',
		issueCount: 3,
		affectedRows: [1, 5, 12],
		message: 'Invalid codelist value',
		...overrides
	};
}

describe('exportResultsAsCSV', () => {
	it('produces valid CSV with header and rows', () => {
		const results = [makeResult()];
		const csv = exportResultsAsCSV(results, 'DM');
		const lines = csv.split('\n');
		expect(lines[0]).toBe('Rule ID,Severity,Variable,Issue Count,Affected Rows,Message');
		expect(lines[1]).toBe('AUTO.CL.DM.SEX,error,SEX,3,1;5;12,Invalid codelist value');
	});

	it('escapes commas in messages', () => {
		const results = [makeResult({ message: 'Value "M" not in list: F, M, U' })];
		const csv = exportResultsAsCSV(results, 'DM');
		const lines = csv.split('\n');
		expect(lines[1]).toContain('"Value ""M"" not in list: F, M, U"');
	});

	it('handles empty results', () => {
		const csv = exportResultsAsCSV([], 'DM');
		const lines = csv.split('\n');
		expect(lines.length).toBe(1); // header only
	});

	it('handles empty affectedRows', () => {
		const results = [makeResult({ affectedRows: [], issueCount: 0 })];
		const csv = exportResultsAsCSV(results, 'DM');
		expect(csv).toContain(',0,');
	});

	it('handles multiple results', () => {
		const results = [
			makeResult({ ruleId: 'R1', columnId: 'A' }),
			makeResult({ ruleId: 'R2', columnId: 'B' })
		];
		const csv = exportResultsAsCSV(results, 'DM');
		const lines = csv.split('\n');
		expect(lines.length).toBe(3); // header + 2 rows
	});
});

describe('exportAllResultsAsCSV', () => {
	it('prepends Dataset column', () => {
		const map = new Map<string, ValidationCacheEntry>([
			['dm.xpt', {
				results: [makeResult()],
				errors: [],
				timestamp: Date.now(),
				rulesGenerated: 1
			}]
		]);
		const csv = exportAllResultsAsCSV(map);
		const lines = csv.split('\n');
		expect(lines[0]).toContain('Dataset,Rule ID');
		expect(lines[1]).toMatch(/^dm\.xpt,/);
	});

	it('includes results from multiple datasets', () => {
		const map = new Map<string, ValidationCacheEntry>([
			['dm.xpt', {
				results: [makeResult()],
				errors: [],
				timestamp: Date.now(),
				rulesGenerated: 1
			}],
			['ae.xpt', {
				results: [makeResult({ ruleId: 'AE.001' }), makeResult({ ruleId: 'AE.002' })],
				errors: [],
				timestamp: Date.now(),
				rulesGenerated: 2
			}]
		]);
		const csv = exportAllResultsAsCSV(map);
		const lines = csv.split('\n');
		expect(lines.length).toBe(4); // header + 3 rows
	});

	it('handles empty map', () => {
		const csv = exportAllResultsAsCSV(new Map());
		const lines = csv.split('\n');
		expect(lines.length).toBe(1); // header only
	});
});
