/**
 * VLM Reactive State Management
 * Svelte 5 reactive state wrapper for VLM processing
 * Migrated from vlmProcessingState.svelte.ts and vlmState.svelte.ts
 */

/// <reference path="./svelte-types.d.ts" />

import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { VLMTableData, GlobalStateProvider, VLMViewMode } from '../types';
import { VLMProcessingService } from '../services/VLMProcessingService';

// ============================================
// VLM UI STATE (per dataset)
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
// VLM PROCESSING STATE
// ============================================

let processingService: VLMProcessingService | null = null;

/**
 * Initializes the VLM processing service with state provider
 */
export function initializeVLMProcessing(stateProvider: GlobalStateProvider): void {
	processingService = new VLMProcessingService(stateProvider);
}

// ============================================
// REACTIVE GETTERS USING DERIVED STATE
// ============================================

/**
 * Gets VLM scoped variables reactively
 */
export function getVLMVariables(): ValueLevelMetadata[] {
	if (!processingService) return [];
	return processingService.getVLMScopedVariables();
}

/**
 * Gets all variables reactively
 */
export function getActiveVariables(): ValueLevelMetadata[] {
	if (!processingService) return [];
	return processingService.getAllVariables();
}

/**
 * Gets active VLM table data reactively
 * @param datasetId - Optional dataset ID to get view mode for
 */
export function getActiveVLMTableData(datasetId?: string): VLMTableData | null {
	if (!processingService) return null;
	const viewMode = datasetId ? getViewMode(datasetId) : 'compact';
	return processingService.getActiveVLMTableData(viewMode);
}

// ============================================
// VLM UI STATE MANAGEMENT FUNCTIONS
// ============================================

