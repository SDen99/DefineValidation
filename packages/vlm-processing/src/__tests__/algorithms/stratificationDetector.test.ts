/**
 * Test suite for VLM Stratification Hierarchy Detection Algorithm
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { detectVLMStratificationHierarchy, extractParamcdMapping } from '../../stratification/hierarchyDetection';
import type { ValueLevelMetadata } from '@sden99/data-processing';

describe('detectVLMStratificationHierarchy', () => {
  let mockVLMVariables: ValueLevelMetadata[];

  beforeEach(() => {
    // Create comprehensive test data
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
            },
            {
              variable: 'AVISIT',
              operator: 'IN',
              checkValues: ['WEEK 2'],
              connector: 'AND'
            }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.VSSTRESN.2',
          connectedNodes: [],
          cluster: ''
        }
      },
      {
        variable: {
          oid: 'IT.VS.VSSTRESC',
          name: 'VSSTRESC',
          dataType: 'text',
          length: 50,
          description: 'Vital Signs Result (Character)',
          orderNumber: 12,
          origin: { type: 'Derived', source: null, description: null },
          mandatory: false
        },
        whereClause: {
          conditions: [
            {
              variable: 'PARCAT1',
              operator: 'IN',
              checkValues: ['VITALS'],
              connector: 'AND'
            },
            {
              variable: 'QNAM',
              operator: 'IN',
              checkValues: ['VSORRES'],
              connector: 'AND'
            }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.VSSTRESC',
          connectedNodes: [],
          cluster: ''
        }
      }
    ];
  });

  it('should detect all stratification variables as primary', () => {
    const result = detectVLMStratificationHierarchy(mockVLMVariables);

    expect(result).toHaveProperty('primary');
    expect(result).toHaveProperty('secondary');
    expect(result).toHaveProperty('analysis');

    // ALL detected variables should be primary (no arbitrary filtering)
    expect(result.primary).toContain('DTYPE');
    expect(result.primary).toContain('PARAMCD');
    expect(result.primary).toContain('AVISIT');
    expect(result.primary).toContain('PARCAT1');
    expect(result.primary).toContain('QNAM');

    // Nothing should be secondary (complete transparency for editable Define-XML)
    expect(result.secondary).toEqual([]);

    // Verify DTYPE analysis
    expect(result.analysis['DTYPE']).toBeDefined();
    expect(result.analysis['DTYPE'].affectedVariables).toBe(1); // affects 1 unique variable (VSSTRESN)
    expect(result.analysis['DTYPE'].totalDefinitions).toBe(2); // appears in 2 VLM definitions

    // PARAMCD should now be detected (previously ignored by whitelist)
    expect(result.analysis['PARAMCD']).toBeDefined();
    expect(result.analysis['PARAMCD'].affectedVariables).toBe(1);
    expect(result.analysis['PARAMCD'].totalDefinitions).toBe(2);
  });

  it('should make all detected variables visible regardless of semantic priority', () => {
    const result = detectVLMStratificationHierarchy(mockVLMVariables);

    // ALL detected variables should be primary, regardless of semantic weight
    // This ensures complete transparency for Define-XML editing
    if (result.analysis['PARCAT1']) {
      expect(result.primary).toContain('PARCAT1');
    }

    if (result.analysis['QNAM']) {
      expect(result.primary).toContain('QNAM');
    }

    // No variables should be relegated to secondary
    expect(result.secondary).toEqual([]);
  });

  it('should handle empty VLM variables', () => {
    const result = detectVLMStratificationHierarchy([]);

    expect(result.primary).toEqual([]);
    expect(result.secondary).toEqual([]);
    expect(result.analysis).toEqual({});
  });

  it('should detect all variables as primary regardless of impact score', () => {
    // Create VLM with variables that would have been "low impact" under old system
    const lowImpactVLM: ValueLevelMetadata[] = [
      {
        variable: {
          oid: 'IT.VS.TEST',
          name: 'TEST',
          dataType: 'text',
          length: null,
          description: 'Test Variable',
          orderNumber: 1,
          origin: { type: 'Collected', source: null, description: null },
          mandatory: false
        },
        whereClause: {
          conditions: [
            {
              variable: 'QVAL',
              operator: 'IN',
              checkValues: ['Y'],
              connector: 'AND'
            }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.TEST',
          connectedNodes: [],
          cluster: ''
        }
      }
    ];

    const result = detectVLMStratificationHierarchy(lowImpactVLM);

    // All detected variables should be primary, not filtered by impact score
    expect(result.primary).toHaveLength(1);
    expect(result.primary[0]).toBe('QVAL');
    expect(result.secondary).toEqual([]);
  });

  it('should calculate impact scores correctly', () => {
    const result = detectVLMStratificationHierarchy(mockVLMVariables);

    // Verify impact score calculation components
    const dtypeAnalysis = result.analysis['DTYPE'];
    expect(dtypeAnalysis).toBeDefined();

    // Impact score should be between 0 and 1
    expect(dtypeAnalysis.impactScore).toBeGreaterThanOrEqual(0);
    expect(dtypeAnalysis.impactScore).toBeLessThanOrEqual(1);

    // DTYPE affects 1 out of 2 unique variables (50% breadth)
    // (VSSTRESN appears in 2 VLM definitions but counts as 1 unique variable)
    expect(dtypeAnalysis.affectedVariables).toBe(1);
  });

  it('should handle variables without where clauses', () => {
    const variablesWithoutClauses: ValueLevelMetadata[] = [
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

    const result = detectVLMStratificationHierarchy(variablesWithoutClauses);

    expect(result.primary).toEqual([]);
    expect(result.secondary).toEqual([]);
    expect(result.analysis).toEqual({});
  });

  it('should prioritize known stratification variables', () => {
    // Create VLM with all known stratification variable types
    const completeVLM: ValueLevelMetadata[] = [
      'DTYPE', 'PARCAT', 'PARCAT1', 'PARCAT2', 'QNAM', 'QVAL', 'AVISIT', 'APHASE'
    ].map((stratVar, index) => ({
      variable: {
        oid: `IT.TEST.VAR${index}`,
        name: `VAR${index}`,
        dataType: 'text',
        length: null,
        description: `Test Variable ${index}`,
        orderNumber: index,
        origin: { type: 'Collected', source: null, description: null },
        mandatory: false
      },
      whereClause: {
        conditions: [
          {
            variable: stratVar,
            operator: 'IN',
            checkValues: ['TEST'],
            connector: 'AND'
          }
        ],
        logicalOperator: 'AND'
      },
      graphContext: {
        nodeId: `IT.TEST.VAR${index}`,
        connectedNodes: [],
        cluster: ''
      }
    }));

    const result = detectVLMStratificationHierarchy(completeVLM);

    // DTYPE should always be primary due to highest semantic priority
    expect(result.primary).toContain('DTYPE');
    
    // Verify semantic ordering in analysis
    const dtypeScore = result.analysis['DTYPE'].impactScore;
    const parcat1Score = result.analysis['PARCAT1'].impactScore;
    const qvalScore = result.analysis['QVAL'].impactScore;
    
    expect(dtypeScore).toBeGreaterThanOrEqual(parcat1Score);
    expect(parcat1Score).toBeGreaterThanOrEqual(qvalScore);
  });
});

describe('extractParamcdMapping', () => {
  it('should extract mapping from codelist items', () => {
    const vlmWithCodelist: ValueLevelMetadata[] = [
      {
        variable: {
          oid: 'IT.VS.PARAMCD',
          name: 'PARAMCD',
          dataType: 'text',
          length: 8,
          description: 'Parameter Code',
          orderNumber: 5,
          origin: { type: 'Assigned', source: null, description: null },
          mandatory: true
        },
        codeList: {
          items: [
            { codedValue: 'SYSBP', decode: 'Systolic Blood Pressure' },
            { codedValue: 'DIABP', decode: 'Diastolic Blood Pressure' },
            { codedValue: 'HR', decode: 'Heart Rate' },
            { codedValue: 'TEMP', decode: 'Body Temperature' }
          ]
        },
        graphContext: {
          nodeId: 'IT.VS.PARAMCD',
          connectedNodes: [],
          cluster: ''
        }
      }
    ];

    const result = extractParamcdMapping(vlmWithCodelist);

    expect(result).toEqual({
      'SYSBP': 'Systolic Blood Pressure',
      'DIABP': 'Diastolic Blood Pressure',
      'HR': 'Heart Rate',
      'TEMP': 'Body Temperature'
    });
  });

  it('should extract mapping from where clause conditions', () => {
    const vlmWithWhereClause: ValueLevelMetadata[] = [
      {
        variable: {
          oid: 'IT.VS.VSSTRESN',
          name: 'VSSTRESN',
          dataType: 'float',
          length: null,
          description: 'Vital Signs Result',
          orderNumber: 10,
          origin: { type: 'Collected', source: null, description: null },
          mandatory: true
        },
        whereClause: {
          conditions: [
            {
              variable: 'PARAMCD',
              operator: 'IN',
              checkValues: ['SYSBP', 'DIABP'],
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
          oid: 'IT.VS.VSSTRESC',
          name: 'VSSTRESC',
          dataType: 'text',
          length: 50,
          description: 'Vital Signs Result (Character)',
          orderNumber: 11,
          origin: { type: 'Derived', source: null, description: null },
          mandatory: false
        },
        whereClause: {
          conditions: [
            {
              variable: 'PARAMCD',
              operator: 'IN',
              checkValues: ['HR', 'TEMP'],
              connector: 'AND'
            }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.VSSTRESC',
          connectedNodes: [],
          cluster: ''
        }
      }
    ];

    const result = extractParamcdMapping(vlmWithWhereClause);

    // Should create 1:1 mapping when no codelist available
    expect(result).toEqual({
      'SYSBP': 'SYSBP',
      'DIABP': 'DIABP',
      'HR': 'HR',
      'TEMP': 'TEMP'
    });
  });

  it('should return empty mapping for VLM without PARAMCD references', () => {
    const vlmWithoutParamcd: ValueLevelMetadata[] = [
      {
        variable: {
          oid: 'IT.VS.VSTESTCD',
          name: 'VSTESTCD',
          dataType: 'text',
          length: 8,
          description: 'Vital Signs Test Code',
          orderNumber: 3,
          origin: { type: 'Assigned', source: null, description: null },
          mandatory: true
        },
        whereClause: {
          conditions: [
            {
              variable: 'VSTESTCD',
              operator: 'IN',
              checkValues: ['TEMP'],
              connector: 'AND'
            }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.VSTESTCD',
          connectedNodes: [],
          cluster: ''
        }
      }
    ];

    const result = extractParamcdMapping(vlmWithoutParamcd);

    expect(result).toEqual({});
  });

  it('should handle empty VLM array', () => {
    const result = extractParamcdMapping([]);
    expect(result).toEqual({});
  });

  it('should prefer codelist over where clause conditions', () => {
    const vlmWithBoth: ValueLevelMetadata[] = [
      {
        variable: {
          oid: 'IT.VS.PARAMCD',
          name: 'PARAMCD',
          dataType: 'text',
          length: 8,
          description: 'Parameter Code',
          orderNumber: 5,
          origin: { type: 'Assigned', source: null, description: null },
          mandatory: true
        },
        codeList: {
          items: [
            { codedValue: 'SYSBP', decode: 'Systolic Blood Pressure' },
            { codedValue: 'DIABP', decode: 'Diastolic Blood Pressure' }
          ]
        },
        whereClause: {
          conditions: [
            {
              variable: 'PARAMCD',
              operator: 'IN',
              checkValues: ['HR', 'TEMP'],
              connector: 'AND'
            }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.PARAMCD',
          connectedNodes: [],
          cluster: ''
        }
      }
    ];

    const result = extractParamcdMapping(vlmWithBoth);

    // Should use codelist data, not where clause
    expect(result).toEqual({
      'SYSBP': 'Systolic Blood Pressure',
      'DIABP': 'Diastolic Blood Pressure'
    });
    expect(result).not.toHaveProperty('HR');
    expect(result).not.toHaveProperty('TEMP');
  });
});