<script lang="ts">
	import { untrack } from 'svelte';
	import type { NumericFilter, NumericFilterOperator } from '../../types/filters';
	import type { ColumnConfig } from '../../types/columns';

	interface Props {
		column: ColumnConfig;
		filter?: NumericFilter;
		onFilterChange?: (filter: NumericFilter | null) => void;
	}

	let { column, filter, onFilterChange }: Props = $props();

	// Helper to check if the current filter belongs to this component (is a NumericFilter)
	function isOurFilter(): boolean {
		return untrack(() => filter?.type === 'numeric');
	}

	/**
	 * Round a number to reasonable precision for display.
	 * Preserves integers, limits decimals based on magnitude.
	 */
	function roundForDisplay(num: number | undefined): number | undefined {
		if (num === undefined || num === null || Number.isNaN(num)) return undefined;
		if (Number.isInteger(num)) return num;

		const abs = Math.abs(num);
		// For large numbers (>=100), round to 1 decimal
		if (abs >= 100) return Math.round(num * 10) / 10;
		// For medium numbers (>=1), round to 2 decimals
		if (abs >= 1) return Math.round(num * 100) / 100;
		// For small numbers, round to 4 decimals
		return Math.round(num * 10000) / 10000;
	}

	// Filter state
	let operator = $state<NumericFilterOperator>(filter?.operator || 'equals');
	let value = $state<number | undefined>(filter?.value);
	let minValue = $state<number | undefined>(
		filter?.operator === 'between' ? filter.value : undefined
	);
	let maxValue = $state<number | undefined>(
		filter?.operator === 'between' ? filter.value2 : undefined
	);
	let enabled = $state(filter?.enabled ?? true);

	// Sync internal state with filter prop when it changes (e.g., dataset switch)
	// IMPORTANT: Only process NumericFilter types - ignore other filter types (e.g., SetFilter from charts)
	$effect(() => {
		if (filter && filter.type === 'numeric') {
			operator = filter.operator;
			enabled = filter.enabled ?? true;
			if (filter.operator === 'between') {
				minValue = roundForDisplay(filter.value);
				maxValue = roundForDisplay(filter.value2);
				value = undefined;
			} else {
				value = roundForDisplay(filter.value);
				minValue = undefined;
				maxValue = undefined;
			}
		} else if (!filter) {
			// Reset to defaults when filter is cleared (but not when a different filter type is active)
			operator = 'equals';
			value = undefined;
			minValue = undefined;
			maxValue = undefined;
			enabled = true;
		}
		// If filter exists but is not 'numeric' type (e.g., SetFilter from chart), do nothing
	});

	// Available operators
	const operators: { value: NumericFilterOperator; label: string }[] = [
		{ value: 'equals', label: 'Equals' },
		{ value: 'notEquals', label: 'Not equal' },
		{ value: 'greaterThan', label: 'Greater than' },
		{ value: 'greaterThanOrEqual', label: 'Greater than or equal' },
		{ value: 'lessThan', label: 'Less than' },
		{ value: 'lessThanOrEqual', label: 'Less than or equal' },
		{ value: 'between', label: 'Between' }
	];

	// Check if operator uses range
	const isRangeOperator = $derived(operator === 'between');

	/**
	 * Check if a value is empty (null, undefined, or NaN)
	 */
	function isEmptyValue(val: number | undefined): boolean {
		return val === undefined || val === null || Number.isNaN(val);
	}

	/**
	 * Apply filter
	 */
	function applyFilter() {
		if (isRangeOperator) {
			// Between operator
			if (isEmptyValue(minValue) || isEmptyValue(maxValue)) {
				onFilterChange?.(null);
				return;
			}

			const newFilter: NumericFilter = {
				type: 'numeric',
				columnId: column.id,
				operator: 'between',
				value: minValue!,
				value2: maxValue!,
				enabled
			};

			onFilterChange?.(newFilter);
		} else {
			// Single value operators
			if (isEmptyValue(value)) {
				onFilterChange?.(null);
				return;
			}

			const newFilter: NumericFilter = {
				type: 'numeric',
				columnId: column.id,
				operator,
				value: value!,
				enabled
			};

			onFilterChange?.(newFilter);
		}
	}

	/**
	 * Clear filter
	 */
	function clearFilter() {
		value = undefined;
		minValue = undefined;
		maxValue = undefined;
		operator = 'equals';
		enabled = true;
		onFilterChange?.(null);
	}

	/**
	 * Handle Enter key
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			applyFilter();
		} else if (event.key === 'Escape') {
			clearFilter();
		}
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

	/**
	 * Format a number to a reasonable number of decimal places.
	 * Preserves precision for values that need it, but limits excessive decimals.
	 */
	function formatNumber(num: number | undefined): string {
		if (num === undefined || num === null || Number.isNaN(num)) return '';

		// If it's effectively an integer, display without decimals
		if (Number.isInteger(num)) return num.toString();

		// Determine reasonable precision based on magnitude
		const abs = Math.abs(num);

		// For very small numbers, show more precision
		if (abs < 0.01 && abs > 0) {
			return num.toPrecision(3);
		}

		// For numbers >= 1, show up to 2 decimal places
		if (abs >= 1) {
			// Round to 2 dp and remove trailing zeros
			return parseFloat(num.toFixed(2)).toString();
		}

		// For numbers between 0.01 and 1, show up to 3 decimal places
		return parseFloat(num.toFixed(3)).toString();
	}

	// Watch for value changes
	// IMPORTANT: Only auto-clear when we have a NumericFilter active, not other filter types
	$effect(() => {
		// Reference values to trigger effect (these are the only reactive dependencies)
		value;
		minValue;
		maxValue;
		operator;

		// Use untrack to check filter type without adding filter as a dependency
		// This prevents infinite loops when chart filters (SetFilter) are applied
		const isNumericFilterActive = isOurFilter();

		// Schedule apply if values are set
		if (isRangeOperator) {
			if (!isEmptyValue(minValue) && !isEmptyValue(maxValue)) {
				scheduleApply();
			} else if (isEmptyValue(minValue) && isEmptyValue(maxValue) && isNumericFilterActive) {
				// Clear filter only if OUR (numeric) filter values become empty
				onFilterChange?.(null);
			}
		} else {
			if (!isEmptyValue(value)) {
				scheduleApply();
			} else if (isEmptyValue(value) && isNumericFilterActive) {
				// Clear filter only if OUR (numeric) filter value becomes empty
				onFilterChange?.(null);
			}
		}
	});

	// Reset values when operator changes to/from range
	$effect(() => {
		if (operator === 'between') {
			value = undefined;
		} else {
			minValue = undefined;
			maxValue = undefined;
		}
	});
