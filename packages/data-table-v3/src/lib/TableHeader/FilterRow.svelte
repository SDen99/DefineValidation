<script lang="ts">
	/**
	 * FilterRow - Inline filter inputs for each column
	 */

	import TextFilter from '../components/filters/TextFilter.svelte';
	import NumericFilter from '../components/filters/NumericFilter.svelte';
	import DateFilter from '../components/filters/DateFilter.svelte';
	import BooleanFilter from '../components/filters/BooleanFilter.svelte';
	import type { ColumnConfig } from '../types/columns';
	import type { Filter } from '../types/filters';

	interface Props {
		columns: ColumnConfig[];
		columnWidths: Record<string, number>;
		filters: Map<string, Filter>;
		onFilterChange: (columnId: string, filter: Filter | null) => void;
	}

	let { columns, columnWidths, filters, onFilterChange }: Props = $props();

	// Only show visible columns
	const visibleColumns = $derived(columns.filter((c) => c.visible));
</script>

<tr class="bg-muted/50">
	{#each visibleColumns as column (column.id)}
		{@const width = columnWidths[column.id] || column.width || 150}
		<th
			class="border border-border px-1 py-1 overflow-hidden"
			style="width: {width}px; min-width: {width}px; max-width: {width}px;"
		>
			{#if column.filterable}
				<div class="filter-cell overflow-hidden">
					{#if column.dataType === 'string'}
						<TextFilter
							{column}
							filter={filters.get(column.id) as any}
							onFilterChange={(filter) => onFilterChange(column.id, filter)}
						/>
					{:else if column.dataType === 'number'}
						<NumericFilter
							{column}
							filter={filters.get(column.id) as any}
							onFilterChange={(filter) => onFilterChange(column.id, filter)}
						/>
					{:else if column.dataType === 'date'}
						<DateFilter
							{column}
							filter={filters.get(column.id) as any}
							onFilterChange={(filter) => onFilterChange(column.id, filter)}
						/>
					{:else if column.dataType === 'boolean'}
						<BooleanFilter
							{column}
							filter={filters.get(column.id) as any}
							onFilterChange={(filter) => onFilterChange(column.id, filter)}
						/>
					{/if}
				</div>
			{/if}
		</th>
	{/each}
</tr>

<style>
	/* Make inline filters more compact */
	.filter-cell :global(.text-filter),
	.filter-cell :global(.numeric-filter),
	.filter-cell :global(.date-filter),
	.filter-cell :global(.boolean-filter) {
		padding: 0.25rem;
		background: transparent;
		border: none;
		border-radius: 0;
	}

	.filter-cell :global(.filter-header) {
		display: none;
	}

	.filter-cell :global(.filter-input),
	.filter-cell :global(.filter-select) {
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
	}

	:global(.filter-cell .filter-input.has-value) {
		background: color-mix(in srgb, var(--color-primary) 8%, transparent) !important;
		border-left: 3px solid var(--color-primary) !important;
		padding-left: calc(0.5rem - 2px) !important;
	}

	.filter-cell :global(.filter-status) {
		display: none;
	}
</style>
