<script lang="ts">
	import MetadataExplorer from '$lib/components/metadata/MetadataExplorer.svelte';
	import { goto } from '$app/navigation';
	import * as dataState from '$lib/core/state/dataState.svelte';

	// Handle dataset selection from tree
	function handleDatasetSelect(datasetInfo: { name: string; oid: string }) {
		console.log('[Test] Dataset selected:', datasetInfo);
		dataState.selectDataset(datasetInfo.name);
		alert(`Dataset selected: ${datasetInfo.name}\nOID: ${datasetInfo.oid}\n\nIn production, this would navigate to the data table view.`);
	}

	// Handle metadata item selection from tree
	function handleMetadataSelect(type: string, oid: string) {
		console.log('[Test] Metadata selected:', { type, oid });
		alert(`Metadata item selected:\nType: ${type}\nOID: ${oid}\n\nIn production, this would navigate to /metadata/${type}/${oid}`);
	}

	// Get current state info for display
	const datasets = $derived(dataState.getDatasets());
	const datasetCount = $derived(Object.keys(datasets).length);
	const hasDefineXML = $derived(
		Object.values(datasets).some((ds: any) => ds.fileName?.endsWith('.xml'))
	);
</script>

<div class="flex h-screen flex-col">
	<!-- Header -->
	<header class="border-b bg-background p-4">
		<h1 class="text-2xl font-bold">MetadataExplorer Component Test</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			Test page for the new MetadataExplorer component. Upload a Define-XML file from the main app
			to see the tree navigation.
		</p>

		<!-- Status Info -->
		<div class="mt-4 flex gap-4 text-sm">
			<div class="rounded-md bg-muted px-3 py-1">
				<span class="font-medium">Datasets loaded:</span>
				<span class="ml-2">{datasetCount}</span>
			</div>
			<div class="rounded-md px-3 py-1" class:bg-green-100={hasDefineXML} class:bg-yellow-100={!hasDefineXML}>
				<span class="font-medium">Define-XML:</span>
				<span class="ml-2">{hasDefineXML ? '✓ Loaded' : '✗ Not loaded'}</span>
			</div>
		</div>

		<!-- Instructions -->
		<div class="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
			<p class="font-medium text-blue-900">Testing Instructions:</p>
			<ol class="ml-5 mt-2 list-decimal space-y-1 text-blue-800">
				<li>If no Define-XML is loaded, go to <a href="/" class="underline">main app</a> and upload a Define-XML file</li>
				<li>Return here to see the tree navigation populated with metadata</li>
				<li>Click on items in the tree to test selection handlers</li>
				<li>Use the search box to filter items</li>
				<li>Toggle the filter button to test connection-based filtering</li>
			</ol>
		</div>

		<!-- Quick Actions -->
		<div class="mt-4 flex gap-2">
			<a
				href="/"
				class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				← Back to Main App
			</a>
			<a
				href="/dev/metadata-browser-prototype/adam"
				class="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
			>
				View Original Prototype
			</a>
		</div>
	</header>

	<!-- Main Content: Tree View -->
	<div class="flex flex-1 overflow-hidden">
		<!-- MetadataExplorer Component -->
		<div class="w-96 border-r bg-background overflow-y-auto">
			<MetadataExplorer
				onDatasetSelect={handleDatasetSelect}
				onMetadataSelect={handleMetadataSelect}
			/>
		</div>

		<!-- Info Panel -->
		<div class="flex-1 overflow-y-auto p-6">
			<h2 class="mb-4 text-xl font-semibold">Component Info</h2>

			<div class="space-y-4">
				<section>
					<h3 class="mb-2 font-medium">What This Tests:</h3>
					<ul class="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
						<li>MetadataExplorer component rendering</li>
						<li>Tree navigation with ADaM and SDTM data</li>
						<li>Expand/collapse functionality</li>
						<li>Search filtering</li>
						<li>Connection-based filtering</li>
						<li>Dataset and metadata item selection</li>
						<li>Data extraction from global dataState</li>
					</ul>
				</section>

				<section>
					<h3 class="mb-2 font-medium">Component Structure:</h3>
					<div class="rounded-md bg-muted p-4 font-mono text-xs">
						<div>MetadataExplorer.svelte</div>
						<div class="ml-4">├─ extractDefineDataForMetadata()</div>
						<div class="ml-4">└─ MetadataTree.svelte</div>
						<div class="ml-8">├─ DefineSection.svelte</div>
						<div class="ml-12">└─ MetadataCategory.svelte</div>
						<div class="ml-16">└─ MetadataNode.svelte</div>
					</div>
				</section>

				<section>
					<h3 class="mb-2 font-medium">Event Handlers:</h3>
					<div class="space-y-2 text-sm">
						<div class="rounded-md border p-3">
							<code class="font-mono text-xs">onDatasetSelect(datasetId)</code>
							<p class="mt-1 text-muted-foreground">
								Called when a dataset is clicked in the tree. In production, this will select the
								dataset and navigate to the data table view.
							</p>
						</div>
						<div class="rounded-md border p-3">
							<code class="font-mono text-xs">onMetadataSelect(type, oid)</code>
							<p class="mt-1 text-muted-foreground">
								Called when a metadata item (variable, codelist, method, etc.) is clicked. In
								production, this will navigate to the detail page.
							</p>
						</div>
					</div>
				</section>

				<section>
					<h3 class="mb-2 font-medium">Current State:</h3>
					<div class="rounded-md border p-4">
						<pre class="overflow-x-auto text-xs">{JSON.stringify(
								{
									datasetsLoaded: datasetCount,
									hasDefineXML: hasDefineXML,
									datasetKeys: Object.keys(datasets).slice(0, 5)
								},
								null,
								2
							)}</pre>
					</div>
				</section>
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
