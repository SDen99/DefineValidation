/**
 * Rule Generator Tests
 *
 * Tests for Phase 3 rule generators:
 * - Length rules
 * - Type rules
 * - Required variable rules
 */

import { describe, it, expect } from 'vitest';
import {
  generateLengthRules,
  generateTypeRules,
  generateRequiredRules,
  generateRulesFromDefine,
  validate,
  type DefineVariableForValidation
} from '../src';

describe('Rule Generators', () => {
  describe('generateLengthRules', () => {
    it('should generate length rules for variables with length defined', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'USUBJID', dataType: 'text', length: 20 },
        { name: 'SEX', dataType: 'text', length: 1 },
        { name: 'AGE', dataType: 'integer' } // No length
      ];

      const rules = generateLengthRules(variables, 'ADSL');

      expect(rules).toHaveLength(2);
      expect(rules[0].Core.Id).toBe('AUTO.LENGTH.ADSL.USUBJID');
      expect(rules[0].Check).toEqual({
        name: 'USUBJID',
        operator: 'longer_than',
        value: 20
      });
      expect(rules[1].Core.Id).toBe('AUTO.LENGTH.ADSL.SEX');
    });

    it('should skip variables without length', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'USUBJID', dataType: 'text' },
        { name: 'SEX', dataType: 'text', length: 0 },
        { name: 'AGE', dataType: 'integer', length: -1 }
      ];

      const rules = generateLengthRules(variables, 'ADSL');
      expect(rules).toHaveLength(0);
    });

    it('should detect length violations when validating', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'CODE', dataType: 'text', length: 3 }
      ];

      const rules = generateLengthRules(variables, 'TEST');
      const data = [
        { CODE: 'AB' },      // OK (2 chars)
        { CODE: 'ABC' },     // OK (3 chars)
        { CODE: 'ABCD' },    // Violation (4 chars)
        { CODE: 'ABCDEF' }   // Violation (6 chars)
      ];

      const results = validate(data, rules, 'TEST');
      expect(results).toHaveLength(1);
      expect(results[0].issueCount).toBe(2);
      expect(results[0].affectedRows).toEqual([2, 3]);
    });
  });

  describe('generateTypeRules', () => {
    it('should generate type rules for numeric variables', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'AGE', dataType: 'integer' },
        { name: 'WEIGHT', dataType: 'float' },
        { name: 'SEX', dataType: 'text' } // Not numeric
      ];

      const rules = generateTypeRules(variables, 'ADSL');

      expect(rules).toHaveLength(2);
      expect(rules[0].Core.Id).toBe('AUTO.TYPE.ADSL.AGE');
      expect(rules[0].Check.operator).toBe('not_matches_regex');
      expect(rules[1].Core.Id).toBe('AUTO.TYPE.ADSL.WEIGHT');
    });

    it('should use integer pattern for integer type', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'AGE', dataType: 'integer' }
      ];

      const rules = generateTypeRules(variables, 'TEST');
      expect(rules[0].Check.value).toBe('^-?\\d+$');
    });

    it('should use decimal pattern for float type', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'WEIGHT', dataType: 'float' }
      ];

      const rules = generateTypeRules(variables, 'TEST');
      expect(rules[0].Check.value).toBe('^-?\\d+(\\.\\d+)?$');
    });

    it('should detect type violations when validating', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'AGE', dataType: 'integer' }
      ];

      const rules = generateTypeRules(variables, 'TEST');
      const data = [
        { AGE: '25' },       // OK
        { AGE: '-10' },      // OK (negative)
        { AGE: '25.5' },     // Violation (decimal in integer)
        { AGE: 'twenty' },   // Violation (text)
        { AGE: '' },         // Violation (empty doesn't match integer pattern)
        { AGE: null }        // OK (null - skip)
      ];

      const results = validate(data, rules, 'TEST');
      expect(results).toHaveLength(1);
      expect(results[0].issueCount).toBe(3);
      expect(results[0].affectedRows).toEqual([2, 3, 4]);
    });
  });

  describe('generateRequiredRules', () => {
    it('should generate required rules for mandatory variables', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'USUBJID', dataType: 'text', mandatory: true },
        { name: 'SEX', dataType: 'text', mandatory: true },
        { name: 'RACE', dataType: 'text', mandatory: false },
        { name: 'AGE', dataType: 'integer' } // undefined mandatory
      ];

      const rules = generateRequiredRules(variables, 'ADSL');

      expect(rules).toHaveLength(2);
      expect(rules[0].Core.Id).toBe('AUTO.REQUIRED.ADSL.USUBJID');
      expect(rules[0].Check).toEqual({
        name: 'USUBJID',
        operator: 'empty'
      });
      expect(rules[1].Core.Id).toBe('AUTO.REQUIRED.ADSL.SEX');
    });

    it('should detect missing required values when validating', () => {
      const variables: DefineVariableForValidation[] = [
        { name: 'USUBJID', dataType: 'text', mandatory: true }
      ];

      const rules = generateRequiredRules(variables, 'TEST');
      const data = [
        { USUBJID: 'SUBJ001' },  // OK
        { USUBJID: '' },         // Violation (empty)
        { USUBJID: null },       // Violation (null)
        { USUBJID: '  ' },       // Violation (whitespace only)
        { USUBJID: 'SUBJ002' }   // OK
      ];

      const results = validate(data, rules, 'TEST');
      expect(results).toHaveLength(1);
      expect(results[0].issueCount).toBe(3);
      expect(results[0].affectedRows).toEqual([1, 2, 3]);
    });
  });

  describe('generateRulesFromDefine', () => {
    it('should generate all rule types', () => {
      const variables: DefineVariableForValidation[] = [
        {
          name: 'SEX',
          dataType: 'text',
          length: 1,
          mandatory: true,
          codelistItems: [
            { codedValue: 'M', decode: 'Male' },
            { codedValue: 'F', decode: 'Female' }
          ]
        },
        {
          name: 'AGE',
          dataType: 'integer',
          length: 3,
          mandatory: true
        }
      ];

      const rules = generateRulesFromDefine(variables, 'ADSL');

      // Should have: 1 codelist, 2 length, 1 type, 2 required = 6 rules
      expect(rules.length).toBeGreaterThanOrEqual(5);

      // Check we have each type
      const ruleTypes = rules.map(r => r.Rule_Type);
      expect(ruleTypes).toContain('Codelist Check');
      expect(ruleTypes).toContain('Length Check');
      expect(ruleTypes).toContain('Type Check');
      expect(ruleTypes).toContain('Required Check');
    });

    it('should validate a complete dataset', () => {
      const variables: DefineVariableForValidation[] = [
        {
          name: 'SEX',
          dataType: 'text',
          length: 1,
          mandatory: true,
          codelistItems: [
            { codedValue: 'M' },
            { codedValue: 'F' }
          ]
        },
        {
          name: 'AGE',
          dataType: 'integer',
          mandatory: true
        }
      ];

      const rules = generateRulesFromDefine(variables, 'TEST');
      const data = [
        { SEX: 'M', AGE: '25' },           // OK
        { SEX: 'X', AGE: '30' },           // SEX codelist violation
        { SEX: 'FF', AGE: '40' },          // SEX codelist + length violation
        { SEX: '', AGE: '' },              // Both required violations
        { SEX: 'F', AGE: 'old' }           // AGE type violation
      ];

      const results = validate(data, rules, 'TEST');

      // We should have multiple results for different rule types
      expect(results.length).toBeGreaterThan(0);

      // Check that we found codelist issues
      const codelistResults = results.filter(r => r.ruleId.includes('CODELIST'));
      expect(codelistResults.length).toBeGreaterThan(0);
    });
  });
});
