<script lang="ts">
	import type { TextFilter, TextFilterOperator, SetFilter, Filter } from '../../types/filters';
	import type { ColumnConfig } from '../../types/columns';

	interface Props {
		column: ColumnConfig;
		filter?: TextFilter | SetFilter; // Can receive SetFilter from chart filters
		onFilterChange?: (filter: TextFilter | SetFilter | null) => void;
	}

	let { column, filter, onFilterChange }: Props = $props();

	// Filter state - initialize to safe defaults, sync from filter prop in $effect
	let operator = $state<TextFilterOperator>('contains');
	let value = $state<string>('');
	let caseSensitive = $state(false);
	let wholeWord = $state(false);
	let enabled = $state(true);
	let initialized = $state(false);

	// Safe accessor for template - ensures value is never undefined
	function getSafeValue(): string {
		return value ?? '';
	}

	// Sync internal state with filter prop when it changes (e.g., dataset switch or chart filter)
	$effect(() => {
		if (filter && filter.type === 'text') {
			// Sync from TextFilter
			operator = filter.operator ?? 'contains';
			value = filter.value ?? '';
			caseSensitive = filter.caseSensitive ?? false;
			wholeWord = filter.wholeWord ?? false;
			enabled = filter.enabled ?? true;

			// Update tracking to match loaded filter (prevents redundant re-application)
			lastAppliedOperator = filter.operator ?? 'contains';
			lastAppliedCaseSensitive = filter.caseSensitive ?? false;
			lastAppliedWholeWord = filter.wholeWord ?? false;
		} else if (filter && filter.type === 'set') {
			// Sync from SetFilter (from chart categorical filter)
			operator = 'in';
			value = (filter as SetFilter).values.map(String).join(', ');
			caseSensitive = false;
			wholeWord = false;
			enabled = filter.enabled ?? true;

			// Update tracking
			lastAppliedOperator = 'in';
			lastAppliedCaseSensitive = false;
			lastAppliedWholeWord = false;
		} else if (!filter && initialized) {
			// Only reset to defaults when filter is explicitly cleared (null/undefined)
			operator = 'contains';
			value = '';
			caseSensitive = false;
			wholeWord = false;
			enabled = true;

			// Reset tracking
			lastAppliedOperator = 'contains';
			lastAppliedCaseSensitive = false;
			lastAppliedWholeWord = false;
		}
		initialized = true;
	});

	// Available operators
	const operators: { value: TextFilterOperator; label: string }[] = [
		{ value: 'contains', label: 'Contains' },
		{ value: 'equals', label: 'Equals' },
		{ value: 'startsWith', label: 'Starts with' },
		{ value: 'endsWith', label: 'Ends with' },
		{ value: 'notContains', label: 'Does not contain' },
		{ value: 'notEquals', label: 'Not equal to' },
		{ value: 'in', label: 'In (comma sep.)' }
	];

	/**
	 * Apply filter
	 */
	function applyFilter() {
		// Guard against undefined value
		const currentValue = value ?? '';
		// Allow whitespace-only searches - check actual length, not trimmed
		if (currentValue.length === 0) {
			// Clear filter if value is completely empty
			onFilterChange?.(null);
			return;
		}

		// For 'in' operator, emit SetFilter with array of values
		if (operator === 'in') {
			const values = currentValue
				.split(',')
				.map((v) => v.trim())
				.filter(Boolean);

			if (values.length === 0) {
				onFilterChange?.(null);
				return;
			}

			const newFilter: SetFilter = {
				type: 'set',
				columnId: column.id,
				operator: 'in',
				values,
				enabled
			};

			onFilterChange?.(newFilter);
		} else {
			// Standard text filter
			const newFilter: TextFilter = {
				type: 'text',
				columnId: column.id,
				operator,
				value: currentValue, // Keep the value as-is, including spaces
				caseSensitive,
				wholeWord,
				enabled
			};

			onFilterChange?.(newFilter);
		}

		// Track what we just applied
		lastAppliedOperator = operator;
		lastAppliedCaseSensitive = caseSensitive;
		lastAppliedWholeWord = wholeWord;
	}

	/**
	 * Clear filter
	 */
	function clearFilter() {
		value = '';
		operator = 'contains';
		caseSensitive = false;
		wholeWord = false;
		enabled = true;
		onFilterChange?.(null);

		// Reset tracking
		lastAppliedOperator = 'contains';
		lastAppliedCaseSensitive = false;
		lastAppliedWholeWord = false;
	}

	/**
	 * Toggle case sensitive
	 */
	function toggleCaseSensitive(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		caseSensitive = !caseSensitive;
	}

	/**
	 * Toggle whole word
	 */
	function toggleWholeWord(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		wholeWord = !wholeWord;
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

	// Auto-apply filter when Enter is pressed or value changes (debounced)
	let applyTimeout: ReturnType<typeof setTimeout> | null = null;

	function scheduleApply() {
		if (applyTimeout) {
			clearTimeout(applyTimeout);
		}
		applyTimeout = setTimeout(() => {
			applyFilter();
		}, 300);
	}

	// Track what was last applied to detect meaningful changes
	let lastAppliedOperator = $state<TextFilterOperator>('contains');
	let lastAppliedCaseSensitive = $state<boolean>(false);
	let lastAppliedWholeWord = $state<boolean>(false);

	// Watch for value changes
	$effect(() => {
		// Guard against undefined value during initialization
		const currentValue = value ?? '';

		// Check what changed from last applied state
		const operatorChanged = operator !== lastAppliedOperator;
		const caseSensitiveChanged = caseSensitive !== lastAppliedCaseSensitive;
		const wholeWordChanged = wholeWord !== lastAppliedWholeWord;

		// Apply immediately if operator or options changed (with value present)
		if ((operatorChanged || caseSensitiveChanged || wholeWordChanged) && currentValue.length > 0) {
			applyFilter(); // This will update lastApplied tracking
		}
		// Otherwise debounce value changes
		else if (currentValue.length > 0) {
			scheduleApply(); // This calls applyFilter after timeout
		} else if (currentValue.length === 0 && filter && (filter.type === 'text' || filter.type === 'set')) {
			// Clear filter if value becomes empty (for both TextFilter and SetFilter)
			onFilterChange?.(null);
			// Reset tracking when cleared
			lastAppliedOperator = 'contains';
			lastAppliedCaseSensitive = false;
			lastAppliedWholeWord = false;
		}
	});
</script>

<div class="text-filter">
	<!-- Header -->
	<div class="filter-header">
		<div class="filter-label">
			<span class="filter-title">{column.header}</span>
		</div>
		{#if filter || getSafeValue()}
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
		<select
			bind:value={operator}
			class="filter-select"
			aria-label="Filter operator"
		>
			{#each operators as op (op.value)}
				<option value={op.value}>{op.label}</option>
			{/each}
		</select>
	</div>

	<!-- Value Input with Inline Options -->
	<div class="filter-control">
		<div class="input-wrapper">
			<input
				type="text"
				bind:value
				onkeydown={handleKeydown}
				placeholder="Enter value..."
				class="filter-input"
				class:has-value={getSafeValue().length > 0}
				aria-label="Filter value"
			/>
			<div class="filter-options">
				<button
					type="button"
					class="option-btn"
					class:active={caseSensitive}
					onclick={toggleCaseSensitive}
					title="Match Case"
					aria-label="Toggle case sensitive matching"
					aria-pressed={caseSensitive}
				>
					Aa
				</button>
				<button
					type="button"
					class="option-btn"
					class:active={wholeWord}
					onclick={toggleWholeWord}
					title="Match Whole Word"
					aria-label="Toggle whole word matching"
					aria-pressed={wholeWord}
				>
					ab
				</button>
			</div>
		</div>
	</div>

	<!-- Status Indicator -->
	{#if filter && getSafeValue()}
		<div class="filter-status">
			<span class="status-badge">
				<svg class="status-icon" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
				Active
			</span>
		</div>
	{/if}
</div>

<style>
	.text-filter {
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

	/* Input wrapper for positioning inline buttons */
	.input-wrapper {
		position: relative;
		width: 100%;
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

	/* Add padding to the right for inline buttons */
	.filter-input {
		padding-right: 4rem; /* Space for 2 buttons */
	}

	.filter-select:focus,
	.filter-input:focus {
		outline: none;
		border-color: var(--color-ring);
		box-shadow: 0 0 0 2px hsl(var(--color-ring) / 0.2);
	}

	.filter-input::placeholder {
		color: var(--color-muted-foreground);
	}

	/* Inline filter options container */
	.filter-options {
		position: absolute;
		right: 4px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		gap: 2px;
		pointer-events: auto;
	}

	/* Option button styling */
	.option-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-muted-foreground);
		background: var(--color-muted);
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s;
		user-select: none;
	}

	.option-btn:hover {
		background: color-mix(in srgb, var(--color-muted) 80%, var(--color-foreground));
		color: var(--color-foreground);
		border-color: var(--color-muted-foreground);
	}

	.option-btn.active {
		color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
		border-color: var(--color-primary);
	}

	.option-btn:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
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
