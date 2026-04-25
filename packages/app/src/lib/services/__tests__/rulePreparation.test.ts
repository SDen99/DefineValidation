import { describe, it, expect } from 'vitest';
import { deduplicateRules } from '../rulePreparation';
import type { Rule } from '@sden99/validation-engine';

function makeRule(overrides: Partial<Rule> = {}): Rule {
	return {
		Core: { Id: 'TEST.001', Version: '1', Status: 'Draft' },
		Description: 'Test rule',
		Sensitivity: 'Record',
		Executability: 'Fully Executable',
		Rule_Type: 'Codelist',
		Target_Variable: 'AETERM',
		Scope: { Domains: { Include: ['AE'] } },
		Check: { name: 'AETERM', operator: 'in' },
		Outcome: { Message: 'Test' },
		...overrides
	} as Rule;
}

describe('deduplicateRules', () => {
	it('returns auto rules unchanged when no imported rules', () => {
		const auto = [makeRule({ Core: { Id: 'A1', Version: '1', Status: 'Draft' } })];
		const result = deduplicateRules(auto, []);
		expect(result).toEqual(auto);
	});

	it('imported rules take precedence over auto rules for same variable+type', () => {
		const auto = [
			makeRule({
				Core: { Id: 'AUTO.1', Version: '1', Status: 'Draft' },
				Target_Variable: 'SEX',
				Rule_Type: 'Codelist'
			})
		];
		const imported = [
			makeRule({
				Core: { Id: 'IMP.1', Version: '1', Status: 'Draft' },
				Target_Variable: 'SEX',
				Rule_Type: 'Codelist'
			})
		];

		const result = deduplicateRules(auto, imported);
		expect(result.length).toBe(1);
		expect(result[0].Core.Id).toBe('IMP.1');
	});

	it('keeps auto rules that do not conflict with imported', () => {
		const auto = [
			makeRule({
				Core: { Id: 'AUTO.1', Version: '1', Status: 'Draft' },
				Target_Variable: 'SEX',
				Rule_Type: 'Codelist'
			}),
			makeRule({
				Core: { Id: 'AUTO.2', Version: '1', Status: 'Draft' },
				Target_Variable: 'AGE',
				Rule_Type: 'Length'
			})
		];
		const imported = [
			makeRule({
				Core: { Id: 'IMP.1', Version: '1', Status: 'Draft' },
				Target_Variable: 'SEX',
				Rule_Type: 'Codelist'
			})
		];

		const result = deduplicateRules(auto, imported);
		expect(result.length).toBe(2);
		const ids = result.map(r => r.Core.Id);
		expect(ids).toContain('AUTO.2');
		expect(ids).toContain('IMP.1');
		expect(ids).not.toContain('AUTO.1');
	});

	it('handles rules with no Target_Variable gracefully', () => {
		const auto = [
			makeRule({
				Core: { Id: 'AUTO.1', Version: '1', Status: 'Draft' },
				Target_Variable: undefined
			})
		];
		const imported = [
			makeRule({
				Core: { Id: 'IMP.1', Version: '1', Status: 'Draft' },
				Target_Variable: undefined
			})
		];

		const result = deduplicateRules(auto, imported);
		// Both kept since Target_Variable is empty — no key match
		expect(result.length).toBe(2);
	});

	it('different Rule_Type for same variable does not conflict', () => {
		const auto = [
			makeRule({
				Core: { Id: 'AUTO.1', Version: '1', Status: 'Draft' },
				Target_Variable: 'SEX',
				Rule_Type: 'Length'
			})
		];
		const imported = [
			makeRule({
				Core: { Id: 'IMP.1', Version: '1', Status: 'Draft' },
				Target_Variable: 'SEX',
				Rule_Type: 'Codelist'
			})
		];

		const result = deduplicateRules(auto, imported);
		expect(result.length).toBe(2);
	});
});
