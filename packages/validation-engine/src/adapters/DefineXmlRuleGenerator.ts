/**
 * Define-XML Rule Generator
 *
 * Automatically generates validation rules from Define-XML metadata.
 * Supports:
 * - Codelist validation rules
 * - Length validation rules
 * - Type validation rules
 * - Required variable rules
 */

import type { Rule, ConditionComposite, DefineVariableForValidation } from '../types';

// =============================================================================
// Rule Factory
// =============================================================================

interface RuleParams {
  idPrefix: string;
  variableName: string;
  domain?: string;
  ruleType: string;
  description: string;
  message: string;
  check: ConditionComposite;
}

function createRule(params: RuleParams): Rule {
  const ruleId = `AUTO.${params.idPrefix}.${params.domain || 'UNKNOWN'}.${params.variableName}`;
  return {
    Core: {
      Id: ruleId,
      Version: '1',
      Status: 'Draft'
    },
    Authorities: [{
      Organization: 'Auto-Generated',
      Standards: [{
        Name: params.domain || 'ALL',
        Version: '1.0',
        References: [{
          Rule_Identifier: { Id: ruleId, Version: '1' },
          Origin: 'Define-XML Auto-Generation',
          Version: '1.0'
        }]
      }]
    }],
    Description: params.description,
    Sensitivity: 'Record',
    Executability: 'Fully Executable',
    Rule_Type: params.ruleType,
    Target_Variable: params.variableName,
    Scope: {
      Domains: {
        Include: params.domain ? [params.domain] : ['ALL']
      }
    },
    Check: params.check,
    Outcome: {
      Message: params.message,
      Output_Variables: [params.variableName]
    }
  };
}

// =============================================================================
// Rule Generators
// =============================================================================

/**
 * Generate codelist validation rules from Define-XML variables.
 * Creates one rule per variable that has a codelist defined.
 */
export function generateCodelistRules(
  variables: DefineVariableForValidation[],
  domain?: string
): Rule[] {
  const rules: Rule[] = [];

  for (const variable of variables) {
    if (!variable.codelistItems || variable.codelistItems.length === 0) continue;

    const allowedValues = variable.codelistItems.map((item) => item.codedValue);

    rules.push(createRule({
      idPrefix: 'CODELIST',
      variableName: variable.name,
      domain,
      ruleType: 'Codelist Check',
      description: `${variable.name} values must be in the defined codelist`,
      message: `Value not in codelist for ${variable.name}`,
      check: { name: variable.name, operator: 'is_not_contained_by', value: allowedValues }
    }));
  }

  return rules;
}

/**
 * Generate length validation rules from Define-XML variables.
 * Creates one rule per variable that has a length defined.
 */
export function generateLengthRules(
  variables: DefineVariableForValidation[],
  domain?: string
): Rule[] {
  const rules: Rule[] = [];

  for (const variable of variables) {
    if (!variable.length || variable.length <= 0) continue;

    rules.push(createRule({
      idPrefix: 'LENGTH',
      variableName: variable.name,
      domain,
      ruleType: 'Length Check',
      description: `${variable.name} must not exceed ${variable.length} characters`,
      message: `${variable.name} exceeds maximum length of ${variable.length}`,
      check: { name: variable.name, operator: 'longer_than', value: variable.length }
    }));
  }

  return rules;
}

/**
 * Generate type validation rules from Define-XML variables.
 * Creates rules for numeric variables to check they contain valid numbers.
 */
export function generateTypeRules(
  variables: DefineVariableForValidation[],
  domain?: string
): Rule[] {
  const rules: Rule[] = [];
  const numericTypes = ['integer', 'float', 'double', 'decimal'];

  for (const variable of variables) {
    const dataType = variable.dataType?.toLowerCase() || '';
    if (!numericTypes.includes(dataType)) continue;

    const pattern = dataType === 'integer'
      ? '^-?\\d+$'
      : '^-?\\d+(\\.\\d+)?$';

    rules.push(createRule({
      idPrefix: 'TYPE',
      variableName: variable.name,
      domain,
      ruleType: 'Type Check',
      description: `${variable.name} must contain valid ${dataType} values`,
      message: `${variable.name} contains invalid ${dataType} value`,
      check: { name: variable.name, operator: 'not_matches_regex', value: pattern }
    }));
  }

  return rules;
}

/**
 * Generate required variable rules from Define-XML variables.
 * Creates one rule per mandatory variable.
 */
export function generateRequiredRules(
  variables: DefineVariableForValidation[],
  domain?: string
): Rule[] {
  const rules: Rule[] = [];

  for (const variable of variables) {
    if (!variable.mandatory) continue;

    rules.push(createRule({
      idPrefix: 'REQUIRED',
      variableName: variable.name,
      domain,
      ruleType: 'Required Check',
      description: `${variable.name} is required and must not be empty`,
      message: `Required variable ${variable.name} is missing`,
      check: { name: variable.name, operator: 'empty' }
    }));
  }

  return rules;
}

/**
 * Generate all validation rules from Define-XML variables.
 * This is the main entry point for rule generation.
 */
export function generateRulesFromDefine(
  variables: DefineVariableForValidation[],
  domain?: string
): Rule[] {
  return [
    ...generateCodelistRules(variables, domain),
    ...generateLengthRules(variables, domain),
    ...generateTypeRules(variables, domain),
    ...generateRequiredRules(variables, domain)
  ];
}

/**
 * Convert DefineVariable (from data-table-v3) to DefineVariableForValidation.
 */
export function convertDefineVariables(
  defineVariables: Array<{
    variable: { name: string; dataType: string; length?: number };
    codeList?: { items: Array<{ codedValue: string; decode: string }> };
    mandatory?: boolean;
  }>,
  domain?: string
): DefineVariableForValidation[] {
  return defineVariables.map((dv) => ({
    name: dv.variable.name,
    dataType: dv.variable.dataType,
    length: dv.variable.length,
    mandatory: dv.mandatory,
    domain,
    codelistItems: dv.codeList?.items.map((item) => ({
      codedValue: item.codedValue,
      decode: item.decode
    }))
  }));
}
