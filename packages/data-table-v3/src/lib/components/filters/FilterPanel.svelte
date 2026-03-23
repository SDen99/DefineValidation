<script lang="ts">
	import type { ColumnConfig } from '../../types/columns';
	import type { Filter } from '../../types/filters';
	import TextFilter from './TextFilter.svelte';
	import NumericFilter from './NumericFilter.svelte';
	import DateFilter from './DateFilter.svelte';
	import BooleanFilter from './BooleanFilter.svelte';

	interface Props {
		columns: ColumnConfig[];
		filters?: Map<string, Filter>;
		onFilterChange?: (columnId: string, filter: Filter | null) => void;
		onClearAll?: () => void;
	}

	let { columns, filters = new Map(), onFilterChange, onClearAll }: Props = $props();

	// Filter to only filterable columns
	const filterableColumns = $derived(columns.filter((col) => col.filterable && col.visible));

	// Count active filters
	const activeFilterCount = $derived(filters.size);

	/**
	 * Handle filter change for a column
	 */
	function handleFilterChange(columnId: string, filter: Filter | null) {
		onFilterChange?.(columnId, filter);
	}

	/**
	 * Clear all filters
	 */
	function handleClearAll() {
		onClearAll?.();
	}

	/**
	 * Get filter for column
	 */
	function getFilter(columnId: string): Filter | undefined {
		return filters.get(columnId);
	}
</script>

<div class="filter-panel">
	<!-- Header -->
	<div class="panel-header">
		<div class="header-content">
			<div class="header-title">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
					/>
				</svg>
				<h3 class="title-text">Filters</h3>
			</div>
			{#if activeFilterCount > 0}
				<span class="filter-count-badge">{activeFilterCount} active</span>
			{/if}
		</div>

		{#if activeFilterCount > 0}
			<button onclick={handleClearAll} class="clear-all-button">
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				Clear All
			</button>
		{/if}
	</div>

	<!-- Filters -->
	{#if filterableColumns.length > 0}
		<div class="filters-grid">
			{#each filterableColumns as column (column.id)}
				<div class="filter-item">
					{#if column.dataType === 'string'}
						<TextFilter
							{column}
							filter={getFilter(column.id) as any}
							onFilterChange={(filter) => handleFilterChange(column.id, filter)}
						/>
					{:else if column.dataType === 'number'}
						<NumericFilter
							{column}
							filter={getFilter(column.id) as any}
							onFilterChange={(filter) => handleFilterChange(column.id, filter)}
						/>
					{:else if column.dataType === 'date'}
						<DateFilter
							{column}
							filter={getFilter(column.id) as any}
							onFilterChange={(filter) => handleFilterChange(column.id, filter)}
						/>
					{:else if column.dataType === 'boolean'}
						<BooleanFilter
							{column}
							filter={getFilter(column.id) as any}
							onFilterChange={(filter) => handleFilterChange(column.id, filter)}
						/>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<svg class="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
				/>
			</svg>
			<p class="empty-text">No filterable columns available</p>
			<p class="empty-hint">Add filterable columns to enable filtering</p>
		</div>
	{/if}
</div>

<style>
	.filter-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: hsl(var(--color-muted));
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: hsl(var(--color-muted-foreground));
	}

	.title-text {
		font-size: 1.125rem;
		font-weight: 600;
		color: hsl(var(--color-foreground));
	}

	.filter-count-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--color-info));
		background: hsl(var(--color-info) / 0.1);
		border-radius: 9999px;
	}

	.clear-all-button {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--color-destructive));
		background: hsl(var(--color-background));
		border: 1px solid hsl(var(--color-destructive) / 0.3);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.clear-all-button:hover {
		color: hsl(var(--color-destructive-foreground));
		background: hsl(var(--color-destructive));
		border-color: hsl(var(--color-destructive));
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.filter-item {
		display: flex;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
	}

	.empty-text {
		margin-top: 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: hsl(var(--color-muted-foreground));
	}

	.empty-hint {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: hsl(var(--color-muted-foreground) / 0.7);
	}
</style>
