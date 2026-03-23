<!--
	MetadataExplorer Component

	Wrapper component that manages state for MetadataTree.
	Replaces the layout-based state management from the prototype.

	Usage:
		<MetadataExplorer
			onDatasetSelect={(id) => selectDataset(id)}
			onMetadataSelect={(type, oid) => goto(`/metadata/${type}/${oid}`)}
		/>
-->
<script lang="ts">
	import { page } from '$app/stores';
	import MetadataTree from './tree/MetadataTree.svelte';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';

	// Props
	let {
		onDatasetSelect = () => {},
		onMetadataSelect = () => {},
		showDatasets = true
	}: {
		onDatasetSelect?: (datasetInfo: { name: string; oid: string }) => void;
		onMetadataSelect?: (type: string, oid: string) => void;
		showDatasets?: boolean;
	} = $props();

	// Extract Define-XML data from global dataState
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Track expansion state per section
	let expandedSections = $state<Set<string>>(new Set());

	// Track filter mode
	let filterActive = $state(false);
	let selectedNodeId = $state<string | null>(null);

	function toggleSection(sectionId: string) {
		if (expandedSections.has(sectionId)) {
			expandedSections.delete(sectionId);
		} else {
			expandedSections.add(sectionId);
		}
		expandedSections = new Set(expandedSections); // Trigger reactivity
	}

	function setFilter(nodeId: string | null) {
		selectedNodeId = nodeId;
		if (nodeId === null) {
			filterActive = false;
		}
	}

	function toggleFilter() {
		filterActive = !filterActive;
	}

	// Handle dataset selection from tree
	function handleDatasetClick(datasetInfo: { name: string; oid: string }) {
		onDatasetSelect(datasetInfo);
	}

	// Handle metadata item selection from tree
	function handleMetadataItemClick(type: string, oid: string) {
		onMetadataSelect(type, oid);
	}

	// Auto-expand sections when navigating to detail pages
	$effect(() => {
		const path = $page.url.pathname;

		// Parse URL: /metadata/{type}/{oid}
		const match = path.match(/\/metadata\/([^/]+)\/([^/]+)/);

		if (match) {
			const [, itemType] = match;

			// Determine which sections need to be expanded based on current metadata
			// We'll expand both ADaM and SDTM sections if they contain this item type
			const sectionsToExpand: string[] = [];

			if (defineBundle.adamData) {
				sectionsToExpand.push('adam');
				sectionsToExpand.push(`adam-${itemType}`);
			}

			if (defineBundle.sdtmData) {
				sectionsToExpand.push('sdtm');
				sectionsToExpand.push(`sdtm-${itemType}`);
			}

			// Add sections to expanded set
			let changed = false;
			sectionsToExpand.forEach(section => {
				if (!expandedSections.has(section)) {
					expandedSections.add(section);
					changed = true;
				}
			});

			if (changed) {
				expandedSections = new Set(expandedSections);
			}
		}
	});
</script>

{#if defineBundle.noDataLoaded}
	<div class="flex h-full items-center justify-center p-6">
		<div class="max-w-md text-center">
			<h2 class="mb-4 text-xl font-semibold text-foreground">No Define-XML Data Loaded</h2>
			<p class="text-muted-foreground">
				Please load a Define-XML file to browse its metadata structure.
				Upload a file from the main application to see its contents here.
			</p>
		</div>
	</div>
{:else}
	<MetadataTree
		adamData={defineBundle.adamData}
		sdtmData={defineBundle.sdtmData}
		{expandedSections}
		{toggleSection}
		currentPath={$page.url.pathname}
		{filterActive}
		{selectedNodeId}
		{setFilter}
		{toggleFilter}
		onNavigate={handleMetadataItemClick}
		onDatasetClick={handleDatasetClick}
		{showDatasets}
	/>
{/if}
