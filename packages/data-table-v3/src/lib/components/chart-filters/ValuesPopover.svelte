<script lang="ts">
	/**
	 * ValuesPopover - Scrollable list of all categorical values
	 *
	 * Shows when user clicks "...more" on a categorical chart.
	 * Allows selecting/deselecting values for filtering.
	 */

	import type { CategoricalItem } from '../../chart-filters';

	interface Props {
		items: CategoricalItem[];
		selectedValues: Set<string>;
		onSelectionChange: (values: Set<string>) => void;
		onClose: () => void;
		labelFormat?: 'code' | 'decode' | 'both';
	}

	let { items, selectedValues, onSelectionChange, onClose, labelFormat = 'code' }: Props = $props();

	// ============================================================================
	// State
	// ============================================================================

	let searchQuery = $state('');

	// ============================================================================
	// Derived
	// ============================================================================

	const filteredItems = $derived.by(() => {
		if (!searchQuery.trim()) return items;
		const query = searchQuery.toLowerCase();
		return items.filter(
			(item) =>
				item.value.toLowerCase().includes(query) ||
				(item.decode && item.decode.toLowerCase().includes(query))
		);
	});

	const allSelected = $derived(
		filteredItems.length > 0 && filteredItems.every((item) => selectedValues.has(item.value))
	);

	const noneSelected = $derived(selectedValues.size === 0);

	// ============================================================================
	// Helpers
	// ============================================================================

	function getLabel(item: CategoricalItem): string {
		switch (labelFormat) {
			case 'decode':
				return item.decode || item.value;
			case 'both':
				return item.decode ? `${item.value} (${item.decode})` : item.value;
			default:
				return item.value;
		}
	}

	// ============================================================================
	// Event Handlers
	// ============================================================================

	function toggleValue(value: string) {
		const newSelected = new Set(selectedValues);
		if (newSelected.has(value)) {
			newSelected.delete(value);
		} else {
			newSelected.add(value);
		}
		onSelectionChange(newSelected);
	}

	function selectAll() {
		const newSelected = new Set(selectedValues);
		for (const item of filteredItems) {
			newSelected.add(item.value);
		}
		onSelectionChange(newSelected);
	}

	function clearAll() {
		onSelectionChange(new Set());
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="popover-backdrop" onclick={handleBackdropClick}>
	<div class="popover-content" role="dialog" aria-label="Select values">
		<div class="popover-header">
			<input
				type="text"
				class="search-input"
				placeholder="Search values..."
				bind:value={searchQuery}
			/>
			<button class="close-btn" onclick={onClose} aria-label="Close">×</button>
		</div>

		<div class="popover-actions">
			<button class="action-btn" onclick={selectAll} disabled={allSelected}>Select All</button>
			<button class="action-btn" onclick={clearAll} disabled={noneSelected}>Clear</button>
			<span class="count-label">{filteredItems.length} values</span>
		</div>

		<div class="popover-list">
			{#each filteredItems as item (item.value)}
				<label class="value-item" class:selected={selectedValues.has(item.value)}>
					<input
						type="checkbox"
						checked={selectedValues.has(item.value)}
						onchange={() => toggleValue(item.value)}
					/>
					<span class="value-label">{getLabel(item)}</span>
					<span class="value-count">{item.count}</span>
				</label>
			{/each}

			{#if filteredItems.length === 0}
				<div class="no-results">No values match "{searchQuery}"</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.popover-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 10vh;
		z-index: 1000;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.popover-content {
		background: var(--color-popover, white);
		color: var(--color-popover-foreground, #18181b);
		border: 1px solid var(--color-border, #e4e4e7);
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		width: 260px;
		max-height: 50vh;
		display: flex;
		flex-direction: column;
		font-size: 0.8125rem;
	}

	.popover-header {
		display: flex;
		gap: 0.375rem;
		padding: 0.5rem;
		border-bottom: 1px solid var(--color-border, #e4e4e7);
	}

	.search-input {
		flex: 1;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-border, #e4e4e7);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		background: var(--color-background, white);
		color: var(--color-foreground, #18181b);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-ring, #3b82f6);
	}

	.close-btn {
		width: 1.25rem;
		height: 1.25rem;
		border: none;
		background: transparent;
		color: var(--color-muted-foreground, #71717a);
		font-size: 0.875rem;
		cursor: pointer;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: var(--color-muted, #f4f4f5);
	}

	.popover-actions {
		display: flex;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		border-bottom: 1px solid var(--color-border, #e4e4e7);
		align-items: center;
	}

	.action-btn {
		padding: 0.125rem 0.5rem;
		border: 1px solid var(--color-border, #e4e4e7);
		background: var(--color-background, white);
		color: var(--color-foreground, #18181b);
		border-radius: 0.25rem;
		font-size: 0.6875rem;
		cursor: pointer;
	}

	.action-btn:hover:not(:disabled) {
		background: var(--color-muted, #f4f4f5);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.count-label {
		margin-left: auto;
		font-size: 0.625rem;
		color: var(--color-muted-foreground, #71717a);
	}

	.popover-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.125rem 0;
	}

	.value-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.75rem;
	}

	.value-item:hover {
		background: var(--color-muted, #f4f4f5);
	}

	.value-item.selected {
		background: var(--color-accent, #f4f4f5);
	}

	.value-item input[type='checkbox'] {
		width: 0.75rem;
		height: 0.75rem;
		cursor: pointer;
	}

	.value-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.value-count {
		color: var(--color-muted-foreground, #71717a);
		font-size: 0.625rem;
		min-width: 1.5rem;
		text-align: right;
	}

	.no-results {
		padding: 1rem;
		text-align: center;
		color: var(--color-muted-foreground, #71717a);
		font-size: 0.75rem;
	}
</style>
