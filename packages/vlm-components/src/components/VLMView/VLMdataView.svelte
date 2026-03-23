<!-- @sden99/vlm-components VLMdataView.svelte -->
<script lang="ts">
	import type { VLMdataViewProps } from '../../types/index.js';
	import {
		initializeVLM,
		isSectionExpanded,
		getAllExpandableSectionIds,
		collapseAllRowSections,
		expandAllRowSections,
		columnVisibility,
		paramcdFilters,
		viewModes,
		toggleViewMode,
		getViewMode
	} from '../../state/vlmUIState.svelte.ts';
	import VLMFilterControls from './VLMFilterControls.svelte';
	import VLMTable from './VLMTable.svelte';
	import VLMTableNew from './VLMTableNew.svelte';
	import { normalizeDatasetId } from '@sden99/dataset-domain';

	let { 
		datasetName, 
		stateProvider,
		uiComponents = {}
	} = $props<VLMdataViewProps>();

	// Extract UI components with defaults
	const Alert = uiComponents.Alert || 'div';
	const Button = uiComponents.Button || 'button';
	const ChevronDown = uiComponents.ChevronDown || (() => '▼');
	const ChevronRight = uiComponents.ChevronRight || (() => '▶');

	// ============================================
	// REACTIVE DERIVED STATE - FOLLOWING PROVIDER PATTERN
	// ============================================

	let cleanDatasetName = $derived(normalizeDatasetId(datasetName));

	// Get current view mode from local state
	let currentViewMode = $derived(viewModes[cleanDatasetName] || 'compact');
	let isExpanded = $derived(currentViewMode === 'expanded');

	// Get VLM table data with current view mode
	let vlmTableData = $derived(stateProvider.getActiveVLMTableData(currentViewMode));

	// Get column visibility from our local state (Direct Values Pattern)
	let visibleColumns = $derived.by(() => {
		if (!vlmTableData?.columns) return [];

		// Access local reactive state
		const visibility = columnVisibility[cleanDatasetName];
		if (!visibility) {
			// Initialize if needed, then use all columns as default
			return vlmTableData.columns.slice();
		}

		// Filter columns based on visibility state
		const cols = vlmTableData.columns.filter((col) => {
			// PARAMCD and PARAM are always visible
			if (col === 'PARAMCD' || col === 'PARAM') return true;
			// Other columns use the visibility state
			return visibility[col] !== false;
		});

		return cols;
	});

	// Get PARAMCD filter from local state (Direct Values Pattern)
	let paramcdFilter = $derived(paramcdFilters[cleanDatasetName] || '');

	// Filter rows based on PARAMCD filter
	let filteredRows = $derived.by(() => {
		const rows = vlmTableData?.rows || [];
		if (!paramcdFilter.trim()) {
			return rows;
		}
		const filter = paramcdFilter.trim().toLowerCase();
		return rows.filter((row: any) =>
			String(row.PARAMCD || '')
				.toLowerCase()
				.includes(filter)
		);
	});

	// Check if all expandable sections are expanded
	let allSectionsExpanded = $derived.by(() => {
		if (!filteredRows.length) return false;
		
		// Collect all possible expandable section IDs from the current data
		const allPossibleSectionIds: string[] = [];
		filteredRows.forEach((row) => {
			visibleColumns.forEach((column) => {
				const variable = row[column];
				if (variable && typeof variable === 'object') {
					const rowKey = row.rowKey;
					if (variable.method) allPossibleSectionIds.push(`${rowKey}_${column}_method`);
					if (variable.codeList) allPossibleSectionIds.push(`${rowKey}_${column}_codelist`);
					if (variable.whereClause) allPossibleSectionIds.push(`${rowKey}_${column}_whereClause`);
					if (variable.comments?.length) allPossibleSectionIds.push(`${rowKey}_${column}_comment`);
					if (variable.origin) allPossibleSectionIds.push(`${rowKey}_${column}_origin`);
					allPossibleSectionIds.push(`${rowKey}_${column}_debug`);
				}
			});
		});
		
		if (allPossibleSectionIds.length === 0) return false;
		return allPossibleSectionIds.every((sectionId) => isSectionExpanded(cleanDatasetName, sectionId));
	});

	// Initialize VLM when data is available
	$effect(() => {
		if (vlmTableData?.columns && cleanDatasetName) {
			initializeVLM(cleanDatasetName, vlmTableData.columns);
		}
	});

	// Debug logging for view mode changes
	$effect(() => {
		console.log('[VLMdataView] View mode debug:', {
			cleanDatasetName,
			currentViewMode,
			rowCount: vlmTableData?.rows?.length || 0,
			compactRowCount: vlmTableData?.compactRowCount,
			expandedRowCount: vlmTableData?.expandedRowCount,
			stratificationColumns: vlmTableData?.stratificationColumns ? Array.from(vlmTableData.stratificationColumns) : [],
			columns: vlmTableData?.columns
		});
	});

	// ============================================
	// EVENT HANDLERS - NO CUSTOM EVENTS NEEDED
	// ============================================

	function handleExpandAll() {
		if (!filteredRows.length || !cleanDatasetName) return;
		
		// Collect all possible expandable section IDs from the current data
		const allPossibleSectionIds: string[] = [];
		filteredRows.forEach((row) => {
			visibleColumns.forEach((column) => {
				const variable = row[column];
				if (variable && typeof variable === 'object') {
					const rowKey = row.rowKey;
					if (variable.method) allPossibleSectionIds.push(`${rowKey}_${column}_method`);
					if (variable.codeList) allPossibleSectionIds.push(`${rowKey}_${column}_codelist`);
					if (variable.whereClause) allPossibleSectionIds.push(`${rowKey}_${column}_whereClause`);
					if (variable.comments?.length) allPossibleSectionIds.push(`${rowKey}_${column}_comment`);
					if (variable.origin) allPossibleSectionIds.push(`${rowKey}_${column}_origin`);
					allPossibleSectionIds.push(`${rowKey}_${column}_debug`);
				}
			});
		});
		
		expandAllRowSections(cleanDatasetName, allPossibleSectionIds);
	}

	function handleCollapseAll() {
		if (!cleanDatasetName) return;
		collapseAllRowSections(cleanDatasetName);
	}
