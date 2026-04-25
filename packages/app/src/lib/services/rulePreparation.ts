/**
 * Rule Preparation
 *
 * Handles rule generation from Define-XML and deduplication of
 * auto-generated rules against imported rules.
 */

import * as dataState from '$lib/core/state/dataState.svelte';
import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';
import {
	generateRulesFromDefine,
	convertDefineVariables,
	type Rule,
	type DefineVariableForValidation
} from '@sden99/validation-engine';
import { ruleState } from '$lib/core/state/ruleState.svelte';

/**
 * Deduplicate rules: imported rules take priority over auto-generated ones
 * when they target the same variable with the same rule type.
 */
export function deduplicateRules(autoRules: Rule[], importedRules: Rule[]): Rule[] {
	if (importedRules.length === 0) return autoRules;

	const importedKeys = new Set<string>();
	for (const rule of importedRules) {
		const variable = rule.Target_Variable || '';
		const type = rule.Rule_Type || '';
		if (variable) {
			importedKeys.add(`${variable}|${type}`);
		}
	}

	const filteredAuto = autoRules.filter((rule) => {
		const variable = rule.Target_Variable || '';
		const type = rule.Rule_Type || '';
		if (variable && importedKeys.has(`${variable}|${type}`)) {
			return false;
		}
		return true;
	});

	return [...filteredAuto, ...importedRules];
}

/**
 * Prepare rules for a dataset (main thread — needs state access).
 * Returns the rules to send to the worker + validation vars for structural checks.
 */
export function prepareRulesForDataset(
	domainName: string,
	define: import('@sden99/cdisc-types/define-xml').ParsedDefineXML
): { rules: Rule[]; validationVars: DefineVariableForValidation[] } | null {
	const itemGroup = dataState.getItemGroupMetadata(domainName);
	if (!itemGroup) return null;

	const defineVars = convertToDefineVariables(itemGroup, define);
	const validationVars = convertDefineVariables(defineVars, domainName);
	if (validationVars.length === 0) return null;

	const autoRules = generateRulesFromDefine(validationVars, domainName);
	const importedForDomain = ruleState
		.getRulesForDomain(domainName)
		.filter((r) => r.Executability === 'Fully Executable');
	const rules = deduplicateRules(autoRules, importedForDomain);

	return { rules, validationVars };
}
