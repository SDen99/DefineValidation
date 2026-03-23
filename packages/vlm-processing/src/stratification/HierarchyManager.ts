/**
 * Manages stratification hierarchies
 */

import type { StratificationHierarchy } from '../types';
import type { HierarchyConfig } from './types';

/**
 * Manages and maintains stratification hierarchies
 */
export class HierarchyManager {
  private hierarchies: Map<string, StratificationHierarchy>;
  private config: HierarchyConfig;

  constructor(config: HierarchyConfig = { 
    allowMultipleRoots: false, 
    enforceUniqueness: true, 
    enableCaching: true 
  }) {
    this.hierarchies = new Map();
    this.config = config;
  }

  /**
   * Add hierarchy to manager
   */
  add(hierarchy: StratificationHierarchy): void {
    this.hierarchies.set(hierarchy.id, hierarchy);
  }

  /**
   * Get hierarchy by ID
   */
  get(id: string): StratificationHierarchy | undefined {
    return this.hierarchies.get(id);
  }

  /**
   * Get all managed hierarchies
   */
  getAll(): StratificationHierarchy[] {
    return Array.from(this.hierarchies.values());
  }
}