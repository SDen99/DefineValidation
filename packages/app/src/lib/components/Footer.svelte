<script lang="ts">
	import { formatStorageSize } from '$lib/utils/utilFunctions';
	import { Separator } from '@sden99/ui-components';
	// NEW: Import directly from the dataState module.
	import * as dataState from '$lib/core/state/dataState.svelte.ts';

	let stats = $derived.by(() => {
		const selectedId = dataState.selectedDatasetId.value;
		if (!selectedId) return null;
		const dataset = dataState.getDatasets()[selectedId];
		return dataset?.processingStats || null;
	});
</script>

<footer
	class="bg-background/95 supports-[backdrop-filter]:bg-background/60 relative border-t backdrop-blur"
>
	{#if stats}
		<div class="container flex h-8 items-center justify-between text-sm">
			<div class="flex items-center gap-4">
				{#if stats.uploadTime}
					<div class="text-muted-foreground">
						Processing time: <span class="text-foreground font-medium">{stats.uploadTime}s</span>
					</div>
				{/if}
			</div>
			<div class="flex items-center gap-4">
				{#if stats.datasetSize}
					<div class="text-muted-foreground">
						Size: <span class="text-foreground font-medium"
							>{formatStorageSize(stats.datasetSize)}</span
						>
					</div>
				{/if}
				<Separator orientation="vertical" class="h-4" />
				{#if stats.numColumns}
					<div class="text-muted-foreground">
						Variables: <span class="text-foreground font-medium">{stats.numColumns}</span>
					</div>
				{/if}
				<Separator orientation="vertical" class="h-4" />
				{#if stats.numRows}
					<div class="text-muted-foreground">
						Records: <span class="text-foreground font-medium">{stats.numRows}</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</footer>
