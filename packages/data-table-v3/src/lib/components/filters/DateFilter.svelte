<script lang="ts">
	import { untrack } from 'svelte';
	import type { DateFilter, DateFilterOperator } from '../../types/filters';
	import type { ColumnConfig } from '../../types/columns';

	interface Props {
		column: ColumnConfig;
		filter?: DateFilter;
		onFilterChange?: (filter: DateFilter | null) => void;
	}

	let { column, filter, onFilterChange }: Props = $props();

	// Helper to check if the current filter belongs to this component (is a DateFilter)
	function isOurFilter(): boolean {
		return untrack(() => filter?.type === 'date');
	}

	// Filter state
	let operator = $state<DateFilterOperator>(filter?.operator || 'equals');
	let value = $state<string>('');
	let minValue = $state<string>('');
	let maxValue = $state<string>('');
	let enabled = $state(filter?.enabled ?? true);

	// Available operators
	const operators: { value: DateFilterOperator; label: string }[] = [
		{ value: 'equals', label: 'On' },
		{ value: 'before', label: 'Before' },
		{ value: 'after', label: 'After' },
		{ value: 'between', label: 'Between' }
	];

	// Check if operator uses range
	const isRangeOperator = $derived(operator === 'between');

	/**
	 * Format date for input[type="date"]
	 */
	function formatDateForInput(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	/**
	 * Parse input date string to Date
	 */
	function parseInputDate(dateStr: string): Date | undefined {
		if (!dateStr) return undefined;
		return new Date(dateStr);
	}

	/**
	 * Format date for display (YYYY-MM-DD only, no time component)
	 */
	function formatDateForDisplay(value: string | Date | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') {
			// If it's already a string, extract just the date portion
			return value.split('T')[0];
		}
		// If it's a Date object, format it
		return formatDateForInput(value);
	}

	// Sync internal state with filter prop when it changes (e.g., dataset switch)
	// IMPORTANT: Only process DateFilter types - ignore other filter types (e.g., SetFilter from charts)
	$effect(() => {
		if (filter && filter.type === 'date') {
			operator = filter.operator;
			enabled = filter.enabled ?? true;

			// Update tracking to match loaded operator (prevents value transfer on load)
			prevOperator = filter.operator;

			if (filter.operator === 'between') {
				minValue = filter.value ? formatDateForInput(new Date(filter.value)) : '';
				maxValue = filter.value2 ? formatDateForInput(new Date(filter.value2)) : '';
				value = '';
			} else {
				value = filter.value ? formatDateForInput(new Date(filter.value)) : '';
				minValue = '';
				maxValue = '';
			}
		} else if (!filter) {
			// Clear values when filter is cleared, but DON'T reset operator
			// (User may have just changed operator and is about to enter a value)
			value = '';
			minValue = '';
			maxValue = '';
			enabled = true;

			// Keep prevOperator in sync with current operator
			prevOperator = operator;
		}
		// If filter exists but is not 'date' type (e.g., SetFilter from chart), do nothing
	});

	/**
	 * Apply filter
	 */
	function applyFilter() {
		if (isRangeOperator) {
			// Between operator
			const min = parseInputDate(minValue);
			const max = parseInputDate(maxValue);

			if (!min || !max) {
				onFilterChange?.(null);
				return;
			}

			const newFilter: DateFilter = {
				type: 'date',
				columnId: column.id,
				operator: 'between',
				value: min,
				value2: max,
				enabled
			};

			onFilterChange?.(newFilter);
		} else {
			// Single value operators
			const date = parseInputDate(value);

			if (!date) {
				onFilterChange?.(null);
				return;
			}

			const newFilter: DateFilter = {
				type: 'date',
				columnId: column.id,
				operator,
				value: date,
				enabled
			};

			onFilterChange?.(newFilter);
		}
	}

	/**
	 * Clear filter
	 */
	function clearFilter() {
		value = '';
		minValue = '';
		maxValue = '';
		operator = 'equals';
		enabled = true;
		onFilterChange?.(null);
	}

	// Auto-apply filter with debouncing
	let applyTimeout: ReturnType<typeof setTimeout> | null = null;

	function scheduleApply() {
		if (applyTimeout) {
			clearTimeout(applyTimeout);
		}
		applyTimeout = setTimeout(() => {
			applyFilter();
		}, 300);
	}

	// Track previous operator to detect changes (for value transfer logic)
	let prevOperator = $state<DateFilterOperator>('equals');
	let isChangingOperator = $state(false);

	// Preserve date values when operator changes
	$effect(() => {
		const operatorChanged = operator !== prevOperator;
		const wasBetween = prevOperator === 'between';
		const isBetween = operator === 'between';
		prevOperator = operator;

		if (operatorChanged) {
			isChangingOperator = true;

			if (wasBetween && !isBetween) {
				// Switching from "between" to single-value operator: preserve minValue
				value = minValue;
				minValue = '';
				maxValue = '';
			} else if (!wasBetween && isBetween) {
				// Switching from single-value to "between": use current value as minValue
				minValue = value;
				maxValue = '';
				value = '';
			}
			// If switching between single-value operators (equals/before/after), keep the value as-is

			// Reset flag after a short delay to allow the value transfer to complete
			setTimeout(() => {
				isChangingOperator = false;
			}, 0);
		}
	});

	// Watch for value changes
	// IMPORTANT: Only auto-clear when we have a DateFilter active, not other filter types
	$effect(() => {
		// Reference values to trigger effect (these are the only reactive dependencies)
		value;
		minValue;
		maxValue;
		operator;

		// Skip auto-clear during operator changes
		if (isChangingOperator) {
			return;
		}

		// Use untrack to check filter type without adding filter as a dependency
		// This prevents infinite loops when chart filters (SetFilter) are applied
		const isDateFilterActive = isOurFilter();

		// Schedule apply if values are set
		if (isRangeOperator) {
			if (minValue && maxValue) {
				scheduleApply();
			} else if (!minValue && !maxValue && isDateFilterActive) {
				// Only clear if OUR (date) filter values become empty
				onFilterChange?.(null);
			}
		} else {
			if (value) {
				scheduleApply();
			} else if (!value && isDateFilterActive) {
				// Only clear if OUR (date) filter value becomes empty
				onFilterChange?.(null);
			}
		}
	});
