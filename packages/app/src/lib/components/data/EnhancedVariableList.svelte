<!-- packages/app/src/lib/components/data/EnhancedVariableList.svelte -->
<script lang="ts">
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import { Button, Input } from '@sden99/ui-components';
	import { Checkbox } from '@sden99/ui-components';
	import { Badge } from '@sden99/ui-components';
	import { GripVertical, Eye, EyeOff, Search } from '@lucide/svelte/icons';

	// Props - receive reference to ClinicalVirtualTable
	let { clinicalTableRef = $bindable() } = $props();

	// Get current dataset info for data types
	let currentDataset = $derived.by(() => {
		const selectedId = dataState.selectedDatasetId.value;
		if (!selectedId) return null;
		return dataState.getDatasets()[selectedId];
	});

	// Get column info from ClinicalVirtualTable reference
	let availableColumns = $derived.by(() => {
		return clinicalTableRef?.getAvailableColumns() || [];
	});
	let visibleColumns = $derived.by(() => {
		return clinicalTableRef?.getVisibleColumns() || [];
	});
	let currentDatasetId = $derived(dataState.selectedDatasetId.value);

	// Combine column info with data types
	let columnInfo = $derived.by(() => {
		return availableColumns.map((column: string) => ({
			name: column,
			dtype: currentDataset?.details?.dtypes?.[column] ?? 'unknown',
			visible: visibleColumns.includes(column),
			order: visibleColumns.indexOf(column)
		}));
	});

	// Search state
	let searchTerm = $state('');

	let filteredColumnInfo = $derived.by(() => {
		if (!searchTerm.trim()) return columnInfo;
		const term = searchTerm.toLowerCase();
		return columnInfo.filter((c) => c.name.toLowerCase().includes(term));
	});

	// Drag and drop state
	let draggedColumn = $state<string | null>(null);
	let dragOverColumn = $state<string | null>(null);

	function handleColumnToggle(column: string) {
		console.log(`[EnhancedVariableList] Toggling column: ${column}`);
		clinicalTableRef?.toggleColumnVisibility(column);
	}

	function handleShowAll() {
		console.log(`[EnhancedVariableList] Show all columns`);
		clinicalTableRef?.showAllColumns();
	}

	function handleHideAll() {
		console.log(`[EnhancedVariableList] Hide all columns`);
		clinicalTableRef?.hideAllColumns();
	}

	function handleReset() {
		console.log(`[EnhancedVariableList] Reset columns`);
		clinicalTableRef?.resetColumns();
	}

	// Drag and drop handlers
	function handleDragStart(e: DragEvent, column: string) {
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
			console.log(`[EnhancedVariableList] Reordering: ${draggedColumn} -> ${targetColumn}`);

			// Use ClinicalVirtualTable's reorder method
			clinicalTableRef?.reorderColumns(draggedColumn, targetColumn);

			console.log(`[EnhancedVariableList] Reordered columns: ${draggedColumn} -> ${targetColumn}`);
		}

		draggedColumn = null;
		dragOverColumn = null;
	}

	function getDataTypeColor(dtype: string): string {
		const type = dtype.toLowerCase();
		if (type.includes('int') || type.includes('float') || type.includes('number'))
			return 'bg-info/10 text-info';
		if (type.includes('str') || type.includes('object') || type.includes('text'))
			return 'bg-success/10 text-success';
		if (type.includes('date') || type.includes('time')) return 'bg-primary/10 text-primary';
		if (type.includes('bool')) return 'bg-warning/10 text-warning';
		return 'bg-muted text-muted-foreground';
	}

	function getVisibilityIcon(visible: boolean) {
		return visible ? Eye : EyeOff;
	}
</script>

<div class="flex h-full flex-col">
	<!-- Fixed: Search bar -->
	<div class="relative mb-3 flex-none">
		<Search class="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
		<Input type="text" placeholder="Search variables..." bind:value={searchTerm} class="pl-8" />
	</div>

	<!-- Fixed: Control buttons -->
	<div class="mb-3 flex flex-none flex-wrap gap-2">
		<Button size="sm" variant="outline" onclick={handleShowAll}>Show All</Button>
		<Button size="sm" variant="outline" onclick={handleHideAll}>Hide All</Button>
		<Button size="sm" variant="outline" onclick={handleReset}>Reset</Button>
	</div>

	<!-- Scrollable: Column list -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="space-y-1">
			{#each filteredColumnInfo as column}
				{@const IconComponent = getVisibilityIcon(column.visible)}
				<div
					role="button"
					tabindex="0"
					class="flex items-center space-x-2 rounded border p-2
                           {dragOverColumn === column.name
						? 'border-info bg-info/10'
						: 'border-border'}
                           {column.visible ? 'bg-card' : 'bg-muted/50 opacity-75'}
                           hover:bg-muted/50 transition-colors"
					draggable={column.visible}
					ondragstart={(e) => handleDragStart(e, column.name)}
					ondragover={(e) => handleDragOver(e, column.name)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, column.name)}
				>
					<!-- Drag handle (only for visible columns) -->
					{#if column.visible}
						<div class="cursor-move opacity-50 hover:opacity-100">
							<GripVertical class="h-4 w-4" />
						</div>
					{:else}
						<div class="w-4"></div>
					{/if}

					<Checkbox
						checked={column.visible}
						onCheckedChange={() => handleColumnToggle(column.name)}
					/>

					<!-- Visibility icon -->
					<IconComponent
						class="h-4 w-4 {column.visible ? 'text-success' : 'text-muted-foreground'}"
					/>

					<!-- Column name and info -->
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="truncate text-sm font-medium">{column.name}</span>
							<Badge variant="outline" class={getDataTypeColor(column.dtype)}>
								{column.dtype}
							</Badge>
						</div>
						{#if column.visible && column.order >= 0}
							<span class="text-muted-foreground text-xs">Position: {column.order + 1}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Fixed: Status info -->
	<div class="text-muted-foreground flex-none border-t pt-2 text-xs">
		{visibleColumns.length} of {availableColumns.length} columns visible
	</div>
</div>
