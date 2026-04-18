/**
 * Validation Service
 *
 * Provides validation of datasets against Define-XML specifications.
 * Validates: codelists, length, types, and required fields.
 * Runs validation for ALL datasets with Define-XML matches.
 *
 * Heavy validation (row iteration) runs in a Web Worker to keep the UI responsive.
 * Rule generation and structural checks stay on the main thread.
 */

import * as dataState from '$lib/core/state/dataState.svelte';
import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';
import {
	generateRulesFromDefine,
	convertDefineVariables,
	validate,
	type Rule,
	type ValidationResult,
	type ValidationEngineError,
	type DefineVariableForValidation
} from '@sden99/validation-engine';
import { normalizeDatasetId } from '@sden99/dataset-domain';
import { ruleState } from '$lib/core/state/ruleState.svelte';
import { browser } from '$app/environment';
import { logError, logWarning } from '$lib/core/state/errorState.svelte';
import type { SerializedValidationResult, ValidateResponse } from '$lib/core/services/validation.worker';
import ValidationWorker from '$lib/core/services/validation.worker?worker';

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

// Worker instance (lazy-initialized)
let worker: Worker | null = null;
let requestId = 0;
let pendingRequests = new Map<number, {
	datasetId: string;
	resolve: (result: { results: ValidationResult[]; errors: ValidationEngineError[] }) => void;
}>();

function getWorker(): Worker | null {
	if (!browser) return null;
	if (!worker) {
		try {
			worker = new ValidationWorker();
			worker.onmessage = handleWorkerMessage;
			worker.onerror = (err) => {
				console.error('[ValidationService] Worker error:', err);
				logWarning('Validation worker error — results may be incomplete');
			};
		} catch (e) {
			console.error('[ValidationService] Failed to create worker:', e);
			return null;
		}
	}
	return worker;
}

function handleWorkerMessage(e: MessageEvent<ValidateResponse>) {
	const { type, id, payload } = e.data;
	if (type !== 'VALIDATE_RESULT') return;

	const pending = pendingRequests.get(id);
	if (!pending) return;
	pendingRequests.delete(id);

	// Deserialize: convert Record<string, number> back to Map<string, number>
	const results: ValidationResult[] = payload.results.map(deserializeResult);
	pending.resolve({ results, errors: payload.errors });
}

function deserializeResult(sr: SerializedValidationResult): ValidationResult {
	const result: ValidationResult = {
		ruleId: sr.ruleId,
		columnId: sr.columnId,
		severity: sr.severity,
		issueCount: sr.issueCount,
		affectedRows: sr.affectedRows,
		message: sr.message
	};
	if (sr.details) {
		result.details = { rule: sr.details.rule };
		if (sr.details.invalidValues) {
			result.details.invalidValues = new Map(Object.entries(sr.details.invalidValues).map(
				([k, v]) => [k, v as number]
			));
		}
	}
	return result;
}

function validateViaWorker(
	datasetId: string,
	data: Record<string, unknown>[],
	rules: Rule[],
	domain: string
): Promise<{ results: ValidationResult[]; errors: ValidationEngineError[] }> {
	const w = getWorker();
	if (!w) {
		// Fallback: run synchronously if worker unavailable (SSR or error)
		const errors: ValidationEngineError[] = [];
		const results = validate(data, rules, domain, errors);
		return Promise.resolve({ results, errors });
	}

	const id = ++requestId;
	return new Promise((resolve) => {
		pendingRequests.set(id, { datasetId, resolve });
		w.postMessage({
			type: 'VALIDATE',
			id,
			payload: { datasetId, data, rules, domain }
		});
	});
}

// =============================================================================
// Internal Functions (Main Thread)
// =============================================================================

/**
 * Deduplicate rules: imported rules take priority over auto-generated ones
 * when they target the same variable with the same rule type.
 */
