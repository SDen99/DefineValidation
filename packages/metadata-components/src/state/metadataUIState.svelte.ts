/**
 * Metadata UI State Management
 * Following Direct Values Pattern (like VLM) for performance-critical metadata interactions
 * 
 * Extracted from main app following VLM package extraction pattern
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';

// ============================================
// DIRECT VALUES PATTERN - Performance Critical UI State
// ============================================

// Expansion state per dataset (datasetId -> Set of expansion keys)
export const metadataExpansions = $state<Record<string, Set<string>>>({});

// Search terms per dataset (datasetId -> search string)
export const metadataSearchTerms = $state<Record<string, string>>({});

// ============================================
// DEPENDENCY INJECTION (following VLM pattern)
// ============================================

// Variables provider interface for clean dependency injection
export interface MetadataVariablesProvider {
	getVariablesForDataset(datasetName: string): ValueLevelMetadata[];
	hasVariablesForDataset(datasetName: string): boolean;
	getVariableCount(datasetName: string): number;
}

let variablesProvider: MetadataVariablesProvider | null = null;

/**
 * Initialize metadata processing with dependency injection (following VLM pattern)
 */
export function initializeMetadataProcessing(provider: MetadataVariablesProvider): void {
	variablesProvider = provider;
}

// ============================================
// REACTIVE GETTERS (following VLM pattern)
// ============================================

/**
 * Get search term for dataset
 */
export function getSearchTerm(datasetName: string): string {
	return metadataSearchTerms[datasetName] || '';
}

/**
 * Get all variables for dataset (reactive)
 */
export function getVariablesForDataset(datasetName: string): ValueLevelMetadata[] {
	if (!variablesProvider) return [];
	return variablesProvider.getVariablesForDataset(datasetName);
}

/**
 * Get filtered variables based on search term (reactive)
 */
export function getFilteredVariables(datasetName: string): ValueLevelMetadata[] {
	const allVariables = getVariablesForDataset(datasetName);
	const searchTerm = getSearchTerm(datasetName);
	
	
	if (!searchTerm) return allVariables;
	
	const searchLower = searchTerm.toLowerCase();
	return allVariables.filter((v) =>
		v.variable?.name?.toLowerCase().includes(searchLower) ||
		v.variable?.description?.toLowerCase().includes(searchLower)
	);
}

/**
 * Check if expansion key is expanded for dataset
 */
export function isExpanded(datasetName: string, expansionKey: string): boolean {
	return metadataExpansions[datasetName]?.has(expansionKey) || false;
}

// ============================================
// DIRECT MANIPULATION (following VLM pattern)
// ============================================

/**
 * Initialize metadata state for a dataset
 */
export function initializeMetadata(datasetName: string): void {
	if (!metadataExpansions[datasetName]) {
		metadataExpansions[datasetName] = new Set();
	}
	if (!metadataSearchTerms[datasetName]) {
		metadataSearchTerms[datasetName] = '';
	}
}

/**
 * Update search term for dataset
 */
export function updateSearchTerm(datasetName: string, term: string): void {
	metadataSearchTerms[datasetName] = term;
}

/**
 * Toggle expansion state for a key
 */
export function toggleExpansion(datasetName: string, expansionKey: string): void {
	if (!metadataExpansions[datasetName]) {
		metadataExpansions[datasetName] = new Set();
	}
	
	const expansions = metadataExpansions[datasetName];
	if (expansions.has(expansionKey)) {
		expansions.delete(expansionKey);
	} else {
		expansions.add(expansionKey);
	}
}

/**
 * Expand all sections for dataset
 */
export function expandAll(datasetName: string, expansionKeys: string[]): void {
	metadataExpansions[datasetName] = new Set(expansionKeys);
}

/**
 * Collapse all sections for dataset
 */
export function collapseAll(datasetName: string): void {
	metadataExpansions[datasetName] = new Set();
}

/**
 * Clear metadata state for dataset
 */
export function clearMetadata(datasetName: string): void {
	delete metadataExpansions[datasetName];
	delete metadataSearchTerms[datasetName];
}

/**
 * Clear all metadata state
 */
export function resetAllMetadata(): void {
	Object.keys(metadataExpansions).forEach(key => delete metadataExpansions[key]);
	Object.keys(metadataSearchTerms).forEach(key => delete metadataSearchTerms[key]);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get expansion state snapshot for dataset
 */
export function getExpansionSnapshot(datasetName: string): string[] {
	return Array.from(metadataExpansions[datasetName] || []);
}

/**
 * Check if dataset has any expanded sections
 */
export function hasExpansions(datasetName: string): boolean {
	return (metadataExpansions[datasetName]?.size || 0) > 0;
}

/**
 * Get datasets with metadata state
 */
export function getActiveDatasets(): string[] {
	const searchDatasets = Object.keys(metadataSearchTerms);
	const expansionDatasets = Object.keys(metadataExpansions);
	return [...new Set([...searchDatasets, ...expansionDatasets])];
}

// ============================================
// DEBUG HELPERS (for development)
// ============================================

if (typeof window !== 'undefined') {
	// @ts-ignore - for debugging
	window.__metadataComponentsState = {
		metadataExpansions,
		metadataSearchTerms,
		getSearchTerm,
		getFilteredVariables,
		toggleExpansion,
		updateSearchTerm,
		isExpanded
	};
}