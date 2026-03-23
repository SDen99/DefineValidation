/**
 * Test suite for VLM Processing Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VLMProcessingService } from '../../services/VLMProcessingService';
import type { GlobalStateProvider, EnhancedVLMTableData } from '../../types';
import type { ValueLevelMetadata } from '@sden99/data-processing';

describe('VLMProcessingService', () => {
  let service: VLMProcessingService;
  let mockStateProvider: GlobalStateProvider;
  let mockDatasets: Record<string, any>;
  let mockDefineXMLData: any;

  beforeEach(() => {
    // Create mock enhanced DefineXML structure
    mockDefineXMLData = {
      enhancedDefineXML: {
        raw: {
          ItemGroups: [
            {
              Name: 'VS',
              SASDatasetName: 'VS',
              ItemRefs: [
                {
                  OID: 'IT.VS.VSSTRESN',
                  OrderNumber: '10',
                  Mandatory: 'Yes',
                  WhereClauseOID: 'WC.VS.VSSTRESN.SYSBP',
                  MethodOID: 'MT.CALCULATION'
                },
                {
                  OID: 'IT.VS.VSSTRESC',
                  OrderNumber: '11',
                  Mandatory: 'No',
                  KeySequence: '1',
                  Role: 'Identifier'
                }
              ]
            }
          ],
          ValueListDefs: [
            {
              OID: 'VL.VS.VSSTRESN',
              ItemRefs: [
                { OID: 'IT.VS.VSSTRESN.SYSBP' },
                { OID: 'IT.VS.VSSTRESN.DIABP' }
              ]
            }
          ]
        },
        enhancedItemGroups: new Map([
          ['VS', {
            name: 'VS',
            sasDatasetName: 'VS',
            valueLevelMetadata: [
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
                    { variable: 'PARAMCD', operator: 'IN', checkValues: ['SYSBP'], connector: 'AND' }
                  ],
                  logicalOperator: 'AND' as const
                },
                methodOID: 'MT.CALCULATION',
                graphContext: {
                  nodeId: 'IT.VS.VSSTRESN',
                  connectedNodes: [],
                  cluster: ''
                }
              }
            ]
          }]
        ]),
        lookups: {
          itemDefsByOID: new Map([
            ['IT.VS.VSSTRESN', {
              OID: 'IT.VS.VSSTRESN',
              Name: 'VSSTRESN',
              DataType: 'float',
              Description: 'Vital Signs Result (Numeric)',
              OriginType: 'Collected',
              Origin: 'CRF'
            }],
            ['IT.VS.VSSTRESC', {
              OID: 'IT.VS.VSSTRESC',
              Name: 'VSSTRESC',
              DataType: 'text',
              Length: '50',
              Description: 'Vital Signs Result (Character)',
              OriginType: 'Derived',
              CommentOID: 'COM.VSSTRESC'
            }]
          ]),
          methodsByOID: new Map([
            ['MT.CALCULATION', {
              OID: 'MT.CALCULATION',
              Name: 'Statistical Calculation',
              Description: 'Average value calculation method',
              Type: 'Computation'
            }]
          ]),
          commentsByOID: new Map([
            ['COM.VSSTRESC', {
              OID: 'COM.VSSTRESC',
              Description: 'Derived from VSORRES using standard units'
            }]
          ])
        }
      }
    };

    mockDatasets = {
      'define-sdtm': mockDefineXMLData
    };

    // Mock state provider
    mockStateProvider = {
      getSelectedDomain: vi.fn(() => 'VS'),
      getSelectedDatasetId: vi.fn(() => 'vs-dataset'),
      getDefineXmlInfo: vi.fn(() => ({
        SDTM: {
          ItemGroups: [{ SASDatasetName: 'VS', Name: 'VS' }]
        },
        ADaM: null,
        sdtmId: 'define-sdtm',
        adamId: null
      })),
      getDatasets: vi.fn(() => mockDatasets)
    };

    service = new VLMProcessingService(mockStateProvider);
  });

  describe('constructor', () => {
    it('should create service with state provider', () => {
      expect(service).toBeInstanceOf(VLMProcessingService);
    });

    it('should initialize with empty cache', () => {
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(3);
      expect(stats.lastKey).toBe('');
    });
  });

  describe('getVLMScopedVariables', () => {
    it('should return VLM variables for selected domain', () => {
      const result = service.getVLMScopedVariables();
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0].variable.name).toBe('VSSTRESN');
    });

    it('should return empty array when no domain selected', () => {
      mockStateProvider.getSelectedDomain = vi.fn(() => null);
      mockStateProvider.getSelectedDatasetId = vi.fn(() => null);
      
      const result = service.getVLMScopedVariables();
      expect(result).toEqual([]);
    });

    it('should handle missing define data', () => {
      mockStateProvider.getDatasets = vi.fn(() => ({}));
      
      const result = service.getVLMScopedVariables();
      expect(result).toEqual([]);
    });

    it('should filter VLM variables by ValueList references', () => {
      // Add a non-VLM variable to test filtering
      const enhancedItemGroups = mockDefineXMLData.enhancedDefineXML.enhancedItemGroups;
      const vsGroup = enhancedItemGroups.get('VS');
      vsGroup.valueLevelMetadata.push({
        variable: {
          oid: 'IT.VS.EXCLUDED',
          name: 'EXCLUDED',
          dataType: 'text',
          length: null,
          description: 'Excluded Variable',
          orderNumber: 99,
          origin: { type: 'Collected', source: null, description: null },
          mandatory: false
        },
        graphContext: {
          nodeId: 'IT.VS.EXCLUDED',
          connectedNodes: [],
          cluster: ''
        }
      });

      const result = service.getVLMScopedVariables();
      
      // Should only return VLM variables referenced in ValueListDefs
      expect(result.length).toBe(1);
      expect(result[0].variable.name).toBe('VSSTRESN');
      expect(result.find(v => v.variable.name === 'EXCLUDED')).toBeUndefined();
    });

    it('should handle ADaM datasets', () => {
      mockStateProvider.getDefineXmlInfo = vi.fn(() => ({
        SDTM: null,
        ADaM: {
          ItemGroups: [{ SASDatasetName: 'ADSL', Name: 'ADSL' }]
        },
        sdtmId: null,
        adamId: 'define-adam'
      }));
      
      mockStateProvider.getSelectedDomain = vi.fn(() => 'ADSL');
      mockDatasets['define-adam'] = mockDefineXMLData;

      // Update enhanced item groups for ADSL
      const enhancedItemGroups = mockDefineXMLData.enhancedDefineXML.enhancedItemGroups;
      enhancedItemGroups.set('ADSL', enhancedItemGroups.get('VS'));

      const result = service.getVLMScopedVariables();
      expect(result.length).toBe(1);
    });
  });

  describe('getAllVariables', () => {
    it('should return all variables from ItemGroup', () => {
      const result = service.getAllVariables();
      
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // VSSTRESN and VSSTRESC from ItemRefs
      
      const vsstresnVar = result.find(v => v.variable.name === 'VSSTRESN');
      expect(vsstresnVar).toBeDefined();
      expect(vsstresnVar?.variable.mandatory).toBe(true);
      expect(vsstresnVar?.variable.orderNumber).toBe(10);
      expect(vsstresnVar?.methodOID).toBe('MT.CALCULATION');
    });

    it('should enhance variables with method information', () => {
      const result = service.getAllVariables();
      
      const vsstresnVar = result.find(v => v.variable.name === 'VSSTRESN');
      expect(vsstresnVar?.method).toBeDefined();
      expect(vsstresnVar?.method?.Name).toBe('Statistical Calculation');
    });

    it('should enhance variables with comment information', () => {
      const result = service.getAllVariables();
      
      const vsstrescVar = result.find(v => v.variable.name === 'VSSTRESC');
      expect(vsstrescVar?.comments).toBeDefined();
      expect(vsstrescVar?.comments?.[0].description).toBe('Derived from VSORRES using standard units');
    });

    it('should return empty array when no dataset selected', () => {
      mockStateProvider.getSelectedDatasetId = vi.fn(() => null);
      mockStateProvider.getSelectedDomain = vi.fn(() => null);
      
      const result = service.getAllVariables();
      expect(result).toEqual([]);
    });

    it('should handle missing ItemGroup data', () => {
      mockDefineXMLData.enhancedDefineXML.raw.ItemGroups = [];
      
      const result = service.getAllVariables();
      expect(result).toEqual([]);
    });

    it('should properly map ItemRef properties to VLM', () => {
      const result = service.getAllVariables();
      
      const vsstrescVar = result.find(v => v.variable.name === 'VSSTRESC');
      expect(vsstrescVar?.variable.keySequence).toBe(1);
      expect(vsstrescVar?.variable.role).toBe('Identifier');
      expect(vsstrescVar?.variable.mandatory).toBe(false);
    });
  });

  describe('getActiveVLMTableData', () => {
    it('should return VLM table data with hierarchy', () => {
      const result = service.getActiveVLMTableData();
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('columns');
      expect(result).toHaveProperty('hierarchy');
      
      const enhancedResult = result as EnhancedVLMTableData;
      expect(enhancedResult.hierarchy).toHaveProperty('primary');
      expect(enhancedResult.hierarchy).toHaveProperty('secondary');
      expect(enhancedResult.hierarchy).toHaveProperty('analysis');
    });

    it('should return null when no VLM variables available', () => {
      // Mock empty VLM variables
      const emptyItemGroup = new Map([
        ['VS', {
          name: 'VS',
          sasDatasetName: 'VS',
          valueLevelMetadata: []
        }]
      ]);
      mockDefineXMLData.enhancedDefineXML.enhancedItemGroups = emptyItemGroup;
      
      const result = service.getActiveVLMTableData();
      expect(result).toBeNull();
    });

    it('should use caching for repeated requests', () => {
      const result1 = service.getActiveVLMTableData();
      const result2 = service.getActiveVLMTableData();
      
      // Should return the same cached object
      expect(result1).toBe(result2);
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should invalidate cache when dataset changes', () => {
      const result1 = service.getActiveVLMTableData();
      
      // Change selected dataset
      mockStateProvider.getSelectedDatasetId = vi.fn(() => 'different-dataset');
      
      const result2 = service.getActiveVLMTableData();
      
      // Should return different objects due to cache key change
      expect(result1).not.toBe(result2);
    });

    it('should limit cache size', () => {
      // Create multiple cache entries
      for (let i = 0; i < 5; i++) {
        mockStateProvider.getSelectedDatasetId = vi.fn(() => `dataset-${i}`);
        service.getActiveVLMTableData();
      }
      
      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(3); // Max cache size
    });

    it('should handle processing errors gracefully', () => {
      // Mock invalid data that causes processing error
      mockDefineXMLData.enhancedDefineXML.enhancedItemGroups.get('VS').valueLevelMetadata = [
        { invalidData: 'test' } // Invalid VLM structure
      ];
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = service.getActiveVLMTableData();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error processing VLM data:'), expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      // Generate cached data
      service.getActiveVLMTableData();
      expect(service.getCacheStats().size).toBe(1);
      
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.lastKey).toBe('');
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('lastKey');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
      expect(typeof stats.lastKey).toBe('string');
    });

    it('should maintain LRU cache behavior', () => {
      // Fill cache to max capacity
      for (let i = 0; i < 4; i++) {
        mockStateProvider.getSelectedDatasetId = vi.fn(() => `dataset-${i}`);
        service.getActiveVLMTableData();
      }
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(3); // Should not exceed max size
      expect(stats.lastKey).toContain('dataset-3'); // Most recent key
    });
  });

  describe('enhanceVLMWithMethod private method', () => {
    it('should enhance VLM with method information', () => {
      // This tests the private method indirectly through getAllVariables
      const result = service.getAllVariables();
      
      const methodEnhancedVar = result.find(v => v.methodOID === 'MT.CALCULATION');
      expect(methodEnhancedVar).toBeDefined();
      expect(methodEnhancedVar?.method).toBeDefined();
      expect(methodEnhancedVar?.method?.Name).toBe('Statistical Calculation');
      expect(methodEnhancedVar?.method?.Type).toBe('Computation');
    });

    it('should handle missing method definition', () => {
      // Create variable with invalid method OID
      mockDefineXMLData.enhancedDefineXML.raw.ItemGroups[0].ItemRefs[0].MethodOID = 'INVALID.METHOD';
      
      const result = service.getAllVariables();
      
      const var1 = result.find(v => v.variable.name === 'VSSTRESN');
      expect(var1?.methodOID).toBe('INVALID.METHOD');
      expect(var1?.method).toBeUndefined();
    });

    it('should handle missing state provider data', () => {
      mockStateProvider.getSelectedDomain = vi.fn(() => null);
      
      const result = service.getAllVariables();
      expect(result).toEqual([]);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow from variables to table', () => {
      // Get VLM variables
      const vlmVariables = service.getVLMScopedVariables();
      expect(vlmVariables.length).toBeGreaterThan(0);
      
      // Get all variables
      const allVariables = service.getAllVariables();
      expect(allVariables.length).toBeGreaterThan(0);
      
      // Generate table data
      const tableData = service.getActiveVLMTableData();
      expect(tableData).not.toBeNull();
      expect(tableData?.rows.length).toBeGreaterThan(0);
      expect(tableData?.columns.length).toBeGreaterThan(0);
    });

    it('should maintain consistent behavior across service methods', () => {
      const vlmVariables = service.getVLMScopedVariables();
      const allVariables = service.getAllVariables();
      const tableData = service.getActiveVLMTableData();
      
      // VLM variables should be subset of all variables
      expect(vlmVariables.length).toBeLessThanOrEqual(allVariables.length);
      
      // Table should have rows corresponding to VLM variables
      if (tableData) {
        expect(tableData.rows.length).toBeGreaterThan(0);
        
        // Each VLM variable should have corresponding row
        vlmVariables.forEach(vlm => {
          const hasRow = tableData.rows.some(row => 
            row.variable === vlm.variable.name
          );
          expect(hasRow).toBe(true);
        });
      }
    });

    it('should handle state changes correctly', () => {
      // Initial state
      const initial = service.getActiveVLMTableData();
      expect(initial).not.toBeNull();
      
      // Change domain
      mockStateProvider.getSelectedDomain = vi.fn(() => 'DIFFERENT');
      const afterDomainChange = service.getActiveVLMTableData();
      
      // Should return different result or null
      expect(afterDomainChange !== initial).toBe(true);
    });
  });
});