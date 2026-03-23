// Shared types file to break circular dependencies
// This file contains types that are used by multiple modules

import type { VLMMethod } from '@sden99/cdisc-types/VLMtypes';

export interface ValueLevelMetadata {
	// Core variable info
	variable: {
		oid: string;
		name: string;
		dataType: string;
		length: string | null;
		description: string | null;
		orderNumber: string | null;
		origin: {
			type: string | null;
			source: string | null;
			description: string | null;
		};
		mandatory: boolean;
		keySequence?: number;
		role?: string;
	};

	// Enhanced where clause structure with both itemOID and variable
	whereClause?: {
		oid: string;
		conditions: Array<{
			comparator: string;
			itemOID: string; // For lookup
			variable: string; // Resolved variable name
			checkValues: string[];
			description?: string; 
		}>;
	};

	codeList?: {
		oid: string;
		name: string;
		items: Array<{
			codedValue: string;
			decode: string;
		}>;
	};

	method?: VLMMethod;

	comments?: Array<{
		oid: string;
		description: string;
	}>;

	// Graph context - links this variable to visualization
	graphContext: {
		nodeId: string;
		connectedNodes: string[];
		cluster: string;
	};

	methodOID?: string;
	whereClauseOID?: string;
	commentOID?: string;
}

export interface EnhancedItemGroup {
	// Original properties
	oid: string;
	name: string;
	sasDatasetName: string;
	description?: string;

	// Enhanced relationships
	variables: Map<string, ValueLevelMetadata>;
	valueLevelMetadata: ValueLevelMetadata[];

	// Graph context
	graphContext: {
		nodeId: string;
		variableNodes: string[];
		cluster: string;
	};

	// Analysis helpers
	statistics: {
		totalVariables: number;
		derivedVariables: number;
		variablesWithCodeLists: number;
		variablesWithMethods: number;
	};
}

export interface SearchCriteria {
	dataType?: string;
	origin?: string;
	hasCodeList?: boolean;
	hasMethod?: boolean;
	mandatory?: boolean;
	datasets?: string[];
	namePattern?: RegExp;
	descriptionPattern?: RegExp;
}

export interface ValidationResult {
	level: 'error' | 'warning' | 'info';
	message: string;
	nodeId?: string;
	context: any;
}

export interface EnhancedNode {
	// Visualization properties
	id: string;
	group: number;
	label: string;
	type: 'ItemGroup' | 'ItemDef' | 'Method' | 'CodeList' | 'WhereClause' | 'ValueList' | 'Comment';

	// Rich metadata
	metadata: {
		name?: string;
		description?: string;
		dataType?: string;
		origin?: string;
		mandatory?: boolean;
		length?: string;
		// Additional context based on type
		[key: string]: any;
	};

	// Visual styling hints
	visual: {
		color?: string;
		size?: number;
		shape?: string;
		icon?: string;
	};
}

export interface EnhancedLink {
	// Visualization properties
	source: string;
	target: string;
	value: number;
	relationship: string;

	// Rich metadata
	metadata: {
		description: string;
		bidirectional: boolean;
		strength: number; // For layout algorithms
		type: 'reference' | 'contains' | 'derives' | 'validates';
	};

	// Visual styling
	visual: {
		color?: string;
		width?: number;
		style?: 'solid' | 'dashed' | 'dotted';
	};
}