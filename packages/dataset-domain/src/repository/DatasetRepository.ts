import type { Dataset } from '../types/index.js';

/**
 * Repository interface for dataset operations
 * Provides abstraction over data storage and retrieval
 */
export interface DatasetRepository {
  findById(id: string): Dataset | null;
  findAll(): Dataset[];
  save(dataset: Dataset): void;
  remove(id: string): void;
  clear(): void;
  exists(id: string): boolean;
  count(): number;
  getOriginalFilename(normalizedId: string): string | undefined;
  setOriginalFilename(normalizedId: string, originalName: string): void;
}

/**
 * Plain JavaScript implementation of DatasetRepository for testing
 * Does not use any UI framework dependencies
 */
export class PlainDatasetRepository implements DatasetRepository {
  private datasets: Record<string, Dataset> = {};
  private originalFilenames: Record<string, string> = {};

  findById(id: string): Dataset | null {
    return this.datasets[id] || null;
  }

  findAll(): Dataset[] {
    return Object.values(this.datasets);
  }

  getAllAsRecord(): Record<string, Dataset> {
    return { ...this.datasets };
  }

  save(dataset: Dataset): void {
    this.datasets[dataset.fileName] = dataset;
    
    // Track normalized filename mapping
    const normalized = this.normalizeId(dataset.fileName);
    if (normalized !== dataset.fileName) {
      this.originalFilenames[normalized] = dataset.fileName;
    }
  }

  remove(id: string): void {
    const normalized = this.normalizeId(id);
    const matchingIds = Object.keys(this.datasets).filter(
      key => this.normalizeId(key) === normalized
    );
    
    matchingIds.forEach(datasetId => {
      delete this.datasets[datasetId];
    });
    
    delete this.originalFilenames[normalized];
  }

  clear(): void {
    this.datasets = {};
    this.originalFilenames = {};
  }

  exists(id: string): boolean {
    return this.datasets[id] !== undefined;
  }

  count(): number {
    return Object.keys(this.datasets).length;
  }

  getOriginalFilename(normalizedId: string): string | undefined {
    return this.originalFilenames[normalizedId];
  }

  setOriginalFilename(normalizedId: string, originalName: string): void {
    this.originalFilenames[normalizedId] = originalName;
  }

  private normalizeId(id: string): string {
    return id.replace(/\.(sas7bdat|xpt|xml|json)$/i, '').toLowerCase();
  }

  // Helper methods for external access
  getDatasets() {
    return this.datasets;
  }

  getOriginalFilenames() {
    return this.originalFilenames;
  }
}