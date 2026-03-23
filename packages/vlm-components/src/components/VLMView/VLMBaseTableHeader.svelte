<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		columns: string[];
		onColumnReorder: (from: string, to: string) => void;
		onColumnResize: (column: string, width: number) => void;
		columnContent?: Snippet<[string]>;
	}

	let { 
		columns, 
		onColumnReorder, 
		onColumnResize, 
		columnContent 
	}: Props = $props();

	let draggedColumn = $state<string | null>(null);
	let dragOverColumn = $state<string | null>(null);

	function handleDragStart(e: DragEvent, column: string) {
		// Prevent drag from starting on the resize handle
		const target = e.target as HTMLElement;
		const hasRoleSeparator = target.closest('[role="separator"]');
		const hasAriaLabel = target.closest('button[aria-label="Resize column"]');
		const hasResizeClass = target.closest('.resize-handle');
		
		if (hasRoleSeparator || hasAriaLabel || hasResizeClass) {
			e.preventDefault();
			return;
		}
		
		draggedColumn = column;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', column);
		}
	}

	function handleDragOver(e: DragEvent, column: string) {
		e.preventDefault();
		if (draggedColumn !== column) {
			dragOverColumn = column;
		}
	}

	function handleDragLeave() {
		dragOverColumn = null;
	}

	function handleDrop(e: DragEvent, targetColumn: string) {
		e.preventDefault();
		if (draggedColumn && draggedColumn !== targetColumn) {
			onColumnReorder(draggedColumn, targetColumn);
		}
		draggedColumn = null;
		dragOverColumn = null;
	}

	// Simple drag handle component
	function DragHandle() {
		return `<div class="text-muted-foreground opacity-50 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M12 5v14M5 12h14"/>
			</svg>
		</div>`;
	}

	// Simple resize handle with manual implementation
	let resizing = $state<string | null>(null);
	let startX = $state(0);
	let startWidth = $state(0);
	let currentWidth = $state(0);

	function handleResizeStart(e: MouseEvent, column: string) {
		e.preventDefault();
		e.stopPropagation();

		resizing = column;
		startX = e.clientX;

		const headerCell = (e.target as HTMLElement).closest('th');
		if (headerCell) {
			startWidth = headerCell.getBoundingClientRect().width;
			currentWidth = startWidth;
		}

		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);
		document.body.style.cursor = 'col-resize';
	}

	function handleResizeMove(e: MouseEvent) {
		if (!resizing) return;

		const deltaX = e.clientX - startX;
		const newWidth = Math.max(50, startWidth + deltaX);
		currentWidth = newWidth;

		// Call onColumnResize during drag for smooth updates
		onColumnResize(resizing, newWidth);
	}

	function handleResizeEnd(e: MouseEvent) {
		if (!resizing) return;

		const deltaX = e.clientX - startX;
		const newWidth = Math.max(50, startWidth + deltaX);

		// Final resize call (in case the last move event was missed)
		onColumnResize(resizing, newWidth);

		resizing = null;
		currentWidth = 0;
		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
		document.body.style.cursor = '';
	}
</script>

<tr>
	{#each columns as column (column)}
		<th
			class="group/header relative border border-border p-2 text-left font-semibold whitespace-nowrap bg-muted
			{dragOverColumn === column ? 'border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950' : ''}
			{draggedColumn === column ? 'opacity-50' : ''}
			{resizing === column ? '' : 'transition-all duration-150'}"
			data-column={column}
			draggable={true}
			ondragstart={(e: DragEvent) => handleDragStart(e, column)}
			ondragover={(e: DragEvent) => handleDragOver(e, column)}
			ondragleave={handleDragLeave}
			ondrop={(e: DragEvent) => handleDrop(e, column)}
		>
			<div class="flex h-full items-center gap-2 select-none">
				<!-- Drag Handle -->
				<div class="text-muted-foreground opacity-50 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 5v14M5 12h14"/>
					</svg>
				</div>
				
				<div class="flex-1 overflow-hidden">
					{#if columnContent}
						{@render columnContent(column)}
					{:else}
						<span class="flex-1">{column}</span>
					{/if}
				</div>
				
				<!-- Resize Handle -->
				<button
					type="button"
					class="resize-handle h-full w-4 cursor-col-resize border-none bg-transparent absolute top-0 right-0 z-10"
					class:resizing={resizing === column}
					class:transition-all={resizing !== column}
					aria-label="Resize column"
					onmousedown={(e: MouseEvent) => handleResizeStart(e, column)}
				>
					<div
						class="divider h-full pointer-events-none absolute top-0 right-0"
						class:w-0.5={resizing !== column}
						class:w-1={resizing === column}
						class:bg-transparent={resizing !== column}
						class:bg-blue-600={resizing === column}
						class:transition-all={resizing !== column}
					></div>
				</button>
			</div>
		</th>
	{/each}
</tr>

<style>
	.resize-handle:hover:not(.resizing) {
		background-color: rgba(59, 130, 246, 0.2); /* blue-500/20 */
	}

	.resize-handle.resizing {
		background-color: rgba(59, 130, 246, 0.3); /* blue-500/30 */
	}

	.resize-handle:hover:not(.resizing) .divider {
		background-color: rgb(59, 130, 246); /* blue-500 */
	}

	/* Dark mode support */
	:global(.dark) .resize-handle:hover:not(.resizing) {
		background-color: rgba(96, 165, 250, 0.2); /* blue-400/20 */
	}

	:global(.dark) .resize-handle.resizing {
		background-color: rgba(96, 165, 250, 0.3); /* blue-400/30 */
	}

	:global(.dark) .resize-handle:hover:not(.resizing) .divider {
		background-color: rgb(96, 165, 250); /* blue-400 */
	}
</style>