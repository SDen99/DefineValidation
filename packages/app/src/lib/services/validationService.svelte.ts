/**
 * Validation Service
 *
 * Provides validation of datasets against Define-XML specifications.
 * Validates: codelists, length, types, and required fields.
 * Runs validation for ALL datasets with Define-XML matches.
 *
 * Trigger validation by calling `validationService.revalidate()` after
 * datasets or Define-XML data change (e.g., after file import or app init).
 */

import * as dataState from '$lib/core/state/dataState.svelte';
import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';
import {
	generateRulesFromDefine,
	validate,
	convertDefineVariables,
	type Rule,
	type ValidationResult,
	type ValidationEngineError,
	type DefineVariableForValidation
} from '@sden99/validation-engine';
import { normalizeDatasetId } from '@sden99/dataset-domain';
import { ruleState } from '$lib/core/state/ruleState.svelte';

// =============================================================================
// Types
// =============================================================================

export interface ValidationCacheEntry {
	results: ValidationResult[];
	errors: ValidationEngineError[];
	timestamp: number;
	rulesGenerated: number;
}

// =============================================================================
// Module-level State
// =============================================================================

let resultsByDataset = $state<Map<string, ValidationCacheEntry>>(new Map());
let isValidating = $state(false);
let lastError = $state<string | null>(null);


// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Deduplicate rules: imported rules take priority over auto-generated ones
 * when they target the same variable with the same rule type.
 * This prevents double-counting when an imported rule overlaps an auto-generated one.
 */
function deduplicateRules(autoRules: Rule[], importedRules: Rule[]): Rule[] {
	if (importedRules.length === 0) return autoRules;

	// Build a set of keys from imported rules: "variable|ruleType"
	const importedKeys = new Set<string>();
	for (const rule of importedRules) {
		const variable = rule.Target_Variable || '';
		const type = rule.Rule_Type || '';
		if (variable) {
			importedKeys.add(`${variable}|${type}`);
		}
	}

	// Filter out auto rules that overlap with imported rules
	const filteredAuto = autoRules.filter((rule) => {
		const variable = rule.Target_Variable || '';
		const type = rule.Rule_Type || '';
		if (variable && importedKeys.has(`${variable}|${type}`)) {
			return false; // Skip — imported rule covers this
		}
		return true;
	});

	return [...filteredAuto, ...importedRules];
}

/**
 * Run validation for a specific dataset against its matching Define-XML.
 */
function runValidation(
	_datasetId: string,
	datasetData: unknown[],
	domain: string,
	defineVariables: DefineVariableForValidation[]
): { results: ValidationResult[]; errors: ValidationEngineError[] } {
	const autoRules = generateRulesFromDefine(defineVariables, domain);

	// Merge imported rules that apply to this domain and are fully executable
	const importedForDomain = ruleState
		.getRulesForDomain(domain)
		.filter((r) => r.Executability === 'Fully Executable');

	// Deduplicate: imported rules take priority over auto-generated ones
	// when they target the same variable with the same check type
	const allRules = deduplicateRules(autoRules, importedForDomain);

	if (allRules.length === 0) {
		return { results: [], errors: [] };
	}

	const errors: ValidationEngineError[] = [];
	const results = validate(datasetData as Record<string, unknown>[], allRules, domain, errors);
	return { results, errors };
}

/**
 * Validate a single dataset against a specific Define-XML.
 * Returns the results or null if validation can't run.
 */
function validateDataset(
	datasetId: string,
	datasetData: unknown[],
	domainName: string,
	define: import('@sden99/cdisc-types/define-xml').ParsedDefineXML,
	defineType: string
): { results: ValidationResult[]; errors: ValidationEngineError[] } | null {
	// Skip if already validated (results are cached)
	if (resultsByDataset.has(datasetId)) {
		return null;
	}

	// Get ItemGroup metadata for this domain from the Define-XML
	const itemGroup = dataState.getItemGroupMetadata(domainName);
	if (!itemGroup) return null;

	// Convert to validation engine format
	const defineVars = convertToDefineVariables(itemGroup, define);
	const validationVars = convertDefineVariables(defineVars, domainName);

	if (validationVars.length === 0) return null;

	const { results, errors } = runValidation(datasetId, datasetData, domainName, validationVars);

	// Structural checks: compare Define-XML variables vs actual data columns
	const structuralResults = checkStructuralMismatches(
		datasetData as Record<string, unknown>[],
		validationVars,
		domainName
	);
	results.push(...structuralResults);

	return { results, errors };
}

/**
 * Check for structural mismatches between Define-XML variables and actual data columns.
 * Produces "Missing Variable" results (in Define but not in data) and
 * "Undocumented Variable" results (in data but not in Define).
 */
