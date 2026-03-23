import { parseDefineXML } from './parser';
import { graphXML } from '../graphXML';
import type { DefineXMLProcessingResult, ValidationResult } from '../types/processing';

/**
 * Pure DefineXML data processor - no file I/O, no progress callbacks
 * Contains only the core data transformation logic
 */
export class DefineXMLDataProcessor {
	/**
	 * Process DefineXML string and return structured result
	 * @param xmlString - The DefineXML content as string
	 * @returns Promise with processed DefineXML data including graph enhancement
	 */
	async process(xmlString: string): Promise<DefineXMLProcessingResult> {
		const startTime = performance.now();

		try {
			// Parse the XML string into structured data
			const defineData = await parseDefineXML(xmlString);
			
			// Generate enhanced graph data
			let enhancedData = null;
			let graphData = null;
			
			try {
				console.log('[DefineXMLDataProcessor] Starting graph enhancement...');
				enhancedData = graphXML.enhance(defineData);
				graphData = enhancedData.graphData;
				
				console.log('[DefineXMLDataProcessor] Graph enhancement complete:', {
					nodeCount: graphData.nodes.length,
					linkCount: graphData.links.length,
					variableCount: enhancedData.allVariables.size,
					datasetCount: enhancedData.enhancedItemGroups.size
				});
			} catch (graphError) {
				console.error('[DefineXMLDataProcessor] Error generating enhanced graph data:', graphError);
				// Continue processing even if graph generation fails
			}

			// Detect study type based on MetaData OID patterns
			const metaDataOID = defineData.MetaData?.OID || '';
			const isADaM = this.detectADaM(defineData, metaDataOID);
			const isSDTM = this.detectSDTM(defineData, metaDataOID);

			// Calculate processing time
			const processingTime = (performance.now() - startTime) / 1000;

			const result: DefineXMLProcessingResult = {
				success: true,
				data: defineData,
				graphData: graphData,
				enhancedDefineXML: enhancedData,
				ADaM: isADaM,
				SDTM: isSDTM,
				details: {
					num_rows: defineData.ItemGroups?.length || 0,
					num_columns: defineData.ItemDefs?.length || 0,
					columns: ['Name', 'Label', 'Type'], // Standard DefineXML columns
					dtypes: {},
					summary: {
						itemGroups: defineData.ItemGroups?.length || 0,
						itemDefs: defineData.ItemDefs?.length || 0,
						methods: defineData.Methods?.length || 0,
						codeLists: defineData.CodeLists?.length || 0,
						comments: defineData.Comments?.length || 0
					}
				},
				processingTime
			};

			console.log('[DefineXMLDataProcessor] Processing complete:', {
				success: result.success,
				ADaM: result.ADaM,
				SDTM: result.SDTM,
				hasGraphData: !!result.graphData,
				hasEnhancedData: !!result.enhancedDefineXML,
				processingTime: result.processingTime
			});

			return result;

		} catch (error) {
			console.error('[DefineXMLDataProcessor] Processing error:', error);
			
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				processingTime: (performance.now() - startTime) / 1000,
				data: {} as any, // Provide empty data structure for failed parsing
				ADaM: false,
				SDTM: false
			};
		}
	}

	/**
	 * Validate DefineXML string without full processing
	 * @param xmlString - The DefineXML content to validate
	 * @returns Validation result
	 */
	validate(xmlString: string): ValidationResult {
		// Basic validation
		if (!xmlString || typeof xmlString !== 'string') {
			return {
				valid: false,
				error: 'Invalid input: XML string required',
				fileType: 'definexml'
			};
		}

		if (xmlString.trim().length === 0) {
			return {
				valid: false,
				error: 'Empty XML content',
				fileType: 'definexml'
			};
		}

		// Check for basic XML structure
		if (!xmlString.includes('<ODM') && !xmlString.includes('<odm:ODM')) {
			return {
				valid: false,
				error: 'Not a valid DefineXML file - missing ODM root element',
				fileType: 'definexml'
			};
		}

		// Check for DefineXML namespace
		if (!xmlString.includes('xmlns:def') && !xmlString.includes('def:')) {
			return {
				valid: false,
				error: 'Not a valid DefineXML file - missing def namespace',
				fileType: 'definexml'
			};
		}

		return {
			valid: true,
			fileType: 'definexml'
		};
	}

	/**
	 * Detect if this is an ADaM DefineXML based on various indicators
	 */
	private detectADaM(defineData: any, metaDataOID: string): boolean {
		// Check MetaData OID for ADaM indicators
		if (metaDataOID.toLowerCase().includes('adam')) {
			return true;
		}

		// Check ItemGroup purposes for ADaM-specific values
		const itemGroups = defineData.ItemGroups || [];
		const adamPurposes = ['analysis', 'tabulation'];
		const hasAdamPurpose = itemGroups.some((group: any) => 
			adamPurposes.some(purpose => 
				group.Purpose?.toLowerCase().includes(purpose)
			)
		);

		if (hasAdamPurpose) {
			return true;
		}

		// Check for ADaM-specific dataset names
		const adamDatasetPatterns = /^(adsl|adae|adcm|adex|adlb|advs|adeg|adpc|adpp|addv|adfa|adrs|adtte|adqs)/i;
		const hasAdamDatasets = itemGroups.some((group: any) => 
			group.SASDatasetName && adamDatasetPatterns.test(group.SASDatasetName)
		);

		return hasAdamDatasets;
	}

	/**
	 * Detect if this is an SDTM DefineXML based on various indicators
	 */
	private detectSDTM(defineData: any, metaDataOID: string): boolean {
		// Check MetaData OID for SDTM indicators
		if (metaDataOID.toLowerCase().includes('sdtm')) {
			return true;
		}

		// Check ItemGroup purposes for SDTM-specific values
		const itemGroups = defineData.ItemGroups || [];
		const sdtmPurposes = ['tabulation'];
		const hasSDTMPurpose = itemGroups.some((group: any) => 
			group.Purpose?.toLowerCase() === 'tabulation'
		);

		if (hasSDTMPurpose) {
			return true;
		}

		// Check for SDTM-specific dataset names
		const sdtmDatasetPatterns = /^(dm|ae|cm|ex|lb|vs|eg|pc|pp|dv|fa|rs|qs|mh|su|pr|da|ho|ie|sv|ds|dv)/i;
		const hasSDTMDatasets = itemGroups.some((group: any) => 
			group.SASDatasetName && sdtmDatasetPatterns.test(group.SASDatasetName)
		);

		return hasSDTMDatasets;
	}
}

/**
 * Pure function interface for simple DefineXML processing
 * @param xmlString - DefineXML content as string
 * @returns Promise with processing result
 */
export async function processDefineXMLString(xmlString: string): Promise<DefineXMLProcessingResult> {
	const processor = new DefineXMLDataProcessor();
	return processor.process(xmlString);
}

/**
 * Pure function for DefineXML validation
 * @param xmlString - DefineXML content to validate
 * @returns Validation result
 */
export function validateDefineXMLString(xmlString: string): ValidationResult {
	const processor = new DefineXMLDataProcessor();
	return processor.validate(xmlString);
}