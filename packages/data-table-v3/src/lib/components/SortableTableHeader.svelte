<script lang="ts">
	import type { ColumnConfig } from '../types/columns';
	import type { SortDirection } from '../types/sorting';

	interface Props {
		columns: ColumnConfig[];
		sortColumn?: string;
		sortDirection?: SortDirection;
		onColumnResize?: (columnId: string, width: number) => void;
		onColumnSort?: (columnId: string) => void;
	}

	let { columns, sortColumn, sortDirection, onColumnResize, onColumnSort }: Props = $props();

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
		startWidth = column.width || 150;

		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);

		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	/**
	 * Handle mouse move during resize
	 */
	function handleResizeMove(event: MouseEvent) {
		if (!resizingColumn) return;

		const diff = event.clientX - startX;
		const newWidth = Math.max(50, startWidth + diff);

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

		if (onColumnResize) {
			onColumnResize(resizingColumn, newWidth);
		}

		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';

		resizingColumn = null;
	}

	/**
	 * Handle column header click for sorting
	 */
	function handleHeaderClick(column: ColumnConfig, event: MouseEvent) {
		// Don't trigger sort if clicking on resize handle
		const target = event.target as HTMLElement;
		if (target.closest('.resize-handle')) return;

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

	/**
	 * Check if column is actively sorted
	 */
	function isSorted(columnId: string): boolean {
		return sortColumn === columnId;
	}
</script>

<thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
	<tr>
		{#each visibleColumns as column (column.id)}
			<th
				class="px-3 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider transition-all duration-150"
				class:cursor-pointer={column.sortable}
				class:hover:bg-gray-100={column.sortable}
				class:dark:hover:bg-gray-700={column.sortable}
				class:bg-blue-50={isSorted(column.id)}
				class:dark:bg-blue-900={isSorted(column.id)}
				class:text-blue-700={isSorted(column.id)}
				class:dark:text-blue-300={isSorted(column.id)}
				style="width: {getColumnWidth(column)}; min-width: 50px; position: relative;"
				title={column.header}
				onclick={(e) => handleHeaderClick(column, e)}
			>
				<div class="flex items-center justify-between gap-2">
					<span class="truncate">{column.header}</span>

					{#if column.sortable}
						<div class="sort-indicator">
							{#if isSorted(column.id)}
								<!-- Active sort indicator -->
								{#if sortDirection === 'asc'}
									<svg
										class="w-4 h-4 text-blue-600"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								{:else}
									<svg
										class="w-4 h-4 text-blue-600"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								{/if}
							{:else}
								<!-- Inactive sort indicator -->
								<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
									<path
										d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z"
									/>
								</svg>
							{/if}
						</div>
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

	.sort-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all 0.15s;
	}

	/* Resize handle */
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
