/**
 * Validation types for column header badges and check-type breakdowns.
 */

/** Individual check-type detail for validation breakdown */
export interface ValidationCheckDetail {
  ruleId: string;
  checkType: string;
  issueCount: number;
  severity: 'error' | 'warning' | 'info';
  affectedRows: number[];
  invalidValues?: Map<string, number>;
}

/** Aggregated validation info for a column header */
export interface ColumnValidationInfo {
  issueCount: number;
  severity: 'error' | 'warning' | 'info';
  affectedRows?: number[];
  checks?: ValidationCheckDetail[];
}
