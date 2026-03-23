/**
 * @sden99/metadata-components
 * 
 * Variable-Level Metadata components and state management for clinical data applications
 * Following the VLM package extraction pattern for clean architecture
 * 
 * @author Densham
 * @version 0.1.0
 */

// State management (selective exports following VLM pattern)
export {
	// Initialization and core functions
	initializeMetadataComponents,
	getSearchTerm,
	getActiveVariables,
	getDefineXmlInfo,
	getActiveDefineInfo,
	getActiveItemGroupMetadata,
	initializeMetadataView,
	updateSearch,
	toggleExpansion,
	expandAll,
	collapseAll,
	getExpansionState,
	isProviderInitialized,
	isExpanded,
	toggleExpansionByKey
} from './state/metadataReactiveState.svelte';

// Raw state objects exported like VLM (for direct reactivity in main app)
export {
	searchTerms,
	expansionStates
} from './state/metadataReactiveState.svelte';

// Utility functions
export * from './utils/index';

// Types
export * from './types/index';

// Component prop types  
export type {
	MetadataViewProps,
	MetadataTableProps,
	ExpansionState
} from './types/index';

// State provider interface
export type { MetadataStateProvider } from './types/index';

/**
 * Package version
 */
export const VERSION = '0.1.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
	name: '@sden99/metadata-components',
	version: VERSION,
	description: 'Variable-Level Metadata components and state management for clinical data applications',
	keywords: ['metadata', 'clinical-data', 'svelte-components', 'vlm', 'variable-level-metadata', 'cdisc']
} as const;