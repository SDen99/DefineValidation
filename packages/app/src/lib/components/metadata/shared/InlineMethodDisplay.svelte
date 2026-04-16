<script lang="ts">
	import type { Method, DefineType } from '@sden99/cdisc-types/define-xml';

	/**
	 * InlineMethodDisplay - View-only display of Method metadata
	 *
	 * Shows method name, type, and description inline within VLM cell
	 */
	let {
		method,
		defineType,
		onNavigateToDetail
	}: {
		method: Method | null | undefined;
		defineType: DefineType;
		onNavigateToDetail?: () => void;
	} = $props();
</script>

{#if method}
	<div class="rounded-md border border-border bg-muted/30 p-3 text-xs break-words">
		<div class="mb-2 flex items-center justify-between gap-2">
			<div class="flex items-center gap-2 min-w-0 flex-1">
				<span class="font-semibold text-foreground">Method</span>
				{#if method.Name}
					<span class="text-muted-foreground truncate">· {method.Name}</span>
				{/if}
			</div>
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

		<div class="space-y-1.5">
			{#if method.Type}
				<div>
					<span class="font-medium text-foreground">Type:</span>
					<span class="ml-1 text-muted-foreground">{method.Type}</span>
				</div>
			{/if}

			{#if method.Description}
				<div>
					<span class="font-medium text-foreground">Description:</span>
					<div class="mt-1 text-muted-foreground whitespace-pre-wrap">{method.Description}</div>
				</div>
			{/if}

			{#if !method.Type && !method.Description}
				<div class="italic text-muted-foreground/50">No additional metadata</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="rounded-md border border-border bg-muted/30 p-3 text-xs">
		<span class="italic text-muted-foreground/50">Method not found</span>
	</div>
{/if}