function deduplicateRules(autoRules: Rule[], importedRules: Rule[]): Rule[] {
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
function prepareRulesForDataset(
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

/**
 * Check for structural mismatches between Define-XML variables and actual data columns.
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
 * Rule generation happens on main thread; row evaluation happens in worker.
 */
async function validateAllDatasets(): Promise<void> {
	const datasets = dataState.getDatasets();
	const defineInfo = dataState.getDefineXmlInfo();

	if (!defineInfo.ADaM && !defineInfo.SDTM) return;

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

	try {
		// Collect all validation jobs
		const jobs: Array<{
			fileId: string;
			data: Record<string, unknown>[];
			rules: Rule[];
			validationVars: DefineVariableForValidation[];
			domainName: string;
		}> = [];

		for (const [fileId, dataset] of Object.entries(datasets)) {
			if (!dataset?.data || !Array.isArray(dataset.data)) continue;
			if (resultsByDataset.has(fileId)) continue; // already cached

			const normalizedFileId = normalizeDatasetId(fileId);
			const match = defineMatches.find((m) => m.normalizedName === normalizedFileId);
			if (!match) continue;

			const domainName =
				match.define.ItemGroups.find(
					(ig) =>
						normalizeDatasetId(ig.SASDatasetName || ig.Name || '') ===
						match.normalizedName
				)?.SASDatasetName ||
				match.normalizedName.toUpperCase();

			const prepared = prepareRulesForDataset(domainName, match.define);
			if (!prepared || prepared.rules.length === 0) continue;

			jobs.push({
				fileId,
				data: dataset.data as Record<string, unknown>[],
				rules: prepared.rules,
				validationVars: prepared.validationVars,
				domainName
			});
		}

		if (jobs.length === 0) {
			isValidating = false;
			return;
		}

		// Send all jobs to worker in parallel
		const promises = jobs.map(async (job) => {
			const { results, errors } = await validateViaWorker(
				job.fileId,
				job.data,
				job.rules,
				job.domainName
			);

			// Structural checks run on main thread (fast, needs no row iteration)
			const structuralResults = checkStructuralMismatches(
				job.data,
				job.validationVars,
				job.domainName
			);
			results.push(...structuralResults);

			return { fileId: job.fileId, results, errors };
		});

		const outcomes = await Promise.all(promises);

		// Update cache with all results
		const newCache = new Map(resultsByDataset);
		for (const { fileId, results, errors } of outcomes) {
			newCache.set(fileId, {
				results,
				errors,
				timestamp: Date.now(),
				rulesGenerated: results.length
			});
		}
		resultsByDataset = newCache;
	} catch (error) {
		lastError = error instanceof Error ? error.message : String(error);
		console.error('[ValidationService] Validation failed:', error);
		logError(error, { context: 'validateAllDatasets' });
	} finally {
		isValidating = false;
	}
}

// =============================================================================
// Public API
// =============================================================================

export const validationService = {
	get isValidating() {
		return isValidating;
	},

	get lastError() {
		return lastError;
	},

	getResultsForDataset(datasetId: string): ValidationResult[] {
		const entry = resultsByDataset.get(datasetId);
		if (entry) return entry.results;

		const normalized = normalizeDatasetId(datasetId);
		for (const [key, value] of resultsByDataset) {
			if (normalizeDatasetId(key) === normalized) {
				return value.results;
			}
		}
		return [];
	},

	getCacheEntry(datasetId: string): ValidationCacheEntry | undefined {
		return resultsByDataset.get(datasetId);
	},

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

	getTotalIssueCount(datasetId: string): number {
		const results = this.getResultsForDataset(datasetId);
		return results.reduce((sum, r) => sum + r.issueCount, 0);
	},

	hasValidationRun(datasetId: string): boolean {
		if (resultsByDataset.has(datasetId)) return true;
		const normalized = normalizeDatasetId(datasetId);
		for (const key of resultsByDataset.keys()) {
			if (normalizeDatasetId(key) === normalized) return true;
		}
		return false;
	},

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

	invalidateCache(datasetId?: string): void {
		if (datasetId) {
			const newCache = new Map(resultsByDataset);
			newCache.delete(datasetId);
			resultsByDataset = newCache;
		} else {
			resultsByDataset = new Map();
		}
	},

	revalidate(): void {
		resultsByDataset = new Map();
		validateAllDatasets().catch((error) => {
			logError(error, { context: 'revalidate' });
		});
	},

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
