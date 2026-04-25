/**
 * Engine Result Adapter
 *
 * Transforms CDISC Rules Engine output into the app's ValidationResult[] format.
 * The engine returns a flat global structure; this adapter groups by dataset
 * and maps each issue to our internal result shape.
 *
 * Engine field names (lowercase, from CDISC Rules Engine):
 *   Issue_Details: core_id, message, dataset, row, variables (array), values, executability, USUBJID, SEQ
 *   Rules_Report:  core_id, version, cdisc_rule_id, fda_rule_id, message, status
 */

import type { Rule, ValidationResult } from '@sden99/validation-engine';

// =============================================================================
// Engine Output Types (from run_validation.py → JSON)
// =============================================================================

export interface EngineOutput {
	Conformance_Details?: {
		Standard: string;
		Version: string;
		CORE_Engine_Version: string;
		Total_Runtime: string;
	};
	Dataset_Details?: Array<{
		filename: string;
		label: string;
		length: number;
	}>;
	Issue_Summary?: Array<{
		Rule: string;
		Datasets: number;
		Errors: number;
	}>;
	Issue_Details?: EngineIssueDetail[];
	Rules_Report?: EngineRuleReport[];
}

export interface EngineIssueDetail {
	// PascalCase (older engine versions)
	Rule?: string;
	Dataset?: string;
	Row?: number | string;
	Variables?: Record<string, unknown> | string[];
	Message?: string;
	Sensitivity?: string;
	// lowercase (current engine output)
	core_id?: string;
	dataset?: string;
	row?: number | string;
	variables?: string[];
	message?: string;
	executability?: string;
}

export interface EngineRuleReport {
	// PascalCase
	Rule?: string;
	Description?: string;
	Sensitivity?: string;
	Category?: string;
	Datasets_Evaluated?: number;
	Errors_Found?: number;
	// lowercase (current engine)
	core_id?: string;
	cdisc_rule_id?: string;
	message?: string;
	status?: string;
}

export interface EngineApiResponse {
	status: 'success' | 'error';
	results?: EngineOutput;
	error?: string;
	warnings?: string;
}

// =============================================================================
// Field Extraction Helpers
// =============================================================================

/** Extract the rule ID from an issue, trying multiple field names. */
function extractRuleId(issue: EngineIssueDetail): string {
	return issue.core_id || issue.Rule || (issue as any).rule || (issue as any).Rule_ID || 'UNKNOWN';
}

/** Extract the dataset name from an issue. */
function extractDataset(issue: EngineIssueDetail): string {
	return issue.Dataset || issue.dataset || (issue as any).Domain || 'unknown';
}

/** Extract the row number from an issue. Returns undefined if not a valid row. */
function extractRow(issue: EngineIssueDetail): number | undefined {
	const raw = issue.Row ?? issue.row ?? (issue as any).Row_Number;
	if (raw === undefined || raw === null || raw === '') return undefined;
	const num = typeof raw === 'number' ? raw : Number(raw);
	return Number.isFinite(num) ? num : undefined;
}

/** Extract the message from an issue. */
function extractMessage(issue: EngineIssueDetail): string | undefined {
	return issue.Message || issue.message;
}

/** Extract variable names from an issue. Engine may return array or Record. */
function extractVariables(issue: EngineIssueDetail): string[] {
	const vars = issue.Variables || issue.variables;
	if (!vars) return [];
	// Engine sends string array: ["EXSTDTC", "EXENDTC"]
	if (Array.isArray(vars)) {
		return vars.filter((v): v is string => typeof v === 'string' && v.length > 0);
	}
	// Older format: Record<string, unknown>
	if (typeof vars === 'object') {
		return Object.keys(vars);
	}
	return [];
}

/** Extract sensitivity/executability for severity mapping. */
function extractSensitivity(issue: EngineIssueDetail): string | undefined {
	return issue.Sensitivity || (issue as any).sensitivity || issue.executability;
}

/** Extract the rule ID from a Rules_Report entry. */
function extractReportRuleId(report: EngineRuleReport): string {
	return report.core_id || report.Rule || 'UNKNOWN';
}

/** Extract description from a Rules_Report entry. */
function extractReportDescription(report: EngineRuleReport): string | undefined {
	return report.Description || report.message;
}

// =============================================================================
// Severity Mapping
// =============================================================================

/**
 * Map engine Sensitivity/executability to app severity.
 * Record-level = error (individual row violations)
 * Dataset-level = warning (structural/metadata issues)
 * Value-level = info (informational)
 * "fully executable" (executability field) = warning (default)
 */
function mapSeverity(sensitivity: string | undefined): 'error' | 'warning' | 'info' {
	switch (sensitivity?.toLowerCase()) {
		case 'record':
			return 'error';
		case 'dataset':
			return 'warning';
		case 'value':
			return 'info';
		default:
			return 'warning';
	}
}

// =============================================================================
// Dataset Key Normalization
// =============================================================================

/**
 * Normalize the dataset key from engine output.
 * The engine may return "ex.xpt", "exxpt" (dot stripped), or just "ex".
 * We normalize to lowercase without extension.
 */
function normalizeEngineDatasetKey(raw: string): string {
	const lower = raw.toLowerCase().trim();
	// Strip known extensions
	const stripped = lower.replace(/\.(xpt|sas7bdat|xml|json)$/i, '');
	return stripped;
}

