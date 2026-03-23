/**
 * VLM UI State - Direct Values Pattern
 * Following STATE_MANAGEMENT_GUIDELINES.md - Direct Values Pattern for performance-critical state
 *
 * Use Case: High-frequency updates (table interactions, column management)
 * Pattern: Direct manipulation for maximum performance
 */

import type { VLMViewMode } from '../types/index.js';

// ============================================
// DIRECT VALUES PATTERN - PERFORMANCE STATE
// ============================================

// Column widths per dataset (datasetId -> column -> width)
export const columnWidths = $state<Record<string, Record<string, number>>>({});

// Column order per dataset (datasetId -> column array)
export const columnOrder = $state<Record<string, string[]>>({});

// Column visibility per dataset (datasetId -> column -> visible)
export const columnVisibility = $state<Record<string, Record<string, boolean>>>({});

// Expanded sections per dataset (for collapsible content)
export const expandedSections = $state<Record<string, Set<string>>>({});

// PARAMCD filters per dataset (datasetId -> filter string)
export const paramcdFilters = $state<Record<string, string>>({});

// View mode per dataset (datasetId -> 'compact' | 'expanded')
export const viewModes = $state<Record<string, VLMViewMode>>({});

// ============================================
// INITIALIZATION FUNCTIONS
// ============================================

export function initializeVLM(datasetId: string, columns: string[]) {
	console.log(`[vlmUIState] Initializing VLM UI for dataset: ${datasetId}`);

	// Initialize column widths with defaults
	if (!columnWidths[datasetId]) {
		columnWidths[datasetId] = {};
		columns.forEach((column) => {
			if (!columnWidths[datasetId][column]) {
				columnWidths[datasetId][column] = getDefaultColumnWidth(column);
			}
		});
	}

	// Initialize column order
	if (!columnOrder[datasetId]) {
		columnOrder[datasetId] = [...columns];
	}

	// Initialize column visibility
	if (!columnVisibility[datasetId]) {
		columnVisibility[datasetId] = {};
		columns.forEach((column) => {
			columnVisibility[datasetId][column] = true;
		});
	}

	// Initialize expanded sections
	if (!expandedSections[datasetId]) {
		expandedSections[datasetId] = new Set();
	}

	// Initialize PARAMCD filter
	if (!paramcdFilters[datasetId]) {
		paramcdFilters[datasetId] = '';
	}

	// Initialize view mode (default to compact)
	if (!viewModes[datasetId]) {
		viewModes[datasetId] = 'compact';
	}
}

function getDefaultColumnWidth(column: string): number {
	// Set wider defaults for common columns
	switch (column) {
		case 'PARAMCD':
			return 120;
		case 'PARAM':
			return 200;
		case 'METHOD':
			return 180;
		default:
			return 150;
	}
}

// ============================================
// COLUMN WIDTH ACTIONS - DIRECT MANIPULATION
// ============================================

export function updateColumnWidth(datasetId: string, column: string, width: number) {
	if (!columnWidths[datasetId]) {
		columnWidths[datasetId] = {};
	}
	// Reassign to trigger Svelte reactivity
	columnWidths[datasetId] = {
		...columnWidths[datasetId],
		[column]: Math.max(50, width)
	};
}

export function getColumnWidth(datasetId: string, column: string, defaultWidth: number = 150): number {
	return columnWidths[datasetId]?.[column] ?? getDefaultColumnWidth(column);
}

// ============================================
// COLUMN VISIBILITY ACTIONS - DIRECT MANIPULATION  
// ============================================

export function toggleColumnVisibility(datasetId: string, column: string) {
	if (!columnVisibility[datasetId]) {
		columnVisibility[datasetId] = {};
	}

	// Keep PARAMCD and PARAM always visible
	if (column === 'PARAMCD' || column === 'PARAM') {
		return;
	}

	const current = columnVisibility[datasetId][column] ?? true;
	// Direct manipulation
	columnVisibility[datasetId][column] = !current;
}

export function isColumnVisible(datasetId: string, column: string): boolean {
	// PARAMCD and PARAM are always visible
	if (column === 'PARAMCD' || column === 'PARAM') {
		return true;
	}

	return columnVisibility[datasetId]?.[column] ?? true;
}

