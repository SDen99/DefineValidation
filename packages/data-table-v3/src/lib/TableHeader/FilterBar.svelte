<script lang="ts">
	/**
	 * FilterBar - Displays active filters as compact chips above the table header.
	 *
	 * Standalone component. Consumers wire it up via props.
	 */

	import type { Filter } from '../types/filters';
	import type { FilterCombination } from '../types/filters';
	import type { ColumnConfig } from '../types/columns';
	import { toggleFilterNegation } from '../utils/filterNegation';
	import FilterChip from '../components/filter-bar/FilterChip.svelte';
	import OverflowPopover from '../components/filter-bar/OverflowPopover.svelte';

	type ColumnFilter = Exclude<Filter, { type: 'global' }>;

	interface Props {
		filters: Map<string, ColumnFilter>;
		columns: Map<string, ColumnConfig>;
		filterCombination: FilterCombination;
		onFilterChange: (columnId: string, filter: ColumnFilter | null) => void;
		onFilterCombinationChange: (combination: FilterCombination) => void;
		onClearAll: () => void;
		maxVisible?: number;
	}

	let {
		filters,
		columns,
		filterCombination,
		onFilterChange,
		onFilterCombinationChange,
		onClearAll,
		maxVisible = 5
	}: Props = $props();

	// ============================================================================
	// State
	// ============================================================================

	let showOverflow = $state(false);

	// ============================================================================
	// Derived
	// ============================================================================

	const filterEntries = $derived.by(() => {
		const entries: Array<{ columnId: string; filter: ColumnFilter; column: ColumnConfig }> = [];
		for (const [columnId, filter] of filters) {
			const column = columns.get(columnId);
			if (column) {
				entries.push({ columnId, filter, column });
			}
		}
		return entries;
	});

	const visibleEntries = $derived(filterEntries.slice(0, maxVisible));
	const overflowEntries = $derived(filterEntries.slice(maxVisible));
	const hasOverflow = $derived(overflowEntries.length > 0);
	const hasFilters = $derived(filterEntries.length > 0);

	const combinationLabel = $derived(filterCombination === 'AND' ? '&' : '|');

	// ============================================================================
	// Event Handlers
	// ============================================================================

	function handleToggleNegation(columnId: string) {
		const filter = filters.get(columnId);
		if (!filter) return;
		const negated = toggleFilterNegation(filter);
		onFilterChange(columnId, negated);
	}

	function handleRemove(columnId: string) {
		onFilterChange(columnId, null);
	}

	function handleToggleCombination() {
		onFilterCombinationChange(filterCombination === 'AND' ? 'OR' : 'AND');
	}
</script>

{#if hasFilters}
	<div class="filter-bar">
		<div class="filter-chips">
			{#each visibleEntries as entry, i (entry.columnId)}
				{#if i > 0}
					<button
						class="combination-label"
						onclick={handleToggleCombination}
						title="Toggle between AND / OR (currently {filterCombination})"
					>
						{combinationLabel}
					</button>
				{/if}
				<FilterChip
					filter={entry.filter}
					column={entry.column}
					onToggleNegation={() => handleToggleNegation(entry.columnId)}
					onRemove={() => handleRemove(entry.columnId)}
				/>
			{/each}

			{#if hasOverflow}
				<button
					class="overflow-btn"
					onclick={() => (showOverflow = true)}
				>
					+{overflowEntries.length}
				</button>
			{/if}
		</div>

		<button class="clear-all-btn" onclick={onClearAll}>
			Clear All
		</button>
	</div>

	{#if showOverflow}
		<OverflowPopover
			filters={overflowEntries.map((e) => ({ filter: e.filter, column: e.column }))}
			onToggleNegation={handleToggleNegation}
			onRemove={handleRemove}
			onClose={() => (showOverflow = false)}
		/>
	{/if}
{/if}

<style>
	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-bottom: 1px solid var(--color-border, #e4e4e7);
		background: var(--color-background, white);
		font-family: system-ui, -apple-system, sans-serif;
		min-height: 1.75rem;
	}

	.filter-chips {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
		overflow: hidden;
		flex-wrap: nowrap;
	}

	.combination-label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.125rem;
		height: 1.125rem;
		border: none;
		background: transparent;
		color: var(--color-muted-foreground, #71717a);
		font-size: 0.6875rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
		font-weight: 600;
		cursor: pointer;
		border-radius: 0.125rem;
		padding: 0;
		flex-shrink: 0;
	}

	.combination-label:hover {
		background: var(--color-muted, #f4f4f5);
		color: var(--color-foreground, #18181b);
	}

	.overflow-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.125rem 0.375rem;
		border: 1px solid var(--color-border, #e4e4e7);
		border-radius: 0.25rem;
		background: var(--color-muted, #f4f4f5);
		color: var(--color-muted-foreground, #71717a);
		font-size: 0.6875rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.overflow-btn:hover {
		background: var(--color-accent, #e4e4e7);
		color: var(--color-foreground, #18181b);
	}

	.clear-all-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.5rem;
		border: 1px solid color-mix(in srgb, var(--color-destructive, #ef4444) 30%, var(--color-border, #e4e4e7));
		border-radius: 0.25rem;
		background: transparent;
		color: var(--color-destructive, #ef4444);
		font-size: 0.6875rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		margin-left: auto;
	}

	.clear-all-btn:hover {
		background: color-mix(in srgb, var(--color-destructive, #ef4444) 10%, transparent);
	}
</style>
