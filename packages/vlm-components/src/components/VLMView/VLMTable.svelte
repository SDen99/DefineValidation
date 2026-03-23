<!-- @sden99/vlm-components VLMTable.svelte -->
<script lang="ts">
	import type { VLMTableProps } from '../../types/index.js';
	import { updateColumnOrder, updateColumnWidth, getColumnWidth } from '../../state/vlmUIState.svelte';
	import VLMTableHeader from './VLMTableHeader.svelte';
	import VLMTableRow from './VLMTableRow.svelte';

	let { 
		rows, 
		visibleColumns, 
		allColumns, 
		cleanDatasetName, 
		stratificationColumns
	} = $props<VLMTableProps>();

	let headerContainer = $state<HTMLElement | null>(null);
	let scrollContainer = $state<HTMLElement | null>(null);
	let scrollLeft = $state(0);

	// ============================================
	// COLUMN WIDTH MANAGEMENT - FOLLOWING DATATABLE PATTERN
	// ============================================

	// Derived column widths map (reactive to state changes)
	let columnWidthsMap = $derived.by(() => {
		const widthsMap: Record<string, number> = {};
		for (const col of visibleColumns) {
			widthsMap[col] = getColumnWidth(cleanDatasetName, col, 150);
		}
		return widthsMap;
	});

	let totalWidth = $derived(
		visibleColumns.reduce((sum, col) => sum + columnWidthsMap[col], 0)
	);

	// ============================================
	// EVENT HANDLERS - FOLLOWING DATATABLE PATTERN
	// ============================================

	function handleColumnReorder(from: string, to: string) {
		console.log(`[VLM] Column reorder: ${from} -> ${to}`);
		const newOrder = [...allColumns];
		const fromIndex = newOrder.indexOf(from);
		const toIndex = newOrder.indexOf(to);

		if (fromIndex !== -1 && toIndex !== -1) {
			const [removed] = newOrder.splice(fromIndex, 1);
			newOrder.splice(toIndex, 0, removed);
			updateColumnOrder(cleanDatasetName, newOrder);
		}
	}

	function handleColumnResize(column: string, width: number) {
		if (!width || width < 50) return;
		updateColumnWidth(cleanDatasetName, column, width);
	}

	// ============================================
	// SCROLL SYNCING - FOLLOWING DATATABLE PATTERN
	// ============================================

	function handleBodyScroll(e: Event) {
		const target = e.target as HTMLElement;
		const newScrollLeft = target.scrollLeft;

		// Sync horizontal scroll with header
		if (newScrollLeft !== scrollLeft) {
			scrollLeft = newScrollLeft;
			if (headerContainer && headerContainer.scrollLeft !== newScrollLeft) {
				headerContainer.scrollLeft = newScrollLeft;
			}
		}
	}

	function handleHeaderScroll(e: Event) {
		const target = e.target as HTMLElement;
		const newScrollLeft = target.scrollLeft;

		if (newScrollLeft !== scrollLeft) {
			scrollLeft = newScrollLeft;
			if (scrollContainer && scrollContainer.scrollLeft !== newScrollLeft) {
				scrollContainer.scrollLeft = newScrollLeft;
			}
		}
	}
</script>

<!-- FOLLOWING EXACT DATATABLE PATTERN -->
<div class="vlm-table-container">
	<!-- Header with horizontal scroll sync -->
	<div class="vlm-table-header" bind:this={headerContainer} onscroll={handleHeaderScroll}>
		<table style="width: {totalWidth}px; table-layout: fixed;" class="w-full text-sm">
			<colgroup>
				{#each visibleColumns as column}
					<col style="width: {columnWidthsMap[column]}px;" />
				{/each}
			</colgroup>
			<thead class="sticky top-0 z-10 border-b">
				<VLMTableHeader
					columns={visibleColumns}
					{stratificationColumns}
					onReorder={handleColumnReorder}
					onResize={handleColumnResize}
				/>
			</thead>
		</table>
	</div>

	<!-- Scrollable body -->
	<div class="vlm-table-body" bind:this={scrollContainer} onscroll={handleBodyScroll}>
		<table style="width: {totalWidth}px; table-layout: fixed;" class="w-full text-sm">
			<colgroup>
				{#each visibleColumns as column}
					<col style="width: {columnWidthsMap[column]}px;" />
				{/each}
			</colgroup>
			<tbody>
				{#each rows as row, index}
					<VLMTableRow
						{row}
						{index}
						columns={visibleColumns}
						columnWidths={columnWidthsMap}
						datasetName={cleanDatasetName}
						{stratificationColumns}
					/>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	/* VLM Table Container - uses theme variables for colors */
	.vlm-table-container {
		width: 100%;
		height: calc(100vh - 350px);
		display: flex;
		flex-direction: column;
	}

	.vlm-table-header {
		border-bottom: 1px solid hsl(var(--border));
		overflow-x: auto;
		overflow-y: hidden;
		background: hsl(var(--background));
		flex-shrink: 0;
		/* Hide scrollbar in header since body will show it */
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.vlm-table-header::-webkit-scrollbar {
		display: none;
	}

	.vlm-table-body {
		flex-grow: 1;
		min-height: 400px;
		overflow: auto;
		border: 1px solid hsl(var(--border));
	}

	/* VLM-specific table styling */
	:global(.vlm-table-container table) {
		border-collapse: collapse;
	}

	:global(.vlm-table-container th),
	:global(.vlm-table-container td) {
		border: 1px solid hsl(var(--border));
		padding: 8px 12px;
		text-align: left;
		overflow: hidden;
		word-wrap: break-word;
	}

	:global(.vlm-table-container th) {
		background-color: hsl(var(--muted));
		font-weight: 600;
	}
</style>