export function getVisibleColumns(datasetId: string, allColumns: string[]): string[] {
	if (!allColumns) return [];
	return allColumns.filter((column) => isColumnVisible(datasetId, column));
}

export function showAllColumns(datasetId: string, allColumns: string[]) {
	if (!columnVisibility[datasetId]) {
		columnVisibility[datasetId] = {};
	}
	// Direct manipulation for performance
	allColumns.forEach((column) => {
		columnVisibility[datasetId][column] = true;
	});
}

// ============================================
// COLUMN ORDER ACTIONS - DIRECT MANIPULATION
// ============================================

export function updateColumnOrder(datasetId: string, newOrder: string[]) {
	// Direct array replacement
	columnOrder[datasetId] = [...newOrder];
}

export function getColumnOrder(datasetId: string): string[] {
	return columnOrder[datasetId] || [];
}

// ============================================
// PARAMCD FILTER ACTIONS - DIRECT MANIPULATION
// ============================================

export function updateParamcdFilter(datasetId: string, filter: string) {
	// Direct string assignment
	paramcdFilters[datasetId] = filter;
}

export function getParamcdFilter(datasetId: string): string {
	return paramcdFilters[datasetId] || '';
}

export function clearParamcdFilter(datasetId: string) {
	paramcdFilters[datasetId] = '';
}

// ============================================
// SECTION EXPANSION ACTIONS - DIRECT MANIPULATION
// ============================================

export function toggleSection(datasetId: string, sectionId: string) {
	if (!expandedSections[datasetId]) {
		expandedSections[datasetId] = new Set();
	}

	// Create a new Set to trigger Svelte 5 reactivity across package boundaries
	const currentSections = expandedSections[datasetId];
	const newSections = new Set(currentSections);
	
	if (newSections.has(sectionId)) {
		newSections.delete(sectionId);
	} else {
		newSections.add(sectionId);
	}
	
	expandedSections[datasetId] = newSections;
}

export function isSectionExpanded(datasetId: string, sectionId: string): boolean {
	return expandedSections[datasetId]?.has(sectionId) ?? false;
}

export function getAllExpandableSectionIds(datasetId: string): string[] {
	return Array.from(expandedSections[datasetId] || []);
}

export function collapseAllRowSections(datasetId: string) {
	// Create a new empty Set to trigger Svelte 5 reactivity
	expandedSections[datasetId] = new Set();
}

export function expandAllRowSections(datasetId: string, allSectionIds: string[]) {
	// Create a new Set with all section IDs to trigger Svelte 5 reactivity
	expandedSections[datasetId] = new Set(allSectionIds);
}

// ============================================
// VIEW MODE ACTIONS - DIRECT MANIPULATION
// ============================================

/**
 * Gets the current view mode for a dataset
 */
export function getViewMode(datasetId: string): VLMViewMode {
	return viewModes[datasetId] || 'compact';
}

/**
 * Sets the view mode for a dataset
 */
export function setViewMode(datasetId: string, mode: VLMViewMode): void {
	viewModes[datasetId] = mode;
}

/**
 * Toggles between compact and expanded view modes
 */
export function toggleViewMode(datasetId: string): void {
	const current = viewModes[datasetId] || 'compact';
	viewModes[datasetId] = current === 'compact' ? 'expanded' : 'compact';
}

/**
 * Checks if expanded mode is active for a dataset
 */
export function isExpandedMode(datasetId: string): boolean {
	return viewModes[datasetId] === 'expanded';
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

export function resetVLM(datasetId: string) {
	// Direct deletion for memory cleanup
	delete columnWidths[datasetId];
	delete columnOrder[datasetId];
	delete columnVisibility[datasetId];
	delete expandedSections[datasetId];
	delete paramcdFilters[datasetId];
	delete viewModes[datasetId];
}

export function resetAllVLM() {
	// Clear all state - direct manipulation
	Object.keys(columnWidths).forEach((key) => delete columnWidths[key]);
	Object.keys(columnOrder).forEach((key) => delete columnOrder[key]);
	Object.keys(columnVisibility).forEach((key) => delete columnVisibility[key]);
	Object.keys(expandedSections).forEach((key) => delete expandedSections[key]);
	Object.keys(paramcdFilters).forEach((key) => delete paramcdFilters[key]);
	Object.keys(viewModes).forEach((key) => delete viewModes[key]);
}