export function initializeVLM(datasetId: string, columns: string[]) {
	console.log(`[vlmState] Initializing VLM for dataset: ${datasetId}`);

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
// COLUMN WIDTH ACTIONS
// ============================================

export function updateColumnWidth(datasetId: string, column: string, width: number) {
	if (!columnWidths[datasetId]) {
		columnWidths[datasetId] = {};
	}
	columnWidths[datasetId][column] = Math.max(50, width); // Minimum width
}

export function getColumnWidth(
	datasetId: string,
	column: string,
	defaultWidth: number = 150
): number {
	return columnWidths[datasetId]?.[column] ?? getDefaultColumnWidth(column);
}

// ============================================
// COLUMN VISIBILITY ACTIONS
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

// ============================================
// COLUMN ORDER ACTIONS
// ============================================

export function updateColumnOrder(datasetId: string, newOrder: string[]) {
	columnOrder[datasetId] = [...newOrder];
}

export function getColumnOrder(datasetId: string): string[] {
	return columnOrder[datasetId] || [];
}

// ============================================
// PARAMCD FILTER ACTIONS
// ============================================

export function updateParamcdFilter(datasetId: string, filter: string) {
	paramcdFilters[datasetId] = filter;
}

export function getParamcdFilter(datasetId: string): string {
	return paramcdFilters[datasetId] || '';
}

export function clearParamcdFilter(datasetId: string): void {
	paramcdFilters[datasetId] = '';
}

export function showAllColumns(datasetId: string): void {
	if (!columnVisibility[datasetId]) return;

	Object.keys(columnVisibility[datasetId]).forEach((column) => {
		columnVisibility[datasetId][column] = true;
	});
}

// ============================================
// VIEW MODE ACTIONS
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
// EXPANDED SECTIONS ACTIONS - FIXED FOR SVELTE 5 REACTIVITY
// ============================================

export function toggleSection(datasetId: string, sectionId: string) {
	if (!expandedSections[datasetId]) {
		expandedSections[datasetId] = new Set();
	}

	const currentSections = expandedSections[datasetId];

	// FIXED: Create new Set to trigger reactivity
	if (currentSections.has(sectionId)) {
		const newSections = new Set(currentSections);
		newSections.delete(sectionId);
		expandedSections[datasetId] = newSections;
	} else {
		const newSections = new Set(currentSections);
		newSections.add(sectionId);
		expandedSections[datasetId] = newSections;
	}
}

export function isSectionExpanded(datasetId: string, sectionId: string): boolean {
	return expandedSections[datasetId]?.has(sectionId) || false;
}

export function getExpandedSections(datasetId: string): string[] {
	return expandedSections[datasetId] ? Array.from(expandedSections[datasetId]) : [];
}

// ============================================
// RESET FUNCTIONS
// ============================================

export function resetVLM(datasetId: string) {
	delete columnWidths[datasetId];
	delete columnOrder[datasetId];
	delete columnVisibility[datasetId];
	delete expandedSections[datasetId];
	delete paramcdFilters[datasetId];
	delete viewModes[datasetId];
}

export function resetAllVLM() {
	Object.keys(columnWidths).forEach((key) => delete columnWidths[key]);
	Object.keys(columnOrder).forEach((key) => delete columnOrder[key]);
	Object.keys(columnVisibility).forEach((key) => delete columnVisibility[key]);
	Object.keys(expandedSections).forEach((key) => delete expandedSections[key]);
	Object.keys(paramcdFilters).forEach((key) => delete paramcdFilters[key]);
	Object.keys(viewModes).forEach((key) => delete viewModes[key]);
}

// ============================================
// BULK OPERATIONS FOR EXPAND/COLLAPSE ALL
// ============================================

export function getAllExpandableSectionIds(datasetId: string, rows: any[]): string[] {
	const sectionIds: string[] = [];

	if (!rows) return sectionIds;

	// Generate all possible section IDs based on row data
	rows.forEach((row) => {
		Object.keys(row).forEach((column) => {
			if (column === 'PARAMCD' || column === 'PARAM' || column === 'rowKey') return;

			const cellData = row[column];
			if (cellData && typeof cellData === 'object') {
				const baseId = `${row.rowKey}_${column}`;

				// Add section IDs for each expandable section type
				if (cellData.method) {
					sectionIds.push(`${baseId}_method`);
				}
				if (cellData.whereClause?.conditions?.length) {
					sectionIds.push(`${baseId}_whereClause`);
				}
				if (cellData.comment) {
					sectionIds.push(`${baseId}_comment`);
				}
				if (cellData.codelist) {
					sectionIds.push(`${baseId}_codelist`);
				}
				if (cellData.origin) {
					sectionIds.push(`${baseId}_origin`);
				}
				// Debug section is always present
				sectionIds.push(`${baseId}_debug`);
			}
		});
	});

	return sectionIds;
}

export function expandAllRowSections(datasetId: string, rows: any[]): void {
	const allSectionIds = getAllExpandableSectionIds(datasetId, rows);
	if (!expandedSections[datasetId]) {
		expandedSections[datasetId] = new Set();
	}
	const newSections = new Set(expandedSections[datasetId]);
	allSectionIds.forEach((id) => newSections.add(id));
	expandedSections[datasetId] = newSections;
}

export function collapseAllRowSections(datasetId: string): void {
	expandedSections[datasetId] = new Set();
}

// ============================================
// PROCESSING SERVICE MANAGEMENT
// ============================================

export function clearProcessingCache(): void {
	processingService?.clearCache();
}

export function getProcessingStats(): any {
	return processingService?.getCacheStats() || { size: 0, maxSize: 0, lastKey: '' };
}

// ============================================
// DEBUG HELPERS (for development only)
// ============================================

if (typeof window !== 'undefined') {
	// @ts-ignore - for debugging
	window.__vlmProcessingState = {
		get vlmVariables() { return getVLMVariables(); },
		get allVariables() { return getActiveVariables(); },
		get activeVLMTableData() { return getActiveVLMTableData(); },
		getVLMVariables,
		getActiveVariables,
		getActiveVLMTableData,
		clearProcessingCache,
		getProcessingStats,
		// UI State
		columnWidths,
		columnOrder,
		columnVisibility,
		expandedSections,
		paramcdFilters,
		viewModes,
		// View mode helpers
		getViewMode,
		setViewMode,
		toggleViewMode,
		isExpandedMode
	};
}