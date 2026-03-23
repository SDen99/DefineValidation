/**
 * YAML Rule Processor
 *
 * Processes YAML/YML files containing CDISC validation rules.
 * Parses, maps field names, and validates rules before import.
 */

import { load as yamlLoad } from 'js-yaml';
import {
	cdiscToInternal,
	validateImportedRule,
	type Rule
} from '@sden99/validation-engine';
import type { DatasetLoadingState } from '$lib/core/types/types';

export interface YamlRuleProcessingResult {
	rules: Rule[];
	warnings: string[];
}

export class YamlRuleProcessor {
	/** Check if the file has a YAML extension */
	validateFile(file: File): { valid: boolean; error?: string } {
		const name = file.name.toLowerCase();
		if (name.endsWith('.yaml') || name.endsWith('.yml')) {
			return { valid: true };
		}
		return {
			valid: false,
			error: `${file.name} is not a YAML file (.yaml or .yml expected)`
		};
	}

	/** Process a YAML file containing one or more CDISC rules */
	async processFile(
		file: File,
		_onProgress?: (state: DatasetLoadingState) => void
	): Promise<YamlRuleProcessingResult> {
		const text = await file.text();
		const parsed = yamlLoad(text);

		if (!parsed || typeof parsed !== 'object') {
			throw new Error(`${file.name} does not contain valid YAML`);
		}

		// Handle single rule or array of rules
		const rawRules: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

		const rules: Rule[] = [];
		const warnings: string[] = [];

		for (let i = 0; i < rawRules.length; i++) {
			const raw = rawRules[i];
			const label = rawRules.length > 1 ? `Rule ${i + 1}` : 'Rule';

			// Convert CDISC field names (spaces) to internal (underscores)
			const converted = cdiscToInternal<Record<string, unknown>>(raw);

			// Validate
			const validation = validateImportedRule(converted);

			if (!validation.isValid) {
				const errorMsgs = validation.issues
					.filter((i) => i.level === 'error')
					.map((i) => i.message)
					.join('; ');
				warnings.push(`${label} skipped: ${errorMsgs}`);
				continue;
			}

			// Add warning-level issues
			for (const issue of validation.issues.filter((i) => i.level === 'warning')) {
				warnings.push(`${label} (${(converted as any).Core?.Id}): ${issue.message}`);
			}

			// Mark executability based on unsupported operators
			const rule = converted as unknown as Rule;
			if (validation.unsupportedOperators.length > 0) {
				rule.Executability = 'Partially Executable';
			}

			// Fill in defaults for optional fields
			if (!rule.Core.Version) rule.Core.Version = '1';
			if (!rule.Core.Status) rule.Core.Status = 'Draft';
			if (!rule.Sensitivity) rule.Sensitivity = 'Record';
			if (!rule.Executability) rule.Executability = 'Fully Executable';
			if (!rule.Rule_Type) rule.Rule_Type = 'Custom';

			rules.push(rule);
		}

		if (rules.length === 0 && warnings.length === 0) {
			throw new Error(`${file.name} did not contain any valid rules`);
		}

		return { rules, warnings };
	}
}
