<!-- packages/app/src/routes/test-enhanced-state/+page.svelte -->
<script lang="ts">
	import * as dataState from '$lib/core/state/dataState.svelte.ts';

	// Component-specific derived state for debugging - following the established pattern!
	const defineXmlInfo = $derived(dataState.getDefineXmlInfo());
	const activeDefineInfo = $derived(dataState.getActiveDefineInfo());
	const activeItemGroupMetadata = $derived(dataState.getActiveItemGroupMetadata());
	const isBdsDataset = $derived(dataState.getIsBdsDataset());
	const availableViews = $derived(dataState.getAvailableViews());

	const debugInfo = $derived.by(() => ({
		// Basic state
		selectedDatasetId: dataState.selectedDatasetId.value,
		selectedDomain: dataState.selectedDomain.value,
		datasetCount: Object.keys(dataState.getDatasets()).length,
		datasetIds: Object.keys(dataState.getDatasets()),

		// Define XML state
		hasSDTM: !!defineXmlInfo.SDTM,
		hasADaM: !!defineXmlInfo.ADaM,
		sdtmItemGroups: defineXmlInfo.SDTM?.ItemGroups?.length || 0,
		adamItemGroups: defineXmlInfo.ADaM?.ItemGroups?.length || 0,

		// Active selection info
		activeDefineType: activeDefineInfo.define ? 'available' : 'none',

		hasActiveDefine: !!activeDefineInfo.define,
		hasActiveItemGroup: !!activeItemGroupMetadata,
		activeItemGroupOID: activeItemGroupMetadata?.OID,
		activeItemGroupClass: activeItemGroupMetadata?.Class,

		// View availability
		isBdsDataset,
		availableViews,

		// Selected dataset details
		selectedDatasetType: dataState.selectedDatasetId.value
			? Array.isArray(dataState.getDatasets()[dataState.selectedDatasetId.value]?.data)
				? 'SAS7BDAT'
				: dataState.getDatasets()[dataState.selectedDatasetId.value]?.data &&
					  typeof dataState.getDatasets()[dataState.selectedDatasetId.value].data === 'object' &&
					  'MetaData' in dataState.getDatasets()[dataState.selectedDatasetId.value].data
					? 'Define XML'
					: 'Unknown'
			: null
	}));

	// List of available datasets for selection
	const datasetOptions = $derived(Object.keys(dataState.getDatasets()));

	function selectDataset(datasetId: string) {
		// For Define XML files, don't set domain
		const dataset = dataState.getDatasets()[datasetId];
		if (dataset?.data && typeof dataset.data === 'object' && 'MetaData' in dataset.data) {
			dataState.selectDataset(datasetId, null);
		} else {
			// For regular datasets, you might want to set a domain based on filename
			// For now, just select without domain
			dataState.selectDataset(datasetId, null);
		}
	}

	function selectWithDomain(datasetId: string, domain: string) {
		dataState.selectDataset(datasetId, domain);
	}

	// Debug effect
	$effect(() => {
		console.log('🧪 Enhanced State Test Debug:', debugInfo);
	});
</script>

<div class="space-y-6 p-6">
	<h1 class="text-2xl font-bold">Enhanced Data State Test</h1>

	<!-- Dataset Selection -->
	<div class="rounded-lg border p-4">
		<h2 class="mb-3 text-lg font-semibold">Dataset Selection</h2>
		<div class="grid gap-2">
			{#each datasetOptions as datasetId}
				<button
					class="rounded border p-2 text-left hover:bg-gray-100 {dataState.selectedDatasetId
						.value === datasetId
						? 'bg-blue-100'
						: ''}"
					onclick={() => selectDataset(datasetId)}
				>
					{datasetId}
					<span class="ml-2 text-sm text-gray-600">
						({Array.isArray(dataState.getDatasets()[datasetId]?.data) ? 'SAS7BDAT' : 'Define XML'})
					</span>
				</button>
			{/each}
		</div>

		<!-- Domain selection for testing -->
		{#if debugInfo.selectedDatasetId && debugInfo.activeDefineType}
			<div class="mt-4">
				<h3 class="mb-2 font-medium">Test Domain Selection:</h3>
				<div class="flex flex-wrap gap-2">
					{#if defineXmlInfo.SDTM?.ItemGroups}
						{#each defineXmlInfo.SDTM.ItemGroups.slice(0, 5) as itemGroup}
							<!-- ... button logic ... -->
						{/each}
					{/if}
					{#if defineXmlInfo.ADaM?.ItemGroups}
						{#each defineXmlInfo.ADaM.ItemGroups.slice(0, 5) as itemGroup}
							<!-- ... button logic ... -->
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Debug Information Display -->
	<div class="rounded-lg border p-4">
		<h2 class="mb-3 text-lg font-semibold">Debug Information</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<!-- Basic State -->
			<div>
				<h3 class="mb-2 font-medium">Basic State:</h3>
				<ul class="space-y-1 text-sm">
					<li><strong>Selected Dataset ID:</strong> {debugInfo.selectedDatasetId || 'None'}</li>
					<li><strong>Selected Domain:</strong> {debugInfo.selectedDomain || 'None'}</li>
					<li><strong>Dataset Count:</strong> {debugInfo.datasetCount}</li>
					<li><strong>Selected Type:</strong> {debugInfo.selectedDatasetType || 'None'}</li>
				</ul>
			</div>

			<!-- Define XML State -->
			<div>
				<h3 class="mb-2 font-medium">Define XML State:</h3>
				<ul class="space-y-1 text-sm">
					<li>
						<strong>Has SDTM:</strong>
						{debugInfo.hasSDTM} ({debugInfo.sdtmItemGroups} ItemGroups)
					</li>
					<li>
						<strong>Has ADaM:</strong>
						{debugInfo.hasADaM} ({debugInfo.adamItemGroups} ItemGroups)
					</li>
					<li><strong>Active Define Type:</strong> {debugInfo.activeDefineType || 'None'}</li>
					<li><strong>Has Active Define:</strong> {debugInfo.hasActiveDefine}</li>
				</ul>
			</div>

			<!-- Active Selection -->
			<div>
				<h3 class="mb-2 font-medium">Active Selection:</h3>
				<ul class="space-y-1 text-sm">
					<li><strong>Has ItemGroup:</strong> {debugInfo.hasActiveItemGroup}</li>
					<li><strong>ItemGroup OID:</strong> {debugInfo.activeItemGroupOID || 'None'}</li>
					<li><strong>ItemGroup Class:</strong> {debugInfo.activeItemGroupClass || 'None'}</li>
					<li><strong>Is BDS Dataset:</strong> {debugInfo.isBdsDataset}</li>
				</ul>
			</div>

			<!-- Available Views -->
			<div>
				<h3 class="mb-2 font-medium">Available Views:</h3>
				<ul class="space-y-1 text-sm">
					<li><strong>Data Tab:</strong> {debugInfo.availableViews.data ? '✅' : '❌'}</li>
					<li><strong>Metadata Tab:</strong> {debugInfo.availableViews.metadata ? '✅' : '❌'}</li>
					<li><strong>VLM Tab:</strong> {debugInfo.availableViews.VLM ? '✅' : '❌'}</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Raw Debug Data -->
	<details class="rounded-lg border p-4">
		<summary class="cursor-pointer font-medium">Raw Debug Data (Click to expand)</summary>
		<pre class="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">{JSON.stringify(
				debugInfo,
				null,
				2
			)}</pre>
	</details>
</div>
