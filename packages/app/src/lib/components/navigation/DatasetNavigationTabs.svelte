<script lang="ts">
	/**
	 * Unified navigation tabs for datasets
	 * Routes between /datasets/[id] (data viewing) and /metadata/datasets/[oid] (metadata editing)
	 * Determines which tabs are available based on loaded data
	 */
	import { goto } from '$app/navigation';
	import { Tabs, TabsList, TabsTrigger } from '@sden99/ui-components';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import { findDatasetOID } from '$lib/utils/datasetOIDLookup';
	import { normalizeDatasetId } from '@sden99/dataset-domain';

	interface Props {
		/** The dataset name (e.g., "ADSL", "adsl.sas7bdat") */
		datasetName: string;
		/** Which view is currently active: "dataset", "metadata", or "vlm" */
		currentView: 'dataset' | 'metadata' | 'vlm';
	}

	let { datasetName, currentView }: Props = $props();

	// Determine available tabs based on loaded data
	const availableTabs = $derived.by(() => {
		const normalized = normalizeDatasetId(datasetName);

		// Check if we have Define-XML metadata for this dataset
		const oid = findDatasetOID(datasetName);
		const hasMetadata = !!oid;

		// Check if we have the actual data file loaded
		const datasets = dataState.getDatasets();
		const hasDataFile = !!Object.keys(datasets).find(
			(key) => normalizeDatasetId(key) === normalized
		);

		// Check if this is a BDS dataset (supports VLM)
		let hasVLM = false;
		if (hasMetadata) {
			const metadata = dataState.getItemGroupMetadata(datasetName);
			hasVLM = metadata?.Class === 'BASIC DATA STRUCTURE';

			// Debug logging for VLM availability
			console.log('[DatasetNavigationTabs] VLM Check:', {
				datasetName,
				oid,
				metadata: {
					Class: metadata?.Class,
					Name: metadata?.Name,
					OID: metadata?.OID
				},
				hasVLM
			});
		}

		return {
			metadata: hasMetadata,
			vlm: hasVLM,
			dataset: hasDataFile,
			oid
		};
	});

	// Navigation handlers
	function navigateToMetadata() {
		if (availableTabs.oid) {
			goto(`/metadata/datasets/${availableTabs.oid}`);
		}
	}

	function navigateToVLM() {
		if (availableTabs.oid) {
			goto(`/metadata/datasets/${availableTabs.oid}/vlm`);
		}
	}

	function navigateToDataset() {
		// Find the actual dataset ID from the repository
		const datasets = dataState.getDatasets();
		const normalized = normalizeDatasetId(datasetName);
		const datasetId = Object.keys(datasets).find(
			(key) => normalizeDatasetId(key) === normalized
		);

		if (datasetId) {
			goto(`/datasets/${encodeURIComponent(datasetId)}`);
		}
	}

	// Determine active tab value based on current view
	const activeTabValue = $derived(currentView);

	// Tab styling
	const triggerClass =
		'relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none';
</script>

<Tabs value={activeTabValue} class="flex-none">
	<TabsList
		class="from-background to-muted/30 w-full justify-start border-b bg-gradient-to-r px-4"
	>
		{#if availableTabs.metadata}
			<TabsTrigger value="metadata" class={triggerClass} onclick={navigateToMetadata}>
				Metadata
			</TabsTrigger>
		{/if}
		{#if availableTabs.vlm}
			<TabsTrigger value="vlm" class={triggerClass} onclick={navigateToVLM}>
				VLM
			</TabsTrigger>
		{/if}
		{#if availableTabs.dataset}
			<TabsTrigger value="dataset" class={triggerClass} onclick={navigateToDataset}>
				Dataset
			</TabsTrigger>
		{/if}
	</TabsList>
</Tabs>
