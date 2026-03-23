<script lang="ts">
	/**
	 * ClinicalDataTableV3 - Event-Driven Clinical Data Table
	 *
	 * Orchestrator component that delegates to:
	 * - tableState: State management and data processing
	 * - HeaderRow: Column headers with sort, drag-drop, resize
	 * - FilterRow: Inline filter inputs
	 * - ChartFilterRow: Visual chart-based filters
	 * - VirtualizedBody: Virtual scrolling table body
	 * - StatusBar: Row count and status display
	 */

	import { onMount, onDestroy, untrack } from 'svelte';
	import { createTableState } from './state/tableState.svelte';
	import { HeaderRow, FilterBar } from './TableHeader';
	import { FilterRow } from './TableHeader';
	import { VirtualizedBody } from './TableBody';
	import { StatusBar } from './TableFooter';
	import { ChartFilterRow } from './components/chart-filters';
	import type { DefineVariable, DatasetDetails } from './chart-filters';
	import type { SortConfig } from './types/sorting';
	import type { SerializedFilter, Filter } from './types/filters';
	import type { ValidationCheckDetail, ColumnValidationInfo } from './types/validation';

	export type { ValidationCheckDetail, ColumnValidationInfo };

	// Clinical data state interface (from app)
	export interface ClinicalDataState {
		getSelectedDatasetId: () => string | null;
		getDatasets: () => Record<string, any>;
	}

	// Worker state interface (minimal - for V2 compatibility)
	export interface WorkerState {
		[key: string]: any;
	}

	// Props interface
	interface Props {
		dataState: ClinicalDataState;
		datasetId: string;
		height?: string | number;
		enableCdiscPriority?: boolean;
		rowHeight?: number;
		overscan?: number;

		// V2 Compatibility props (unused but accepted)
		workerState?: WorkerState | null;
		emergencyColumnCount?: number;

		// Persistence (Controlled component pattern)
		initialFilters?: SerializedFilter[];
		initialSort?: SortConfig[];
		initialColumnWidths?: Record<string, number>;
		initialVisibleColumns?: string[];
		initialColumnOrder?: string[];

		// Callbacks
		onMetricStart?: (metric: string) => void;
		onMetricEnd?: (metric: string) => void;
		onFilterChange?: (filters: SerializedFilter[]) => void;
		onSortChange?: (sorts: SortConfig[]) => void;
		onColumnWidthChange?: (widths: Record<string, number>) => void;
		onVisibilityChange?: (visibleColumns: string[]) => void;
		onColumnOrderChange?: (columnOrder: string[]) => void;
		onError?: (error: Error) => void;

		// Chart Filters
		showChartFilters?: boolean;
		chartFilterHeight?: number;
		defineVariables?: DefineVariable[];
		datasetDetails?: DatasetDetails;
		showAllCodelistValues?: boolean;
		chartLabelFormat?: 'code' | 'decode' | 'both';

		// Validation
		validationResults?: Map<string, ColumnValidationInfo>;
		onValidationBadgeClick?: (columnId: string, affectedRows: number[], ruleId?: string) => void;
	}

	let {
		dataState,
		datasetId,
		height = '100%',
		enableCdiscPriority = false,
		rowHeight = 32,
		overscan = 5,
		workerState,
		emergencyColumnCount = 5,
		initialFilters,
		initialSort,
		initialColumnWidths,
		initialVisibleColumns,
		initialColumnOrder,
		onMetricStart,
		onMetricEnd,
		onFilterChange,
		onSortChange,
		onColumnWidthChange,
		onVisibilityChange,
		onColumnOrderChange,
		onError,
		showChartFilters = false,
		chartFilterHeight = 70,
		defineVariables,
		datasetDetails,
		showAllCodelistValues = false,
		chartLabelFormat = 'code',
		validationResults,
		onValidationBadgeClick
	}: Props = $props();

	// Convert height to numeric for state
	const containerHeight = $derived(
		typeof height === 'number' ? height : parseInt(String(height)) || 600
	);

	// Create table state
	const state = createTableState({
		enableCdiscPriority,
		rowHeight,
		overscan,
		containerHeight,
		initialFilters,
		initialSort,
		initialColumnWidths,
		initialVisibleColumns,
		initialColumnOrder,
		onMetricStart,
		onMetricEnd,
		onFilterChange,
		onSortChange,
		onColumnWidthChange,
		onVisibilityChange,
		onColumnOrderChange
	});

	// Build a Map<string, ColumnConfig> for FilterBar
	const columnsMap = $derived.by(() => {
		const map = new Map<string, import('./types/columns').ColumnConfig>();
		for (const col of state.columns) {
			map.set(col.id, col);
		}
		return map;
	});

	// DOM reference for scroll handling and auto-fit
	let scrollContainerEl: HTMLDivElement;

	// ============================================================
	// AUTO-FIT COLUMN WIDTH
	// ============================================================

	function calculateAutoFitWidth(columnId: string): number {
		const column = state.columns.find((c) => c.id === columnId);
		if (!column) return 150;

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return 150;

		const tableCell = scrollContainerEl?.querySelector('td');
		const headerCell = scrollContainerEl?.querySelector('th');

		let bodyFont = '14px ui-sans-serif, system-ui, sans-serif';
		let headerFont = '600 14px ui-sans-serif, system-ui, sans-serif';

		if (tableCell) {
			const computed = getComputedStyle(tableCell);
			bodyFont = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
		}
		if (headerCell) {
			const computed = getComputedStyle(headerCell);
			headerFont = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
		}

		let maxWidth = 50;

		ctx.font = headerFont;
		const headerWidth = ctx.measureText(column.header).width + 48;
		maxWidth = Math.max(maxWidth, headerWidth);

		ctx.font = bodyFont;
		for (const row of state.visibleRows) {
			const value = String(row[columnId] ?? '');
			const textWidth = ctx.measureText(value).width + 32;
			maxWidth = Math.max(maxWidth, textWidth);
		}

		return Math.ceil(maxWidth);
	}

	function handleColumnAutoFit(columnId: string) {
		const optimalWidth = calculateAutoFitWidth(columnId);
		state.handleColumnResize(columnId, optimalWidth);
	}

	// ============================================================
	// DRAG AND DROP EVENT HANDLERS
	// ============================================================

	function handleDragStart(e: DragEvent, columnId: string) {
		const target = e.target as HTMLElement;
		if (target.closest('[role="separator"]') || target.closest('.chart-mode-trigger')) {
			e.preventDefault();
			return;
		}

		state.handleDragStart(columnId);
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', columnId);
		}
	}

	function handleDragOver(e: DragEvent, columnId: string) {
		e.preventDefault();
		state.handleDragOver(columnId);
	}

	function handleDrop(e: DragEvent, targetColumnId: string) {
		e.preventDefault();
		state.handleDrop(targetColumnId);
	}

	// ============================================================
	// SCROLL HANDLING
	// ============================================================

	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		state.handleScroll(target.scrollTop);
	}

	// ============================================================
	// SYNC CONFIG CHANGES
	// ============================================================

	$effect(() => {
		state.updateVirtualizationConfig({
			height: containerHeight,
			rowHeight,
			overscan
		});
	});

	// ============================================================
	// DATASET CHANGES
	// ============================================================

	$effect(() => {
		if (datasetId) {
			const tEffect = performance.now();
			console.log(`[ClinicalDataTableV3] ⏱️ $effect fired for ${datasetId} at ${tEffect.toFixed(1)}`);
			untrack(() => {
				state.initializeDataset(dataState, datasetId);
			});
			console.log(`[ClinicalDataTableV3] ⏱️ $effect completed in ${(performance.now()-tEffect).toFixed(1)}ms`);
		}
	});

	// ============================================================
	// LIFECYCLE
	// ============================================================

	onMount(() => {
		state.mount();
	});

	onDestroy(() => {
		state.destroy();
	});

	// ============================================================
	// PUBLIC API (Sidebar Integration)
	// ============================================================

	export function getAvailableColumns(): string[] {
		return state.getAvailableColumns();
	}

	export function getVisibleColumns(): string[] {
		return state.getVisibleColumnIds();
	}

	export function toggleColumnVisibility(columnId: string): void {
		state.toggleColumnVisibility(columnId);
	}

	export function showAllColumns(): void {
		state.showAllColumns();
	}

	export function hideAllColumns(): void {
		state.hideAllColumns();
	}

	export function resetColumns(): void {
		state.resetColumns();
	}

	export function reorderColumns(draggedColumnId: string, targetColumnId: string): void {
		state.reorderColumns(draggedColumnId, targetColumnId);
	}

	export function applyFilter(columnId: string, filter: Filter | null): void {
		state.handleFilterChange(columnId, filter);
	}

	export function clearFilter(columnId: string): void {
		state.handleFilterChange(columnId, null);
	}

	export function clearAllFilters(): void {
		state.handleClearAllFilters();
	}
