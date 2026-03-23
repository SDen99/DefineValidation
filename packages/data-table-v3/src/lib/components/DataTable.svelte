<script lang="ts">
	import type { DataRow } from '../types/core';
	import type { ColumnConfig } from '../types/columns';
	import TableHeader from './TableHeader.svelte';
	import TableBody from './TableBody.svelte';

	interface Props {
		rows: DataRow[];
		columns: ColumnConfig[];
		height?: string;
		loading?: boolean;
	}

	let { rows, columns, height = '600px', loading = false }: Props = $props();

	// Derive visible column count for empty state
	const visibleColumnCount = $derived(columns.filter((col) => col.visible).length);
</script>

<div class="data-table-container" style="height: {height}">
	<div class="overflow-auto h-full border border-gray-300 rounded-lg shadow-sm">
		<table class="min-w-full divide-y divide-gray-200">
			<TableHeader {columns} />
			{#if loading}
				<tbody>
					<tr>
						<td colspan={visibleColumnCount} class="px-3 py-8 text-center">
							<div class="flex items-center justify-center">
								<svg
									class="animate-spin h-8 w-8 text-blue-500"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								<span class="ml-3 text-gray-500">Loading data...</span>
							</div>
						</td>
					</tr>
				</tbody>
			{:else}
				<TableBody {rows} {columns} />
			{/if}
		</table>
	</div>
</div>

<style>
	.data-table-container {
		width: 100%;
		display: flex;
		flex-direction: column;
	}

	table {
		border-collapse: collapse;
		table-layout: auto;
	}
</style>
