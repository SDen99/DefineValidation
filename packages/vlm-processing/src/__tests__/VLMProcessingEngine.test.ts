/**
 * Test suite for VLMProcessingEngine
 */

import { describe, it, expect } from 'vitest';
import { VLMProcessingEngine } from '../VLMProcessingEngine';

describe('VLMProcessingEngine', () => {
  it('should create an instance with default config', () => {
    const engine = new VLMProcessingEngine();
    expect(engine).toBeInstanceOf(VLMProcessingEngine);
    
    const config = engine.getConfig();
    expect(config.enableStratification).toBe(true);
    expect(config.maxStratificationDepth).toBe(5);
    expect(config.includeEmptyConditions).toBe(false);
    expect(config.preserveOriginalOrder).toBe(true);
  });

  it('should accept custom configuration', () => {
    const customConfig = {
      enableStratification: false,
      maxStratificationDepth: 3
    };
    
    const engine = new VLMProcessingEngine(customConfig);
    const config = engine.getConfig();
    
    expect(config.enableStratification).toBe(false);
    expect(config.maxStratificationDepth).toBe(3);
    expect(config.includeEmptyConditions).toBe(false); // default value preserved
  });

  it('should process empty VLM array', async () => {
    const engine = new VLMProcessingEngine();
    const result = await engine.processVLMs([]);
    
    expect(result.processedVLMs).toEqual([]);
    expect(result.hierarchies).toEqual([]);
    expect(result.variableAnalyses).toEqual([]);
    expect(result.processingStats.totalVariables).toBe(0);
    expect(result.processingStats.vlmVariables).toBe(0);
    expect(result.processingStats.stratifiedVariables).toBe(0);
    expect(typeof result.processingStats.processingTime).toBe('number');
  });

  it('should update configuration', () => {
    const engine = new VLMProcessingEngine();
    
    engine.updateConfig({ maxStratificationDepth: 10 });
    const config = engine.getConfig();
    
    expect(config.maxStratificationDepth).toBe(10);
    expect(config.enableStratification).toBe(true); // other values preserved
  });
});