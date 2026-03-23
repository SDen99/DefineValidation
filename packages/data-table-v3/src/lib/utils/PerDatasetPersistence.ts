/**
 * PerDatasetPersistence - Dataset-scoped state persistence
 *
 * Extends the base ColumnStateManager to support per-dataset persistence.
 * Each dataset maintains its own column state, filter state, and sort configuration.
 */

import type { ColumnConfig } from '../types/columns';
import type { Filter } from '../types/filters';
import type { SortDirection } from '../types/sorting';

/**
 * Persisted state for a dataset
 */
export interface DatasetViewState {
  // Column state
  visibleColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;

  // Filter state
  activeFilters: Map<string, Filter>;
  globalSearch?: string;

  // Sort state
  sortColumn?: string;
  sortDirection?: SortDirection;

  // Metadata
  lastUpdated: number;
}

/**
 * Persistence scope options
 */
export type PersistenceScope = 'dataset' | 'global';

/**
 * PerDatasetPersistence - Manages per-dataset state persistence
 *
 * Usage:
 * const persistence = new PerDatasetPersistence('clinical-table');
 * persistence.saveDatasetState(datasetId, state);
 * const state = persistence.loadDatasetState(datasetId);
 */
export class PerDatasetPersistence {
  private baseKey: string;
  private memoryCache = new Map<string, DatasetViewState>();

  constructor(baseKey: string = 'data-table-v3') {
    this.baseKey = baseKey;
  }

  /**
   * Generate storage key for a dataset
   */
  private getStorageKey(datasetId: string, scope: PersistenceScope = 'dataset'): string {
    if (scope === 'global') {
      return `${this.baseKey}-global`;
    }
    return `${this.baseKey}-${datasetId}`;
  }

  /**
   * Save dataset state to localStorage
   */
  saveDatasetState(
    datasetId: string,
    state: Partial<DatasetViewState>,
    scope: PersistenceScope = 'dataset'
  ): void {
    const key = this.getStorageKey(datasetId, scope);

    // Load existing state
    const existing = this.loadDatasetState(datasetId, scope) || this.getDefaultState();

    // Merge with new state
    const merged: DatasetViewState = {
      ...existing,
      ...state,
      // Convert Map to array for JSON serialization
      activeFilters: state.activeFilters || existing.activeFilters,
      lastUpdated: Date.now()
    };

    try {
      // Convert Map to plain object for storage
      const serializable = {
        ...merged,
        activeFilters: Array.from(merged.activeFilters.entries())
      };

      localStorage.setItem(key, JSON.stringify(serializable));

      // Update memory cache
      this.memoryCache.set(key, merged);

      console.log(`[PerDatasetPersistence] Saved state for ${datasetId}:`, {
        scope,
        key,
        visibleColumns: merged.visibleColumns.length,
        filters: merged.activeFilters.size
      });
    } catch (error) {
      console.error(`[PerDatasetPersistence] Failed to save state for ${datasetId}:`, error);
    }
  }

