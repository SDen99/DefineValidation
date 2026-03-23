<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * ExpandableSection - Reusable component for collapsible content sections
	 *
	 * Used in Phase 1 for method/codelist/comments expandable sections in dataset detail pages.
	 *
	 * Features:
	 * - Controlled expansion state via props
	 * - Only renders when expanded (hides completely when collapsed)
	 * - No toggle button visible - controlled by parent badges
	 * - Simple title + content display
	 * - Renders children via snippet pattern
	 */
	let {
		title,
		expanded = false,
		children
	}: {
		title: string;
		expanded?: boolean;
		children: Snippet;
	} = $props();
</script>

<!-- Only render when expanded -->
{#if expanded}
	<div class="expandable-section border-t first:border-t-0">
		<!-- Section Header (no button, just title) -->
		<div class="flex w-full items-center gap-2 px-4 py-2">
			<!-- Title -->
			<span class="flex-1 text-sm font-medium text-muted-foreground">
				{title}
			</span>
		</div>

		<!-- Section Content -->
		<div class="px-4 pb-3">
			{@render children()}
		</div>
	</div>
{/if}
