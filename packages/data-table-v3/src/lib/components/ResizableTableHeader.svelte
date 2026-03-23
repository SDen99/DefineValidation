<script lang="ts">
	import type { ColumnConfig } from '../types/columns';

	interface Props {
		columns: ColumnConfig[];
		onColumnResize?: (columnId: string, width: number) => void;
		onColumnSort?: (columnId: string) => void;
	}

	let { columns, onColumnResize, onColumnSort }: Props = $props();

	// Filter to only visible columns
	const visibleColumns = $derived(columns.filter((col) => col.visible));

	// Resizing state
	let resizingColumn = $state<string | null>(null);
	let startX = $state(0);
	let startWidth = $state(0);

	/**
	 * Start resizing a column
	 */
	function handleResizeStart(event: MouseEvent, column: ColumnConfig) {
		if (!column.resizable) return;

		event.preventDefault();
		event.stopPropagation();

		resizingColumn = column.id;
		startX = event.clientX;
		startWidth = column.width || 150; // Default width if not set

		// Add global mouse event listeners
		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);

		// Add visual feedback
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	/**
	 * Handle mouse move during resize
	 */
	function handleResizeMove(event: MouseEvent) {
		if (!resizingColumn) return;

		const diff = event.clientX - startX;
		const newWidth = Math.max(50, startWidth + diff); // Min width 50px

		// Update the column width immediately for visual feedback
		const column = columns.find((c) => c.id === resizingColumn);
		if (column) {
			column.width = newWidth;
		}
	}

	/**
	 * End resizing
	 */
	function handleResizeEnd(event: MouseEvent) {
		if (!resizingColumn) return;

		const diff = event.clientX - startX;
		const newWidth = Math.max(50, startWidth + diff);

		// Call the resize callback
		if (onColumnResize) {
			onColumnResize(resizingColumn, newWidth);
		}

		// Cleanup
		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';

		resizingColumn = null;
	}

	/**
	 * Handle column header click for sorting
	 */
	function handleHeaderClick(column: ColumnConfig) {
		if (column.sortable && onColumnSort) {
			onColumnSort(column.id);
		}
	}

	/**
	 * Get column width style
	 */
	function getColumnWidth(column: ColumnConfig): string {
		return column.width ? `${column.width}px` : 'auto';
	}
</script>

<thead class="bg-gray-50 border-b border-gray-200">
	<tr>
		{#each visibleColumns as column (column.id)}
			<th
				class="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider transition-colors duration-150"
				class:cursor-pointer={column.sortable}
				class:hover:bg-gray-100={column.sortable}
				style="width: {getColumnWidth(column)}; min-width: 50px; position: relative;"
				title={column.header}
				onclick={() => handleHeaderClick(column)}
			>
				<div class="flex items-center justify-between">
					<span class="truncate">{column.header}</span>
					{#if column.sortable}
						<span class="ml-2 text-gray-400">
							<!-- Sort indicator placeholder - will be functional in Day 9 -->
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 9l4-4 4 4m0 6l-4 4-4-4"
								/>
							</svg>
						</span>
					{/if}
				</div>

				{#if column.resizable}
					<!-- Resize handle -->
					<div
						class="resize-handle"
						class:resizing={resizingColumn === column.id}
						onmousedown={(e) => handleResizeStart(e, column)}
						role="separator"
						aria-orientation="vertical"
						tabindex="-1"
					>
						<div class="resize-handle-inner"></div>
					</div>
				{/if}
			</th>
		{/each}
	</tr>
</thead>

<style>
	th {
		position: relative;
		max-width: none;
		box-sizing: border-box;
	}

	.resize-handle {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 10px;
		cursor: col-resize;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
	}

	.resize-handle:hover {
		background: rgba(59, 130, 246, 0.1);
	}

	.resize-handle.resizing {
		background: rgba(59, 130, 246, 0.2);
	}

	.resize-handle-inner {
		width: 2px;
		height: 100%;
		background: transparent;
	}

	.resize-handle:hover .resize-handle-inner {
		background: rgba(59, 130, 246, 0.5);
	}

	.resize-handle.resizing .resize-handle-inner {
		background: rgb(59, 130, 246);
	}
</style>
