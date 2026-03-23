/**
 * Performance Benchmark Test Suite for VLM Processing
 * Validates that migration didn't degrade performance characteristics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { GlobalStateProvider } from '../../types';

import {
  VLMProcessingEngine,
  VLMProcessingService,
  detectVLMStratificationHierarchy,
  extractParamcdMapping,
  generateEnhancedTransposedVLMTable
} from '../../index';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  STRATIFICATION_SMALL: 10, // ms for 10 variables
  STRATIFICATION_MEDIUM: 50, // ms for 100 variables
  STRATIFICATION_LARGE: 200, // ms for 1000 variables
  
  PARAMCD_MAPPING_SMALL: 5, // ms for 10 variables
  PARAMCD_MAPPING_MEDIUM: 25, // ms for 100 variables
  PARAMCD_MAPPING_LARGE: 100, // ms for 1000 variables
  
  TABLE_GENERATION_SMALL: 20, // ms for 10 variables
  TABLE_GENERATION_MEDIUM: 100, // ms for 100 variables
  TABLE_GENERATION_LARGE: 500, // ms for 1000 variables
  
  ENGINE_PROCESSING_SMALL: 50, // ms for 10 variables
  ENGINE_PROCESSING_MEDIUM: 200, // ms for 100 variables
  ENGINE_PROCESSING_LARGE: 1000, // ms for 1000 variables
  
  SERVICE_CACHING_THRESHOLD: 5, // ms for cached requests
  MEMORY_LEAK_ITERATIONS: 1000 // iterations to test for memory leaks
};

describe('VLM Performance Benchmarks', () => {
  let mockStateProvider: GlobalStateProvider;

  beforeEach(() => {
    mockStateProvider = {
      getSelectedDomain: vi.fn(() => 'VS'),
      getSelectedDatasetId: vi.fn(() => 'vs-dataset'),
      getDefineXmlInfo: vi.fn(() => ({
        SDTM: { ItemGroups: [{ SASDatasetName: 'VS', Name: 'VS' }] },
        ADaM: null,
        sdtmId: 'define-sdtm',
        adamId: null
      })),
      getDatasets: vi.fn(() => ({
        'define-sdtm': {
          enhancedDefineXML: {
            raw: { ItemGroups: [] },
            enhancedItemGroups: new Map(),
            lookups: {
              itemDefsByOID: new Map(),
              methodsByOID: new Map(),
              commentsByOID: new Map()
            }
          }
        }
      }))
    };
  });

  // Helper function to generate VLM test data
  function generateVLMData(count: number): ValueLevelMetadata[] {
    const stratificationVars = ['DTYPE', 'PARCAT1', 'PARCAT2', 'PARAMCD', 'AVISIT'];
    const paramcds = ['SYSBP', 'DIABP', 'HR', 'TEMP', 'RR', 'O2SAT'];
    const dtypes = ['AVERAGE', 'MAXIMUM', 'MINIMUM', 'MEDIAN'];

    return Array.from({ length: count }, (_, i) => ({
      variable: {
        oid: `IT.VS.VAR${i}`,
        name: `VAR${i}`,
        dataType: i % 2 === 0 ? 'float' : 'text',
        length: i % 2 === 0 ? null : 50,
        description: `Test Variable ${i}`,
        orderNumber: i,
        origin: { 
          type: i % 3 === 0 ? 'Collected' : 'Derived', 
          source: null, 
          description: null 
        },
        mandatory: i % 2 === 0
      },
      whereClause: {
        conditions: [
          {
            variable: stratificationVars[i % stratificationVars.length],
            operator: 'IN',
            checkValues: i % 4 === 0 ? 
              [paramcds[i % paramcds.length]] : 
              [dtypes[i % dtypes.length]],
            connector: 'AND'
          }
        ],
        logicalOperator: 'AND' as const
      },
      methodOID: i % 5 === 0 ? `MT.METHOD${i}` : undefined,
      graphContext: {
        nodeId: `IT.VS.VAR${i}`,
        connectedNodes: [],
        cluster: 'test'
      }
    }));
  }

  // Helper function to measure execution time
  function measureExecutionTime<T>(fn: () => T): [T, number] {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    return [result, endTime - startTime];
  }

  describe('Stratification Detection Performance', () => {
    it('should detect stratification efficiently with small datasets (10 variables)', () => {
      const vlmData = generateVLMData(10);
      
      const [result, executionTime] = measureExecutionTime(() => 
        detectVLMStratificationHierarchy(vlmData)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.STRATIFICATION_SMALL);
      expect(result.primary.length).toBeGreaterThan(0);
    });

    it('should detect stratification efficiently with medium datasets (100 variables)', () => {
      const vlmData = generateVLMData(100);
      
      const [result, executionTime] = measureExecutionTime(() => 
        detectVLMStratificationHierarchy(vlmData)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.STRATIFICATION_MEDIUM);
      expect(result.primary.length).toBeGreaterThan(0);
    });

    it('should detect stratification efficiently with large datasets (1000 variables)', () => {
      const vlmData = generateVLMData(1000);
      
      const [result, executionTime] = measureExecutionTime(() => 
        detectVLMStratificationHierarchy(vlmData)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.STRATIFICATION_LARGE);
      expect(result.primary.length).toBeGreaterThan(0);
      
      // Log actual performance for monitoring
      console.log(`Stratification detection (1000 vars): ${executionTime.toFixed(2)}ms`);
    });

    it('should scale linearly with dataset size', () => {
      const sizes = [10, 50, 100, 500];
      const times: number[] = [];

      sizes.forEach(size => {
        const vlmData = generateVLMData(size);
        const [, executionTime] = measureExecutionTime(() => 
          detectVLMStratificationHierarchy(vlmData)
        );
        times.push(executionTime);
      });

      // Check that performance scaling is reasonable (not exponential)
      for (let i = 1; i < times.length; i++) {
        const ratio = times[i] / times[i-1];
        const sizeRatio = sizes[i] / sizes[i-1];
        
        // Performance should scale better than quadratically
        expect(ratio).toBeLessThan(sizeRatio * sizeRatio);
      }
    });
  });

  describe('PARAMCD Mapping Performance', () => {
    it('should extract PARAMCD mapping efficiently with small datasets', () => {
      const vlmData = generateVLMData(10);
      
      const [result, executionTime] = measureExecutionTime(() => 
        extractParamcdMapping(vlmData)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PARAMCD_MAPPING_SMALL);
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(0);
    });

    it('should extract PARAMCD mapping efficiently with medium datasets', () => {
      const vlmData = generateVLMData(100);
      
      const [result, executionTime] = measureExecutionTime(() => 
        extractParamcdMapping(vlmData)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PARAMCD_MAPPING_MEDIUM);
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(0);
    });

    it('should extract PARAMCD mapping efficiently with large datasets', () => {
      const vlmData = generateVLMData(1000);
      
      const [result, executionTime] = measureExecutionTime(() => 
        extractParamcdMapping(vlmData)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PARAMCD_MAPPING_LARGE);
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(0);
      
      console.log(`PARAMCD mapping (1000 vars): ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Table Generation Performance', () => {
    it('should generate tables efficiently with small datasets', () => {
      const vlmData = generateVLMData(10);
      const hierarchy = detectVLMStratificationHierarchy(vlmData);
      const paramcdMapping = extractParamcdMapping(vlmData);
      
      const [result, executionTime] = measureExecutionTime(() => 
        generateEnhancedTransposedVLMTable(vlmData, paramcdMapping, hierarchy, mockStateProvider)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TABLE_GENERATION_SMALL);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should generate tables efficiently with medium datasets', () => {
      const vlmData = generateVLMData(100);
      const hierarchy = detectVLMStratificationHierarchy(vlmData);
      const paramcdMapping = extractParamcdMapping(vlmData);
      
      const [result, executionTime] = measureExecutionTime(() => 
        generateEnhancedTransposedVLMTable(vlmData, paramcdMapping, hierarchy, mockStateProvider)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TABLE_GENERATION_MEDIUM);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should generate tables efficiently with large datasets', () => {
      const vlmData = generateVLMData(1000);
      const hierarchy = detectVLMStratificationHierarchy(vlmData);
      const paramcdMapping = extractParamcdMapping(vlmData);
      
      const [result, executionTime] = measureExecutionTime(() => 
        generateEnhancedTransposedVLMTable(vlmData, paramcdMapping, hierarchy, mockStateProvider)
      );

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TABLE_GENERATION_LARGE);
      expect(result.rows.length).toBeGreaterThan(0);
      
      console.log(`Table generation (1000 vars): ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('VLM Processing Engine Performance', () => {
    it('should process VLMs efficiently with small datasets', async () => {
      const engine = new VLMProcessingEngine();
      const vlmData = generateVLMData(10);
      
      const [result, executionTime] = measureExecutionTime(() => 
        engine.processVLMs(vlmData)
      );

      const engineResult = await result;
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ENGINE_PROCESSING_SMALL);
      expect(engineResult.processedVLMs).toHaveLength(10);
    });

    it('should process VLMs efficiently with medium datasets', async () => {
      const engine = new VLMProcessingEngine();
      const vlmData = generateVLMData(100);
      
      const [result, executionTime] = measureExecutionTime(() => 
        engine.processVLMs(vlmData)
      );

      const engineResult = await result;
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ENGINE_PROCESSING_MEDIUM);
      expect(engineResult.processedVLMs).toHaveLength(100);
    });

    it('should process VLMs efficiently with large datasets', async () => {
      const engine = new VLMProcessingEngine();
      const vlmData = generateVLMData(1000);
      
      const startTime = performance.now();
      const result = await engine.processVLMs(vlmData);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.ENGINE_PROCESSING_LARGE);
      expect(result.processedVLMs).toHaveLength(1000);
      
      console.log(`Engine processing (1000 vars): ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('VLM Processing Service Performance', () => {
    it('should demonstrate efficient caching behavior', () => {
      const service = new VLMProcessingService(mockStateProvider);
      
      // First call - cache miss
      const [result1, time1] = measureExecutionTime(() => 
        service.getActiveVLMTableData()
      );
      
      // Second call - cache hit
      const [result2, time2] = measureExecutionTime(() => 
        service.getActiveVLMTableData()
      );
      
      // Cached call should be much faster
      expect(time2).toBeLessThan(PERFORMANCE_THRESHOLDS.SERVICE_CACHING_THRESHOLD);
      
      // Results should be identical (same object reference)
      expect(result1).toBe(result2);
    });

    it('should handle cache invalidation efficiently', () => {
      const service = new VLMProcessingService(mockStateProvider);
      
      // Warm up cache
      service.getActiveVLMTableData();
      
      // Change dataset ID to invalidate cache
      mockStateProvider.getSelectedDatasetId = vi.fn(() => 'new-dataset');
      
      const [result, executionTime] = measureExecutionTime(() => 
        service.getActiveVLMTableData()
      );
      
      // Should handle cache miss efficiently
      expect(executionTime).toBeLessThan(100); // Reasonable threshold
    });

    it('should maintain bounded cache size', () => {
      const service = new VLMProcessingService(mockStateProvider);
      
      // Generate multiple cache entries
      for (let i = 0; i < 10; i++) {
        mockStateProvider.getSelectedDatasetId = vi.fn(() => `dataset-${i}`);
        service.getActiveVLMTableData();
      }
      
      const stats = service.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(3); // Max cache size
    });
  });

  describe('Memory Management Performance', () => {
    it('should not leak memory with repeated operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations that could leak memory
      for (let i = 0; i < PERFORMANCE_THRESHOLDS.MEMORY_LEAK_ITERATIONS; i++) {
        const vlmData = generateVLMData(10);
        detectVLMStratificationHierarchy(vlmData);
        extractParamcdMapping(vlmData);
        
        // Force garbage collection periodically
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }
      
      // Force final garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      // Memory increase should be reasonable (< 50MB for 1000 iterations)
      expect(memoryIncreaseMB).toBeLessThan(50);
      
      console.log(`Memory increase after ${PERFORMANCE_THRESHOLDS.MEMORY_LEAK_ITERATIONS} iterations: ${memoryIncreaseMB.toFixed(2)}MB`);
    });

    it('should clean up resources properly', () => {
      const service = new VLMProcessingService(mockStateProvider);
      
      // Create many cache entries
      for (let i = 0; i < 100; i++) {
        mockStateProvider.getSelectedDatasetId = vi.fn(() => `dataset-${i}`);
        service.getActiveVLMTableData();
      }
      
      const statsBeforeClear = service.getCacheStats();
      expect(statsBeforeClear.size).toBeGreaterThan(0);
      
      // Clear cache
      service.clearCache();
      
      const statsAfterClear = service.getCacheStats();
      expect(statsAfterClear.size).toBe(0);
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle multiple simultaneous requests efficiently', async () => {
      const service = new VLMProcessingService(mockStateProvider);
      const promises: Promise<any>[] = [];
      
      const startTime = performance.now();
      
      // Create multiple concurrent requests
      for (let i = 0; i < 10; i++) {
        mockStateProvider.getSelectedDatasetId = vi.fn(() => `concurrent-${i}`);
        promises.push(Promise.resolve(service.getActiveVLMTableData()));
      }
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(500); // 500ms for 10 concurrent requests
      
      console.log(`Concurrent processing (10 requests): ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle typical clinical dataset sizes efficiently', () => {
      // Simulate a typical VS (Vital Signs) dataset
      const typicalVSSize = 150; // Typical number of VLM entries for VS
      const vlmData = generateVLMData(typicalVSSize);
      
      const totalStartTime = performance.now();
      
      // Full processing pipeline
      const hierarchy = detectVLMStratificationHierarchy(vlmData);
      const paramcdMapping = extractParamcdMapping(vlmData);
      const tableData = generateEnhancedTransposedVLMTable(vlmData, paramcdMapping, hierarchy, mockStateProvider);
      
      const totalEndTime = performance.now();
      const totalTime = totalEndTime - totalStartTime;
      
      // Full pipeline should complete within reasonable time for typical dataset
      expect(totalTime).toBeLessThan(300); // 300ms for complete processing
      
      // Verify results are reasonable
      expect(hierarchy.primary.length + hierarchy.secondary.length).toBeGreaterThan(0);
      expect(Object.keys(paramcdMapping).length).toBeGreaterThanOrEqual(0);
      expect(tableData.rows.length).toBeGreaterThan(0);
      
      console.log(`Complete VS processing (${typicalVSSize} vars): ${totalTime.toFixed(2)}ms`);
    });

    it('should handle complex laboratory dataset efficiently', () => {
      // Simulate complex LB (Laboratory) dataset with multiple stratifications
      const complexLBData = generateVLMData(500).map((vlm, i) => ({
        ...vlm,
        whereClause: {
          conditions: [
            { variable: 'DTYPE', operator: 'IN', checkValues: ['AVERAGE'], connector: 'AND' },
            { variable: 'PARCAT1', operator: 'IN', checkValues: ['CHEMISTRY'], connector: 'AND' },
            { variable: 'PARCAT2', operator: 'IN', checkValues: ['LIVER'], connector: 'AND' },
            { variable: 'PARAMCD', operator: 'IN', checkValues: [`LAB${i % 20}`], connector: 'AND' },
            { variable: 'AVISIT', operator: 'IN', checkValues: [`WEEK ${(i % 4) + 1}`], connector: 'AND' }
          ],
          logicalOperator: 'AND' as const
        }
      }));
      
      const totalStartTime = performance.now();
      
      const hierarchy = detectVLMStratificationHierarchy(complexLBData);
      const paramcdMapping = extractParamcdMapping(complexLBData);
      const tableData = generateEnhancedTransposedVLMTable(complexLBData, paramcdMapping, hierarchy, mockStateProvider);
      
      const totalEndTime = performance.now();
      const totalTime = totalEndTime - totalStartTime;
      
      // Complex processing should still be efficient
      expect(totalTime).toBeLessThan(800); // 800ms for complex dataset
      
      // Verify complex hierarchy was detected
      expect(hierarchy.primary.length).toBeGreaterThan(0);
      expect(hierarchy.secondary.length).toBeGreaterThan(0);
      
      console.log(`Complex LB processing (500 vars, 5 stratifications): ${totalTime.toFixed(2)}ms`);
    });
  });
});