</script>

{#if !stateProvider.hasVLMData()}
	<Alert variant="info">
		No VLM data available for the selected dataset.
	</Alert>
{:else if vlmTableData?.rows?.length === 0}
	<Alert variant="info">
		No VLM records found for the current dataset.
	</Alert>
{:else if !vlmTableData}
	<Alert variant="warning">
		Loading VLM data...
	</Alert>
{:else}
	<div class="vlm-data-view h-full flex flex-col">
		<!-- Header with controls -->
		<div class="mb-4 flex items-center justify-between gap-4">
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={allSectionsExpanded ? handleCollapseAll : handleExpandAll}
					class="flex items-center gap-1"
				>
					{#if allSectionsExpanded}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
					{allSectionsExpanded ? 'Collapse All' : 'Expand All'}
				</Button>
			</div>

			<!-- View Mode Toggle -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">View:</span>
				<div class="flex rounded-md border border-input">
					<button
						onclick={() => toggleViewMode(cleanDatasetName)}
						class="px-3 py-1.5 text-xs font-medium transition-colors rounded-l-md
							{!isExpanded
							? 'bg-primary text-primary-foreground'
							: 'bg-background text-muted-foreground hover:bg-muted'}"
					>
						Compact
					</button>
					<button
						onclick={() => toggleViewMode(cleanDatasetName)}
						class="px-3 py-1.5 text-xs font-medium transition-colors rounded-r-md border-l border-input
							{isExpanded
							? 'bg-primary text-primary-foreground'
							: 'bg-background text-muted-foreground hover:bg-muted'}"
					>
						Expanded
					</button>
				</div>
				{#if vlmTableData?.compactRowCount && vlmTableData?.expandedRowCount}
					<span class="text-xs text-muted-foreground">
						({isExpanded ? vlmTableData.expandedRowCount : vlmTableData.compactRowCount} rows)
					</span>
				{/if}
			</div>
		</div>

		<!-- Filter Controls -->
		<div class="flex-none">
			<VLMFilterControls 
				{cleanDatasetName} 
				allColumns={vlmTableData?.columns || []} 
				uiComponents={{
					Input: uiComponents.Input,
					Button: uiComponents.Button
				}}
			/>
		</div>

		<!-- Data Table -->
		{#if filteredRows.length > 0}
			<div class="flex-grow min-h-0">
				<VLMTable
					rows={filteredRows}
					visibleColumns={visibleColumns}
					allColumns={vlmTableData?.columns || []}
					{cleanDatasetName}
					stratificationColumns={vlmTableData?.stratificationColumns || new Set()}
				/>
			</div>
		{:else}
			<Alert variant="info">
				No VLM records match the current filter criteria.
			</Alert>
		{/if}
	</div>
{/if}

<style>
	.vlm-data-view {
		gap: 1rem;
	}
</style>