/**
 * DataStateProvider - Interface for accessing dataset state
 * Breaks circular dependency between workerState and dataState
 *
 * This interface allows workerState to access dataState functionality
 * without directly importing it, enabling proper dependency injection
 * and testability.
 */

import type { Dataset } from '@sden99/dataset-domain';

/**
 * Interface for providing dataset state access
 */
export interface DataStateProvider {
  /**
   * Get the currently selected dataset ID
   */
  getSelectedDatasetId(): string | null;

  /**
   * Get the currently selected domain (for BDS datasets)
   */
  getSelectedDomain(): string | null;

  /**
   * Get all loaded datasets
   */
  getDatasets(): Record<string, Dataset>;
}

/**
 * Implementation that wraps dataState module functions
 * This adapter prevents circular imports between modules
 */
export class DataStateProviderImpl implements DataStateProvider {
  constructor(
    private getSelectedDatasetIdFn: () => string | null,
    private getSelectedDomainFn: () => string | null,
    private getDatasetsFn: () => Record<string, Dataset>
  ) {}

  getSelectedDatasetId(): string | null {
    return this.getSelectedDatasetIdFn();
  }

  getSelectedDomain(): string | null {
    return this.getSelectedDomainFn();
  }

  getDatasets(): Record<string, Dataset> {
    return this.getDatasetsFn();
  }
}
