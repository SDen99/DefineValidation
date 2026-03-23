import type { DatasetRepository } from '../repository/index.js';
import type { 
  SelectionResult, 
  DatasetClassification, 
  DefineXMLInfo,
  ActiveDefineInfo,
  AvailableDataset,
  AvailableViews,
  Dataset 
} from '../types/index.js';
import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';
import { normalizeDatasetId as normalize } from '../utils/index.js';
import { graphXML } from '@sden99/data-processing';

/**
 * Service for dataset selection business logic
 * Contains pure functions with no side effects
 */
export class DatasetSelectionService {
  constructor(private repository: DatasetRepository) {}

  /**
   * Validates and prepares dataset selection
   * Pure business logic - no state mutations
   */
  selectDataset(id: string | null, domain: string | null = null): SelectionResult {
    // Handle null selection (clear selection)
    if (!id) {
      return {
        success: true,
        selectedId: null,
        selectedDomain: null
      };
    }

    const dataset = this.repository.findById(id);
    if (!dataset) {
      return {
        success: false,
        selectedId: null,
        selectedDomain: null,
        error: `Dataset not found: ${id}`
      };
    }

    const classification = this.classifyDataset(dataset);
    
    if (classification.isDefineXML) {
      const enhanceResult = this.ensureDefineXMLEnhanced(dataset);
      if (!enhanceResult.success) {
        return {
          success: false,
          selectedId: null,
          selectedDomain: null,
          error: enhanceResult.error
        };
      }
    } else if (!classification.isTabular) {
      return {
        success: false,
        selectedId: null,
        selectedDomain: null,
        error: `Dataset has no tabular data: ${id}`
      };
    }

    return {
      success: true,
      selectedId: id,
      selectedDomain: domain,
      dataset
    };
  }

  /**
   * Classifies a dataset based on its properties
   */
  classifyDataset(dataset: Dataset): DatasetClassification {
    const isDefineXML = dataset.fileName.toLowerCase().endsWith('.xml');
    
    if (isDefineXML) {
      const defineXMLData = this.extractDefineXMLData(dataset);
      const type = this.determineDefineXMLType(defineXMLData);
      
      return {
        isDefineXML: true,
        isTabular: false,
        type: type || 'UNKNOWN'
      };
    }

    const isTabular = dataset.data && Array.isArray(dataset.data);
    
    return {
      isDefineXML: false,
      isTabular: !!isTabular,
      type: isTabular ? 'TABULAR' : 'UNKNOWN'
    };
  }

  /**
   * Extracts DefineXML info from all datasets in the repository
   */
  getDefineXMLInfo(): DefineXMLInfo {
    const result: DefineXMLInfo = {
      SDTM: null,
      ADaM: null,
      sdtmId: null,
      adamId: null
    };

    const allDatasets = this.repository.findAll();
    
    for (const dataset of allDatasets) {
      const defineData = this.extractDefineXMLData(dataset);
      if (defineData && defineData.MetaData?.OID) {
        if (defineData.MetaData.OID.includes('SDTM')) {
          result.SDTM = defineData;
          result.sdtmId = dataset.fileName;
        } else if (defineData.MetaData.OID.includes('ADaM')) {
          result.ADaM = defineData;
          result.adamId = dataset.fileName;
        }
      }
    }

    return result;
  }

  /**
   * Gets available datasets based on actual data and Define-XML metadata
   */
  getAvailableDatasets(): AvailableDataset[] {
    const nameMapping = new Map<string, string>(); // normalized -> original
    const datasets = this.repository.findAll();
    
    // Add datasets that are not XML files
    datasets.forEach(dataset => {
      if (!dataset.fileName.toLowerCase().endsWith('.xml')) {
        const normalized = normalize(dataset.fileName);
        nameMapping.set(normalized, dataset.fileName);
      }
    });

    // Add datasets from Define-XML metadata
    const defineXMLInfo = this.getDefineXMLInfo();
    defineXMLInfo.SDTM?.ItemGroups.forEach(group => {
      const originalName = group.SASDatasetName || group.Name || '';
      if (originalName) {
        const normalized = normalize(originalName);
        nameMapping.set(normalized, originalName);
      }
    });
    defineXMLInfo.ADaM?.ItemGroups.forEach(group => {
      const originalName = group.SASDatasetName || group.Name || '';
      if (originalName) {
        const normalized = normalize(originalName);
        nameMapping.set(normalized, originalName);
      }
    });

    return Array.from(nameMapping.entries())
      .sort(([, a], [, b]) => a.localeCompare(b))
      .map(([normalizedName, originalName]) => ({ 
        id: originalName,    // Use original case as ID (e.g., "ADAE")
        name: originalName   // Display original case (e.g., "ADAE")
      }));
  }

