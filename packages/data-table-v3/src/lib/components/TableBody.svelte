<script lang="ts">
	import type { DataRow } from '../types/core';
	import type { ColumnConfig } from '../types/columns';
	import Cell from './Cell.svelte';

	interface Props {
		rows: DataRow[];
		columns: ColumnConfig[];
	}

	let { rows, columns }: Props = $props();

	// Filter to only visible columns
	const visibleColumns = $derived(columns.filter((col) => col.visible));
</script>

<tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
	{#each rows as row, rowIndex (rowIndex)}
		<tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
			{#each visibleColumns as column (column.id)}
				<Cell value={row[column.id]} {column} {row} {rowIndex} />
			{/each}
		</tr>
	{:else}
		<tr>
			<td colspan={visibleColumns.length} class="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
				No data available
			</td>
		</tr>
	{/each}
</tbody>
