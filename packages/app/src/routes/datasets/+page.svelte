<script lang="ts">
	import * as dataState from '$lib/core/state/dataState.svelte.ts';

	// Get available datasets
	const availableDatasets = $derived(dataState.getAvailableDatasets());
</script>

<div class="flex h-full flex-col items-center justify-center p-8">
	<div class="max-w-2xl text-center">
		<h1 class="mb-4 text-3xl font-bold text-foreground">Clinical Datasets</h1>

		{#if availableDatasets.length > 0}
			<p class="mb-6 text-lg text-muted-foreground">
				Select a dataset from the left sidebar to view its data, metadata, and VLM information.
			</p>

			<div class="rounded-lg border border-border bg-muted/30 p-6">
				<p class="text-sm text-muted-foreground">
					<strong>{availableDatasets.length}</strong> dataset{availableDatasets.length === 1 ? '' : 's'} loaded
				</p>
			</div>
		{:else}
			<p class="mb-6 text-lg text-muted-foreground">
				No datasets loaded yet. Upload a .sas7bdat file or Define-XML to get started.
			</p>

			<div class="rounded-lg border border-border bg-muted/30 p-6">
				<p class="text-sm text-muted-foreground">
					Supported formats: .sas7bdat, .xpt, .xml
				</p>
			</div>
		{/if}
	</div>
</div>
