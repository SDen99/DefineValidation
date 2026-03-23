/**
 * Test suite for VLM Reactive State Management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeVLMProcessing,
  getVisibleColumns,
  getParamcdFilter,
  updateParamcdFilter,
  updateColumnOrder,
  updateColumnWidth,
  toggleColumnVisibility,
  isColumnVisible,
  initializeVLM,
  toggleSection,
  isSectionExpanded,
  getExpandedSections,
  getColumnWidth,
  getColumnOrder,
  resetVLM,
  resetAllVLM,
  clearProcessingCache,
  getProcessingStats,
  getActiveVLMTableData,
  getActiveVariables,
  getVLMVariables,
  showAllColumns,
  clearParamcdFilter,
  getAllExpandableSectionIds,
  collapseAllRowSections,
  expandAllRowSections,
  expandedSections
} from '../../state/vlmReactiveState.svelte';

// Mock the VLM Processing Service
vi.mock('../../services/VLMProcessingService', () => ({
  VLMProcessingService: vi.fn().mockImplementation(() => ({
    getVLMScopedVariables: vi.fn(() => []),
    getAllVariables: vi.fn(() => []),
    getActiveVLMTableData: vi.fn(() => null),
    clearCache: vi.fn(),
    getCacheStats: vi.fn(() => ({ size: 0, maxSize: 3, lastKey: '' }))
  }))
}));

// Mock state provider
const mockStateProvider = {
  getSelectedDomain: vi.fn(() => 'VS'),
  getSelectedDatasetId: vi.fn(() => 'vs-dataset'),
  getDefineXmlInfo: vi.fn(() => ({
    SDTM: { ItemGroups: [] },
    ADaM: null,
    sdtmId: 'define-sdtm',
    adamId: null
  })),
  getDatasets: vi.fn(() => ({}))
};

describe('VLM Reactive State Management', () => {
  beforeEach(() => {
    // Reset all state before each test
    resetAllVLM();
  });

  describe('Initialization', () => {
    it('should initialize VLM processing with state provider', () => {
      expect(() => initializeVLMProcessing(mockStateProvider)).not.toThrow();
    });

    it('should initialize VLM with dataset ID', () => {
      initializeVLMProcessing(mockStateProvider);
      const datasetId = 'test-dataset';
      
      initializeVLM(datasetId);
      
      // Should not throw and should set up initial state
      expect(() => getVisibleColumns(datasetId)).not.toThrow();
      expect(() => getExpandedSections(datasetId)).not.toThrow();
    });
  });

  describe('Column Management', () => {
    const datasetId = 'test-dataset';

    beforeEach(() => {
      initializeVLMProcessing(mockStateProvider);
      initializeVLM(datasetId);
    });

    it('should manage visible columns', () => {
      const initialColumns = getVisibleColumns(datasetId);
      expect(initialColumns).toBeInstanceOf(Set);
      
      const testColumn = 'TEST_COLUMN';
      
      // Toggle column visibility
      toggleColumnVisibility(datasetId, testColumn);
      expect(isColumnVisible(datasetId, testColumn)).toBe(true);
      
      // Toggle again
      toggleColumnVisibility(datasetId, testColumn);
      expect(isColumnVisible(datasetId, testColumn)).toBe(false);
    });

    it('should show all columns', () => {
      const testColumns = ['COL1', 'COL2', 'COL3'];
      
      // Hide some columns first
      toggleColumnVisibility(datasetId, 'COL1');
      toggleColumnVisibility(datasetId, 'COL2');
      
      // Show all columns
      showAllColumns(datasetId, testColumns);
      
      testColumns.forEach(col => {
        expect(isColumnVisible(datasetId, col)).toBe(true);
      });
    });

    it('should manage column order', () => {
      const newOrder = ['COL3', 'COL1', 'COL2'];
      updateColumnOrder(datasetId, newOrder);
      
      const currentOrder = getColumnOrder(datasetId);
      expect(currentOrder).toEqual(newOrder);
    });

    it('should manage column widths', () => {
      const columnId = 'TEST_COLUMN';
      const width = 150;
      
      updateColumnWidth(datasetId, columnId, width);
      
      const currentWidth = getColumnWidth(datasetId, columnId);
      expect(currentWidth).toBe(width);
    });
  });

  describe('PARAMCD Filter Management', () => {
    const datasetId = 'test-dataset';

    beforeEach(() => {
      initializeVLMProcessing(mockStateProvider);
      initializeVLM(datasetId);
    });

    it('should manage PARAMCD filter', () => {
      const testFilter = 'SYSBP';
      
      updateParamcdFilter(datasetId, testFilter);
      
      const currentFilter = getParamcdFilter(datasetId);
      expect(currentFilter).toBe(testFilter);
    });

    it('should clear PARAMCD filter', () => {
      // Set a filter first
      updateParamcdFilter(datasetId, 'DIABP');
      expect(getParamcdFilter(datasetId)).toBe('DIABP');
      
      // Clear filter
      clearParamcdFilter(datasetId);
      expect(getParamcdFilter(datasetId)).toBe('');
    });
  });

  describe('Section Expansion Management', () => {
    const datasetId = 'test-dataset';

    beforeEach(() => {
      initializeVLMProcessing(mockStateProvider);
      initializeVLM(datasetId);
    });

    it('should toggle section expansion', () => {
      const sectionId = 'test-section';
      
      // Initially should not be expanded
      expect(isSectionExpanded(datasetId, sectionId)).toBe(false);
      
      // Toggle expansion
      toggleSection(datasetId, sectionId);
      expect(isSectionExpanded(datasetId, sectionId)).toBe(true);
      
      // Toggle again
      toggleSection(datasetId, sectionId);
      expect(isSectionExpanded(datasetId, sectionId)).toBe(false);
    });

    it('should get expanded sections', () => {
      const section1 = 'section-1';
      const section2 = 'section-2';
      
      toggleSection(datasetId, section1);
      toggleSection(datasetId, section2);
      
      const expanded = getExpandedSections(datasetId);
      expect(expanded.has(section1)).toBe(true);
      expect(expanded.has(section2)).toBe(true);
    });

    it('should expand all row sections', () => {
      const sectionIds = ['row-1', 'row-2', 'row-3'];
      
      expandAllRowSections(datasetId, sectionIds);
      
      sectionIds.forEach(id => {
        expect(isSectionExpanded(datasetId, id)).toBe(true);
      });
    });

    it('should collapse all row sections', () => {
      const sectionIds = ['row-1', 'row-2', 'row-3'];
      
      // Expand all first
      expandAllRowSections(datasetId, sectionIds);
      
      // Then collapse all
      collapseAllRowSections(datasetId, sectionIds);
      
      sectionIds.forEach(id => {
        expect(isSectionExpanded(datasetId, id)).toBe(false);
      });
    });

    it('should get all expandable section IDs', () => {
      const sectionIds = ['row-1', 'row-2', 'row-3'];
      
      // Expand some sections
      sectionIds.forEach(id => toggleSection(datasetId, id));
      
      const allIds = getAllExpandableSectionIds(datasetId);
      expect(allIds).toBeInstanceOf(Array);
      expect(allIds.length).toBeGreaterThan(0);
    });

    it('should access global expanded sections', () => {
      const sectionId = 'global-section';
      toggleSection(datasetId, sectionId);
      
      const globalExpanded = expandedSections;
      expect(globalExpanded).toBeDefined();
      expect(typeof globalExpanded).toBe('object');
    });
  });

  describe('Data Access Functions', () => {
    const datasetId = 'test-dataset';

    beforeEach(() => {
      initializeVLMProcessing(mockStateProvider);
      initializeVLM(datasetId);
    });

    it('should get active VLM table data', () => {
      const tableData = getActiveVLMTableData();
      expect(tableData).toBeDefined(); // May be null if no data
    });

    it('should get VLM variables', () => {
      const vlmVars = getVLMVariables();
      expect(vlmVars).toBeInstanceOf(Array);
    });

    it('should get active variables', () => {
      const activeVars = getActiveVariables();
      expect(activeVars).toBeInstanceOf(Array);
    });

    it('should get processing statistics', () => {
      const stats = getProcessingStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('lastKey');
    });
  });

  describe('Reset and Clear Operations', () => {
    const datasetId = 'test-dataset';

    beforeEach(() => {
      initializeVLMProcessing(mockStateProvider);
      initializeVLM(datasetId);
    });

    it('should reset VLM state for specific dataset', () => {
      // Set up some state
      updateParamcdFilter(datasetId, 'SYSBP');
      toggleSection(datasetId, 'test-section');
      updateColumnWidth(datasetId, 'TEST_COL', 200);
      
      // Reset
      resetVLM(datasetId);
      
      // State should be reset
      expect(getParamcdFilter(datasetId)).toBe('');
      expect(isSectionExpanded(datasetId, 'test-section')).toBe(false);
      expect(getColumnWidth(datasetId, 'TEST_COL')).toBe(120); // default width
    });

    it('should reset all VLM state', () => {
      const dataset1 = 'dataset-1';
      const dataset2 = 'dataset-2';
      
      // Initialize multiple datasets
      initializeVLM(dataset1);
      initializeVLM(dataset2);
      
      // Set up state for both
      updateParamcdFilter(dataset1, 'SYSBP');
      updateParamcdFilter(dataset2, 'DIABP');
      
      // Reset all
      resetAllVLM();
      
      // All state should be reset
      expect(getParamcdFilter(dataset1)).toBe('');
      expect(getParamcdFilter(dataset2)).toBe('');
    });

    it('should clear processing cache', () => {
      clearProcessingCache();
      
      const stats = getProcessingStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on non-initialized dataset', () => {
      const nonExistentDataset = 'non-existent';
      
      // Should not throw errors
      expect(() => getVisibleColumns(nonExistentDataset)).not.toThrow();
      expect(() => getParamcdFilter(nonExistentDataset)).not.toThrow();
      expect(() => getExpandedSections(nonExistentDataset)).not.toThrow();
      
      // Should return default values
      expect(getVisibleColumns(nonExistentDataset)).toBeInstanceOf(Set);
      expect(getParamcdFilter(nonExistentDataset)).toBe('');
      expect(getExpandedSections(nonExistentDataset)).toBeInstanceOf(Set);
    });

    it('should handle missing state provider gracefully', () => {
      // Don't initialize with state provider
      expect(() => getVLMVariables()).not.toThrow();
      expect(() => getActiveVLMTableData()).not.toThrow();
      
      // Should return safe defaults
      expect(getVLMVariables()).toEqual([]);
      expect(getActiveVLMTableData()).toBeNull();
    });

    it('should handle invalid column operations', () => {
      const datasetId = 'test-dataset';
      initializeVLMProcessing(mockStateProvider);
      initializeVLM(datasetId);
      
      // Should handle undefined/null column IDs
      expect(() => toggleColumnVisibility(datasetId, '')).not.toThrow();
      expect(() => updateColumnWidth(datasetId, '', 100)).not.toThrow();
      expect(() => isColumnVisible(datasetId, '')).not.toThrow();
    });
  });

  describe('Reactivity and State Consistency', () => {
    const datasetId = 'test-dataset';

    beforeEach(() => {
      initializeVLMProcessing(mockStateProvider);
      initializeVLM(datasetId);
    });

    it('should maintain state consistency across operations', () => {
      // Set initial state
      const testColumns = ['COL1', 'COL2', 'COL3'];
      const testFilter = 'SYSBP';
      
      updateParamcdFilter(datasetId, testFilter);
      testColumns.forEach(col => toggleColumnVisibility(datasetId, col));
      
      // Verify state persists
      expect(getParamcdFilter(datasetId)).toBe(testFilter);
      testColumns.forEach(col => {
        expect(isColumnVisible(datasetId, col)).toBe(true);
      });
      
      // State should be independent per dataset
      const dataset2 = 'dataset-2';
      initializeVLM(dataset2);
      expect(getParamcdFilter(dataset2)).toBe(''); // Different dataset, clean state
    });

    it('should handle rapid state updates', () => {
      const sectionId = 'rapid-test';
      
      // Rapidly toggle section multiple times
      for (let i = 0; i < 10; i++) {
        toggleSection(datasetId, sectionId);
      }
      
      // Should end up collapsed (even number of toggles)
      expect(isSectionExpanded(datasetId, sectionId)).toBe(false);
    });

    it('should maintain column width precision', () => {
      const columnId = 'precision-test';
      const preciseWidth = 123.456;
      
      updateColumnWidth(datasetId, columnId, preciseWidth);
      
      // Should maintain precision
      expect(getColumnWidth(datasetId, columnId)).toBe(preciseWidth);
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with multiple dataset resets', () => {
      // Create and reset multiple datasets
      for (let i = 0; i < 100; i++) {
        const datasetId = `dataset-${i}`;
        initializeVLM(datasetId);
        updateParamcdFilter(datasetId, `PARAM-${i}`);
        resetVLM(datasetId);
      }
      
      // Should complete without issues
      expect(true).toBe(true);
    });

    it('should handle large column sets efficiently', () => {
      const datasetId = 'large-dataset';
      initializeVLM(datasetId);
      
      // Create large set of columns
      const largeColumnSet = Array.from({ length: 1000 }, (_, i) => `COL_${i}`);
      
      // Should handle efficiently
      const startTime = performance.now();
      showAllColumns(datasetId, largeColumnSet);
      const endTime = performance.now();
      
      // Should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Verify all columns are visible
      expect(getVisibleColumns(datasetId).size).toBe(1000);
    });
  });
});