// =============================================================================
// Adapter
// =============================================================================

/**
 * Transform engine output into per-dataset ValidationResult arrays.
 * Returns a Map keyed by normalized dataset name (lowercase, no extension).
 */
export function adaptEngineResults(
	engineOutput: EngineOutput
): Map<string, ValidationResult[]> {
	const resultsByDataset = new Map<string, ValidationResult[]>();

	const issues = engineOutput.Issue_Details ?? [];
	const rulesReport = engineOutput.Rules_Report ?? [];

	// Build a lookup of rule metadata from Rules_Report
	const ruleMeta = new Map<string, EngineRuleReport>();
	for (const report of rulesReport) {
		const id = extractReportRuleId(report);
		if (id !== 'UNKNOWN') {
			ruleMeta.set(id, report);
		}
	}

	// Group issues by (Rule, Dataset) → collect rows
	type IssueGroup = {
		rule: string;
		dataset: string;
		rows: number[];
		message: string;
		sensitivity: string | undefined;
		variables: Set<string>;
	};

	const groups = new Map<string, IssueGroup>();

	for (const issue of issues) {
		const ruleId = extractRuleId(issue);
		const dataset = extractDataset(issue);
		const row = extractRow(issue);
		const message = extractMessage(issue);
		const sensitivity = extractSensitivity(issue);
		const variables = extractVariables(issue);

		const key = `${ruleId}|||${dataset}`;
		let group = groups.get(key);
		if (!group) {
			const meta = ruleMeta.get(ruleId);
			group = {
				rule: ruleId,
				dataset,
				rows: [],
				message: message || extractReportDescription(meta!) || `Rule ${ruleId} violation`,
				sensitivity: sensitivity || meta?.Sensitivity,
				variables: new Set()
			};
			groups.set(key, group);
		}

		if (row !== undefined) {
			group.rows.push(row);
		}

		for (const varName of variables) {
			group.variables.add(varName);
		}
	}

	// Convert groups to ValidationResult[]
	for (const group of groups.values()) {
		const datasetKey = normalizeEngineDatasetKey(group.dataset);
		const columnId = group.variables.size > 0
			? Array.from(group.variables)[0]
			: '';

		const result: ValidationResult = {
			ruleId: `ENGINE.${group.rule}`,
			columnId,
			severity: mapSeverity(group.sensitivity),
			issueCount: group.rows.length || 1,
			affectedRows: group.rows,
			message: group.message
		};

		const existing = resultsByDataset.get(datasetKey) ?? [];
		existing.push(result);
		resultsByDataset.set(datasetKey, existing);
	}

	return resultsByDataset;
}

// =============================================================================
// Synthetic Rule Builder
// =============================================================================

/**
 * Build synthetic Rule objects from engine Rules_Report metadata.
 * These allow engine results to appear alongside auto-generated and imported
 * rules in the RulesPage checks view.
 */
export function buildEngineRules(
	rulesReport: EngineRuleReport[],
	resultsByDataset: Map<string, ValidationResult[]>
): Rule[] {
	const rules: Rule[] = [];
	const seenIds = new Set<string>();

	// Collect affected domains per rule from results
	const domainsByRule = new Map<string, Set<string>>();
	for (const [datasetKey, results] of resultsByDataset) {
		for (const result of results) {
			const coreId = result.ruleId.replace(/^ENGINE\./, '');
			const domains = domainsByRule.get(coreId) ?? new Set();
			domains.add(datasetKey.toUpperCase());
			domainsByRule.set(coreId, domains);
		}
	}

	// Build rules from Rules_Report entries
	for (const report of rulesReport) {
		const coreId = extractReportRuleId(report);
		if (coreId === 'UNKNOWN') continue;

		const ruleId = `ENGINE.${coreId}`;
		seenIds.add(coreId);

		const domains = domainsByRule.get(coreId);
		const description = extractReportDescription(report) || `CDISC Engine rule ${coreId}`;

		rules.push({
			Core: {
				Id: ruleId,
				Version: '1',
				Status: 'Published'
			},
			Description: description,
			Sensitivity: 'Record',
			Executability: 'Fully Executable',
			Rule_Type: 'CDISC Engine',
			Scope: {
				Domains: {
					Include: domains ? [...domains] : ['ALL']
				}
			},
			Check: { name: 'engine', operator: 'external' },
			Outcome: { Message: description }
		} as Rule);
	}

	// Pick up any ENGINE.* results that don't have a Rules_Report entry
	for (const coreId of domainsByRule.keys()) {
		if (seenIds.has(coreId)) continue;

		const ruleId = `ENGINE.${coreId}`;
		const domains = domainsByRule.get(coreId);

		// Find a message from the results
		let message = `CDISC Engine rule ${coreId}`;
		for (const results of resultsByDataset.values()) {
			const match = results.find(r => r.ruleId === ruleId);
			if (match?.message) {
				message = match.message;
				break;
			}
		}

		rules.push({
			Core: {
				Id: ruleId,
				Version: '1',
				Status: 'Published'
			},
			Description: message,
			Sensitivity: 'Record',
			Executability: 'Fully Executable',
			Rule_Type: 'CDISC Engine',
			Scope: {
				Domains: {
					Include: domains ? [...domains] : ['ALL']
				}
			},
			Check: { name: 'engine', operator: 'external' },
			Outcome: { Message: message }
		} as Rule);
	}

	return rules;
}
