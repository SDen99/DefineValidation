<!-- @sden99/vlm-components VLMTableNew.svelte -->
<script lang="ts">
	import type { VLMTableProps } from '../../types/index.js';

	let {
		rows,
		visibleColumns,
		allColumns,
		cleanDatasetName,
		stratificationColumns
	} = $props<VLMTableProps>();

	// Drag and drop state
	let draggedColumn = $state<string | null>(null);
	let dragOverColumn = $state<string | null>(null);

	// Column configuration with basic sizing
	let columnWidths = $state<Record<string, number>>({});

	// Initialize default column widths
	$effect(() => {
		const defaultWidth = 150;
		visibleColumns.forEach(col => {
			if (!(col in columnWidths)) {
				columnWidths[col] = defaultWidth;
			}
		});
	});

	// Simple column management for native Svelte implementation
	let columns = $derived(visibleColumns.map(columnName => ({
		id: columnName,
		header: columnName,
		isStratification: stratificationColumns.has(columnName),
		width: columnWidths[columnName] || 150
	})));

	// Column reordering handlers
	function handleDragStart(e: DragEvent, columnId: string) {
		if (!e.dataTransfer) return;

		draggedColumn = columnId;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', columnId);
	}

	function handleDragOver(e: DragEvent, columnId: string) {
		e.preventDefault();
		if (draggedColumn && draggedColumn !== columnId) {
			dragOverColumn = columnId;
		}
	}

	function handleDragLeave() {
		dragOverColumn = null;
	}

	function handleDrop(e: DragEvent, targetColumnId: string) {
		e.preventDefault();

		if (draggedColumn && draggedColumn !== targetColumnId) {
			// For now, just clear the drag state - column reordering can be implemented later
			console.log('Would reorder', draggedColumn, 'to', targetColumnId);
		}

		draggedColumn = null;
		dragOverColumn = null;
	}

	// Column resizing
	let resizingColumn = $state<string | null>(null);
	let resizeStartX = $state(0);
	let resizeStartWidth = $state(0);

	function handleResizeStart(e: MouseEvent, columnId: string) {
		e.preventDefault();
		e.stopPropagation();

		resizingColumn = columnId;
		resizeStartX = e.clientX;
		resizeStartWidth = columnWidths[columnId] || 150;

		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);
	}

	function handleResizeMove(e: MouseEvent) {
		if (!resizingColumn) return;

		const diff = e.clientX - resizeStartX;
		const newWidth = Math.max(80, resizeStartWidth + diff);
		columnWidths[resizingColumn] = newWidth;
	}

	function handleResizeEnd() {
		resizingColumn = null;
		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
	}
</script>

<div class="vlm-table-new-container h-[600px] max-h-[80vh] overflow-auto border border-border rounded-md">
	<table class="w-full text-sm border-collapse">
		<thead class="sticky top-0 z-10 bg-background dark:bg-background border-b border-border">
			<tr>
				{#each columns as column (column.id)}
					<th
						class="relative select-none cursor-grab active:cursor-grabbing transition-all duration-150 border border-border p-3 text-left font-semibold bg-muted
							{resizingColumn === column.id ? 'bg-blue-50 dark:bg-blue-950' : ''}
							{draggedColumn === column.id ? 'opacity-50' : ''}
							{dragOverColumn === column.id ? 'border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950' : ''}"
						style="width: {column.width}px; min-width: {column.width}px; max-width: {column.width}px;"
						draggable={true}
						ondragstart={(e) => handleDragStart(e, column.id)}
						ondragover={(e) => handleDragOver(e, column.id)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, column.id)}
					>
						<div class="flex items-center justify-between h-full">
							<!-- Drag handle -->
							<div class="text-muted-foreground opacity-50 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mr-2">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M12 5v14M5 12h14"/>
								</svg>
							</div>

							<!-- Column header content -->
							<div class="flex items-center gap-2 flex-1">
								<span class="font-semibold text-foreground">
									{column.header}
								</span>
							</div>

							<!-- Resize handle -->
							<div
								class="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500 dark:hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity z-10"
								role="button"
								tabindex="-1"
								onmousedown={(e) => handleResizeStart(e, column.id)}
							></div>
						</div>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, rowIndex (rowIndex)}
				<tr class="hover:bg-muted/50 border-b border-border">
					{#each columns as column (column.id)}
						<td
							class="text-sm border border-border p-3 overflow-hidden"
							style="width: {column.width}px; min-width: {column.width}px; max-width: {column.width}px;"
						>
							{row[column.id] ?? ''}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.vlm-table-new-container {
		width: 100%;
		max-width: 100%;
	}

	/* Ensure table doesn't overflow */
	:global(.vlm-table-new-container table) {
		table-layout: fixed;
		width: 100%;
	}
</style>