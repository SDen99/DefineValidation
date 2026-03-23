/**
 * VLM Components State Management
 * Following metadata-components pattern for state exports
 * 
 * NOTE: State functions are exported from Svelte context at runtime.
 * This file provides TypeScript definitions only.
 */

// Type definitions for state functions
export type VLMStateActions = {
	// Initialization
	initializeVLM: (datasetId: string, columns: string[]) => void;
	
	// Column width management
	updateColumnWidth: (datasetId: string, column: string, width: number) => void;
	getColumnWidth: (datasetId: string, column: string, defaultWidth?: number) => number;
	
	// Column visibility management
	toggleColumnVisibility: (datasetId: string, column: string) => void;
	isColumnVisible: (datasetId: string, column: string) => boolean;
	getVisibleColumns: (datasetId: string, allColumns: string[]) => string[];
	showAllColumns: (datasetId: string, allColumns: string[]) => void;
	
	// Column order management
	updateColumnOrder: (datasetId: string, newOrder: string[]) => void;
	getColumnOrder: (datasetId: string) => string[];
	
	// PARAMCD filter management
	updateParamcdFilter: (datasetId: string, filter: string) => void;
	getParamcdFilter: (datasetId: string) => string;
	clearParamcdFilter: (datasetId: string) => void;
	
	// Section expansion management
	toggleSection: (datasetId: string, sectionId: string) => void;
	isSectionExpanded: (datasetId: string, sectionId: string) => boolean;
	getAllExpandableSectionIds: (datasetId: string) => string[];
	collapseAllRowSections: (datasetId: string) => void;
	expandAllRowSections: (datasetId: string, allSectionIds: string[]) => void;
	
	// Cleanup functions
	resetVLM: (datasetId: string) => void;
	resetAllVLM: () => void;
};

// Note: Actual state functions are available from the Svelte components at runtime
// They cannot be exported from TypeScript build due to Svelte runtime dependencies