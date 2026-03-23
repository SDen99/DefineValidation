<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import { createNavigationHandlers } from '$lib/utils/metadata/navigationHelpers';

	// Get reactive data from parent layout
	const getDefineData = getContext<() => any>('defineData');
	const activeData = $derived(getDefineData?.() ?? { defineData: null });

	// Navigation helpers
	const { navigateToCodeList } = createNavigationHandlers($page.url.pathname);

	// Find the dictionary
	const dictionary = $derived(
		activeData.defineData.Dictionaries?.find((dict) => dict.OID === $page.params.oid)
	);

	// Find codelists that might reference this dictionary (by name matching)
	const relatedCodelists = $derived(
		activeData.defineData.CodeLists?.filter(
			(cl) => cl.Name === dictionary?.Name || cl.OID === dictionary?.OID
		) || []
	);
</script>

{#if dictionary}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>Dictionary</span>
				<span>›</span>
				<span>{dictionary.OID}</span>
			</div>
			<h1 class="mb-2 text-3xl font-bold">{dictionary.Name || dictionary.OID}</h1>
			<div class="flex gap-4 text-sm text-muted-foreground">
				{#if dictionary.Version}
					<span>Version: {dictionary.Version}</span>
				{/if}
				{#if dictionary.Dictionary}
					<span>Dictionary: {dictionary.Dictionary}</span>
				{/if}
			</div>
		</div>

		<!-- Dictionary Properties -->
		<div class="mb-6 rounded-lg border bg-card p-6">
			<h2 class="mb-4 text-lg font-semibold">Properties</h2>
			<dl class="grid gap-4 sm:grid-cols-2">
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Name</dt>
					<dd class="mt-1 text-sm">{dictionary.Name || 'N/A'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Data Type</dt>
					<dd class="mt-1 text-sm">{dictionary.DataType || 'N/A'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Dictionary</dt>
					<dd class="mt-1 text-sm">{dictionary.Dictionary || 'N/A'}</dd>
				</div>
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Version</dt>
					<dd class="mt-1 text-sm">{dictionary.Version || 'N/A'}</dd>
				</div>
			</dl>
		</div>

		<!-- Related CodeLists -->
		{#if relatedCodelists.length > 0}
			<div class="rounded-lg border bg-card">
				<div class="border-b p-4">
					<h2 class="text-lg font-semibold">Related CodeLists ({relatedCodelists.length})</h2>
				</div>
				<div class="p-4">
					<div class="space-y-1">
						{#each relatedCodelists as codelist}
							<button
								onclick={() => codelist.OID && navigateToCodeList(codelist.OID)}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{codelist.Name || codelist.OID}</div>
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{codelist.DataType || 'text'}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">Dictionary Not Found</h1>
		<p class="text-muted-foreground">
			The dictionary with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
