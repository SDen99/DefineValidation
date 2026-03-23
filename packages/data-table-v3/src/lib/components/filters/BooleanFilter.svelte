<script lang="ts">
	import { untrack } from 'svelte';
	import type { BooleanFilter } from '../../types/filters';
	import type { ColumnConfig } from '../../types/columns';

	interface Props {
		column: ColumnConfig;
		filter?: BooleanFilter;
		onFilterChange?: (filter: BooleanFilter | null) => void;
	}

	let { column, filter, onFilterChange }: Props = $props();

	// Helper to check if the current filter belongs to this component (is a BooleanFilter)
	function isOurFilter(): boolean {
		return untrack(() => filter?.type === 'boolean');
	}

	// Filter state
	let value = $state<boolean | undefined>(filter?.value);
	let enabled = $state(filter?.enabled ?? true);

	// Sync internal state with filter prop when it changes (e.g., dataset switch)
	// IMPORTANT: Only process BooleanFilter types - ignore other filter types (e.g., SetFilter from charts)
	$effect(() => {
		if (filter && filter.type === 'boolean') {
			value = filter.value;
			enabled = filter.enabled ?? true;
		} else if (!filter) {
			// Reset to defaults when filter is cleared (but not when a different filter type is active)
			value = undefined;
			enabled = true;
		}
		// If filter exists but is not 'boolean' type (e.g., SetFilter from chart), do nothing
	});

	// Options for boolean filter
	const options: { value: boolean | undefined; label: string }[] = [
		{ value: undefined, label: 'All' },
		{ value: true, label: 'True' },
		{ value: false, label: 'False' }
	];

	/**
	 * Apply filter
	 */
	function applyFilter(newValue: boolean | undefined) {
		value = newValue;

		if (newValue === undefined) {
			onFilterChange?.(null);
			return;
		}

		const newFilter: BooleanFilter = {
			type: 'boolean',
			columnId: column.id,
			operator: 'equals',
			value: newValue,
			enabled
		};

		onFilterChange?.(newFilter);
	}

	/**
	 * Clear filter
	 */
	function clearFilter() {
		applyFilter(undefined);
	}

	/**
	 * Handle option click
	 */
	function handleOptionClick(optionValue: boolean | undefined) {
		applyFilter(optionValue);
	}
</script>

<div class="boolean-filter">
	<!-- Header -->
	<div class="filter-header">
		<div class="filter-label">
			<span class="filter-title">{column.header}</span>
		</div>
		{#if filter}
			<button
				onclick={clearFilter}
				class="clear-button"
				title="Clear filter"
				aria-label="Clear filter"
			>
				<svg class="clear-icon" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		{/if}
	</div>

	<!-- Options -->
	<div class="options-group">
		{#each options as option (option.label)}
			<button
				onclick={() => handleOptionClick(option.value)}
				class="option-button"
				class:active={value === option.value}
				aria-label={`Filter by ${option.label}`}
			>
				{#if value === option.value}
					<svg class="option-icon" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg class="option-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" stroke-width="2" />
					</svg>
				{/if}
				<span>{option.label}</span>
			</button>
		{/each}
	</div>

	<!-- Status Indicator -->
	{#if filter}
		<div class="filter-status">
			<span class="status-badge">
				<svg class="status-icon" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				Showing: {value ? 'True' : 'False'}
			</span>
		</div>
	{/if}
</div>

<style>
	.boolean-filter {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--color-card);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
	}

	.filter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.filter-label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.filter-title {
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--color-card-foreground);
	}

	.clear-button {
		padding: 0.25rem;
		color: var(--color-muted-foreground);
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.clear-button:hover {
		color: var(--color-destructive);
		background: var(--color-destructive-foreground);
	}

	.clear-icon {
		width: 0.75rem;
		height: 0.75rem;
	}

	.options-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.option-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-foreground);
		background: var(--color-background);
		border: 1px solid var(--color-input);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s;
		text-align: left;
	}

	.option-button:hover {
		background: var(--color-accent);
		border-color: var(--color-ring);
	}

	.option-button.active {
		color: var(--color-primary);
		background: var(--color-primary-foreground);
		border-color: var(--color-primary);
		font-weight: 500;
	}

	.option-icon {
		width: 1rem;
		height: 1rem;
	}

	.filter-status {
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: hsl(var(--color-success));
		background: hsl(var(--color-success) / 0.1);
		border-radius: 9999px;
	}

	.status-icon {
		width: 0.75rem;
		height: 0.75rem;
	}
</style>
