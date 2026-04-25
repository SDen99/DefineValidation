// packages/app/src/lib/core/types/types.ts
import type {
	ProcessingResult,
	EnhancedDefineXMLData,
	GraphData
} from '@sden99/data-processing/types';

// Re-export worker types from worker-communication package for backward compatibility
export type { WorkerTask, ManagedWorker, DatasetLoadingState } from '@sden99/worker-communication';

export interface ProcessingStats {
	uploadTime: number | null;
	numColumns: number | null;
	numRows: number | null;
	datasetSize: number | null;
}

export interface DefineAssociation {
	type: 'SDTM' | 'ADaM' | 'SEND';
	defineId: string;
	timestamp: number;
}

export type Record<K extends keyof any, T> = {
	[P in K]: T;
};

export interface ServiceContainer {
	getDatasetService(): any;
	getWorkerPool(): any;
	dispose(): Promise<void>;
}

export interface VLMRow {
	[key: string]: any;
	rowKey: string;
}

export interface VLMTableData {
	data: VLMRow[];
	columns: string[];
	totalRows: number;
}

// Complete Dataset interface with all required properties
export interface Dataset {
	fileName: string;
	data: any;
	details: any;
	// Optional properties that may be added during processing
	graphData?: GraphData;
	enhancedDefineXML?: EnhancedDefineXMLData;
	defineAssociation?: DefineAssociation;
	isMetadataOnly?: boolean;
	processingStats?: ProcessingStats;
	ADaM?: boolean;
	SDTM?: boolean;
	SEND?: boolean;
	// Add any other optional properties that might be needed
	timestamp?: number;
}

export interface InitState {
	status: 'idle' | 'initializing' | 'ready' | 'error';
	container: ServiceContainer | null;
	error?: Error | null;
	progress?: {
		step: 'services' | 'dataset' | 'ui';
		message: string;
	} | null;
}

export interface VariableType {
	name: string;
	type: string;
	dtype?: string;
	description?: string;
}

// Re-export types from data-processing for convenience
export type { ProcessingResult, EnhancedDefineXMLData, GraphData };
