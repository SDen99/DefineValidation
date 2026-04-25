import { describe, it, expect } from 'vitest';
import { checkStructuralMismatches } from '../structuralChecks';
import type { DefineVariableForValidation } from '@sden99/validation-engine';

function makeDefineVar(name: string): DefineVariableForValidation {
	return {
		name,
		dataType: 'text',
		length: 20,
		domain: 'DM'
	} as DefineVariableForValidation;
}

describe('checkStructuralMismatches', () => {
	it('returns empty array for empty dataset', () => {
		const results = checkStructuralMismatches(
			[],
			[makeDefineVar('SEX')],
			'DM'
		);
		expect(results).toEqual([]);
	});

	it('detects missing variables (in define but not in data)', () => {
		const data = [{ STUDYID: 'S001', SUBJID: '001' }];
		const defineVars = [
			makeDefineVar('STUDYID'),
			makeDefineVar('SUBJID'),
			makeDefineVar('SEX') // missing from data
		];

		const results = checkStructuralMismatches(data, defineVars, 'DM');
		expect(results.length).toBe(1);
		expect(results[0].ruleId).toBe('AUTO.MISSING_VAR.DM.SEX');
		expect(results[0].severity).toBe('warning');
		expect(results[0].columnId).toBe('SEX');
	});

	it('detects undocumented variables (in data but not in define)', () => {
		const data = [{ STUDYID: 'S001', SUBJID: '001', EXTRA_COL: 'val' }];
		const defineVars = [
			makeDefineVar('STUDYID'),
			makeDefineVar('SUBJID')
		];

		const results = checkStructuralMismatches(data, defineVars, 'DM');
		expect(results.length).toBe(1);
		expect(results[0].ruleId).toBe('AUTO.UNDOCUMENTED_VAR.DM.EXTRA_COL');
		expect(results[0].severity).toBe('info');
		expect(results[0].columnId).toBe('EXTRA_COL');
	});

	it('returns empty when data and define match exactly', () => {
		const data = [{ STUDYID: 'S001', SUBJID: '001' }];
		const defineVars = [
			makeDefineVar('STUDYID'),
			makeDefineVar('SUBJID')
		];

		const results = checkStructuralMismatches(data, defineVars, 'DM');
		expect(results).toEqual([]);
	});

	it('detects both missing and undocumented at the same time', () => {
		const data = [{ STUDYID: 'S001', EXTRA: 'val' }];
		const defineVars = [
			makeDefineVar('STUDYID'),
			makeDefineVar('MISSING_VAR')
		];

		const results = checkStructuralMismatches(data, defineVars, 'AE');
		const missing = results.filter(r => r.ruleId.includes('MISSING_VAR'));
		const undocumented = results.filter(r => r.ruleId.includes('UNDOCUMENTED_VAR'));
		expect(missing.length).toBe(1);
		expect(undocumented.length).toBe(1);
	});

	it('includes domain in ruleId', () => {
		const data = [{ A: 1 }];
		const defineVars = [makeDefineVar('B')];

		const results = checkStructuralMismatches(data, defineVars, 'LB');
		expect(results[0].ruleId).toContain('.LB.');
		expect(results[1].ruleId).toContain('.LB.');
	});
});
