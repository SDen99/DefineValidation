import { describe, it, expect } from 'vitest';
import { adaptEngineResults, buildEngineRules, type EngineOutput, type EngineIssueDetail } from '../engineResultAdapter';

import basicOutput from './fixtures/engine-output-basic.json';
import multiDatasetOutput from './fixtures/engine-output-multi-dataset.json';
import legacyOutput from './fixtures/engine-output-legacy.json';
import emptyOutput from './fixtures/engine-output-empty.json';

// =============================================================================
// adaptEngineResults
// =============================================================================

describe('adaptEngineResults', () => {
	it('groups multiple issues for same rule+dataset into one ValidationResult', () => {
		const results = adaptEngineResults(basicOutput as EngineOutput);
		const dmResults = results.get('dm');
		expect(dmResults).toBeDefined();
		expect(dmResults!.length).toBe(1);
		expect(dmResults![0].ruleId).toBe('ENGINE.CG0001');
		expect(dmResults![0].issueCount).toBe(2);
		expect(dmResults![0].affectedRows).toEqual([5, 12]);
	});

	it('maps severity correctly (record -> error, dataset -> warning, value -> info)', () => {
		const results = adaptEngineResults(multiDatasetOutput as EngineOutput);
		const aeResults = results.get('ae')!;

		const recordResult = aeResults.find(r => r.ruleId === 'ENGINE.CG0015');
		expect(recordResult?.severity).toBe('error');

		const datasetResult = aeResults.find(r => r.ruleId === 'ENGINE.CG0020');
		expect(datasetResult?.severity).toBe('warning');
	});

	it('maps value sensitivity to info severity', () => {
		const results = adaptEngineResults(legacyOutput as EngineOutput);
		const exResults = results.get('ex')!;
		expect(exResults[0].severity).toBe('info');
	});

	it('normalizes dataset keys (dm.xpt -> dm, EX.xpt -> ex)', () => {
		const basicResults = adaptEngineResults(basicOutput as EngineOutput);
		expect(basicResults.has('dm')).toBe(true);
		expect(basicResults.has('dm.xpt')).toBe(false);

		const legacyResults = adaptEngineResults(legacyOutput as EngineOutput);
		expect(legacyResults.has('ex')).toBe(true);
		expect(legacyResults.has('EX.xpt')).toBe(false);
	});

	it('handles both PascalCase and lowercase field names', () => {
		// PascalCase (legacy)
		const legacyResults = adaptEngineResults(legacyOutput as EngineOutput);
		const exResults = legacyResults.get('ex')!;
		expect(exResults.length).toBe(1);
		expect(exResults[0].ruleId).toBe('ENGINE.CG0050');
		expect(exResults[0].affectedRows).toEqual([1, 3]);

		// lowercase (current)
		const currentResults = adaptEngineResults(basicOutput as EngineOutput);
		const dmResults = currentResults.get('dm')!;
		expect(dmResults[0].ruleId).toBe('ENGINE.CG0001');
	});

	it('handles missing/null row fields gracefully', () => {
		const results = adaptEngineResults(multiDatasetOutput as EngineOutput);
		const aeResults = results.get('ae')!;
		const datasetLevelResult = aeResults.find(r => r.ruleId === 'ENGINE.CG0020');
		// null row should result in issueCount of 1 but empty affectedRows
		expect(datasetLevelResult?.issueCount).toBe(1);
		expect(datasetLevelResult?.affectedRows).toEqual([]);
	});

	it('prefixes ruleId with ENGINE.', () => {
		const results = adaptEngineResults(basicOutput as EngineOutput);
		const dmResults = results.get('dm')!;
		for (const result of dmResults) {
			expect(result.ruleId).toMatch(/^ENGINE\./);
		}
	});

	it('returns empty Map for empty input', () => {
		const results = adaptEngineResults(emptyOutput as EngineOutput);
		expect(results.size).toBe(0);
	});

	it('returns empty Map when no Issue_Details present', () => {
		const results = adaptEngineResults({} as EngineOutput);
		expect(results.size).toBe(0);
	});

	it('splits results across multiple datasets', () => {
		const results = adaptEngineResults(multiDatasetOutput as EngineOutput);
		expect(results.has('dm')).toBe(true);
		expect(results.has('ae')).toBe(true);
		expect(results.size).toBe(2);
	});

	it('collects all variables from issues into first columnId', () => {
		const results = adaptEngineResults(multiDatasetOutput as EngineOutput);
		const aeResults = results.get('ae')!;
		const dateResult = aeResults.find(r => r.ruleId === 'ENGINE.CG0015');
		// First variable becomes columnId
		expect(dateResult?.columnId).toBe('AESTDTC');
	});

	it('extracts variables from Record format (legacy)', () => {
		const results = adaptEngineResults(legacyOutput as EngineOutput);
		const exResults = results.get('ex')!;
		expect(exResults[0].columnId).toBe('EXSTDTC');
	});
});

// =============================================================================
// buildEngineRules
// =============================================================================

describe('buildEngineRules', () => {
	it('builds Rule objects from Rules_Report entries', () => {
		const adapted = adaptEngineResults(basicOutput as EngineOutput);
		const rules = buildEngineRules(basicOutput.Rules_Report, adapted);
		expect(rules.length).toBe(1);
		expect(rules[0].Core.Id).toBe('ENGINE.CG0001');
		expect(rules[0].Rule_Type).toBe('CDISC Engine');
		expect(rules[0].Core.Status).toBe('Published');
	});

	it('collects affected domains from results', () => {
		const adapted = adaptEngineResults(multiDatasetOutput as EngineOutput);
		const rules = buildEngineRules(multiDatasetOutput.Rules_Report, adapted);

		const cg0015Rule = rules.find(r => r.Core.Id === 'ENGINE.CG0015');
		expect(cg0015Rule?.Scope?.Domains?.Include).toContain('AE');
	});

	it('handles rules without Rules_Report entry (fallback to results)', () => {
		// Create a result map with a rule not in the report
		const resultsByDataset = new Map([
			['dm', [{
				ruleId: 'ENGINE.CUSTOM001',
				columnId: 'SUBJID',
				severity: 'error' as const,
				issueCount: 1,
				affectedRows: [1],
				message: 'Custom rule violation'
			}]]
		]);

		const rules = buildEngineRules([], resultsByDataset);
		expect(rules.length).toBe(1);
		expect(rules[0].Core.Id).toBe('ENGINE.CUSTOM001');
		expect(rules[0].Description).toBe('Custom rule violation');
	});

	it('sets correct Rule_Type for all engine rules', () => {
		const adapted = adaptEngineResults(multiDatasetOutput as EngineOutput);
		const rules = buildEngineRules(multiDatasetOutput.Rules_Report, adapted);
		for (const rule of rules) {
			expect(rule.Rule_Type).toBe('CDISC Engine');
		}
	});

	it('uses description from Rules_Report', () => {
		const adapted = adaptEngineResults(legacyOutput as EngineOutput);
		const rules = buildEngineRules(legacyOutput.Rules_Report, adapted);
		expect(rules[0].Description).toBe('Date/time variable format check');
	});
});
