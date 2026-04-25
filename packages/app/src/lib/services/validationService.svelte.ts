/**
 * Validation Service
 *
 * Public API facade for dataset validation. Orchestrates:
 * - Rule preparation (rulePreparation.ts)
 * - Worker-based row validation (validationWorkerBridge.ts)
 * - Structural mismatch checks (structuralChecks.ts)
 * - Engine result merging (engineResultAdapter.ts)
 *
 * Heavy validation (row iteration) runs in a Web Worker to keep the UI responsive.
 * Rule generation and structural checks stay on the main thread.
 */

import * as dataState from '$lib/core/state/dataState.svelte';
import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';
import {
	generateRulesFromDefine,
	convertDefineVariables,
	type Rule,
	type ValidationResult,
	type ValidationEngineError
} from '@sden99/validation-engine';
import { normalizeDatasetId } from '@sden99/dataset-domain';
import { logError } from '$lib/core/state/errorState.svelte';

import { validateViaWorker } from './validationWorkerBridge';
import { prepareRulesForDataset } from './rulePreparation';
import { checkStructuralMismatches } from './structuralChecks';

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
// Core Orchestration
// =============================================================================

/**
 * Validate ALL datasets that have a matching Define-XML.
 * Rule generation happens on main thread; row evaluation happens in worker.
 */
async function validateAllDatasets(): Promise<void> {
	const datasets = dataState.getDatasets();
	const defineInfo = dataState.getDefineXmlInfo();

	if (!defineInfo.ADaM && !defineInfo.SDTM && !defineInfo.SEND) return;

	const defineMatches: Array<{
		normalizedName: string;
		define: import('@sden99/cdisc-types/define-xml').ParsedDefineXML;
		type: string;
	}> = [];

	for (const [define, type] of [
		[defineInfo.ADaM, 'ADaM'],
		[defineInfo.SDTM, 'SDTM'],
		[defineInfo.SEND, 'SEND']
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
			validationVars: import('@sden99/validation-engine').DefineVariableForValidation[];
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

	/**
	 * Merge engine results into the existing validation cache.
	 * Engine results are keyed by lowercase dataset name (no extension).
	 * We match them to existing dataset keys in the cache.
	 */
	addEngineResults(engineResults: Map<string, import('@sden99/validation-engine').ValidationResult[]>): void {
		if (engineResults.size === 0) return;

		const newCache = new Map(resultsByDataset);
		const datasets = dataState.getDatasets();

		for (const [engineKey, results] of engineResults) {
			// The adapter already normalizes keys (lowercase, no extension)
			const normalizedEngineKey = normalizeDatasetId(engineKey);

			// Find the matching dataset key in our cache or loaded datasets
			let targetKey: string | null = null;

			// Direct match on existing cache keys
			for (const key of newCache.keys()) {
				if (normalizeDatasetId(key) === normalizedEngineKey) {
					targetKey = key;
					break;
				}
			}

			// If not in cache yet, try loaded datasets
			if (!targetKey) {
				for (const fileId of Object.keys(datasets)) {
					if (normalizeDatasetId(fileId) === normalizedEngineKey) {
						targetKey = fileId;
						break;
					}
				}
			}

			// Last resort: use the engine key directly as the dataset key
			if (!targetKey) {
				targetKey = engineKey;
			}

			const existing = newCache.get(targetKey);
			if (existing) {
				// Remove any prior ENGINE.* results to avoid duplicates on re-run
				const clientResults = existing.results.filter(r => !r.ruleId.startsWith('ENGINE.'));
				newCache.set(targetKey, {
					...existing,
					results: [...clientResults, ...results],
					timestamp: Date.now()
				});
			} else {
				// No client-side results yet — create a new entry
				newCache.set(targetKey, {
					results,
					errors: [],
					timestamp: Date.now(),
					rulesGenerated: results.length
				});
			}
		}

		resultsByDataset = newCache;
	},

	getAutoGeneratedRules(): Rule[] {
		const defineInfo = dataState.getDefineXmlInfo();
		const ruleMap = new Map<string, Rule>();

		if (!defineInfo.ADaM && !defineInfo.SDTM && !defineInfo.SEND) return [];

		for (const [define, _type] of [
			[defineInfo.ADaM, 'ADaM'],
			[defineInfo.SDTM, 'SDTM'],
			[defineInfo.SEND, 'SEND']
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
