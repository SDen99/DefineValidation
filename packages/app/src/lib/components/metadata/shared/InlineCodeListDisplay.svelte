<script lang="ts">
	import type { CodeList } from '@sden99/cdisc-types/define-xml';
	import type { DefineType } from '../../../core/state/metadata/editState.svelte';

	/**
	 * InlineCodeListDisplay - View-only display of CodeList metadata
	 *
	 * Shows codelist name and items inline within VLM cell
	 * Shows all items (scrollable) as per user preference
	 */
	let {
		codelist,
		defineType,
		onNavigateToDetail
	}: {
		codelist: CodeList | null | undefined;
		defineType: DefineType;
		onNavigateToDetail?: () => void;
	} = $props();

	// Merge CodeListItems and EnumeratedItems
	const allItems = $derived.by(() => {
		if (!codelist) return [];
		const codeListItems = codelist.CodeListItems || [];
		const enumeratedItems = (codelist.EnumeratedItems || []).map((item) => ({
			...item,
			Decode: null,
			Rank: null,
			ExtendedValue: false
		}));
		return [...codeListItems, ...enumeratedItems].sort((a, b) => {
			const orderA = parseInt(a.OrderNumber || '0');
			const orderB = parseInt(b.OrderNumber || '0');
			return orderA - orderB;
		});
	});
</script>

{#if codelist}
	<div class="rounded-md border border-border bg-muted/30 p-3 text-xs break-words">
		<div class="mb-2 flex items-center justify-between gap-2">
			<div class="flex items-center gap-2 min-w-0 flex-1">
				<span class="font-semibold text-foreground">CodeList</span>
				{#if codelist.Name}
					<span class="text-muted-foreground truncate">· {codelist.Name}</span>
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

		{#if allItems.length > 0}
			<div class="max-h-48 overflow-y-auto">
				<div class="space-y-1">
					<div class="mb-1 font-medium text-foreground">Items ({allItems.length}):</div>
					{#each allItems as item}
						<div class="flex items-start gap-2 rounded bg-background/50 px-2 py-1 break-words">
							<span class="font-mono font-medium text-foreground flex-shrink-0">{item.CodedValue}</span>
							{#if item.Decode?.TranslatedText}
								<span class="text-muted-foreground break-words">= {item.Decode.TranslatedText}</span>
							{/if}
							{#if item.ExtendedValue}
								<span class="ml-auto rounded bg-amber-100 px-1.5 text-xxs text-amber-700 dark:bg-amber-900 dark:text-amber-300 flex-shrink-0">
									Extended
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="italic text-muted-foreground/50">No items defined</div>
		{/if}
	</div>
{:else}
	<div class="rounded-md border border-border bg-muted/30 p-3 text-xs">
		<span class="italic text-muted-foreground/50">CodeList not found</span>
	</div>
{/if}
