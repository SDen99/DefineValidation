<script lang="ts">
	import { TableHeader, TableRow, TableHead } from '@sden99/ui-components';
	import { DragHandle, ResizeHandle } from './index.js';
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
</script>

<TableHeader class="sticky top-0 z-10">
	<TableRow>
		{#each columns as column (column)}
			<TableHead
				class="group/header relative border p-2 text-left font-semibold whitespace-nowrap
				{dragOverColumn === column ? 'border-l-4 border-blue-500 bg-blue-50' : ''}
				{draggedColumn === column ? 'opacity-50' : ''} transition-all duration-150"
				data-column={column}
				draggable={true}
				ondragstart={(e: DragEvent) => handleDragStart(e, column)}
				ondragover={(e: DragEvent) => handleDragOver(e, column)}
				ondragleave={handleDragLeave}
				ondrop={(e: DragEvent) => handleDrop(e, column)}
			>
				<div class="flex h-full items-center gap-2 select-none">
					<DragHandle />
					<div class="flex-1 overflow-hidden">
						{#if columnContent}
							{@render columnContent(column)}
						{:else}
							<span class="flex-1">{column}</span>
						{/if}
					</div>
					<ResizeHandle onResize={(width) => onColumnResize(column, width)} />
				</div>
			</TableHead>
		{/each}
	</TableRow>
</TableHeader>