function checkStructuralMismatches(
	datasetData: Record<string, unknown>[],
	defineVars: DefineVariableForValidation[],
	domain: string
): ValidationResult[] {
	if (datasetData.length === 0) return [];

	const results: ValidationResult[] = [];
	const dataColumns = new Set(Object.keys(datasetData[0]));
	const defineNames = new Set(defineVars.map((v) => v.name));

	// Missing variables: in Define-XML but not in data
	for (const name of defineNames) {
		if (!dataColumns.has(name)) {
			results.push({
				ruleId: `AUTO.MISSING_VAR.${domain}.${name}`,
				columnId: name,
				severity: 'warning',
				issueCount: 1,
				affectedRows: [],
				message: `Variable ${name} is defined in the Define-XML but missing from the dataset`,
				details: {
					invalidValues: new Map(),
					rule: {
						Core: { Id: `AUTO.MISSING_VAR.${domain}.${name}`, Version: '1', Status: 'Draft' },
						Authorities: [{
							Organization: 'Auto-Generated',
							Standards: [{
								Name: domain,
								Version: '1.0',
								References: [{
									Rule_Identifier: { Id: `AUTO.MISSING_VAR.${domain}.${name}`, Version: '1' },
									Origin: 'Define-XML Auto-Generation',
									Version: '1.0'
								}]
							}]
						}],
						Description: `${name} is defined in metadata but not present in data`,
						Sensitivity: 'Dataset',
						Executability: 'Fully Executable',
						Rule_Type: 'Missing Variable',
						Target_Variable: name,
						Scope: { Domains: { Include: [domain] } },
						Check: { name, operator: 'empty' },
						Outcome: { Message: `Variable ${name} missing from dataset`, Output_Variables: [name] }
					}
				}
			});
		}
	}

	// Undocumented variables: in data but not in Define-XML
	for (const col of dataColumns) {
		if (!defineNames.has(col)) {
			results.push({
				ruleId: `AUTO.UNDOCUMENTED_VAR.${domain}.${col}`,
				columnId: col,
				severity: 'info',
				issueCount: 1,
				affectedRows: [],
				message: `Variable ${col} exists in the dataset but is not documented in the Define-XML`,
				details: {
					invalidValues: new Map(),
					rule: {
						Core: { Id: `AUTO.UNDOCUMENTED_VAR.${domain}.${col}`, Version: '1', Status: 'Draft' },
						Authorities: [{
							Organization: 'Auto-Generated',
							Standards: [{
								Name: domain,
								Version: '1.0',
								References: [{
									Rule_Identifier: { Id: `AUTO.UNDOCUMENTED_VAR.${domain}.${col}`, Version: '1' },
									Origin: 'Define-XML Auto-Generation',
									Version: '1.0'
								}]
							}]
						}],
						Description: `${col} is present in data but not defined in metadata`,
						Sensitivity: 'Dataset',
						Executability: 'Fully Executable',
						Rule_Type: 'Undocumented Variable',
						Target_Variable: col,
						Scope: { Domains: { Include: [domain] } },
						Check: { name: col, operator: 'non_empty' },
						Outcome: { Message: `Variable ${col} not in Define-XML`, Output_Variables: [col] }
					}
				}
			});
		}
	}

	return results;
}

/**
 * Validate ALL datasets that have a matching Define-XML.
 * Caches results per dataset so they're available instantly on navigation.
 */
function validateAllDatasets(): void {
	const datasets = dataState.getDatasets();
	const defineInfo = dataState.getDefineXmlInfo();

	// Need at least one Define-XML
	if (!defineInfo.ADaM && !defineInfo.SDTM) return;

	// Build lookup: normalized domain name → { define, type }
	const defineMatches: Array<{
		normalizedName: string;
		define: import('@sden99/cdisc-types/define-xml').ParsedDefineXML;
		type: string;
	}> = [];

	for (const [define, type] of [
		[defineInfo.ADaM, 'ADaM'],
		[defineInfo.SDTM, 'SDTM']
	] as const) {
		if (!define) continue;
		for (const ig of define.ItemGroups) {
			const name = normalizeDatasetId(ig.SASDatasetName || ig.Name || '');
			if (name) {
				defineMatches.push({ normalizedName: name, define, type });
			}
		}
	}

	if (defineMatches.length === 0) return;

	isValidating = true;
	lastError = null;
	let newCache = new Map(resultsByDataset);
	let validated = 0;

	try {
		// Iterate all tabular datasets
		for (const [fileId, dataset] of Object.entries(datasets)) {
			if (!dataset?.data || !Array.isArray(dataset.data)) continue;

			// Find matching Define-XML by normalized filename
			const normalizedFileId = normalizeDatasetId(fileId);
			const match = defineMatches.find((m) => m.normalizedName === normalizedFileId);
			if (!match) continue;

			// Determine domain name (use the original ItemGroup name, not file ID)
			const domainName =
				match.define.ItemGroups.find(
					(ig) =>
						normalizeDatasetId(ig.SASDatasetName || ig.Name || '') ===
						match.normalizedName
				)?.SASDatasetName ||
				match.normalizedName.toUpperCase();

			const outcome = validateDataset(
				fileId,
				dataset.data,
				domainName,
				match.define,
				match.type
			);

			if (outcome !== null) {
				newCache.set(fileId, {
					results: outcome.results,
					errors: outcome.errors,
					timestamp: Date.now(),
					rulesGenerated: outcome.results.length
				});
				validated++;
			}
		}

		if (validated > 0) {
			resultsByDataset = newCache;
		}
	} catch (error) {
		lastError = error instanceof Error ? error.message : String(error);
		console.error('[ValidationService] Validation failed:', error);
	} finally {
		isValidating = false;
	}
}

