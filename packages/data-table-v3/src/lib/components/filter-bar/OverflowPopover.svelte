<script lang="ts">
	/**
	 * OverflowPopover - Shows overflow filter chips in a modal dialog.
	 */

	import type { Filter } from '../../types/filters';
	import type { ColumnConfig } from '../../types/columns';
	import FilterChip from './FilterChip.svelte';

	interface FilterEntry {
		filter: Exclude<Filter, { type: 'global' }>;
		column: ColumnConfig;
	}

	interface Props {
		filters: FilterEntry[];
		onToggleNegation: (columnId: string) => void;
		onRemove: (columnId: string) => void;
		onClose: () => void;
	}

	let { filters, onToggleNegation, onRemove, onClose }: Props = $props();

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
	<div class="popover-content" role="dialog" aria-label="Overflow filters">
		<div class="popover-header">
			<span class="header-title">{filters.length} more filter{filters.length !== 1 ? 's' : ''}</span>
			<button class="close-btn" onclick={onClose} aria-label="Close">×</button>
		</div>

		<div class="popover-list">
			{#each filters as entry (entry.filter.columnId)}
				<div class="popover-item">
					<FilterChip
						filter={entry.filter}
						column={entry.column}
						onToggleNegation={() => onToggleNegation(entry.filter.columnId)}
						onRemove={() => onRemove(entry.filter.columnId)}
					/>
				</div>
			{/each}
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
		width: 320px;
		max-height: 50vh;
		display: flex;
		flex-direction: column;
		font-size: 0.8125rem;
	}

	.popover-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--color-border, #e4e4e7);
	}

	.header-title {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-foreground, #18181b);
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

	.popover-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.popover-item {
		display: flex;
	}
</style>
