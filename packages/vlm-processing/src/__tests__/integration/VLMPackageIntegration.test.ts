/**
 * Integration Test Suite for VLM Package
 * Tests the complete VLM processing pipeline and package exports
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { GlobalStateProvider, VLMTableData } from '../../types';

// Test all main exports work correctly
import {
  VLMProcessingEngine,
  VLMProcessingService,
  detectVLMStratificationHierarchy,
  extractParamcdMapping,
  generateEnhancedTransposedVLMTable,
  getVLMScopedVariables,
  getAllVariables,
  initializeVLMProcessing,
  getActiveVLMTableData,
  VERSION,
  PACKAGE_INFO
} from '../../index';

describe('VLM Package Integration', () => {
  let mockStateProvider: GlobalStateProvider;
  let sampleVLMData: ValueLevelMetadata[];

  beforeEach(() => {
    // Create comprehensive mock data that represents real clinical data
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
      getDatasets: vi.fn(() => ({
        'define-sdtm': {
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
                      Mandatory: 'Yes'
                    }
                  ]
                }
              ]
            },
            enhancedItemGroups: new Map([
              ['VS', {
                name: 'VS',
                sasDatasetName: 'VS',
                valueLevelMetadata: []
              }]
            ]),
            lookups: {
              itemDefsByOID: new Map([
                ['IT.VS.VSSTRESN', {
                  OID: 'IT.VS.VSSTRESN',
                  Name: 'VSSTRESN',
                  DataType: 'float',
                  Description: 'Vital Signs Result (Numeric)',
                  OriginType: 'Collected'
                }]
              ]),
              methodsByOID: new Map(),
              commentsByOID: new Map()
            }
          }
        }
      }))
    };

    // Create realistic VLM data representing vital signs measurements
    sampleVLMData = [
      {
        variable: {
          oid: 'IT.VS.VSSTRESN.SYSBP.AVG',
          name: 'VSSTRESN',
          dataType: 'float',
          length: null,
          description: 'Vital Signs Result (Numeric) - Systolic BP Average',
          orderNumber: 10,
          origin: { type: 'Collected', source: null, description: null },
          mandatory: true
        },
        whereClause: {
          conditions: [
            { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
            { variable: 'PARAMCD', operator: 'IN', checkValues: ['SYSBP'], connector: 'AND' }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.VSSTRESN.SYSBP.AVG',
          connectedNodes: [],
          cluster: 'vitals'
        }
      },
      {
        variable: {
          oid: 'IT.VS.VSSTRESN.SYSBP.MAX',
          name: 'VSSTRESN',
          dataType: 'float',
          length: null,
          description: 'Vital Signs Result (Numeric) - Systolic BP Maximum',
          orderNumber: 11,
          origin: { type: 'Derived', source: null, description: null },
          mandatory: true
        },
        whereClause: {
          conditions: [
            { variable: 'DTYPE', operator: 'IN', checkValues: ['MAXIMUM'], connector: 'AND' },
            { variable: 'PARAMCD', operator: 'IN', checkValues: ['SYSBP'], connector: 'AND' }
          ],
          logicalOperator: 'AND'
        },
        methodOID: 'MT.MAX.CALCULATION',
        graphContext: {
          nodeId: 'IT.VS.VSSTRESN.SYSBP.MAX',
          connectedNodes: ['IT.VS.VSSTRESN.SYSBP.AVG'],
          cluster: 'vitals'
        }
      },
      {
        variable: {
          oid: 'IT.VS.VSSTRESN.DIABP.AVG',
          name: 'VSSTRESN',
          dataType: 'float',
          length: null,
          description: 'Vital Signs Result (Numeric) - Diastolic BP Average',
          orderNumber: 12,
          origin: { type: 'Collected', source: null, description: null },
          mandatory: true
        },
        whereClause: {
          conditions: [
            { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
            { variable: 'PARAMCD', operator: 'IN', checkValues: ['DIABP'], connector: 'AND' }
          ],
          logicalOperator: 'AND'
        },
        graphContext: {
          nodeId: 'IT.VS.VSSTRESN.DIABP.AVG',
          connectedNodes: [],
          cluster: 'vitals'
        }
      },
      {
        variable: {
          oid: 'IT.VS.VSSTRESC.SYSBP',
          name: 'VSSTRESC',
          dataType: 'text',
          length: 50,
          description: 'Vital Signs Result (Character) - Systolic BP',
          orderNumber: 13,
          origin: { type: 'Derived', source: null, description: null },
          mandatory: false
        },
        whereClause: {
          conditions: [
            { variable: 'PARCAT1', operator: 'IN', checkValues: ['VITALS'], connector: 'AND' },
            { variable: 'PARAMCD', operator: 'IN', checkValues: ['SYSBP'], connector: 'AND' }
          ],
          logicalOperator: 'AND'
        },
        codeList: {
          items: [
            { codedValue: 'NORMAL', decode: 'Normal Range' },
            { codedValue: 'HIGH', decode: 'High' },
            { codedValue: 'LOW', decode: 'Low' }
          ]
        },
        graphContext: {
          nodeId: 'IT.VS.VSSTRESC.SYSBP',
          connectedNodes: ['IT.VS.VSSTRESN.SYSBP.AVG'],
          cluster: 'vitals'
        }
      }
    ];
  });

  describe('Package Exports', () => {
    it('should export all required public interfaces', () => {
      // Core classes
      expect(VLMProcessingEngine).toBeDefined();
      expect(VLMProcessingService).toBeDefined();
      
      // Algorithm functions
      expect(detectVLMStratificationHierarchy).toBeDefined();
      expect(extractParamcdMapping).toBeDefined();
      expect(generateEnhancedTransposedVLMTable).toBeDefined();
      
      // Data access functions
      expect(getVLMScopedVariables).toBeDefined();
      expect(getAllVariables).toBeDefined();
      
      // State management functions
      expect(initializeVLMProcessing).toBeDefined();
      expect(getActiveVLMTableData).toBeDefined();
      
      // Package metadata
      expect(VERSION).toBeDefined();
      expect(PACKAGE_INFO).toBeDefined();
    });

    it('should have correct package metadata', () => {
      expect(VERSION).toBe('0.1.0');
      expect(PACKAGE_INFO.name).toBe('@sden99/vlm-processing');
      expect(PACKAGE_INFO.version).toBe('0.1.0');
      expect(PACKAGE_INFO.keywords).toContain('vlm');
      expect(PACKAGE_INFO.keywords).toContain('clinical-data');
    });
  });

  describe('End-to-End Processing Pipeline', () => {
    it('should process VLM data through complete pipeline', async () => {
      // Step 1: Initialize VLM Processing Engine
      const engine = new VLMProcessingEngine({
        enableStratification: true,
        maxStratificationDepth: 5
      });

      // Step 2: Process VLMs through engine
      const engineResult = await engine.processVLMs(sampleVLMData);

      expect(engineResult.processedVLMs).toHaveLength(4);
      expect(engineResult.hierarchies).toHaveLength(1);
      expect(engineResult.processingStats.totalVariables).toBe(4);
      expect(engineResult.processingStats.vlmVariables).toBe(4);
      expect(engineResult.processingStats.processingTime).toBeGreaterThan(0);

      // Step 3: Extract stratification hierarchy
      const hierarchy = detectVLMStratificationHierarchy(sampleVLMData);
      
      expect(hierarchy.primary).toContain('DTYPE');
      expect(hierarchy.secondary.includes('PARAMCD') || hierarchy.primary.includes('PARAMCD')).toBe(true);
      expect(hierarchy.analysis).toHaveProperty('DTYPE');
      expect(hierarchy.analysis).toHaveProperty('PARAMCD');

      // Step 4: Extract PARAMCD mapping
      const paramcdMapping = extractParamcdMapping(sampleVLMData);
      
      expect(paramcdMapping).toHaveProperty('SYSBP');
      expect(paramcdMapping).toHaveProperty('DIABP');
      expect(paramcdMapping['SYSBP']).toBe('SYSBP'); // No codelist, so 1:1 mapping

      // Step 5: Generate table data
      const tableData = generateEnhancedTransposedVLMTable(
        sampleVLMData,
        paramcdMapping,
        hierarchy,
        mockStateProvider
      );

      expect(tableData.rows).toHaveLength(2); // VSSTRESN and VSSTRESC
      expect(tableData.columns.length).toBeGreaterThan(2); // Variable column + parameter columns

      // Verify row structure
      const vsstresn = tableData.rows.find(row => row.variable === 'VSSTRESN');
      expect(vsstresn).toBeDefined();
      expect(vsstresn?.cells).toBeInstanceOf(Array);

      const vsstresc = tableData.rows.find(row => row.variable === 'VSSTRESC');
      expect(vsstresc).toBeDefined();
      expect(vsstresc?.cells).toBeInstanceOf(Array);
    });

    it('should handle complex stratification scenarios', () => {
      // Create complex VLM with multiple stratification levels
      const complexVLM: ValueLevelMetadata[] = [
        {
          variable: {
            oid: 'IT.LB.LBSTRESN.COMPLEX',
            name: 'LBSTRESN',
            dataType: 'float',
            length: null,
            description: 'Complex Lab Result',
            orderNumber: 1,
            origin: { type: 'Collected', source: null, description: null },
            mandatory: true
          },
          whereClause: {
            conditions: [
              { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
              { variable: 'PARCAT1', operator: 'IN', checkValues: ['CHEMISTRY'], connector: 'AND' },
              { variable: 'PARCAT2', operator: 'IN', checkValues: ['LIVER'], connector: 'AND' },
              { variable: 'PARAMCD', operator: 'IN', checkValues: ['ALT'], connector: 'AND' },
              { variable: 'AVISIT', operator: 'IN', checkValues: ['WEEK 2'], connector: 'AND' }
            ],
            logicalOperator: 'AND'
          },
          graphContext: {
            nodeId: 'IT.LB.LBSTRESN.COMPLEX',
            connectedNodes: [],
            cluster: 'lab'
          }
        }
      ];

      const hierarchy = detectVLMStratificationHierarchy(complexVLM);
      const paramcdMapping = extractParamcdMapping(complexVLM);
      const tableData = generateEnhancedTransposedVLMTable(
        complexVLM,
        paramcdMapping,
        hierarchy,
        mockStateProvider
      );

      // Should handle complex hierarchy
      expect(hierarchy.primary).toContain('DTYPE');
      expect(hierarchy.primary.includes('PARCAT1') || hierarchy.secondary.includes('PARCAT1')).toBe(true);
      
      // Should generate appropriate table
      expect(tableData.rows).toHaveLength(1);
      expect(tableData.columns.length).toBeGreaterThan(1);
    });

    it('should integrate with VLM Processing Service', () => {
      // Initialize service with state provider
      const service = new VLMProcessingService(mockStateProvider);

      // Update mock to return our sample data
      const enhancedItemGroups = mockStateProvider.getDatasets()['define-sdtm'].enhancedDefineXML.enhancedItemGroups;
      enhancedItemGroups.get('VS').valueLevelMetadata = sampleVLMData.filter(vlm => 
        vlm.variable.oid.startsWith('IT.VS.VSSTRESN')
      );

      // Get VLM scoped variables
      const vlmVariables = service.getVLMScopedVariables();
      expect(vlmVariables).toBeInstanceOf(Array);
      
      // Get all variables
      const allVariables = service.getAllVariables();
      expect(allVariables).toBeInstanceOf(Array);
      expect(allVariables.length).toBeGreaterThanOrEqual(0);

      // Get table data through service
      const tableData = service.getActiveVLMTableData();
      if (tableData) {
        expect(tableData).toHaveProperty('rows');
        expect(tableData).toHaveProperty('columns');
        expect(tableData).toHaveProperty('hierarchy');
      }
    });
  });

  describe('State Management Integration', () => {
    it('should initialize and manage state correctly', () => {
      const datasetId = 'integration-test';

      // Initialize VLM processing with state provider
      initializeVLMProcessing(mockStateProvider);

      // Should not throw
      expect(() => {
        const tableData = getActiveVLMTableData();
        // May be null if no data available
      }).not.toThrow();
    });

    it('should handle state provider integration', () => {
      // Initialize with mock state provider
      initializeVLMProcessing(mockStateProvider);

      // Mock should be called by VLM processing functions
      const vlmVars = getVLMScopedVariables();
      expect(mockStateProvider.getSelectedDomain).toHaveBeenCalled();
      expect(mockStateProvider.getDefineXmlInfo).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty VLM data gracefully', async () => {
      const engine = new VLMProcessingEngine();
      const result = await engine.processVLMs([]);

      expect(result.processedVLMs).toEqual([]);
      expect(result.hierarchies).toEqual([]);
      expect(result.variableAnalyses).toEqual([]);
      expect(result.processingStats.totalVariables).toBe(0);
    });

    it('should handle invalid VLM data', () => {
      const invalidVLM = [
        {
          // Missing required properties
          variable: {
            oid: 'INVALID',
            name: '',
            dataType: '',
            length: null,
            description: null,
            orderNumber: null,
            origin: { type: null, source: null, description: null },
            mandatory: false
          },
          graphContext: {
            nodeId: 'INVALID',
            connectedNodes: [],
            cluster: ''
          }
        }
      ] as ValueLevelMetadata[];

      expect(() => {
        detectVLMStratificationHierarchy(invalidVLM);
      }).not.toThrow();

      expect(() => {
        extractParamcdMapping(invalidVLM);
      }).not.toThrow();
    });

    it('should handle missing state provider data', () => {
      const emptyStateProvider = {
        getSelectedDomain: vi.fn(() => null),
        getSelectedDatasetId: vi.fn(() => null),
        getDefineXmlInfo: vi.fn(() => ({ SDTM: null, ADaM: null, sdtmId: null, adamId: null })),
        getDatasets: vi.fn(() => ({}))
      };

      const service = new VLMProcessingService(emptyStateProvider);

      expect(service.getVLMScopedVariables()).toEqual([]);
      expect(service.getAllVariables()).toEqual([]);
      expect(service.getActiveVLMTableData()).toBeNull();
    });

    it('should handle processing errors without crashing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create malformed data that might cause processing errors
      const malformedVLM = sampleVLMData.map(vlm => ({
        ...vlm,
        whereClause: {
          ...vlm.whereClause,
          conditions: vlm.whereClause?.conditions.map(cond => ({
            ...cond,
            checkValues: null as any // Invalid check values
          })) || []
        }
      }));

      const hierarchy = detectVLMStratificationHierarchy(malformedVLM);
      
      // Should return safe defaults even with malformed data
      expect(hierarchy).toHaveProperty('primary');
      expect(hierarchy).toHaveProperty('secondary');
      expect(hierarchy).toHaveProperty('analysis');

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate large VLM dataset
      const largeVLM: ValueLevelMetadata[] = [];
      
      for (let i = 0; i < 1000; i++) {
        largeVLM.push({
          variable: {
            oid: `IT.TEST.VAR${i}`,
            name: `VAR${i}`,
            dataType: 'float',
            length: null,
            description: `Test Variable ${i}`,
            orderNumber: i,
            origin: { type: 'Collected', source: null, description: null },
            mandatory: i % 2 === 0
          },
          whereClause: {
            conditions: [
              { 
                variable: 'PARAMCD', 
                operator: 'IN', 
                checkValues: [`PARAM${i % 50}`], 
                connector: 'AND' 
              }
            ],
            logicalOperator: 'AND'
          },
          graphContext: {
            nodeId: `IT.TEST.VAR${i}`,
            connectedNodes: [],
            cluster: 'test'
          }
        });
      }

      const startTime = performance.now();
      
      const hierarchy = detectVLMStratificationHierarchy(largeVLM);
      const paramcdMapping = extractParamcdMapping(largeVLM);
      const tableData = generateEnhancedTransposedVLMTable(
        largeVLM,
        paramcdMapping,
        hierarchy,
        mockStateProvider
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete in reasonable time (< 1 second for 1000 items)
      expect(processingTime).toBeLessThan(1000);

      // Should produce valid results
      expect(hierarchy.analysis).toHaveProperty('PARAMCD');
      expect(Object.keys(paramcdMapping).length).toBe(50); // 50 unique PARAMCDs
      expect(tableData.rows.length).toBe(1000); // One row per variable
    });

    it('should manage memory efficiently with caching', () => {
      const service = new VLMProcessingService(mockStateProvider);

      // Generate multiple cache entries
      for (let i = 0; i < 10; i++) {
        mockStateProvider.getSelectedDatasetId = vi.fn(() => `dataset-${i}`);
        service.getActiveVLMTableData();
      }

      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(3); // Should respect max cache size

      // Clear cache and verify memory is freed
      service.clearCache();
      const clearedStats = service.getCacheStats();
      expect(clearedStats.size).toBe(0);
    });
  });

  describe('Compatibility and Type Safety', () => {
    it('should maintain type compatibility across interfaces', () => {
      // Test that all interfaces work together correctly
      const service = new VLMProcessingService(mockStateProvider);
      
      initializeVLMProcessing(mockStateProvider);

      // Should compile without TypeScript errors and work at runtime
      const tableData: VLMTableData | null = service.getActiveVLMTableData();
      
      if (tableData) {
        expect(tableData.rows).toBeInstanceOf(Array);
        expect(tableData.columns).toBeInstanceOf(Array);
        
        // Verify structure matches interface
        tableData.rows.forEach(row => {
          expect(row).toHaveProperty('id');
          expect(row).toHaveProperty('variable');
          expect(row).toHaveProperty('cells');
          expect(typeof row.id).toBe('string');
          expect(typeof row.variable).toBe('string');
          expect(Array.isArray(row.cells)).toBe(true);
        });

        tableData.columns.forEach(column => {
          expect(column).toHaveProperty('id');
          expect(column).toHaveProperty('header');
          expect(typeof column.id).toBe('string');
          expect(typeof column.header).toBe('string');
        });
      }
    });

    it('should work with different GlobalStateProvider implementations', () => {
      // Test with minimal state provider
      const minimalProvider: GlobalStateProvider = {
        getSelectedDomain: () => 'TEST',
        getSelectedDatasetId: () => 'test-id',
        getDefineXmlInfo: () => ({ SDTM: null, ADaM: null, sdtmId: null, adamId: null }),
        getDatasets: () => ({})
      };

      expect(() => {
        const service = new VLMProcessingService(minimalProvider);
        initializeVLMProcessing(minimalProvider);
      }).not.toThrow();

      // Test with comprehensive state provider
      expect(() => {
        const service = new VLMProcessingService(mockStateProvider);
        initializeVLMProcessing(mockStateProvider);
      }).not.toThrow();
    });
  });
});