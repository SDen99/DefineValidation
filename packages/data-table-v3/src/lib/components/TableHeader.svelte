<script lang="ts">
	import type { ColumnConfig } from '../types/columns';

	interface Props {
		columns: ColumnConfig[];
	}

	let { columns }: Props = $props();

	// Filter to only visible columns
	const visibleColumns = $derived(columns.filter((col) => col.visible));
</script>

<thead class="bg-muted border-b border-border">
	<tr>
		{#each visibleColumns as column (column.id)}
			<th
				class="px-3 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors duration-150"
				title={column.header}
			>
				<div class="flex items-center justify-between">
					<span class="truncate">{column.header}</span>
					{#if column.sortable}
						<span class="ml-2 text-muted-foreground">
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
					<!-- Resize handle placeholder - will be functional in Day 8 -->
					<div
						class="absolute right-0 top-0 bottom-0 w-1 hover:bg-info cursor-col-resize"
					></div>
				{/if}
			</th>
		{/each}
	</tr>
</thead>

<style>
	th {
		position: relative;
		max-width: 300px;
	}
</style>
