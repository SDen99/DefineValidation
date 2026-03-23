/**
 * Metadata Components Reactive State Management
 * Follows VLM pattern with reactive boundary between package and app
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { MetadataStateProvider, ExpansionState } from '../types';

// ============================================
// METADATA UI STATE (per dataset) - Direct Values Pattern
// ============================================

// Search terms per dataset (datasetId -> search string)
export const searchTerms = $state<Record<string, string>>({});

// Expansion states per dataset (datasetId -> expansion state)
export const expansionStates = $state<Record<string, ExpansionState>>({});

// ============================================
// STATE PROVIDER INTEGRATION
// ============================================

let stateProvider: MetadataStateProvider | null = null;

/**
 * Initialize metadata components with app state provider
 */
export function initializeMetadataComponents(provider: MetadataStateProvider): void {
	stateProvider = provider;
	console.log('[metadataReactiveState] Initialized with state provider:', !!provider);
	console.log('[metadataReactiveState] Provider methods available:', {
		getActiveVariables: typeof provider.getActiveVariables,
		getDefineXmlInfo: typeof provider.getDefineXmlInfo,
		getActiveDefineInfo: typeof provider.getActiveDefineInfo,
		getActiveItemGroupMetadata: typeof provider.getActiveItemGroupMetadata
	});
}

// ============================================
// REACTIVE GETTERS - DELEGATE TO PROVIDER
// ============================================

/**
 * Get active variables from the app's state
 */
export function getActiveVariables(): ValueLevelMetadata[] {
	if (!stateProvider) {
		console.warn('[metadataReactiveState] No state provider initialized');
		return [];
	}
	return stateProvider.getActiveVariables();
}

/**
 * Get define XML info from the app's state
 */
export function getDefineXmlInfo() {
	if (!stateProvider) return { SDTM: null, ADaM: null };
	return stateProvider.getDefineXmlInfo();
}

/**
 * Get active define info from the app's state
 */
export function getActiveDefineInfo() {
	if (!stateProvider) return null;
	return stateProvider.getActiveDefineInfo();
}

/**
 * Get active item group metadata from the app's state
 */
export function getActiveItemGroupMetadata() {
	if (!stateProvider) return null;
	return stateProvider.getActiveItemGroupMetadata();
}

// ============================================
// METADATA UI STATE MANAGEMENT
// ============================================

/**
 * Initialize metadata view for a dataset
 */
export function initializeMetadataView(datasetName: string): void {
	console.log(`[metadataReactiveState] Initializing metadata view for: ${datasetName}`);
	
	// Initialize search term if not exists
	if (!searchTerms[datasetName]) {
		searchTerms[datasetName] = '';
	}
	
	// Initialize expansion state if not exists
	if (!expansionStates[datasetName]) {
		expansionStates[datasetName] = {
			expandedVariableIds: new Set(),
			methodExpansions: new Set(),
			codelistExpansions: new Set(),
			commentsExpansions: new Set()
		};
	}
}

/**
 * Get search term for a dataset
 */
export function getSearchTerm(datasetName: string): string {
	return searchTerms[datasetName] || '';
}

/**
 * Update search term for a dataset
 */
export function updateSearch(datasetName: string, term: string): void {
	searchTerms[datasetName] = term;
}

/**
 * Get expansion state for a dataset (safe for derived contexts)
 */
export function getExpansionState(datasetName: string): ExpansionState {
	// Don't auto-initialize to avoid state mutations in derived contexts
	if (!expansionStates[datasetName]) {
		// Return empty state structure instead of initializing
		return {
			expandedVariableIds: new Set(),
			methodExpansions: new Set(),
			codelistExpansions: new Set(),
			commentsExpansions: new Set()
		};
	}
	return expansionStates[datasetName];
}

/**
 * Toggle expansion for a specific item
 */
export function toggleExpansion(
	datasetName: string, 
	type: keyof ExpansionState, 
	key: string
): void {
	// Ensure state is initialized before toggling
	if (!expansionStates[datasetName]) {
		initializeMetadataView(datasetName);
	}
	
	const state = expansionStates[datasetName];
	const targetSet = state[type];
	
	if (targetSet.has(key)) {
		targetSet.delete(key);
	} else {
		targetSet.add(key);
	}
}

/**
 * Expand all items for a dataset
 */
