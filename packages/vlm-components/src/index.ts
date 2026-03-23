/**
 * @sden99/vlm-components
 * 
 * Variable-Level Metadata UI components for clinical data visualization
 * Following established patterns from metadata-components
 * 
 * @author Densham
 * @version 0.1.0
 */

// State management exports available at runtime
// Note: State functions are not exported from TypeScript build
// They are available at runtime when using Svelte

// Type definitions
export type {
	VLMStateProvider,
	VLMdataViewProps,
	VLMTableProps,
	VLMFilterControlsProps,
	ValueLevelMetadata
} from './types/index.js';

/**
 * Package version
 */
export const VERSION = '0.1.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
	name: '@sden99/vlm-components',
	version: VERSION,
	description: 'Variable-Level Metadata UI components for clinical data visualization',
	keywords: ['vlm', 'variable-level-metadata', 'clinical-data', 'cdisc', 'ui-components', 'svelte']
} as const;