</script>

<div class="numeric-filter">
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
		<!-- Range inputs - inline layout -->
		<div class="filter-control-inline">
			<label class="input-label" for="min-input">Min:</label>
			<input
				id="min-input"
				type="number"
				bind:value={minValue}
				onkeydown={handleKeydown}
				placeholder={formatNumber(minValue) || 'Min'}
				class="filter-input"
				class:has-value={minValue != null}
				aria-label="Minimum value"
			/>
		</div>
		<div class="filter-control-inline">
			<label class="input-label" for="max-input">Max:</label>
			<input
				id="max-input"
				type="number"
				bind:value={maxValue}
				onkeydown={handleKeydown}
				placeholder={formatNumber(maxValue) || 'Max'}
				class="filter-input"
				class:has-value={maxValue != null}
				aria-label="Maximum value"
			/>
		</div>
	{:else}
		<!-- Single value input -->
		<div class="filter-control">
			<input
				type="number"
				bind:value
				onkeydown={handleKeydown}
				placeholder="Enter value..."
				class="filter-input"
				class:has-value={value != null}
				aria-label="Filter value"
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
					{formatNumber(minValue)} - {formatNumber(maxValue)}
				{:else}
					{operators.find((o) => o.value === operator)?.label}
					{formatNumber(value)}
				{/if}
			</span>
		</div>
	{/if}
</div>

<style>
	.numeric-filter {
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

	.filter-control-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-control-inline .input-label {
		flex-shrink: 0;
		min-width: 2.5rem;
	}

	.filter-control-inline .filter-input {
		flex: 1;
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

	.filter-select:focus,
	.filter-input:focus {
		outline: none;
		border-color: var(--color-ring);
		box-shadow: 0 0 0 2px hsl(var(--color-ring) / 0.2);
	}

	/* Remove spinners for number inputs */
	.filter-input[type='number']::-webkit-inner-spin-button,
	.filter-input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.filter-input[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
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