  /**
   * Load dataset state from localStorage
   */
  loadDatasetState(
    datasetId: string,
    scope: PersistenceScope = 'dataset'
  ): DatasetViewState | null {
    const key = this.getStorageKey(datasetId, scope);

    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }

    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);

      // Convert activeFilters array back to Map
      const state: DatasetViewState = {
        ...parsed,
        activeFilters: new Map(parsed.activeFilters || [])
      };

      // Update memory cache
      this.memoryCache.set(key, state);

      console.log(`[PerDatasetPersistence] Loaded state for ${datasetId}:`, {
        scope,
        visibleColumns: state.visibleColumns?.length || 0,
        filters: state.activeFilters.size
      });

      return state;
    } catch (error) {
      console.error(`[PerDatasetPersistence] Failed to load state for ${datasetId}:`, error);
      return null;
    }
  }

  /**
   * Clear dataset state
   */
  clearDatasetState(datasetId: string, scope: PersistenceScope = 'dataset'): void {
    const key = this.getStorageKey(datasetId, scope);

    try {
      localStorage.removeItem(key);
      this.memoryCache.delete(key);
      console.log(`[PerDatasetPersistence] Cleared state for ${datasetId}`);
    } catch (error) {
      console.error(`[PerDatasetPersistence] Failed to clear state for ${datasetId}:`, error);
    }
  }

  /**
   * Clear all persisted state
   */
  clearAllState(): void {
    try {
      // Find all keys with our prefix
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.baseKey)) {
          keysToRemove.push(key);
        }
      }

      // Remove all matching keys
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear memory cache
      this.memoryCache.clear();

      console.log(`[PerDatasetPersistence] Cleared all state (${keysToRemove.length} keys)`);
    } catch (error) {
      console.error(`[PerDatasetPersistence] Failed to clear all state:`, error);
    }
  }

  /**
   * Get default empty state
   */
  private getDefaultState(): DatasetViewState {
    return {
      visibleColumns: [],
      columnOrder: [],
      columnWidths: {},
      activeFilters: new Map(),
      lastUpdated: Date.now()
    };
  }

  /**
   * Save column configuration
   */
  saveColumns(
    datasetId: string,
    columns: ColumnConfig[],
    scope: PersistenceScope = 'dataset'
  ): void {
    const visibleColumns = columns.filter(c => c.visible !== false).map(c => c.id);
    const columnOrder = columns.map(c => c.id);
    const columnWidths: Record<string, number> = {};

    columns.forEach(col => {
      if (col.width) {
        columnWidths[col.id] = col.width;
      }
    });

    this.saveDatasetState(datasetId, {
      visibleColumns,
      columnOrder,
      columnWidths
    }, scope);
  }

  /**
   * Save filter state
   */
  saveFilters(
    datasetId: string,
    filters: Map<string, Filter>,
    globalSearch?: string,
    scope: PersistenceScope = 'dataset'
  ): void {
    this.saveDatasetState(datasetId, {
      activeFilters: filters,
      globalSearch
    }, scope);
  }

  /**
   * Save sort state
   */
  saveSort(
    datasetId: string,
    sortColumn?: string,
    sortDirection?: SortDirection,
    scope: PersistenceScope = 'dataset'
  ): void {
    this.saveDatasetState(datasetId, {
      sortColumn,
      sortDirection
    }, scope);
  }

  /**
   * Get list of all persisted dataset IDs
   */
  getPersistedDatasets(): string[] {
    const datasetIds: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.baseKey) && !key.endsWith('-global')) {
          // Extract dataset ID from key
          const datasetId = key.substring(this.baseKey.length + 1);
          datasetIds.push(datasetId);
        }
      }
    } catch (error) {
      console.error(`[PerDatasetPersistence] Failed to get persisted datasets:`, error);
    }

    return datasetIds;
  }

  /**
   * Get storage statistics
   */
  getStats(): { datasets: number; cacheSize: number; totalSize: number } {
    const datasets = this.getPersistedDatasets().length;
    const cacheSize = this.memoryCache.size;

    let totalSize = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.baseKey)) {
          const value = localStorage.getItem(key);
          totalSize += (value?.length || 0) + key.length;
        }
      }
    } catch (error) {
      console.error(`[PerDatasetPersistence] Failed to calculate stats:`, error);
    }

    return { datasets, cacheSize, totalSize };
  }

  /**
   * Debounced save function factory
   * Returns a function that saves state with debouncing to prevent excessive writes
   */
  createDebouncedSave(
    datasetId: string,
    delay: number = 500,
    scope: PersistenceScope = 'dataset'
  ): (state: Partial<DatasetViewState>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (state: Partial<DatasetViewState>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        this.saveDatasetState(datasetId, state, scope);
        timeoutId = null;
      }, delay);
    };
  }
}
