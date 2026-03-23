<script lang="ts">
	/**
	 * VirtualizedBody - Virtual scrolling table body
	 *
	 * Renders only visible rows with spacers for performance.
	 */

	import type { DataRow } from '../types/core';
	import type { ColumnConfig } from '../types/columns';
	import type { VisibleWindow } from '../types/virtualization';

	interface Props {
		rows: DataRow[];
		allColumns: ColumnConfig[];
		columnWidths: Record<string, number>;
		visibleWindow: VisibleWindow;
		rowHeight: number;
		totalHeight: number;
		totalRows: number;
		filterCount: number;
	}

	let {
		rows,
		allColumns,
		columnWidths,
		visibleWindow,
		rowHeight,
		totalHeight,
		totalRows,
		filterCount
	}: Props = $props();

	// Only visible columns
	const visibleColumns = $derived(allColumns.filter((c) => c.visible));

	// Bottom spacer height calculation
	const bottomSpacerHeight = $derived(
		Math.max(0, totalHeight - visibleWindow.offsetY - rows.length * rowHeight)
	);
</script>

<tbody>
	<!-- Empty State -->
	{#if totalRows === 0}
		<tr>
			<td colspan={visibleColumns.length} class="text-center py-12 text-muted-foreground">
				<div class="flex flex-col items-center gap-2">
					<svg
						class="w-8 h-8 opacity-50"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div class="text-lg font-medium">No results found</div>
					<div class="text-sm">
						{#if filterCount > 0}
							Try adjusting your filters to see more results
						{:else}
							No data available
						{/if}
					</div>
				</div>
			</td>
		</tr>
	{:else}
		<!-- Top spacer for virtual scrolling -->
		{#if visibleWindow.offsetY > 0}
			<tr>
				<td
					colspan={visibleColumns.length}
					style="height: {visibleWindow.offsetY}px; padding: 0; border: none;"
				></td>
			</tr>
		{/if}

		<!-- Visible rows only -->
		{#each rows as row, index (visibleWindow.startIndex + index)}
			<tr class="hover:bg-accent/50" style="height: {rowHeight}px;">
				{#each visibleColumns as column (column.id)}
					<td
						class="border border-border px-3 py-1 text-foreground text-sm overflow-hidden text-ellipsis whitespace-nowrap"
					>
						{row[column.id] ?? ''}
					</td>
				{/each}
			</tr>
		{/each}

		<!-- Bottom spacer for virtual scrolling -->
		{#if bottomSpacerHeight > 0}
			<tr>
				<td
					colspan={visibleColumns.length}
					style="height: {bottomSpacerHeight}px; padding: 0; border: none;"
				></td>
			</tr>
		{/if}
	{/if}
</tbody>
