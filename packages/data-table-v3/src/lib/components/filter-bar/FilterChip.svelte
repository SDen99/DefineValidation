<script lang="ts">
	/**
	 * FilterChip - Individual filter chip for the FilterBar.
	 *
	 * Displays a compact filter representation with NOT toggle and remove button.
	 */

	import type { Filter } from '../../types/filters';
	import type { ColumnConfig } from '../../types/columns';
	import { isNegatedOperator } from '../../utils/filterNegation';
	import { formatFilterChip, getSetFilterSubChips } from '../../utils/filterFormatting';

	interface Props {
		filter: Exclude<Filter, { type: 'global' }>;
		column: ColumnConfig;
		onToggleNegation: () => void;
		onRemove: () => void;
	}

	let { filter, column, onToggleNegation, onRemove }: Props = $props();

	const negated = $derived(isNegatedOperator(filter.operator));
	const chipText = $derived(formatFilterChip(filter, column));
	const setSubChips = $derived(filter.type === 'set' ? getSetFilterSubChips(filter) : []);
	const maxVisibleSubChips = 3;
</script>

<div class="filter-chip" class:negated>
	<button
		class="negation-btn"
		onclick={onToggleNegation}
		aria-label={negated ? 'Remove negation' : 'Negate filter'}
		title={negated ? 'Negated (click to toggle)' : 'Click to negate'}
	>
		{#if negated}
			<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
				<polygon points="1,0 7,4 1,8" fill="currentColor" />
			</svg>
		{:else}
			<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
				<polygon points="1,0 7,4 1,8" fill="none" stroke="currentColor" stroke-width="1.2" />
			</svg>
		{/if}
	</button>

	<span class="chip-text">{chipText}</span>

	{#if filter.type === 'set' && setSubChips.length > 0}
		<span class="sub-chips">
			{#each setSubChips.slice(0, maxVisibleSubChips) as value (value)}
				<span class="sub-chip">{value}</span>
			{/each}
			{#if setSubChips.length > maxVisibleSubChips}
				<span class="sub-chip overflow">+{setSubChips.length - maxVisibleSubChips}</span>
			{/if}
		</span>
	{/if}

	<button class="remove-btn" onclick={onRemove} aria-label="Remove filter">×</button>
</div>

<style>
	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.25rem;
		border: 1px solid var(--color-border, #e4e4e7);
		border-radius: 0.25rem;
		background: var(--color-muted, #f4f4f5);
		font-size: 0.6875rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
		white-space: nowrap;
		line-height: 1.4;
		max-height: 1.5rem;
	}

	.filter-chip.negated {
		background: color-mix(in srgb, var(--color-warning, #f59e0b) 10%, var(--color-muted, #f4f4f5));
		border-color: color-mix(in srgb, var(--color-warning, #f59e0b) 30%, var(--color-border, #e4e4e7));
	}

	.negation-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		border: none;
		background: transparent;
		color: var(--color-muted-foreground, #71717a);
		cursor: pointer;
		border-radius: 0.125rem;
		padding: 0;
		flex-shrink: 0;
	}

	.negation-btn:hover {
		background: var(--color-accent, #e4e4e7);
		color: var(--color-foreground, #18181b);
	}

	.filter-chip.negated .negation-btn {
		color: var(--color-warning, #f59e0b);
	}

	.chip-text {
		color: var(--color-foreground, #18181b);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sub-chips {
		display: inline-flex;
		gap: 0.125rem;
		align-items: center;
	}

	.sub-chip {
		display: inline-block;
		padding: 0 0.25rem;
		border-radius: 0.125rem;
		background: var(--color-background, white);
		border: 1px solid var(--color-border, #e4e4e7);
		font-size: 0.625rem;
		line-height: 1.4;
	}

	.sub-chip.overflow {
		color: var(--color-muted-foreground, #71717a);
		font-style: italic;
	}

	.remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		border: none;
		background: transparent;
		color: var(--color-muted-foreground, #71717a);
		cursor: pointer;
		border-radius: 0.125rem;
		padding: 0;
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.remove-btn:hover {
		background: color-mix(in srgb, var(--color-destructive, #ef4444) 15%, transparent);
		color: var(--color-destructive, #ef4444);
	}
</style>