// =============================================================================
// Public API
// =============================================================================

export const validationService = {
	/**
	 * Whether validation is currently running.
	 */
	get isValidating() {
		return isValidating;
	},

	/**
	 * Last error message, if any.
	 */
	get lastError() {
		return lastError;
	},

	/**
	 * Get validation results for a specific dataset.
	 */
	getResultsForDataset(datasetId: string): ValidationResult[] {
		// Try exact match first
		const entry = resultsByDataset.get(datasetId);
		if (entry) return entry.results;

		// Fall back to normalized lookup (e.g., "ADSL" matches "adsl.sas7bdat")
		const normalized = normalizeDatasetId(datasetId);
		for (const [key, value] of resultsByDataset) {
			if (normalizeDatasetId(key) === normalized) {
				return value.results;
			}
		}
		return [];
	},

	/**
	 * Get the full cache entry for a dataset (includes metadata).
	 */
	getCacheEntry(datasetId: string): ValidationCacheEntry | undefined {
		return resultsByDataset.get(datasetId);
	},

	/**
	 * Get results grouped by column for a dataset.
	 */
	getResultsByColumn(datasetId: string): Map<string, ValidationResult[]> {
		const results = this.getResultsForDataset(datasetId);
		const byColumn = new Map<string, ValidationResult[]>();

		for (const result of results) {
			const existing = byColumn.get(result.columnId) || [];
			existing.push(result);
			byColumn.set(result.columnId, existing);
		}

		return byColumn;
	},

	/**
	 * Get engine errors for a specific dataset (unknown operators, missing columns, etc.).
	 */
	getErrorsForDataset(datasetId: string): ValidationEngineError[] {
		const entry = resultsByDataset.get(datasetId);
		if (entry) return entry.errors;

		const normalized = normalizeDatasetId(datasetId);
		for (const [key, value] of resultsByDataset) {
			if (normalizeDatasetId(key) === normalized) {
				return value.errors;
			}
		}
		return [];
	},

	/**
	 * Get the total issue count for a dataset.
	 */
	getTotalIssueCount(datasetId: string): number {
		const results = this.getResultsForDataset(datasetId);
		return results.reduce((sum, r) => sum + r.issueCount, 0);
	},

	/**
	 * Get violations for a specific rule across all datasets.
	 * Returns array of { datasetId, columnId, affectedRows, issueCount }.
	 */
	getViolationsByRule(ruleId: string): Array<{
		datasetId: string;
		columnId: string;
		affectedRows: number[];
		issueCount: number;
	}> {
		const violations: Array<{
			datasetId: string;
			columnId: string;
			affectedRows: number[];
			issueCount: number;
		}> = [];
		for (const [datasetId, entry] of resultsByDataset) {
			for (const result of entry.results) {
				if (result.ruleId === ruleId && result.issueCount > 0) {
					violations.push({
						datasetId,
						columnId: result.columnId,
						affectedRows: [...result.affectedRows],
						issueCount: result.issueCount
					});
				}
			}
		}
		return violations;
	},

	/**
	 * Invalidate cached results for a dataset (or all if no ID provided).
	 */
	invalidateCache(datasetId?: string): void {
		if (datasetId) {
			const newCache = new Map(resultsByDataset);
			newCache.delete(datasetId);
			resultsByDataset = newCache;
		} else {
			resultsByDataset = new Map();
		}
	},

	/**
	 * Force re-validation of all datasets.
	 * Call this after datasets or Define-XML data changes.
	 */
	revalidate(): void {
		resultsByDataset = new Map();
		validateAllDatasets();
	},

	/**
	 * Get all auto-generated rules across all validated datasets.
	 * Returns deduplicated rules (one per unique rule ID).
	 */
	getAutoGeneratedRules(): Rule[] {
		const defineInfo = dataState.getDefineXmlInfo();
		const ruleMap = new Map<string, Rule>();

		if (!defineInfo.ADaM && !defineInfo.SDTM) return [];

		for (const [define, _type] of [
			[defineInfo.ADaM, 'ADaM'],
			[defineInfo.SDTM, 'SDTM']
		] as const) {
			if (!define) continue;
			for (const ig of define.ItemGroups) {
				const domainName = ig.SASDatasetName || ig.Name || '';
				if (!domainName) continue;

				const itemGroup = dataState.getItemGroupMetadata(domainName);
				if (!itemGroup) continue;

				const defineVars = convertToDefineVariables(itemGroup, define);
				const validationVars = convertDefineVariables(defineVars, domainName);
				if (validationVars.length === 0) continue;

				const rules = generateRulesFromDefine(validationVars, domainName);
				for (const rule of rules) {
					ruleMap.set(rule.Core.Id, rule);
				}
			}
		}

		return Array.from(ruleMap.values());
	}
};
