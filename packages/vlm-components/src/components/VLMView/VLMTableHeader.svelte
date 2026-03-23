<!-- @sden99/vlm-components VLMTableHeader.svelte -->
<script lang="ts">
	import VLMBaseTableHeader from './VLMBaseTableHeader.svelte';

	let { 
		columns, 
		stratificationColumns,
		onReorder, 
		onResize 
	} = $props<{
		columns: string[];
		stratificationColumns: Set<string>;
		onReorder: (from: string, to: string) => void;
		onResize: (column: string, width: number) => void;
	}>();
</script>

<VLMBaseTableHeader {columns} onColumnReorder={onReorder} onColumnResize={onResize}>
	{#snippet columnContent(column)}
		<div class="flex items-center justify-between">
			<span class="text-foreground font-semibold">
				{column}
			</span>
		</div>
	{/snippet}
</VLMBaseTableHeader>