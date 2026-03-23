/**
 * Rule Engine
 *
 * Main orchestrator for validating data against rules.
 */

import type {
  Rule,
  DataRow,
  ValidationResult,
  ValidationEngineError,
  DatasetValidationSummary
} from './types';
import { evaluateWithDetails, setCurrentRuleId, getAndClearErrors } from './ConditionEvaluator';

/**
 * Extract the primary column name from a rule's Check condition.
 * This is used for result aggregation and value tracking.
 */
function extractPrimaryColumn(rule: Rule): string | null {
  // Prefer explicit target variable
  if (rule.Target_Variable) {
    return rule.Target_Variable;
  }

  // Fallback: infer from condition tree
  const check = rule.Check;

  if ('name' in check && 'operator' in check) {
    return check.name;
  }

  if ('all' in check && check.all.length > 0) {
    const first = check.all[0];
    if ('name' in first) return first.name;
  }

  if ('any' in check && check.any.length > 0) {
    const first = check.any[0];
    if ('name' in first) return first.name;
  }

  if ('not' in check) {
    const inner = check.not;
    if ('name' in inner) return inner.name;
  }

  if (rule.Outcome.Output_Variables && rule.Outcome.Output_Variables.length > 0) {
    return rule.Outcome.Output_Variables[0];
  }

  return null;
}

/**
 * Check if a rule applies to the given domain.
 */
function ruleAppliesToDomain(rule: Rule, domain?: string): boolean {
  const scope = rule.Scope;

  // No scope means applies to all
  if (!scope || !scope.Domains) {
    return true;
  }

  const { Include, Exclude } = scope.Domains;

  // Check exclusions first
  if (Exclude && domain && Exclude.includes(domain)) {
    return false;
  }

  // Check inclusions
  if (Include) {
    // "ALL" means include everything
    if (Include.includes('ALL')) {
      return true;
    }
    // Otherwise, domain must be in the list
    if (domain && Include.includes(domain)) {
      return true;
    }
    // Domain not in include list
    return false;
  }

  // No explicit include/exclude - include by default
  return true;
}

/**
 * Validate data against a single rule.
 *
 * @param data - Array of data rows to validate
 * @param rule - The rule to evaluate
 * @param domain - Optional domain name for scope filtering
 * @param errors - Optional array to collect engine errors into
 * @returns ValidationResult if rule has issues, null if passed or not applicable
 */
export function validateRule(
  data: DataRow[],
  rule: Rule,
  domain?: string,
  errors?: ValidationEngineError[]
): ValidationResult | null {
  // Check if rule applies to this domain
  if (!ruleAppliesToDomain(rule, domain)) {
    return null;
  }

  // Get the primary column for this rule
  const primaryColumn = extractPrimaryColumn(rule);
  if (!primaryColumn) {
    console.warn(`Could not determine primary column for rule ${rule.Core.Id}`);
    errors?.push({
      ruleId: rule.Core.Id,
      type: 'missing_column',
      message: `Could not determine primary column for rule ${rule.Core.Id}`
    });
    return null;
  }

  // Set rule context for error collection in evaluator
  setCurrentRuleId(rule.Core.Id);

  // Evaluate the condition against all rows
  const { failingIndices, invalidValues } = evaluateWithDetails(
    rule.Check,
    data,
    primaryColumn
  );

  // Drain any errors from the evaluator
  const evalErrors = getAndClearErrors();
  if (evalErrors.length > 0 && errors) {
    errors.push(...evalErrors);
  }

  // If no failures, return null (rule passed)
  if (failingIndices.length === 0) {
    return null;
  }

  // Build the result
  const result: ValidationResult = {
    ruleId: rule.Core.Id,
    columnId: primaryColumn,
    severity: mapSensitivityToSeverity(rule.Sensitivity),
    issueCount: failingIndices.length,
    affectedRows: failingIndices,
    message: formatMessage(rule.Outcome.Message, failingIndices.length, invalidValues),
    details: {
      invalidValues,
      rule
    }
  };

  return result;
}

/**
 * Map CDISC Sensitivity to our severity levels.
 */
function mapSensitivityToSeverity(
  sensitivity: string
): 'error' | 'warning' | 'info' {
  switch (sensitivity) {
    case 'Record':
    case 'Value':
      return 'error';
    case 'Dataset':
      return 'warning';
    default:
      return 'error';
  }
}

/**
 * Format the error message with counts and values.
 */
function formatMessage(
  template: string,
  count: number,
  invalidValues: Map<string, number>
): string {
  // Simple formatting - show count and top invalid values
  const topValues = Array.from(invalidValues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([v]) => v)
    .join(', ');

  return `${count} issue${count !== 1 ? 's' : ''}: ${template}${topValues ? ` (e.g., ${topValues})` : ''}`;
}

/**
 * Validate data against multiple rules.
 *
 * @param data - Array of data rows to validate
 * @param rules - Array of rules to evaluate
 * @param domain - Optional domain name for scope filtering
 * @param errors - Optional array to collect engine errors into
 * @returns Array of ValidationResults (only rules that failed)
 */
export function validate(
  data: DataRow[],
  rules: Rule[],
  domain?: string,
  errors?: ValidationEngineError[]
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const rule of rules) {
    const result = validateRule(data, rule, domain, errors);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Validate data and return a full summary.
 *
 * @param datasetId - Identifier for the dataset
 * @param data - Array of data rows to validate
 * @param rules - Array of rules to evaluate
 * @param domain - Optional domain name for scope filtering
 * @returns Complete validation summary
 */
export function validateWithSummary(
  datasetId: string,
  data: DataRow[],
  rules: Rule[],
  domain?: string
): DatasetValidationSummary {
  const allResults: ValidationResult[] = [];
  const resultsByColumn = new Map<string, ValidationResult[]>();
  const errors: ValidationEngineError[] = [];
  let rulesPassed = 0;
  let rulesFailed = 0;

  for (const rule of rules) {
    const errorsBefore = errors.length;
    const result = validateRule(data, rule, domain, errors);
    const hadErrors = errors.length > errorsBefore;

    if (result) {
      rulesFailed++;
      allResults.push(result);

      // Group by column
      const existing = resultsByColumn.get(result.columnId) || [];
      existing.push(result);
      resultsByColumn.set(result.columnId, existing);
    } else if (ruleAppliesToDomain(rule, domain) && !hadErrors) {
      // Rule was applicable, had no errors, and passed
      rulesPassed++;
    }
    // If hadErrors && !result: rule is not counted as passed or failed
  }

  return {
    datasetId,
    rulesEvaluated: rulesPassed + rulesFailed,
    rulesPassed,
    rulesFailed,
    resultsByColumn,
    allResults,
    timestamp: new Date(),
    errors
  };
}