</script>

<div class="date-filter">
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

	<!-- Operator Selector -->
	<div class="filter-control">
		<select bind:value={operator} class="filter-select" aria-label="Filter operator">
			{#each operators as op (op.value)}
				<option value={op.value}>{op.label}</option>
			{/each}
		</select>
	</div>

	<!-- Value Input(s) -->
	{#if isRangeOperator}
		<!-- Range inputs -->
		<div class="filter-control">
			<label class="input-label" for="date-filter-from-{column.id}">From</label>
			<input
				id="date-filter-from-{column.id}"
				type="date"
				bind:value={minValue}
				class="filter-input"
				class:has-value={minValue && minValue !== ''}
				aria-label="Start date"
			/>
		</div>
		<div class="filter-control">
			<label class="input-label" for="date-filter-to-{column.id}">To</label>
			<input
				id="date-filter-to-{column.id}"
				type="date"
				bind:value={maxValue}
				class="filter-input"
				class:has-value={maxValue && maxValue !== ''}
				aria-label="End date"
			/>
		</div>
	{:else}
		<!-- Single value input -->
		<div class="filter-control">
			<input
				type="date"
				bind:value
				class="filter-input"
				class:has-value={value && value !== ''}
				aria-label="Filter date"
			/>
		</div>
	{/if}

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
				{#if isRangeOperator}
					{formatDateForDisplay(minValue)} - {formatDateForDisplay(maxValue)}
				{:else}
					{operators.find((o) => o.value === operator)?.label}
					{formatDateForDisplay(value)}
				{/if}
			</span>
		</div>
	{/if}
</div>

<style>
	.date-filter {
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

	.filter-control {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.input-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-muted-foreground);
	}

	.filter-select,
	.filter-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		background: var(--color-background);
		color: var(--color-foreground);
		border: 1px solid var(--color-input);
		border-radius: 0.375rem;
		transition: all 0.15s;
	}

	/* Ensure native date picker icon is visible in dark mode */
	.filter-input[type='date'] {
		color-scheme: light dark;
	}

	.filter-select:focus,
	.filter-input:focus {
		outline: none;
		border-color: var(--color-ring);
		box-shadow: 0 0 0 2px hsl(var(--color-ring) / 0.2);
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
