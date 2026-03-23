/**
 * DataManager - Core data operations engine
 *
 * NO SVELTE DEPENDENCIES - Pure TypeScript
 *
 * CRITICAL: This class maintains plain JavaScript data that never
 * gets wrapped in Svelte proxies. This is the key to avoiding the
 * proxy contamination issues from the old implementation.
 *
 * Pattern from POC validation: All 5 proxy isolation tests passed!
 */

import { EventEmitter } from './EventEmitter.js';
import type { DataRow, DataManagerEvents, FilterPredicate, SortConfig } from '../types/core.js';

export class DataManager<T extends DataRow = DataRow> {
  private data: T[] = []; // NEVER wrap this in $state!
  private eventBus: EventEmitter<DataManagerEvents<T>>;

  constructor() {
    this.eventBus = new EventEmitter();
  }

  /**
   * Set the data (replaces all existing data)
   * @param newData Array of data rows
   */
  setData(newData: T[]): void {
    // Store as plain array - no proxy wrapping
    this.data = newData;
    this.emit('data-changed', this.data);
  }

  /**
   * Get the data (returns plain array)
   * @returns Current data array
   */
  getData(): T[] {
    return this.data;
  }

  /**
   * Get total count of rows
   * @returns Number of rows
   */
  getCount(): number {
    return this.data.length;
  }

  /**
   * Filter data using a predicate function
   * @param predicate Filter function
   * @returns Filtered data array (plain, not proxied)
   */
  filter(predicate: FilterPredicate<T>): T[] {
    return this.data.filter(predicate);
  }

  /**
   * Sort data using a comparison function
   * @param compareFn Comparison function
   * @returns Sorted data array (plain, not proxied)
   */
  sort(compareFn: (a: T, b: T) => number): T[] {
    const sorted = [...this.data].sort(compareFn);
    this.data = sorted;
    this.emit('data-changed', this.data);
    return sorted;
  }

  /**
   * Get a slice of data (for virtualization)
   * @param start Start index
   * @param end End index (exclusive)
   * @returns Slice of data array
   */
  slice(start: number, end: number): T[] {
    return this.data.slice(start, end);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data = [];
    this.emit('data-changed', this.data);
  }

  /**
   * Subscribe to events
   * @param event Event name
   * @param handler Event handler
   * @returns Unsubscribe function
   */
  on<K extends keyof DataManagerEvents<T>>(
    event: K,
    handler: (payload: DataManagerEvents<T>[K]) => void
  ): () => void {
    return this.eventBus.on(event, handler);
  }

  /**
   * Emit an event
   * @param event Event name
   * @param payload Event payload
   */
  private emit<K extends keyof DataManagerEvents<T>>(
    event: K,
    payload: DataManagerEvents<T>[K]
  ): void {
    this.eventBus.emit(event, payload);
  }

  /**
   * DIAGNOSTIC: Check for proxy contamination
   * This is from our POC - use for debugging if needed
   *
   * @returns Proxy check result
   */
  checkProxyContamination(): { isProxy: boolean; evidence: string[] } {
    const evidence: string[] = [];

    // Check 1: Array.isArray
    if (!Array.isArray(this.data)) {
      evidence.push('❌ Array.isArray returned false');
    }

    // Check 2: Constructor
    if (this.data.constructor !== Array) {
      evidence.push(`❌ Constructor is ${this.data.constructor.name}, not Array`);
    }

    // Check 3: Prototype
    if (Object.getPrototypeOf(this.data) !== Array.prototype) {
      evidence.push('❌ Prototype is not Array.prototype');
    }

    // Check 4: Set uniqueness (the bug from clinical-virtual-table:475)
    if (this.data.length > 0) {
      try {
        const firstRow = this.data[0];
        const set = new Set([firstRow, firstRow]);
        if (set.size !== 1) {
          evidence.push('❌ Set uniqueness check FAILED - Proxy equality issue');
        }
      } catch (e) {
        evidence.push(`❌ Set test threw error: ${e}`);
      }
    }

    // Check 5: JSON serialization (IndexedDB requirement)
    try {
      JSON.stringify(this.data);
    } catch (e) {
      evidence.push(`❌ JSON serialization failed: ${e}`);
    }

    return {
      isProxy: evidence.length > 0,
      evidence
    };
  }
}
