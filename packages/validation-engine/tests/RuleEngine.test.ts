/**
 * Rule Engine Tests
 *
 * Run with: pnpm --filter @sden99/validation-engine test
 */

import { describe, it, expect } from 'vitest';
import {
  validate,
  validateWithSummary,
  generateCodelistRules,
  type Rule,
  type DefineVariableForValidation,
  type ValidationEngineError
} from '../src';

describe('RuleEngine', () => {
  describe('validate with codelist rule', () => {
    // Sample data - like ADSL
    const sampleData = [
      { USUBJID: '001', SEX: 'M', RACE: 'WHITE', AGE: 45 },
      { USUBJID: '002', SEX: 'F', RACE: 'BLACK', AGE: 32 },
      { USUBJID: '003', SEX: 'X', RACE: 'WHITE', AGE: 28 },  // Invalid SEX
      { USUBJID: '004', SEX: 'M', RACE: 'UNKNOWN', AGE: 55 }, // Invalid RACE
      { USUBJID: '005', SEX: 'F', RACE: 'ASIAN', AGE: 41 },
      { USUBJID: '006', SEX: 'INVALID', RACE: 'WHITE', AGE: 38 }, // Invalid SEX
    ];

    // Codelist rule for SEX
    const sexRule: Rule = {
      Core: {
        Id: 'TEST.CODELIST.SEX',
        Version: '1',
        Status: 'Draft'
      },
      Description: 'SEX must be M or F',
      Sensitivity: 'Record',
      Executability: 'Fully Executable',
      Rule_Type: 'Codelist Check',
      Scope: {
        Domains: { Include: ['ALL'] }
      },
      Check: {
        name: 'SEX',
        operator: 'is_not_contained_by',
        value: ['M', 'F']
      },
      Outcome: {
        Message: 'SEX value not in codelist',
        Output_Variables: ['SEX']
      }
    };

    it('should detect invalid SEX values', () => {
      const results = validate(sampleData, [sexRule]);

      expect(results).toHaveLength(1);
      expect(results[0].columnId).toBe('SEX');
      expect(results[0].issueCount).toBe(2); // 'X' and 'INVALID'
      expect(results[0].affectedRows).toEqual([2, 5]); // Row indices
    });

    it('should return empty results when all values are valid', () => {
      const validData = [
        { USUBJID: '001', SEX: 'M' },
        { USUBJID: '002', SEX: 'F' },
      ];

      const results = validate(validData, [sexRule]);
      expect(results).toHaveLength(0);
    });

    it('should handle null/empty values gracefully', () => {
      const dataWithNulls = [
        { USUBJID: '001', SEX: 'M' },
        { USUBJID: '002', SEX: null },
        { USUBJID: '003', SEX: '' },
        { USUBJID: '004', SEX: 'F' },
      ];

      const results = validate(dataWithNulls, [sexRule]);
      // Nulls and empty strings should pass (not flagged as codelist violations)
      expect(results).toHaveLength(0);
    });
  });

  describe('generateCodelistRules', () => {
    it('should generate rules from Define-XML variables', () => {
      const variables: DefineVariableForValidation[] = [
        {
          name: 'SEX',
          dataType: 'text',
          domain: 'ADSL',
          codelistItems: [
            { codedValue: 'M', decode: 'Male' },
            { codedValue: 'F', decode: 'Female' }
          ]
        },
        {
          name: 'RACE',
          dataType: 'text',
          domain: 'ADSL',
          codelistItems: [
            { codedValue: 'WHITE', decode: 'White' },
            { codedValue: 'BLACK', decode: 'Black or African American' },
            { codedValue: 'ASIAN', decode: 'Asian' }
          ]
        },
        {
          name: 'AGE',
          dataType: 'integer',
          domain: 'ADSL'
          // No codelist - should not generate a rule
        }
      ];

      const rules = generateCodelistRules(variables, 'ADSL');

      expect(rules).toHaveLength(2); // SEX and RACE, not AGE
      expect(rules[0].Core.Id).toBe('AUTO.CODELIST.ADSL.SEX');
      expect(rules[1].Core.Id).toBe('AUTO.CODELIST.ADSL.RACE');
    });
  });

  describe('validateWithSummary', () => {
    it('should return a complete summary', () => {
      const data = [
        { SEX: 'M', RACE: 'WHITE' },
        { SEX: 'X', RACE: 'WHITE' },   // Invalid SEX
        { SEX: 'F', RACE: 'INVALID' }, // Invalid RACE
      ];

      const rules: Rule[] = [
        {
          Core: { Id: 'TEST.SEX', Version: '1', Status: 'Draft' },
          Description: 'SEX check',
          Sensitivity: 'Record',
          Executability: 'Fully Executable',
          Rule_Type: 'Codelist Check',
          Check: { name: 'SEX', operator: 'is_not_contained_by', value: ['M', 'F'] },
          Outcome: { Message: 'Invalid SEX' }
        },
        {
          Core: { Id: 'TEST.RACE', Version: '1', Status: 'Draft' },
          Description: 'RACE check',
          Sensitivity: 'Record',
          Executability: 'Fully Executable',
          Rule_Type: 'Codelist Check',
          Check: { name: 'RACE', operator: 'is_not_contained_by', value: ['WHITE', 'BLACK', 'ASIAN'] },
          Outcome: { Message: 'Invalid RACE' }
        }
      ];

      const summary = validateWithSummary('test-dataset', data, rules);

      expect(summary.datasetId).toBe('test-dataset');
      expect(summary.rulesEvaluated).toBe(2);
      expect(summary.rulesFailed).toBe(2);
      expect(summary.rulesPassed).toBe(0);
      expect(summary.allResults).toHaveLength(2);
      expect(summary.resultsByColumn.has('SEX')).toBe(true);
      expect(summary.resultsByColumn.has('RACE')).toBe(true);
      expect(summary.errors).toHaveLength(0);
    });
  });

  describe('error collection', () => {
    it('should collect errors for unknown operators via validate()', () => {
      const data = [{ SEX: 'M' }];
      const rule: Rule = {
        Core: { Id: 'TEST.UNKNOWN_OP', Version: '1', Status: 'Draft' },
        Description: 'Uses a bogus operator',
        Sensitivity: 'Record',
        Executability: 'Fully Executable',
        Rule_Type: 'Test',
        Target_Variable: 'SEX',
        Check: { name: 'SEX', operator: 'totally_fake_operator', value: 'M' },
        Outcome: { Message: 'Should not fire' }
      };

      const errors: ValidationEngineError[] = [];
      const results = validate(data, [rule], undefined, errors);

      // Rule should not produce a validation result (unknown op returns false)
      expect(results).toHaveLength(0);
      // But we should have an engine error
      expect(errors).toHaveLength(1);
      expect(errors[0].ruleId).toBe('TEST.UNKNOWN_OP');
      expect(errors[0].type).toBe('unknown_operator');
      expect(errors[0].message).toContain('totally_fake_operator');
    });

    it('should collect errors for missing primary column', () => {
      const data = [{ A: 1 }];
      // Rule with no Target_Variable and a condition tree that doesn't expose a name
      const rule: Rule = {
        Core: { Id: 'TEST.NO_COL', Version: '1', Status: 'Draft' },
        Description: 'Cannot determine column',
        Sensitivity: 'Record',
        Executability: 'Fully Executable',
        Rule_Type: 'Test',
        Check: { all: [] },
        Outcome: { Message: 'N/A' }
      };

      const errors: ValidationEngineError[] = [];
      const results = validate(data, [rule], undefined, errors);

      expect(results).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('missing_column');
      expect(errors[0].ruleId).toBe('TEST.NO_COL');
    });

    it('should not count errored rules as passed in validateWithSummary', () => {
      const data = [{ SEX: 'M' }];
      const rules: Rule[] = [
        {
          Core: { Id: 'TEST.GOOD', Version: '1', Status: 'Draft' },
          Description: 'Valid rule that passes',
          Sensitivity: 'Record',
          Executability: 'Fully Executable',
          Rule_Type: 'Test',
          Target_Variable: 'SEX',
          Check: { name: 'SEX', operator: 'is_not_contained_by', value: ['M', 'F'] },
          Outcome: { Message: 'Invalid SEX' }
        },
        {
          Core: { Id: 'TEST.BAD_OP', Version: '1', Status: 'Draft' },
          Description: 'Rule with unknown operator',
          Sensitivity: 'Record',
          Executability: 'Fully Executable',
          Rule_Type: 'Test',
          Target_Variable: 'SEX',
          Check: { name: 'SEX', operator: 'nonexistent_op', value: 'X' },
          Outcome: { Message: 'Should error' }
        }
      ];

      const summary = validateWithSummary('test', data, rules);

      // Good rule passed, bad rule errored (not counted as passed or failed)
      expect(summary.rulesPassed).toBe(1);
      expect(summary.rulesFailed).toBe(0);
      expect(summary.rulesEvaluated).toBe(1); // Only the good rule counts
      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0].type).toBe('unknown_operator');
    });
  });
});