  /**
   * Gets active Define-XML info for the selected dataset
   */
  getActiveDefineInfo(selectedId: string | null, selectedDomain: string | null): ActiveDefineInfo {
    if (!selectedId) return { define: null, type: null };

    const lookupName = selectedDomain || selectedId;
    const normalizedName = normalize(lookupName!);
    const defineXMLInfo = this.getDefineXMLInfo();

    const findMatch = (define: ParsedDefineXML | null) =>
      define?.ItemGroups.some(g => normalize(g.SASDatasetName || g.Name || '') === normalizedName);

    if (findMatch(defineXMLInfo.ADaM)) {
      return { define: defineXMLInfo.ADaM, type: 'ADaM' as const };
    }
    if (findMatch(defineXMLInfo.SDTM)) {
      return { define: defineXMLInfo.SDTM, type: 'SDTM' as const };
    }

    return { define: null, type: null };
  }

  /**
   * Gets item group metadata for the selected dataset
   */
  getActiveItemGroupMetadata(selectedId: string | null, selectedDomain: string | null) {
    const { define } = this.getActiveDefineInfo(selectedId, selectedDomain);
    const name = selectedDomain || selectedId;
    if (!define || !name) return null;

    const normalizedName = normalize(name);
    return define.ItemGroups.find(g => normalize(g.SASDatasetName || g.Name || '') === normalizedName) || null;
  }

  /**
   * Determines available views for a dataset
   */
  getAvailableViews(selectedId: string | null, selectedDomain: string | null = null): AvailableViews {
    if (!selectedId) return { data: false, metadata: false, VLM: false };

    const dataset = this.repository.findById(selectedId);
    const metadata = this.getActiveItemGroupMetadata(selectedId, selectedDomain);
    const hasTabularData = dataset?.data && Array.isArray(dataset.data);

    const defineXMLInfo = this.getDefineXMLInfo();
    const hasDefineXmlData = !!(defineXMLInfo.SDTM || defineXMLInfo.ADaM);
    const hasMetadata = !!metadata;

    return {
      data: !!hasTabularData,
      metadata: hasDefineXmlData && hasMetadata,
      VLM: metadata?.Class === 'BASIC DATA STRUCTURE'
    };
  }

  private extractDefineXMLData(dataset: Dataset): ParsedDefineXML | null {
    if (dataset.data && typeof dataset.data === 'object' && 'ItemGroups' in dataset.data) {
      return dataset.data as ParsedDefineXML;
    }
    return null;
  }

  private determineDefineXMLType(defineData: ParsedDefineXML | null): 'SDTM' | 'ADaM' | null {
    if (!defineData?.MetaData?.OID) return null;
    
    if (defineData.MetaData.OID.includes('SDTM')) return 'SDTM';
    if (defineData.MetaData.OID.includes('ADaM')) return 'ADaM';
    
    return null;
  }

  private ensureDefineXMLEnhanced(dataset: Dataset): { success: boolean; error?: string } {
    const defineXMLData = this.extractDefineXMLData(dataset);
    
    if (defineXMLData && !dataset.enhancedDefineXML) {
      try {
        dataset.enhancedDefineXML = graphXML.enhance(defineXMLData);
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: `Failed to enhance DefineXML: ${error instanceof Error ? error.message : String(error)}` 
        };
      }
    }

    return { success: true };
  }
}