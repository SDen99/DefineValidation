<script lang="ts">
	import type { Comment, DefineType } from '@sden99/cdisc-types/define-xml';

	/**
	 * InlineCommentDisplay - View-only display of Comment metadata
	 *
	 * Shows comment description inline within VLM cell
	 */
	let {
		comment,
		defineType,
		onNavigateToDetail
	}: {
		comment: Comment | null | undefined;
		defineType: DefineType;
		onNavigateToDetail?: () => void;
	} = $props();
</script>

{#if comment}
	<div class="rounded-md border border-border bg-muted/30 p-3 text-xs break-words">
		<div class="mb-2 flex items-center justify-between gap-2">
			<span class="font-semibold text-foreground">Comment</span>
			{#if onNavigateToDetail}
				<button
					onclick={onNavigateToDetail}
					class="text-primary hover:underline flex-shrink-0"
					title="View full details"
				>
					→ Details
				</button>
			{/if}
		</div>

		{#if comment.Description}
			<div class="text-muted-foreground whitespace-pre-wrap break-words">
				{comment.Description}
			</div>
		{:else}
			<div class="italic text-muted-foreground/50">No description</div>
		{/if}
	</div>
{:else}
	<div class="rounded-md border border-border bg-muted/30 p-3 text-xs">
		<span class="italic text-muted-foreground/50">Comment not found</span>
	</div>
{/if}
