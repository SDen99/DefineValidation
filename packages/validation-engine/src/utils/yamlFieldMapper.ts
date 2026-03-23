/**
 * YAML Field Mapper
 *
 * Bidirectional mapping between CDISC YAML field names (spaces)
 * and our internal field names (underscores).
 *
 * CDISC YAML format uses spaces: "Rule Type", "Output Variables"
 * Internal format uses underscores: "Rule_Type", "Output_Variables"
 */

/** Known CDISC fields that use spaces in YAML format */
const FIELD_MAP: ReadonlyMap<string, string> = new Map([
	['Rule Type', 'Rule_Type'],
	['Output Variables', 'Output_Variables'],
	['Target Variable', 'Target_Variable'],
	['Rule Identifier', 'Rule_Identifier'],
	['Output_Variables', 'Output Variables'],
	['Rule_Type', 'Rule Type'],
	['Target_Variable', 'Target Variable'],
	['Rule_Identifier', 'Rule Identifier']
]);

/** CDISC (space) → Internal (underscore) mapping */
const cdiscToInternalMap = new Map<string, string>([
	['Rule Type', 'Rule_Type'],
	['Output Variables', 'Output_Variables'],
	['Target Variable', 'Target_Variable'],
	['Rule Identifier', 'Rule_Identifier']
]);

/** Internal (underscore) → CDISC (space) mapping */
const internalToCdiscMap = new Map<string, string>([
	['Rule_Type', 'Rule Type'],
	['Output_Variables', 'Output Variables'],
	['Target_Variable', 'Target Variable'],
	['Rule_Identifier', 'Rule Identifier']
]);

/**
 * Convert CDISC YAML field names (spaces) to internal names (underscores).
 * Recursively processes nested objects and arrays.
 * Unknown keys are passed through unchanged.
 */
export function cdiscToInternal<T = unknown>(obj: unknown): T {
	if (obj === null || obj === undefined) return obj as T;
	if (typeof obj !== 'object') return obj as T;

	if (Array.isArray(obj)) {
		return obj.map((item) => cdiscToInternal(item)) as T;
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const mappedKey = cdiscToInternalMap.get(key) ?? key;
		result[mappedKey] = cdiscToInternal(value);
	}
	return result as T;
}

/**
 * Convert internal field names (underscores) to CDISC YAML names (spaces).
 * Recursively processes nested objects and arrays.
 * Unknown keys are passed through unchanged.
 */
export function internalToCdisc<T = unknown>(obj: unknown): T {
	if (obj === null || obj === undefined) return obj as T;
	if (typeof obj !== 'object') return obj as T;

	if (Array.isArray(obj)) {
		return obj.map((item) => internalToCdisc(item)) as T;
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const mappedKey = internalToCdiscMap.get(key) ?? key;
		result[mappedKey] = internalToCdisc(value);
	}
	return result as T;
}
