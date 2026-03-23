/**
 * Test suite for VLM Table Generation Algorithms
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  generateEnhancedTransposedVLMTable,
  getEnhancedParameterConditionCombinations,
  processEnhancedWhereClause,
  createEnhancedVLMCellData,
  formatStratificationValue,
  enhanceVLMWithMethod
} from '../../algorithms/vlmTableGenerator';
import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { GlobalStateProvider, EnhancedStratificationHierarchy } from '../../types';

describe('VLM Table Generation', () => {
  let mockStateProvider: GlobalStateProvider;
  let mockVLMVariables: ValueLevelMetadata[];
  let mockParamcdMapping: Record<string, string>;
  let mockHierarchy: EnhancedStratificationHierarchy;

  beforeEach(() => {
    // Mock state provider
    mockStateProvider = {
      getSelectedDomain: vi.fn(() => 'VS'),
      getSelectedDatasetId: vi.fn(() => 'vs-dataset'),
      getDefineXmlInfo: vi.fn(() => ({
        SDTM: { ItemGroups: [] },
        ADaM: null,
        sdtmId: 'define-sdtm',
        adamId: null
      })),
      getDatasets: vi.fn(() => ({
        'define-sdtm': {
          enhancedDefineXML: {
            lookups: {
              methodsByOID: new Map(),
              commentsByOID: new Map()
            }
          }
        }
      }))
    };

    // Mock VLM variables
    mockVLMVariables = [
      {
        variable: {
          oid: 'IT.VS.VSSTRESN',
          name: 'VSSTRESN',
          dataType: 'float',
          length: null,
          description: 'Vital Signs Result (Numeric)',
          orderNumber: 10,
          origin: { type: 'Collected', source: null, description: null },
          mandatory: true
        },
        whereClause: {
          conditions: [
            {
              variable: 'DTYPE',
              operator: 'IN',
              checkValues: ['AVERAGE'],
              connector: 'AND'
            },
            {
              variable: 'PARAMCD',
              operator: 'IN',
              checkValues: ['SYSBP'],
              connector: 'AND'
            }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.VSSTRESN',
          connectedNodes: [],
          cluster: ''
        }
      },
      {
        variable: {
          oid: 'IT.VS.VSSTRESN.2',
          name: 'VSSTRESN',
          dataType: 'float',
          length: null,
          description: 'Vital Signs Result (Numeric)',
          orderNumber: 11,
          origin: { type: 'Collected', source: null, description: null },
          mandatory: true
        },
        whereClause: {
          conditions: [
            {
              variable: 'DTYPE',
              operator: 'IN',
              checkValues: ['MAXIMUM'],
              connector: 'AND'
            },
            {
              variable: 'PARAMCD',
              operator: 'IN',
              checkValues: ['DIABP'],
              connector: 'AND'
            }
          ],
          logicalOperator: 'AND'
        },
        methodOID: 'MT.CALCULATION',
        graphContext: {
          nodeId: 'IT.VS.VSSTRESN.2',
          connectedNodes: [],
          cluster: ''
        }
      }
    ];

    // Mock PARAMCD mapping
    mockParamcdMapping = {
      'SYSBP': 'Systolic Blood Pressure',
      'DIABP': 'Diastolic Blood Pressure'
    };

    // Mock hierarchy
    mockHierarchy = {
      primary: ['DTYPE'],
      secondary: ['PARAMCD'],
      analysis: {
        'DTYPE': { affectedVariables: 2, totalDefinitions: 2, impactScore: 0.8 },
        'PARAMCD': { affectedVariables: 2, totalDefinitions: 2, impactScore: 0.6 }
      }
    };
  });

  describe('generateEnhancedTransposedVLMTable', () => {
    it('should generate enhanced transposed VLM table', () => {
      const result = generateEnhancedTransposedVLMTable(
        mockVLMVariables,
        mockParamcdMapping,
        mockHierarchy,
        mockStateProvider
      );

      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('columns');
      expect(result.rows).toBeInstanceOf(Array);
      expect(result.columns).toBeInstanceOf(Array);
    });

    it('should handle empty VLM variables', () => {
      const result = generateEnhancedTransposedVLMTable(
        [],
        {},
        { primary: [], secondary: [], analysis: {} },
        mockStateProvider
      );

      expect(result.rows).toEqual([]);
      expect(result.columns).toEqual([]);
    });

    it('should create proper column structure', () => {
      const result = generateEnhancedTransposedVLMTable(
        mockVLMVariables,
        mockParamcdMapping,
        mockHierarchy,
        mockStateProvider
      );

      // Should have variable column plus parameter columns
      expect(result.columns.length).toBeGreaterThan(0);
      
      // First column should be variable column
      const firstColumn = result.columns[0];
      expect(firstColumn).toHaveProperty('id');
      expect(firstColumn).toHaveProperty('header');
    });

    it('should create proper row structure for each variable', () => {
      const result = generateEnhancedTransposedVLMTable(
        mockVLMVariables,
        mockParamcdMapping,
        mockHierarchy,
        mockStateProvider
      );

      expect(result.rows.length).toBeGreaterThan(0);
      
      const firstRow = result.rows[0];
      expect(firstRow).toHaveProperty('id');
      expect(firstRow).toHaveProperty('variable');
      expect(firstRow).toHaveProperty('cells');
      expect(firstRow.cells).toBeInstanceOf(Array);
    });
  });

  describe('getEnhancedParameterConditionCombinations', () => {
    it('should extract unique parameter condition combinations', () => {
      const result = getEnhancedParameterConditionCombinations(mockVLMVariables, mockHierarchy);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      // Should have combinations for each unique set of stratification conditions
      const firstCombination = result[0];
      expect(firstCombination).toHaveProperty('conditions');
      expect(firstCombination.conditions).toBeInstanceOf(Array);
    });

    it('should handle VLM without where clauses', () => {
      const vlmWithoutClauses: ValueLevelMetadata[] = [
        {
          variable: {
            oid: 'IT.VS.SIMPLE',
            name: 'SIMPLE',
            dataType: 'text',
            length: null,
            description: 'Simple Variable',
            orderNumber: 1,
            origin: { type: 'Collected', source: null, description: null },
            mandatory: false
          },
          graphContext: {
            nodeId: 'IT.VS.SIMPLE',
            connectedNodes: [],
            cluster: ''
          }
        }
      ];

      const result = getEnhancedParameterConditionCombinations(vlmWithoutClauses, mockHierarchy);
      expect(result).toEqual([]);
    });

    it('should sort combinations by primary hierarchy order', () => {
      const result = getEnhancedParameterConditionCombinations(mockVLMVariables, mockHierarchy);

      if (result.length > 1) {
        // First combination should prioritize primary stratification variables
        const firstCombination = result[0];
        const dtypeCondition = firstCombination.conditions.find(c => c.variable === 'DTYPE');
        expect(dtypeCondition).toBeDefined();
      }
    });
  });

  describe('processEnhancedWhereClause', () => {
    it('should process where clause with AND logic', () => {
      const whereClause = {
        conditions: [
          { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
          { variable: 'PARAMCD', operator: 'IN', checkValues: ['SYSBP'], connector: 'AND' }
        ],
        logicalOperator: 'AND' as const
      };

      const result = processEnhancedWhereClause(whereClause, mockHierarchy);

      expect(result).toHaveProperty('primaryConditions');
      expect(result).toHaveProperty('secondaryConditions');
      expect(result).toHaveProperty('otherConditions');
      
      // DTYPE should be in primary conditions
      expect(result.primaryConditions.some(c => c.variable === 'DTYPE')).toBe(true);
      
      // PARAMCD should be in secondary conditions
      expect(result.secondaryConditions.some(c => c.variable === 'PARAMCD')).toBe(true);
    });

    it('should categorize conditions by hierarchy level', () => {
      const whereClause = {
        conditions: [
          { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
          { variable: 'PARAMCD', operator: 'IN', checkValues: ['SYSBP'], connector: 'AND' },
          { variable: 'AVISIT', operator: 'IN', checkValues: ['WEEK 1'], connector: 'AND' }
        ],
        logicalOperator: 'AND' as const
      };

      const hierarchy = {
        primary: ['DTYPE'],
        secondary: ['PARAMCD'],
        analysis: {}
      };

      const result = processEnhancedWhereClause(whereClause, hierarchy);

      expect(result.primaryConditions).toHaveLength(1);
      expect(result.primaryConditions[0].variable).toBe('DTYPE');
      
      expect(result.secondaryConditions).toHaveLength(1);
      expect(result.secondaryConditions[0].variable).toBe('PARAMCD');
      
      expect(result.otherConditions).toHaveLength(1);
      expect(result.otherConditions[0].variable).toBe('AVISIT');
    });
  });

  describe('createEnhancedVLMCellData', () => {
    it('should create enhanced cell data with metadata', () => {
      const vlm = mockVLMVariables[0];
      const paramCombination = {
        conditions: [
          { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
          { variable: 'PARAMCD', operator: 'IN', checkValues: ['SYSBP'], connector: 'AND' }
        ]
      };

      const result = createEnhancedVLMCellData(vlm, paramCombination, mockParamcdMapping);

      expect(result).toHaveProperty('variable');
      expect(result).toHaveProperty('conditions');
      expect(result).toHaveProperty('parameterLabel');
      expect(result).toHaveProperty('isApplicable');
      
      expect(result.variable).toBe('VSSTRESN');
      expect(result.isApplicable).toBe(true);
      expect(result.parameterLabel).toBe('Systolic Blood Pressure');
    });

    it('should handle non-applicable combinations', () => {
      const vlm = mockVLMVariables[0]; // Has DTYPE=AVERAGE, PARAMCD=SYSBP
      const nonMatchingCombination = {
        conditions: [
          { variable: 'DTYPE', operator: 'IN', checkValues: ['MAXIMUM'], connector: 'AND' },
          { variable: 'PARAMCD', operator: 'IN', checkValues: ['DIABP'], connector: 'AND' }
        ]
      };

      const result = createEnhancedVLMCellData(vlm, nonMatchingCombination, mockParamcdMapping);

      expect(result.isApplicable).toBe(false);
      expect(result.parameterLabel).toBe('Diastolic Blood Pressure'); // Still resolves parameter
    });

    it('should handle missing parameter mapping', () => {
      const paramCombination = {
        conditions: [
          { variable: 'PARAMCD', operator: 'IN', checkValues: ['UNKNOWN'], connector: 'AND' }
        ]
      };

      const result = createEnhancedVLMCellData(mockVLMVariables[0], paramCombination, {});

      expect(result.parameterLabel).toBe('UNKNOWN'); // Falls back to parameter code
    });
  });

  describe('formatStratificationValue', () => {
    it('should format single value', () => {
      const result = formatStratificationValue(['AVERAGE']);
      expect(result).toBe('AVERAGE');
    });

    it('should format multiple values', () => {
      const result = formatStratificationValue(['AVERAGE', 'MAXIMUM', 'MINIMUM']);
      expect(result).toBe('AVERAGE, MAXIMUM, MINIMUM');
    });

    it('should handle empty array', () => {
      const result = formatStratificationValue([]);
      expect(result).toBe('');
    });

    it('should handle single empty string', () => {
      const result = formatStratificationValue(['']);
      expect(result).toBe('');
    });

    it('should filter out empty strings', () => {
      const result = formatStratificationValue(['AVERAGE', '', 'MAXIMUM']);
      expect(result).toBe('AVERAGE, MAXIMUM');
    });
  });

  describe('enhanceVLMWithMethod', () => {
    it('should enhance VLM with method information', () => {
      // Mock enhanced state provider with method lookup
      const enhancedStateProvider = {
        ...mockStateProvider,
        getDatasets: vi.fn(() => ({
          'define-sdtm': {
            enhancedDefineXML: {
              lookups: {
                methodsByOID: new Map([
                  ['MT.CALCULATION', {
                    OID: 'MT.CALCULATION',
                    Name: 'Statistical Calculation',
                    Description: 'Average value calculation method',
                    Type: 'Computation'
                  }]
                ]),
                commentsByOID: new Map()
              }
            }
          }
        }))
      };

      const vlmWithMethod = { ...mockVLMVariables[1] }; // Has methodOID
      const result = enhanceVLMWithMethod(vlmWithMethod, enhancedStateProvider);

      expect(result).toHaveProperty('method');
      expect(result.method).toHaveProperty('Name');
      expect(result.method?.Name).toBe('Statistical Calculation');
    });

    it('should handle VLM without method OID', () => {
      const vlmWithoutMethod = { ...mockVLMVariables[0] }; // No methodOID
      const result = enhanceVLMWithMethod(vlmWithoutMethod, mockStateProvider);

      expect(result).toEqual(vlmWithoutMethod);
      expect(result.method).toBeUndefined();
    });

    it('should handle missing method definition', () => {
      const vlmWithInvalidMethod = {
        ...mockVLMVariables[1],
        methodOID: 'INVALID.METHOD'
      };
      
      const result = enhanceVLMWithMethod(vlmWithInvalidMethod, mockStateProvider);

      expect(result).toEqual(vlmWithInvalidMethod);
      expect(result.method).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    it('should generate complete table with all components', () => {
      const result = generateEnhancedTransposedVLMTable(
        mockVLMVariables,
        mockParamcdMapping,
        mockHierarchy,
        mockStateProvider
      );

      // Verify structure
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.columns.length).toBeGreaterThan(0);

      // Verify each row has proper structure
      result.rows.forEach(row => {
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('variable');
        expect(row).toHaveProperty('cells');
        expect(row.cells).toBeInstanceOf(Array);

        // Verify cells match column count
        expect(row.cells.length).toBe(result.columns.length - 1); // Minus variable column
      });

      // Verify columns have proper structure
      result.columns.forEach(column => {
        expect(column).toHaveProperty('id');
        expect(column).toHaveProperty('header');
      });
    });

    it('should handle complex stratification scenarios', () => {
      // Create complex VLM with multiple stratification levels
      const complexVLM: ValueLevelMetadata[] = [
        {
          variable: {
            oid: 'IT.VS.COMPLEX',
            name: 'COMPLEX',
            dataType: 'float',
            length: null,
            description: 'Complex Variable',
            orderNumber: 1,
            origin: { type: 'Derived', source: null, description: null },
            mandatory: false
          },
          whereClause: {
            conditions: [
              { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
              { variable: 'PARCAT1', operator: 'IN', checkValues: ['VITALS'], connector: 'AND' },
              { variable: 'PARAMCD', operator: 'IN', checkValues: ['SYSBP'], connector: 'AND' },
              { variable: 'AVISIT', operator: 'IN', checkValues: ['WEEK 1'], connector: 'AND' }
            ],
            logicalOperator: 'AND'
          },
          graphContext: {
            nodeId: 'IT.VS.COMPLEX',
            connectedNodes: [],
            cluster: ''
          }
        }
      ];

      const complexHierarchy = {
        primary: ['DTYPE', 'PARCAT1'],
        secondary: ['PARAMCD', 'AVISIT'],
        analysis: {}
      };

      const result = generateEnhancedTransposedVLMTable(
        complexVLM,
        mockParamcdMapping,
        complexHierarchy,
        mockStateProvider
      );

      expect(result.rows.length).toBe(1);
      expect(result.columns.length).toBeGreaterThan(1);

      // Should have one applicable cell
      const row = result.rows[0];
      const applicableCells = row.cells.filter(cell => cell.isApplicable);
      expect(applicableCells.length).toBe(1);
    });
  });
});