</script>

<div
	class="clinical-data-table-v3"
	style="height: {typeof height === 'number' ? `${height}px` : height}"
>
	<!-- Filter Bar (active filter chips) -->
	<FilterBar
		filters={state.filters}
		columns={columnsMap}
		filterCombination={state.filterCombination}
		onFilterChange={state.handleFilterChange}
		onFilterCombinationChange={state.handleFilterCombinationChange}
		onClearAll={state.handleClearAllFilters}
	/>

	<!-- Table with Inline Filters and Virtual Scrolling -->
	<div class="table-container">
		<div
			bind:this={scrollContainerEl}
			onscroll={handleScroll}
			class="overflow-auto bg-background h-full"
		>
			<table
				style="width: {state.totalWidth}px; table-layout: fixed;"
				class="border-collapse bg-background"
			>
				<colgroup>
					{#each state.visibleColumns as column (column.id)}
						{@const width = state.currentColumnWidths[column.id] || column.width || 150}
						<col style="width: {width}px;" />
					{/each}
				</colgroup>
				<thead class="sticky top-0 bg-muted z-10">
					<!-- Column Headers -->
					<HeaderRow
						columns={state.columns}
						columnWidths={state.currentColumnWidths}
						sortConfigs={state.sortConfigs}
						distributionTypes={state.distributionTypes}
						{showChartFilters}
						chartDisplayModes={state.chartDisplayModes}
						draggedColumnId={state.draggedColumnId}
						dragOverColumnId={state.dragOverColumnId}
						{validationResults}
						onSort={state.handleColumnHeaderClick}
						onResize={state.handleColumnResize}
						onAutoFit={handleColumnAutoFit}
						onChartModeChange={state.handleChartModeChange}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragLeave={state.handleDragLeave}
						onDrop={handleDrop}
						onDragEnd={state.handleDragEnd}
						{onValidationBadgeClick}
					/>

					<!-- Chart Filter Row -->
					<ChartFilterRow
						data={state.rawData}
						crossFilterData={state.processedData}
						columns={state.columns}
						columnWidths={state.currentColumnWidths}
						{defineVariables}
						{datasetDetails}
						activeFilters={state.filters}
						height={chartFilterHeight}
						visible={showChartFilters}
						{showAllCodelistValues}
						labelFormat={chartLabelFormat}
						chartDisplayModes={state.chartDisplayModes}
						onFilterChange={state.handleFilterChange}
						onDistributionTypesChange={state.handleDistributionTypesChange}
					/>

					<!-- Filter Row -->
					<FilterRow
						columns={state.columns}
						columnWidths={state.currentColumnWidths}
						filters={state.filters}
						onFilterChange={state.handleFilterChange}
					/>
				</thead>

				<!-- Virtualized Body -->
				<VirtualizedBody
					rows={state.visibleRows}
					allColumns={state.columns}
					columnWidths={state.currentColumnWidths}
					visibleWindow={state.visibleWindow}
					rowHeight={state.rowHeight}
					totalHeight={state.totalHeight}
					totalRows={state.processedData.length}
					filterCount={state.filters.size}
				/>
			</table>
		</div>
	</div>

	<!-- Status Bar -->
	<StatusBar
		totalRows={state.rawData.length}
		filteredRows={state.processedData.length}
		filterCount={state.filters.size}
		sortCount={state.sortConfigs.length}
	/>
</div>

<style>
	.clinical-data-table-v3 {
		display: flex;
		flex-direction: column;
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.table-container {
		flex: 1;
		overflow: hidden;
	}
</style>
