<script lang="ts">
	/**
	 * StatusBar - Display row count and active filter/sort status
	 */

	interface Props {
		totalRows: number;
		filteredRows: number;
		filterCount: number;
		sortCount: number;
	}

	let { totalRows, filteredRows, filterCount, sortCount }: Props = $props();
</script>

<div class="status-bar px-4 py-2 border-t border-border bg-muted text-sm text-muted-foreground">
	Showing {filteredRows.toLocaleString()} of {totalRows.toLocaleString()} rows
	{#if filterCount > 0}
		| {filterCount} filter{filterCount !== 1 ? 's' : ''} active
	{/if}
	{#if sortCount > 0}
		| {sortCount} sort{sortCount !== 1 ? 's' : ''} active
	{/if}
</div>

<style>
	.status-bar {
		flex-shrink: 0;
	}
</style>
