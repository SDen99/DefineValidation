import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';
export type { ValueLevelMetadata } from './shared';
// Graph data structure definition
export interface GraphData {
	nodes: Array<{
		id: string;
		group: number;
		label: string;
	}>;
	links: Array<{
		source: string;
		target: string;
		value: number;
		relationship: string;
	}>;
}

export interface BaseProcessingResult {
	success: boolean;
	error?: string;
	processingTime?: number; // To change at a later date to distinguish between define & dataset
}

// SAS7bdat specific result - unchanged
export interface Sas7bdatProcessingResult extends BaseProcessingResult {
	data: any[];
	metrics: {
		uploadTime: number;
		datasetSize: number;
		processingTime: number;
	};
	details: {
		columns: string[];
		dtypes: Record<string, string>;
		num_rows: number;
		num_columns: number;
		summary?: Record<string, any>;
		unique_values?: Record<string, any[]>;
	};
}

// Dataset-JSON specific result - follows same structure as Sas7bdat
export interface DatasetJsonProcessingResult extends BaseProcessingResult {
	data: any[];
	metrics: {
		uploadTime: number;
		datasetSize: number;
		processingTime: number;
	};
	details: {
		columns: string[];
		dtypes: Record<string, string>; // CDISC dataTypes (string, integer, decimal, etc.)
		num_rows: number;
		num_columns: number;
		summary?: Record<string, any>;
		unique_values?: Record<string, any[]>;
	};
	// Dataset-JSON specific metadata
	metadata?: {
		itemGroupOID: string;
		datasetName: string;
		datasetLabel: string;
		version: string;
	};
}

// Enhanced DefineXML data structure (already imported from this package)
export interface EnhancedDefineXMLData {
	// Original data (for compatibility)
	raw: ParsedDefineXML;

	// Enhanced lookup maps for O(1) access
	lookups: {
		itemGroupsByOID: Map<string, any>;
		itemDefsByOID: Map<string, any>;
		methodsByOID: Map<string, any>;
		codeListsByOID: Map<string, any>;
		whereClausesByOID: Map<string, any>;
		valueListsByOID: Map<string, any>;
		commentsByOID: Map<string, any>;
	};

	// Enhanced data with relationships resolved
	enhancedItemGroups: Map<string, any>;
	allVariables: Map<string, any>;

	// Graph data for visualization
	graphData: GraphData;
}

// Define XML specific result - updated to include graphData
export interface DefineXMLProcessingResult extends BaseProcessingResult {
	data: ParsedDefineXML;
	metrics?: {
		uploadTime: number;
		fileSize: number;
	};
	ADaM: boolean;
	SDTM: boolean;
	details?: {
		num_rows: number;
		num_columns: number;
		columns: string[];
		dtypes: Record<string, string>;
		summary?: Record<string, any>;
	};
	graphData?: GraphData | null;
	enhancedDefineXML?: EnhancedDefineXMLData | null;
}

// Union type for all processing results
export type ProcessingResult = Sas7bdatProcessingResult | DefineXMLProcessingResult | DatasetJsonProcessingResult;

// Validation result interface
export interface ValidationResult {
	valid: boolean;
	error?: string;
	fileType?: string;
}