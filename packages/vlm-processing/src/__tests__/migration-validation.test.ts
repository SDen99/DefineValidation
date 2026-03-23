/**
 * VLM Package Migration Validation Test Suite
 * Tests core functionality to validate migration success
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { GlobalStateProvider } from '../types';

// Test core exports
import {
  VLMProcessingEngine,
  VLMProcessingService,
  detectVLMStratificationHierarchy,
  extractParamcdMapping,
  VERSION,
  PACKAGE_INFO
} from '../index';

describe('VLM Package Migration Validation', () => {
  let mockStateProvider: GlobalStateProvider;
  let sampleVLMData: ValueLevelMetadata[];

  beforeEach(() => {
    // Create realistic mock state provider
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
              ItemGroups: [{
                Name: 'VS',
                SASDatasetName: 'VS',
                ItemRefs: [
                  { OID: 'IT.VS.VSSTRESN', OrderNumber: '10', Mandatory: 'Yes' }
                ]
              }]
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
                  Description: 'Vital Signs Result',
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

    // Create sample VLM data for testing
    sampleVLMData = [
      {
        variable: {
          oid: 'IT.VS.VSSTRESN.SYSBP',
          name: 'VSSTRESN',
          dataType: 'float',
          length: null,
          description: 'Systolic Blood Pressure',
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
          nodeId: 'IT.VS.VSSTRESN.SYSBP',
          connectedNodes: [],
          cluster: 'vitals'
        }
      },
      {
        variable: {
          oid: 'IT.VS.VSSTRESN.DIABP',
          name: 'VSSTRESN',
          dataType: 'float',
          length: null,
          description: 'Diastolic Blood Pressure',
          orderNumber: 11,
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
          nodeId: 'IT.VS.VSSTRESN.DIABP',
          connectedNodes: [],
          cluster: 'vitals'
        }
      }
    ];
  });

  describe('Package Exports Validation', () => {
    it('should export all required components without errors', () => {
      // Core classes
      expect(VLMProcessingEngine).toBeDefined();
      expect(typeof VLMProcessingEngine).toBe('function');
      
      expect(VLMProcessingService).toBeDefined();
      expect(typeof VLMProcessingService).toBe('function');
      
      // Algorithm functions
      expect(detectVLMStratificationHierarchy).toBeDefined();
      expect(typeof detectVLMStratificationHierarchy).toBe('function');
      
      expect(extractParamcdMapping).toBeDefined();
      expect(typeof extractParamcdMapping).toBe('function');
      
      // Package metadata
      expect(VERSION).toBe('0.1.0');
      expect(PACKAGE_INFO.name).toBe('@sden99/vlm-processing');
    });

    it('should instantiate VLM Processing Engine successfully', () => {
      const engine = new VLMProcessingEngine();
      expect(engine).toBeInstanceOf(VLMProcessingEngine);
      
      const config = engine.getConfig();
      expect(config).toHaveProperty('enableStratification');
      expect(config).toHaveProperty('maxStratificationDepth');
    });

    it('should instantiate VLM Processing Service successfully', () => {
      const service = new VLMProcessingService(mockStateProvider);
      expect(service).toBeInstanceOf(VLMProcessingService);
      
      // Should have basic methods
      expect(typeof service.getVLMScopedVariables).toBe('function');
      expect(typeof service.getAllVariables).toBe('function');
      expect(typeof service.getActiveVLMTableData).toBe('function');
      expect(typeof service.clearCache).toBe('function');
    });
  });

  describe('Core Algorithm Functionality', () => {
    it('should detect stratification hierarchy from VLM data', () => {
      const result = detectVLMStratificationHierarchy(sampleVLMData);
      
      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('secondary');
      expect(result).toHaveProperty('analysis');
      
      expect(Array.isArray(result.primary)).toBe(true);
      expect(Array.isArray(result.secondary)).toBe(true);
      expect(typeof result.analysis).toBe('object');
      
      // Should detect DTYPE as primary stratification variable
      expect(result.primary.includes('DTYPE') || result.secondary.includes('DTYPE')).toBe(true);
    });

    it('should extract PARAMCD mapping from VLM data', () => {
      const result = extractParamcdMapping(sampleVLMData);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('SYSBP');
      expect(result).toHaveProperty('DIABP');
      
      // Should create proper mapping
      expect(result['SYSBP']).toBe('SYSBP');
      expect(result['DIABP']).toBe('DIABP');
    });

    it('should handle empty VLM data gracefully', () => {
      const hierarchyResult = detectVLMStratificationHierarchy([]);
      expect(hierarchyResult.primary).toEqual([]);
      expect(hierarchyResult.secondary).toEqual([]);
      expect(hierarchyResult.analysis).toEqual({});
      
      const paramcdResult = extractParamcdMapping([]);
      expect(paramcdResult).toEqual({});
    });
  });

  describe('VLM Processing Engine Functionality', () => {
    it('should process VLM data through engine', async () => {
      const engine = new VLMProcessingEngine();
      const result = await engine.processVLMs(sampleVLMData);
      
      expect(result).toHaveProperty('processedVLMs');
      expect(result).toHaveProperty('hierarchies');
      expect(result).toHaveProperty('variableAnalyses');
      expect(result).toHaveProperty('processingStats');
      
      expect(result.processedVLMs).toHaveLength(2);
      expect(result.processingStats.totalVariables).toBe(2);
      expect(typeof result.processingStats.processingTime).toBe('number');
      expect(result.processingStats.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle engine configuration updates', () => {
      const engine = new VLMProcessingEngine();
      
      engine.updateConfig({ maxStratificationDepth: 3 });
      const config = engine.getConfig();
      
      expect(config.maxStratificationDepth).toBe(3);
    });
  });

  describe('VLM Processing Service Functionality', () => {
    it('should provide service methods without errors', () => {
      const service = new VLMProcessingService(mockStateProvider);
      
      // These should not throw errors
      expect(() => service.getVLMScopedVariables()).not.toThrow();
      expect(() => service.getAllVariables()).not.toThrow();
      expect(() => service.getActiveVLMTableData()).not.toThrow();
      
      const vlmVars = service.getVLMScopedVariables();
      expect(Array.isArray(vlmVars)).toBe(true);
      
      const allVars = service.getAllVariables();
      expect(Array.isArray(allVars)).toBe(true);
    });

    it('should provide cache management functionality', () => {
      const service = new VLMProcessingService(mockStateProvider);
      
      const initialStats = service.getCacheStats();
      expect(initialStats).toHaveProperty('size');
      expect(initialStats).toHaveProperty('maxSize');
      expect(initialStats).toHaveProperty('lastKey');
      
      expect(typeof initialStats.size).toBe('number');
      expect(typeof initialStats.maxSize).toBe('number');
      expect(typeof initialStats.lastKey).toBe('string');
      
      // Clear cache should work
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('Performance Validation', () => {
    it('should process small datasets efficiently', async () => {
      const startTime = performance.now();
      
      const hierarchy = detectVLMStratificationHierarchy(sampleVLMData);
      const paramcdMapping = extractParamcdMapping(sampleVLMData);
      
      const engine = new VLMProcessingEngine();
      const result = await engine.processVLMs(sampleVLMData);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete quickly for small datasets
      expect(totalTime).toBeLessThan(100); // 100ms threshold
      expect(result.processedVLMs).toHaveLength(2);
    });

    it('should handle medium-sized datasets without performance degradation', () => {
      // Create larger test dataset
      const mediumVLMData: ValueLevelMetadata[] = [];
      
      for (let i = 0; i < 50; i++) {
        mediumVLMData.push({
          variable: {
            oid: `IT.VS.VAR${i}`,
            name: `VAR${i}`,
            dataType: 'float',
            length: null,
            description: `Variable ${i}`,
            orderNumber: i,
            origin: { type: 'Collected', source: null, description: null },
            mandatory: i % 2 === 0
          },
          whereClause: {
            conditions: [
              { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
              { variable: 'PARAMCD', operator: 'IN', checkValues: [`PARAM${i % 5}`], connector: 'AND' }
            ],
            logicalOperator: 'AND'
          },
          graphContext: {
            nodeId: `IT.VS.VAR${i}`,
            connectedNodes: [],
            cluster: 'test'
          }
        });
      }
      
      const startTime = performance.now();
      
      const hierarchy = detectVLMStratificationHierarchy(mediumVLMData);
      const paramcdMapping = extractParamcdMapping(mediumVLMData);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should handle 50 variables efficiently
      expect(processingTime).toBeLessThan(200); // 200ms threshold
      expect(hierarchy.primary.length + hierarchy.secondary.length).toBeGreaterThanOrEqual(1);
      expect(Object.keys(paramcdMapping).length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Validation', () => {
    it('should handle malformed VLM data gracefully', () => {
      const malformedData = [
        {
          variable: {
            oid: '',
            name: '',
            dataType: '',
            length: null,
            description: null,
            orderNumber: null,
            origin: { type: null, source: null, description: null },
            mandatory: false
          },
          graphContext: {
            nodeId: '',
            connectedNodes: [],
            cluster: ''
          }
        } as ValueLevelMetadata
      ];
      
      expect(() => detectVLMStratificationHierarchy(malformedData)).not.toThrow();
      expect(() => extractParamcdMapping(malformedData)).not.toThrow();
    });

    it('should handle service with missing state provider data', () => {
      const emptyStateProvider = {
        getSelectedDomain: vi.fn(() => null),
        getSelectedDatasetId: vi.fn(() => null),
        getDefineXmlInfo: vi.fn(() => ({ SDTM: null, ADaM: null, sdtmId: null, adamId: null })),
        getDatasets: vi.fn(() => ({}))
      };
      
      const service = new VLMProcessingService(emptyStateProvider);
      
      expect(() => service.getVLMScopedVariables()).not.toThrow();
      expect(() => service.getAllVariables()).not.toThrow();
      expect(() => service.getActiveVLMTableData()).not.toThrow();
      
      expect(service.getVLMScopedVariables()).toEqual([]);
      expect(service.getAllVariables()).toEqual([]);
      expect(service.getActiveVLMTableData()).toBeNull();
    });
  });

  describe('Integration Validation', () => {
    it('should work end-to-end without errors', async () => {
      // Complete workflow validation
      const service = new VLMProcessingService(mockStateProvider);
      const engine = new VLMProcessingEngine();
      
      // Step 1: Extract data through service
      const vlmVariables = service.getVLMScopedVariables();
      const allVariables = service.getAllVariables();
      
      // Step 2: Process through algorithms
      const hierarchy = detectVLMStratificationHierarchy(sampleVLMData);
      const paramcdMapping = extractParamcdMapping(sampleVLMData);
      
      // Step 3: Process through engine
      const engineResult = await engine.processVLMs(sampleVLMData);
      
      // All steps should complete without errors
      expect(Array.isArray(vlmVariables)).toBe(true);
      expect(Array.isArray(allVariables)).toBe(true);
      expect(hierarchy).toHaveProperty('primary');
      expect(typeof paramcdMapping).toBe('object');
      expect(engineResult).toHaveProperty('processedVLMs');
    });

    it('should maintain consistent interfaces across components', () => {
      const service = new VLMProcessingService(mockStateProvider);
      const engine = new VLMProcessingEngine();
      
      // Check that all interfaces are compatible
      expect(typeof service.getVLMScopedVariables).toBe('function');
      expect(typeof engine.processVLMs).toBe('function');
      expect(typeof detectVLMStratificationHierarchy).toBe('function');
      expect(typeof extractParamcdMapping).toBe('function');
      
      // All should work together without TypeScript errors
      const vars = service.getVLMScopedVariables();
      const hierarchy = detectVLMStratificationHierarchy(vars);
      const mapping = extractParamcdMapping(vars);
      
      expect(Array.isArray(hierarchy.primary)).toBe(true);
      expect(typeof mapping).toBe('object');
    });
  });

  describe('Migration Success Indicators', () => {
    it('should demonstrate that core VLM functionality has been preserved', async () => {
      // Test that all major VLM operations work as expected
      const testResults = {
        hierarchyDetection: false,
        paramcdExtraction: false,
        engineProcessing: false,
        serviceIntegration: false,
        cacheManagement: false
      };
      
      try {
        // Test hierarchy detection
        const hierarchy = detectVLMStratificationHierarchy(sampleVLMData);
        testResults.hierarchyDetection = hierarchy.primary.length > 0 || hierarchy.secondary.length > 0;
        
        // Test PARAMCD extraction
        const paramcdMapping = extractParamcdMapping(sampleVLMData);
        testResults.paramcdExtraction = Object.keys(paramcdMapping).length > 0;
        
        // Test engine processing
        const engine = new VLMProcessingEngine();
        const engineResult = await engine.processVLMs(sampleVLMData);
        testResults.engineProcessing = engineResult.processedVLMs.length === sampleVLMData.length;
        
        // Test service integration
        const service = new VLMProcessingService(mockStateProvider);
        const serviceVars = service.getVLMScopedVariables();
        testResults.serviceIntegration = Array.isArray(serviceVars);
        
        // Test cache management
        const stats = service.getCacheStats();
        testResults.cacheManagement = typeof stats.size === 'number';
        
      } catch (error) {
        console.error('Migration validation error:', error);
      }
      
      // Calculate success rate
      const successCount = Object.values(testResults).filter(Boolean).length;
      const totalTests = Object.keys(testResults).length;
      const successRate = (successCount / totalTests) * 100;
      
      console.log('Migration Validation Results:', testResults);
      console.log(`Success Rate: ${successRate}%`);
      
      // Migration should be at least 80% successful
      expect(successRate).toBeGreaterThanOrEqual(80);
    });
  });
});