<script lang="ts">
	import { getContext } from 'svelte';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';

	// Get defineData from parent layout context
	const getDefineData = getContext<() => any>('defineData');
	const contextData = $derived(getDefineData?.() ?? { defineData: null });
	const defineData = $derived(contextData.defineData);

	// Get study info from the dataset
	const datasets = $derived(dataState.getDatasets());
	const activeDataset = $derived(
		Object.values(datasets).find((ds: any) => ds.fileName?.endsWith('.xml') && (ds.ADaM || ds.SDTM))
	);
	const defineXMLData = $derived((activeDataset?.data && !Array.isArray(activeDataset.data)) ? activeDataset.data : null);
	const studyName = $derived((defineXMLData as any)?.Study?.Name || 'Define-XML Metadata Browser');
	const studyDescription = $derived(
		(defineXMLData as any)?.Study?.Description || 'Browse and explore Define-XML metadata structure'
	);
</script>

<div class="mx-auto max-w-4xl">
	<div class="mb-8">
		<h1 class="mb-4 text-3xl font-bold">{studyName}</h1>
		<p class="text-lg text-muted-foreground">
			{studyDescription}
		</p>
	</div>

	<!-- Study Information -->
	{#if defineXMLData && (defineXMLData as any)?.Study}
		<div class="mb-6 rounded-lg border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Study Information</h2>
			<dl class="space-y-2">
				<div class="flex">
					<dt class="w-40 font-medium">Study OID:</dt>
					<dd class="text-muted-foreground">{(defineXMLData as any).Study.OID || 'N/A'}</dd>
				</div>
				<div class="flex">
					<dt class="w-40 font-medium">Protocol Name:</dt>
					<dd class="text-muted-foreground">{(defineXMLData as any).Study.ProtocolName || 'N/A'}</dd>
				</div>
			</dl>
		</div>
	{/if}

	<!-- Metadata Information -->
	{#if defineXMLData && (defineXMLData as any)?.MetaData}
		<div class="mb-6 rounded-lg border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Metadata Version</h2>
			<dl class="space-y-2">
				<div class="flex">
					<dt class="w-40 font-medium">Name:</dt>
					<dd class="text-muted-foreground">{(defineXMLData as any).MetaData.Name || 'N/A'}</dd>
				</div>
				<div class="flex">
					<dt class="w-40 font-medium">Description:</dt>
					<dd class="text-muted-foreground">{(defineXMLData as any).MetaData.Description || 'N/A'}</dd>
				</div>
				<div class="flex">
					<dt class="w-40 font-medium">Define Version:</dt>
					<dd class="text-muted-foreground">{(defineXMLData as any).MetaData.DefineVersion || 'N/A'}</dd>
				</div>
			</dl>
		</div>
	{/if}

	<!-- Standards -->
	{#if defineData.Standards && defineData.Standards.length > 0}
		<div class="mb-6 rounded-lg border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Standards</h2>
			<div class="space-y-3">
				{#each defineData.Standards as standard}
					<div class="rounded border p-3">
						<div class="font-medium">{standard.Name || standard.OID}</div>
						{#if standard.Version}
							<div class="text-sm text-muted-foreground">Version: {standard.Version}</div>
						{/if}
						{#if standard.Type}
							<div class="text-sm text-muted-foreground">Type: {standard.Type}</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Content Summary -->
	<div class="rounded-lg border bg-card p-6">
		<h2 class="mb-4 text-xl font-semibold">Content Summary</h2>
		<div class="grid grid-cols-2 gap-4">
			<div class="rounded border p-4">
				<div class="text-2xl font-bold">{defineData.ItemGroups?.length || 0}</div>
				<div class="text-sm text-muted-foreground">Datasets</div>
			</div>
			<div class="rounded border p-4">
				<div class="text-2xl font-bold">{defineData.ItemDefs?.length || 0}</div>
				<div class="text-sm text-muted-foreground">Variables</div>
			</div>
			<div class="rounded border p-4">
				<div class="text-2xl font-bold">{defineData.CodeLists?.length || 0}</div>
				<div class="text-sm text-muted-foreground">Codelists</div>
			</div>
			<div class="rounded border p-4">
				<div class="text-2xl font-bold">{defineData.Methods?.length || 0}</div>
				<div class="text-sm text-muted-foreground">Methods</div>
			</div>
			<div class="rounded border p-4">
				<div class="text-2xl font-bold">{defineData.ValueListDefs?.length || 0}</div>
				<div class="text-sm text-muted-foreground">Value Lists</div>
			</div>
			<div class="rounded border p-4">
				<div class="text-2xl font-bold">{defineData.WhereClauseDefs?.length || 0}</div>
				<div class="text-sm text-muted-foreground">Where Clauses</div>
			</div>
		</div>
	</div>

	<!-- Instructions -->
	<div class="mt-6 rounded-lg border border-primary/50 bg-primary/5 p-6">
		<h2 class="mb-3 text-lg font-semibold">How to Navigate</h2>
		<ul class="space-y-2 text-sm">
			<li>✓ Use the tree navigation on the left to explore metadata</li>
			<li>✓ Click on any dataset, variable, or codelist to view details</li>
			<li>✓ When you select an item, the tree filters to show only connected items</li>
			<li>✓ Click "Clear ×" to remove the filter and see all items again</li>
			<li>✓ Use browser back/forward buttons to navigate</li>
		</ul>
	</div>
</div>
