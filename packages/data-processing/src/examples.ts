/**
 * Examples showing how to use the pure data processors
 * These demonstrate the separation between pure data processing and file/UI concerns
 */

import { DataProcessors } from './index';
import type { DefineXMLProcessingResult, Sas7bdatProcessingResult } from './types/processing';

// Example 1: Using the factory for simple processing
export async function processDefineXMLExample(xmlContent: string): Promise<DefineXMLProcessingResult> {
  // Simple functional approach
  return DataProcessors.processDefineXMLString(xmlContent);
}

// Example 2: Using processor instances for more control
export async function processDefineXMLWithValidation(xmlContent: string): Promise<DefineXMLProcessingResult> {
  const processor = DataProcessors.createDefineXMLProcessor();
  
  // Validate first
  const validation = processor.validate(xmlContent);
  if (!validation.valid) {
    throw new Error(`Invalid DefineXML: ${validation.error}`);
  }
  
  // Process if valid
  return processor.process(xmlContent);
}

// Example 3: SAS7bdat processing (when implemented)
export async function processSasFileExample(fileBuffer: ArrayBuffer, fileName: string): Promise<Sas7bdatProcessingResult> {
  // Validate the buffer first
  const validation = DataProcessors.validateSas7bdatBuffer(fileBuffer);
  if (!validation.valid) {
    throw new Error(`Invalid SAS file: ${validation.error}`);
  }
  
  // Process using the pure function
  return DataProcessors.processSas7bdatBuffer(fileBuffer, fileName);
}

// Example 4: Batch processing multiple files
export async function processBatchFiles(files: Array<{content: string | ArrayBuffer, name: string, type: 'xml' | 'sas'}>): Promise<Array<DefineXMLProcessingResult | Sas7bdatProcessingResult>> {
  const results = [];
  
  for (const file of files) {
    try {
      if (file.type === 'xml' && typeof file.content === 'string') {
        const result = await DataProcessors.processDefineXMLString(file.content);
        results.push(result);
      } else if (file.type === 'sas' && file.content instanceof ArrayBuffer) {
        const result = await DataProcessors.processSas7bdatBuffer(file.content, file.name);
        results.push(result);
      }
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
      // Add error result
      results.push({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: file.type === 'xml' ? {} as any : [],
        ADaM: false,
        SDTM: false
      } as DefineXMLProcessingResult);
    }
  }
  
  return results;
}

// Example 5: Working with enhanced DefineXML data
export async function analyzeDefineXMLStructure(xmlContent: string) {
  const result = await DataProcessors.processDefineXMLString(xmlContent);
  
  if (!result.success) {
    throw new Error(`Processing failed: ${result.error}`);
  }
  
  const analysis = {
    studyType: result.ADaM ? 'ADaM' : result.SDTM ? 'SDTM' : 'Unknown',
    datasetCount: result.data.ItemGroups?.length || 0,
    variableCount: result.data.ItemDefs?.length || 0,
    hasGraphData: !!result.graphData,
    graphNodeCount: result.graphData?.nodes.length || 0,
    graphLinkCount: result.graphData?.links.length || 0,
    processingTime: result.processingTime
  };
  
  console.log('DefineXML Analysis:', analysis);
  return analysis;
}

// Example 6: Pure function for use in workers
export function createWorkerProcessingFunction() {
  // This function can be serialized and sent to a web worker
  return async function(xmlContent: string) {
    // Import would need to be dynamic in a real worker context
    const { processDefineXMLString } = await import('./definexml/processor');
    return processDefineXMLString(xmlContent);
  };
}