import { describe, it, expect, beforeEach } from 'vitest';
import { DatasetSelectionService } from '../services/DatasetSelectionService.js';
import { PlainDatasetRepository } from '../repository/DatasetRepository.js';
import type { DatasetRepository, Dataset } from '../index.js';
import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

// Mock dataset factory
const createMockTabularDataset = (fileName: string): Dataset => ({
  fileName,
  data: [
    { USUBJID: 'SUBJ-001', AGE: 25, SEX: 'M' },
    { USUBJID: 'SUBJ-002', AGE: 30, SEX: 'F' }
  ],
  details: {
    num_rows: 2,
    num_columns: 3,
    columns: ['USUBJID', 'AGE', 'SEX'],
    dtypes: { USUBJID: 'string', AGE: 'int', SEX: 'string' },
    summary: {}
  }
});

const createMockDefineXMLDataset = (fileName: string, type: 'SDTM' | 'ADaM'): Dataset => {
  const mockDefineXML: ParsedDefineXML = {
    MetaData: {
      OID: type === 'SDTM' ? 'DEFINE-SDTM-123' : 'DEFINE-ADaM-456'
    },
    ItemGroups: [
      {
        OID: 'IG.DM',
        Name: 'DM',
        SASDatasetName: 'dm',
        Class: 'DEMOGRAPHICS',
        Purpose: 'Tabulation'
      },
      {
        OID: 'IG.VS',
        Name: 'VS',
        SASDatasetName: 'vs',
        Class: 'BASIC DATA STRUCTURE',
        Purpose: 'Tabulation'
      }
    ]
  } as ParsedDefineXML;

  return {
    fileName,
    data: mockDefineXML,
    details: {
      num_rows: 0,
      num_columns: 0,
      columns: [],
      dtypes: {},
      summary: {}
    }
  };
};

describe('DatasetSelectionService', () => {
  let repository: DatasetRepository;
  let service: DatasetSelectionService;

  beforeEach(() => {
    repository = new PlainDatasetRepository();
    service = new DatasetSelectionService(repository);
  });

  describe('Dataset Selection', () => {
    it('should successfully select existing tabular dataset', () => {
      const dataset = createMockTabularDataset('dm.sas7bdat');
      repository.save(dataset);

      const result = service.selectDataset('dm.sas7bdat');

      expect(result.success).toBe(true);
      expect(result.selectedId).toBe('dm.sas7bdat');
      expect(result.dataset).toEqual(dataset);
    });

    it('should handle null selection (clear)', () => {
      const result = service.selectDataset(null);

      expect(result.success).toBe(true);
      expect(result.selectedId).toBeNull();
      expect(result.selectedDomain).toBeNull();
    });

    it('should fail when dataset not found', () => {
      const result = service.selectDataset('nonexistent.sas7bdat');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Dataset not found: nonexistent.sas7bdat');
    });

    it('should successfully select DefineXML dataset', () => {
      const dataset = createMockDefineXMLDataset('define-sdtm.xml', 'SDTM');
      repository.save(dataset);

      const result = service.selectDataset('define-sdtm.xml');

      expect(result.success).toBe(true);
      expect(result.selectedId).toBe('define-sdtm.xml');
    });
  });

  describe('Dataset Classification', () => {
    it('should classify tabular dataset correctly', () => {
      const dataset = createMockTabularDataset('dm.sas7bdat');
      
      const classification = service.classifyDataset(dataset);

      expect(classification.isDefineXML).toBe(false);
      expect(classification.isTabular).toBe(true);
      expect(classification.type).toBe('TABULAR');
    });

    it('should classify DefineXML dataset correctly', () => {
      const dataset = createMockDefineXMLDataset('define-sdtm.xml', 'SDTM');
      
      const classification = service.classifyDataset(dataset);

      expect(classification.isDefineXML).toBe(true);
      expect(classification.isTabular).toBe(false);
      expect(classification.type).toBe('SDTM');
    });
  });

  describe('DefineXML Information', () => {
    it('should extract DefineXML info from repository', () => {
      const sdtmDataset = createMockDefineXMLDataset('define-sdtm.xml', 'SDTM');
      const adamDataset = createMockDefineXMLDataset('define-adam.xml', 'ADaM');
      
      repository.save(sdtmDataset);
      repository.save(adamDataset);

      const defineXMLInfo = service.getDefineXMLInfo();

      expect(defineXMLInfo.SDTM).toBeTruthy();
      expect(defineXMLInfo.ADaM).toBeTruthy();
      expect(defineXMLInfo.sdtmId).toBe('define-sdtm.xml');
      expect(defineXMLInfo.adamId).toBe('define-adam.xml');
    });

    it('should return empty info when no DefineXML datasets exist', () => {
      const defineXMLInfo = service.getDefineXMLInfo();

      expect(defineXMLInfo.SDTM).toBeNull();
      expect(defineXMLInfo.ADaM).toBeNull();
      expect(defineXMLInfo.sdtmId).toBeNull();
      expect(defineXMLInfo.adamId).toBeNull();
    });
  });

  describe('Available Datasets', () => {
    it('should return available datasets from both data and metadata', () => {
      const tabularDataset = createMockTabularDataset('dm.sas7bdat');
      const defineDataset = createMockDefineXMLDataset('define-sdtm.xml', 'SDTM');
      
      repository.save(tabularDataset);
      repository.save(defineDataset);

      const available = service.getAvailableDatasets();

      // Should include the tabular dataset and datasets from Define-XML metadata
      expect(available.length).toBeGreaterThan(0);
      
      const datasetNames = available.map(d => d.name);
      // Check that we get datasets from both sources (exact names depend on normalization)
      expect(datasetNames.length).toBeGreaterThan(1);
    });
  });

  describe('Available Views', () => {
    it('should correctly determine available views for tabular dataset', () => {
      const dataset = createMockTabularDataset('dm.sas7bdat');
      repository.save(dataset);

      const views = service.getAvailableViews('dm.sas7bdat');

      expect(views.data).toBe(true);
      expect(views.metadata).toBe(false); // No Define-XML available
      expect(views.VLM).toBe(false);
    });

    it('should return false views for null selection', () => {
      const views = service.getAvailableViews(null);

      expect(views.data).toBe(false);
      expect(views.metadata).toBe(false);
      expect(views.VLM).toBe(false);
    });
  });
});