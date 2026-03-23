<script lang="ts">
	import type { ColumnConfig } from '../types/columns';

	interface Props {
		columns: ColumnConfig[];
		onColumnResize?: (columnId: string, width: number) => void;
		onColumnSort?: (columnId: string) => void;
		onColumnReorder?: (fromIndex: number, toIndex: number) => void;
	}

	let { columns, onColumnResize, onColumnSort, onColumnReorder }: Props = $props();

	// Filter to only visible columns
	const visibleColumns = $derived(columns.filter((col) => col.visible));

	// Resizing state
	let resizingColumn = $state<string | null>(null);
	let startX = $state(0);
	let startWidth = $state(0);

	// Drag and drop state
	let draggedColumnIndex = $state<number | null>(null);
	let dropTargetIndex = $state<number | null>(null);
	let isDragging = $state(false);

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
	 * Handle drag start
	 */
	function handleDragStart(event: DragEvent, index: number) {
		event.stopPropagation();
		draggedColumnIndex = index;
		isDragging = true;

		// Set drag data
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(index));
		}

		// Add visual feedback
		const target = event.target as HTMLElement;
		target.style.opacity = '0.5';
	}

	/**
	 * Handle drag end
	 */
	function handleDragEnd(event: DragEvent) {
		isDragging = false;
		draggedColumnIndex = null;
		dropTargetIndex = null;

		// Reset visual feedback
		const target = event.target as HTMLElement;
		target.style.opacity = '1';
	}

	/**
	 * Handle drag over
	 */
	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}

		// Only set drop target if it's different from dragged column
		if (draggedColumnIndex !== null && draggedColumnIndex !== index) {
			dropTargetIndex = index;
		}
	}

	/**
	 * Handle drag leave
	 */
	function handleDragLeave() {
		dropTargetIndex = null;
	}

	/**
	 * Handle drop
	 */
	function handleDrop(event: DragEvent, toIndex: number) {
		event.preventDefault();
		event.stopPropagation();

		if (draggedColumnIndex !== null && draggedColumnIndex !== toIndex) {
			// Call reorder callback
			if (onColumnReorder) {
				onColumnReorder(draggedColumnIndex, toIndex);
			}
		}

		// Reset state
		isDragging = false;
		draggedColumnIndex = null;
		dropTargetIndex = null;
	}
</script>

<thead class="bg-gray-50 border-b border-gray-200">
	<tr>
		{#each visibleColumns as column, index (column.id)}
			<th
				draggable="true"
				ondragstart={(e) => handleDragStart(e, index)}
				ondragend={handleDragEnd}
				ondragover={(e) => handleDragOver(e, index)}
				ondragleave={handleDragLeave}
				ondrop={(e) => handleDrop(e, index)}
				class="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider transition-all duration-150"
				class:cursor-pointer={column.sortable}
				class:hover:bg-gray-100={column.sortable && !isDragging}
				class:cursor-move={isDragging}
				class:bg-blue-50={dropTargetIndex === index && isDragging}
				class:border-l-4={dropTargetIndex === index && isDragging}
				class:border-blue-500={dropTargetIndex === index && isDragging}
				class:opacity-50={draggedColumnIndex === index}
				style="width: {getColumnWidth(column)}; min-width: 50px; position: relative;"
				title={column.header}
				onclick={(e) => handleHeaderClick(column, e)}
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<!-- Drag handle icon -->
						<svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"
							/>
						</svg>
						<span class="truncate">{column.header}</span>
					</div>
					{#if column.sortable}
						<span class="ml-2 text-gray-400">
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

	/* Dragging states */
	th[draggable='true'] {
		cursor: grab;
	}

	th[draggable='true']:active {
		cursor: grabbing;
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
