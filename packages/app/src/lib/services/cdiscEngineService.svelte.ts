/**
 * CDISC Engine Service
 *
 * Client-side service that sends dataset files + rules to the server
 * for validation via the CDISC Rules Engine. Results are adapted to
 * the app's ValidationResult[] format and merged into the validation cache.
 */

import { exportRulesToYaml } from '$lib/utils/ruleExporter';
import { ruleState } from '$lib/core/state/ruleState.svelte';
import { adaptEngineResults, buildEngineRules, type EngineApiResponse, type EngineRuleReport } from './engineResultAdapter';
import type { Rule, ValidationResult } from '@sden99/validation-engine';

// =============================================================================
// Module State
// =============================================================================

let isRunning = $state(false);
let lastError = $state<string | null>(null);
let lastResults = $state<Map<string, ValidationResult[]>>(new Map());
let lastRunAt = $state<number | null>(null);
let lastRulesReport = $state<EngineRuleReport[]>([]);

// Stash raw File objects during upload for server-side re-upload
let pendingFiles: File[] = [];

// =============================================================================
// Configuration
// =============================================================================

const SDTM_STANDARD = 'sdtmig';
const SDTM_VERSION = '3-4';
const ADAM_STANDARD = 'adamig';
const ADAM_VERSION = '1-3';

/**
 * Auto-detect the CDISC standard from dataset filenames.
 * ADaM datasets conventionally start with "ad" (adae, adlb, adtte, etc.)
 */
function detectStandard(files: File[]): { standard: string; version: string } {
	const hasAdam = files.some(f => f.name.toLowerCase().startsWith('ad'));
	if (hasAdam) {
		return { standard: ADAM_STANDARD, version: ADAM_VERSION };
	}
	return { standard: SDTM_STANDARD, version: SDTM_VERSION };
}

// =============================================================================
// File Management
// =============================================================================

/**
 * Stash a raw File object for later server upload.
 * Called during the upload flow before/during client-side processing.
 */
export function stashFileForEngine(file: File): void {
	// Only stash dataset files (not YAML rules, not Define-XML)
	const name = file.name.toLowerCase();
	if (name.endsWith('.xpt') || name.endsWith('.sas7bdat') || name.endsWith('.json')) {
		// Don't stash Dataset-JSON files (they contain parsed tabular data, not raw transport)
		// For now, stash .xpt and .sas7bdat which are the primary engine inputs
		if (name.endsWith('.json')) return;
		pendingFiles.push(file);
		console.warn(`[cdiscEngineService] Stashed file: ${file.name} (${pendingFiles.length} total)`);
	}
}

/**
 * Clear the stashed files (after validation completes or on reset).
 */
export function clearStashedFiles(): void {
	pendingFiles = [];
}

/**
 * Get the current count of stashed files.
 */
export function getStashedFileCount(): number {
	return pendingFiles.length;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Run CDISC engine validation with the stashed files.
 * Sends files + rules to the server endpoint, returns adapted results.
 */
export async function runEngineValidation(
	options?: {
		standard?: string;
		version?: string;
		files?: File[]; // Override stashed files
	}
): Promise<Map<string, ValidationResult[]>> {
	const files = options?.files ?? pendingFiles;

	if (files.length === 0) {
		console.warn('[cdiscEngineService] No files to validate');
		return new Map();
	}

	const detected = detectStandard(files);
	const standard = options?.standard ?? detected.standard;
	const version = options?.version ?? detected.version;

	isRunning = true;
	lastError = null;

	try {
		// Build FormData
		const formData = new FormData();
		formData.set('standard', standard);
		formData.set('version', version);

		for (const file of files) {
			formData.append('datasets', file);
		}

		// Serialize current rules to YAML (if any)
		const rules = ruleState.rules;
		if (rules.length > 0) {
			const rulesYaml = exportRulesToYaml(rules);
			formData.set('rules', rulesYaml);
		}

		console.warn(
			`[cdiscEngineService] Sending ${files.length} files for engine validation ` +
			`(${standard} v${version}, ${rules.length} rules)`
		);

		const response = await fetch('/api/validate', {
			method: 'POST',
			body: formData
		});

		let data: EngineApiResponse;
		try {
			data = await response.json();
		} catch {
			throw new Error(`Server returned ${response.status}: ${response.statusText} (non-JSON body)`);
		}

		if (!response.ok || data.status === 'error') {
			throw new Error(data.error || `Server returned ${response.status}`);
		}

		if (data.warnings) {
			console.warn(`[cdiscEngineService] Engine warnings: ${data.warnings}`);
		}

		if (!data.results) {
			console.warn('[cdiscEngineService] No results in engine response');
			return new Map();
		}

		// Log raw engine output structure for debugging
		console.warn('[cdiscEngineService] Engine output keys:', Object.keys(data.results));
		if (data.results.Issue_Details?.length) {
			console.warn('[cdiscEngineService] First issue sample:', JSON.stringify(data.results.Issue_Details[0]));
		}
		if (data.results.Rules_Report?.length) {
			console.warn('[cdiscEngineService] First rule sample:', JSON.stringify(data.results.Rules_Report[0]));
		}

		// Persist rules report metadata for building synthetic Rule objects
		lastRulesReport = data.results.Rules_Report ?? [];

		// Adapt engine output to app format
		const adapted = adaptEngineResults(data.results);
		lastResults = adapted;
		lastRunAt = Date.now();

		const totalIssues = Array.from(adapted.values())
			.reduce((sum, results) => sum + results.length, 0);
		console.warn(
			`[cdiscEngineService] Engine returned ${totalIssues} issues ` +
			`across ${adapted.size} datasets`
		);

		return adapted;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		lastError = message;
		console.error(`[cdiscEngineService] Validation failed:`, message);
		return new Map();
	} finally {
		isRunning = false;
	}
}

// =============================================================================
// Public API (reactive getters)
// =============================================================================

export const cdiscEngineService = {
	get isRunning() {
		return isRunning;
	},

	get lastError() {
		return lastError;
	},

	get lastResults() {
		return lastResults;
	},

	get lastRunAt() {
		return lastRunAt;
	},

	get lastRulesReport() {
		return lastRulesReport;
	},

	getResultsForDataset(datasetKey: string): ValidationResult[] {
		return lastResults.get(datasetKey.toLowerCase()) ?? [];
	},

	getEngineRules(): Rule[] {
		return buildEngineRules(lastRulesReport, lastResults);
	},

	stashFile: stashFileForEngine,
	clearStashed: clearStashedFiles,
	getStashedCount: getStashedFileCount,
	validate: runEngineValidation
};
