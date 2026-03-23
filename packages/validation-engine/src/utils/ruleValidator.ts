/**
 * Rule Validator
 *
 * Validates imported rules for required fields and operator support.
 * Used during YAML/JSON rule import to catch issues early.
 */

import type { Rule, ConditionComposite } from '../types';
import {
	isAllCondition,
	isAnyCondition,
	isNotCondition,
	isSingleCondition
} from '../types';
import { hasOperator } from '../operators';

/**
 * An issue found during rule import validation.
 */
export interface RuleImportIssue {
	/** 'error' = rule cannot be used, 'warning' = rule usable but limited */
	level: 'error' | 'warning';
	/** Which field or aspect has the issue */
	field: string;
	/** Human-readable description */
	message: string;
}

/**
 * Result of validating an imported rule.
 */
export interface RuleValidationResult {
	/** Whether the rule is valid enough to use */
	isValid: boolean;
	/** All issues found */
	issues: RuleImportIssue[];
	/** Operators used in the rule that we don't support */
	unsupportedOperators: string[];
}

/**
 * Validate an imported rule for required fields and operator support.
 *
 * Rules with missing required fields are invalid.
 * Rules with unsupported operators are valid but marked as 'Partially Executable'.
 */
export function validateImportedRule(rule: unknown): RuleValidationResult {
	const issues: RuleImportIssue[] = [];
	const unsupportedOperators: string[] = [];

	// Check it's an object
	if (!rule || typeof rule !== 'object') {
		return {
			isValid: false,
			issues: [{ level: 'error', field: 'root', message: 'Rule must be an object' }],
			unsupportedOperators: []
		};
	}

	const r = rule as Record<string, unknown>;

	// Required: Core.Id
	if (!r.Core || typeof r.Core !== 'object' || !(r.Core as Record<string, unknown>).Id) {
		issues.push({
			level: 'error',
			field: 'Core.Id',
			message: 'Missing required field Core.Id'
		});
	}

	// Required: Description
	if (!r.Description || typeof r.Description !== 'string') {
		issues.push({
			level: 'error',
			field: 'Description',
			message: 'Missing required field Description'
		});
	}

	// Required: Check
	if (!r.Check || typeof r.Check !== 'object') {
		issues.push({
			level: 'error',
			field: 'Check',
			message: 'Missing required field Check (condition tree)'
		});
	} else {
		// Walk condition tree and check operator support
		collectUnsupportedOperators(r.Check as ConditionComposite, unsupportedOperators);
	}

	// Required: Outcome.Message
	if (
		!r.Outcome ||
		typeof r.Outcome !== 'object' ||
		!(r.Outcome as Record<string, unknown>).Message
	) {
		issues.push({
			level: 'error',
			field: 'Outcome.Message',
			message: 'Missing required field Outcome.Message'
		});
	}

	// Add warnings for unsupported operators
	if (unsupportedOperators.length > 0) {
		issues.push({
			level: 'warning',
			field: 'Check',
			message: `Unsupported operators: ${unsupportedOperators.join(', ')}`
		});
	}

	const hasErrors = issues.some((i) => i.level === 'error');

	return {
		isValid: !hasErrors,
		issues,
		unsupportedOperators
	};
}

/**
 * Recursively walk a condition tree and collect unsupported operator names.
 */
function collectUnsupportedOperators(
	condition: ConditionComposite,
	unsupported: string[]
): void {
	if (isAllCondition(condition)) {
		for (const child of condition.all) {
			collectUnsupportedOperators(child, unsupported);
		}
		return;
	}

	if (isAnyCondition(condition)) {
		for (const child of condition.any) {
			collectUnsupportedOperators(child, unsupported);
		}
		return;
	}

	if (isNotCondition(condition)) {
		collectUnsupportedOperators(condition.not, unsupported);
		return;
	}

	if (isSingleCondition(condition)) {
		if (!hasOperator(condition.operator) && !unsupported.includes(condition.operator)) {
			unsupported.push(condition.operator);
		}
	}
}
