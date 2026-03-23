/**
 * Type definitions for metadata components
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';

// Re-export commonly used types
export type { ValueLevelMetadata };

// Component prop types
export interface MetadataViewProps {
	datasetName: string;
}

export interface MetadataTableProps {
	datasetName: string;
	filteredVariables: ValueLevelMetadata[];
	expansionStates: {
		expandedVariableIds: Set<string>;
		methodExpansions: Set<string>;
		codelistExpansions: Set<string>;
		commentsExpansions: Set<string>;
	};
}

// State-related types  
export interface ExpansionState {
	expandedVariableIds: Set<string>;
	methodExpansions: Set<string>;
	codelistExpansions: Set<string>;
	commentsExpansions: Set<string>;
}

// State provider interface for reactive boundary
export interface MetadataStateProvider {
	getActiveVariables(): ValueLevelMetadata[];
	getDefineXmlInfo(): {
		SDTM?: any;
		ADaM?: any;
		sdtmId?: string;
		adamId?: string;
	};
	getActiveDefineInfo(): {
		define?: {
			ItemGroups?: any[];
		};
	} | null;
	getActiveItemGroupMetadata(): {
		Name?: string;
		SASDatasetName?: string;
		Class?: string;
	} | null;
}