export function expandAll(datasetName: string, expansionKeys: string[]): void {
	// Ensure state is initialized before expanding
	if (!expansionStates[datasetName]) {
		initializeMetadataView(datasetName);
	}

	const state = expansionStates[datasetName];

	// Add all keys to appropriate sets
	// Keys are in format: "uniqueKey-method", "uniqueKey-codelist", "uniqueKey-comments"
	expansionKeys.forEach(key => {
		if (key.endsWith('-method')) {
			state.methodExpansions.add(key);
			// Also add the base variable key
			const variableKey = key.replace('-method', '');
			state.expandedVariableIds.add(variableKey);
		} else if (key.endsWith('-codelist')) {
			state.codelistExpansions.add(key);
			// Also add the base variable key
			const variableKey = key.replace('-codelist', '');
			state.expandedVariableIds.add(variableKey);
		} else if (key.endsWith('-comments')) {
			state.commentsExpansions.add(key);
			// Also add the base variable key
			const variableKey = key.replace('-comments', '');
			state.expandedVariableIds.add(variableKey);
		}
	});

	// IMPORTANT: Trigger reactivity by reassigning the state object
	expansionStates[datasetName] = { ...state };
}

/**
 * Collapse all items for a dataset
 */
export function collapseAll(datasetName: string): void {
	// Ensure state is initialized before collapsing
	if (!expansionStates[datasetName]) {
		initializeMetadataView(datasetName);
	}

	const state = expansionStates[datasetName];

	// Clear all expansion sets
	state.expandedVariableIds.clear();
	state.methodExpansions.clear();
	state.codelistExpansions.clear();
	state.commentsExpansions.clear();

	// IMPORTANT: Trigger reactivity by reassigning the state object
	expansionStates[datasetName] = { ...state };
}

/**
 * Check if provider is initialized
 */
export function isProviderInitialized(): boolean {
	return stateProvider !== null;
}

/**
 * Check if a specific expansion key is expanded for a dataset
 */
export function isExpanded(datasetName: string, expansionKey: string): boolean {
	const state = getExpansionState(datasetName);
	
	// Check which type of expansion based on the key format
	if (expansionKey.includes('-method')) {
		return state.methodExpansions.has(expansionKey);
	} else if (expansionKey.includes('-codelist')) {
		return state.codelistExpansions.has(expansionKey);
	} else if (expansionKey.includes('-comments')) {
		return state.commentsExpansions.has(expansionKey);
	} else {
		return state.expandedVariableIds.has(expansionKey);
	}
}

/**
 * Toggle expansion for a specific expansion key (used by utilities)
 */
export function toggleExpansionByKey(datasetName: string, expansionKey: string): void {
	// Ensure state is initialized before toggling
	if (!expansionStates[datasetName]) {
		initializeMetadataView(datasetName);
	}

	const state = expansionStates[datasetName];

	// Determine which set to toggle based on the key format
	if (expansionKey.includes('-method')) {
		if (state.methodExpansions.has(expansionKey)) {
			state.methodExpansions.delete(expansionKey);
		} else {
			state.methodExpansions.add(expansionKey);
		}
		// Also update expandedVariableIds since method is being toggled
		const variableKey = expansionKey.split('-')[0];
		if (state.methodExpansions.has(expansionKey) || state.codelistExpansions.has(`${variableKey}-codelist`) || state.commentsExpansions.has(`${variableKey}-comments`)) {
			state.expandedVariableIds.add(variableKey);
		} else {
			state.expandedVariableIds.delete(variableKey);
		}
	} else if (expansionKey.includes('-codelist')) {
		if (state.codelistExpansions.has(expansionKey)) {
			state.codelistExpansions.delete(expansionKey);
		} else {
			state.codelistExpansions.add(expansionKey);
		}
		// Also update expandedVariableIds
		const variableKey = expansionKey.split('-')[0];
		if (state.methodExpansions.has(`${variableKey}-method`) || state.codelistExpansions.has(expansionKey) || state.commentsExpansions.has(`${variableKey}-comments`)) {
			state.expandedVariableIds.add(variableKey);
		} else {
			state.expandedVariableIds.delete(variableKey);
		}
	} else if (expansionKey.includes('-comments')) {
		if (state.commentsExpansions.has(expansionKey)) {
			state.commentsExpansions.delete(expansionKey);
		} else {
			state.commentsExpansions.add(expansionKey);
		}
		// Also update expandedVariableIds
		const variableKey = expansionKey.split('-')[0];
		if (state.methodExpansions.has(`${variableKey}-method`) || state.codelistExpansions.has(`${variableKey}-codelist`) || state.commentsExpansions.has(expansionKey)) {
			state.expandedVariableIds.add(variableKey);
		} else {
			state.expandedVariableIds.delete(variableKey);
		}
	} else {
		if (state.expandedVariableIds.has(expansionKey)) {
			state.expandedVariableIds.delete(expansionKey);
		} else {
			state.expandedVariableIds.add(expansionKey);
		}
	}

	// IMPORTANT: Trigger reactivity by reassigning the state object
	expansionStates[datasetName] = { ...state };
}