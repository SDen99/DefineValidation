import { describe, it, expect, beforeEach } from 'vitest';
import { PlainDatasetRepository } from '../repository/DatasetRepository.js';
import type { DatasetRepository, Dataset } from '../index.js';

// Mock dataset for testing
const createMockDataset = (fileName: string, hasTabularData: boolean = true): Dataset => ({
  fileName,
  data: hasTabularData ? [{ id: 1, name: 'test' }] : null,
  details: {
    num_rows: hasTabularData ? 1 : 0,
    num_columns: hasTabularData ? 2 : 0,
    columns: hasTabularData ? ['id', 'name'] : [],
    dtypes: hasTabularData ? { id: 'int', name: 'string' } : {},
    summary: {}
  }
});

describe('DatasetRepository', () => {
  let repository: DatasetRepository;

  beforeEach(() => {
    repository = new PlainDatasetRepository();
  });

  describe('Basic CRUD Operations', () => {
    it('should save and find datasets', () => {
      const dataset = createMockDataset('test.sas7bdat');
      
      repository.save(dataset);
      
      expect(repository.findById('test.sas7bdat')).toEqual(dataset);
      expect(repository.exists('test.sas7bdat')).toBe(true);
    });

    it('should return null for non-existent dataset', () => {
      expect(repository.findById('nonexistent.sas7bdat')).toBeNull();
      expect(repository.exists('nonexistent.sas7bdat')).toBe(false);
    });

    it('should find all datasets', () => {
      const dataset1 = createMockDataset('test1.sas7bdat');
      const dataset2 = createMockDataset('test2.sas7bdat');
      
      repository.save(dataset1);
      repository.save(dataset2);
      
      const allDatasets = repository.findAll();
      expect(allDatasets).toHaveLength(2);
      expect(allDatasets).toContain(dataset1);
      expect(allDatasets).toContain(dataset2);
    });

    it('should remove datasets', () => {
      const dataset = createMockDataset('test.sas7bdat');
      
      repository.save(dataset);
      expect(repository.exists('test.sas7bdat')).toBe(true);
      
      repository.remove('test.sas7bdat');
      expect(repository.exists('test.sas7bdat')).toBe(false);
      expect(repository.findById('test.sas7bdat')).toBeNull();
    });

    it('should clear all datasets', () => {
      repository.save(createMockDataset('test1.sas7bdat'));
      repository.save(createMockDataset('test2.sas7bdat'));
      
      expect(repository.count()).toBe(2);
      
      repository.clear();
      
      expect(repository.count()).toBe(0);
      expect(repository.findAll()).toHaveLength(0);
    });
  });

  describe('Filename Normalization', () => {
    it('should handle original filename mapping', () => {
      const dataset = createMockDataset('TEST_Dataset.sas7bdat');
      repository.save(dataset);
      
      const normalizedId = 'test_dataset';
      repository.setOriginalFilename(normalizedId, 'TEST_Dataset.sas7bdat');
      
      expect(repository.getOriginalFilename(normalizedId)).toBe('TEST_Dataset.sas7bdat');
    });

    it('should remove normalized datasets by ID', () => {
      const dataset1 = createMockDataset('TEST_Dataset.sas7bdat');
      const dataset2 = createMockDataset('test_dataset.xml');
      
      repository.save(dataset1);
      repository.save(dataset2);
      
      // Both should normalize to similar IDs
      repository.remove('test_dataset');
      
      // Should remove datasets that normalize to the same ID
      expect(repository.count()).toBeLessThan(2);
    });
  });

  describe('Update Operations', () => {
    it('should update existing dataset on save', () => {
      const original = createMockDataset('test.sas7bdat');
      repository.save(original);
      
      const updated = {
        ...original,
        details: { ...original.details!, num_rows: 999 }
      };
      
      repository.save(updated);
      
      const retrieved = repository.findById('test.sas7bdat');
      expect(retrieved?.details?.num_rows).toBe(999);
    });
  });
});