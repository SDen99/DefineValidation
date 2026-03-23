<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import VLMTablePrototype from '$lib/components/metadata/VLMTablePrototype.svelte';
	import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import { mergeItemWithChanges, hasItemChanges } from '$lib/utils/metadata/useEditableItem.svelte';
	import { isItemDeleted } from '$lib/utils/metadata/useDeleteModal.svelte';
	import { transformVLMForEditing } from '$lib/utils/metadata/vlmTableTransform';
	import type { VLMViewMode } from '@sden99/vlm-processing';
	import DatasetNavigationTabs from '$lib/components/navigation/DatasetNavigationTabs.svelte';
	import { findDatasetNameFromOID } from '$lib/utils/datasetOIDLookup';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import { graphXML } from '@sden99/data-processing';

	// View mode state for VLM display
	let viewMode = $state<VLMViewMode>('compact');

	// Extract Define-XML data
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Ensure Define-XML is enhanced (needed for VLM data)
	$effect(() => {
		const datasets = dataState.getDatasets();

		// Enhance ADaM Define-XML if present
		const adamDefine = Object.entries(datasets).find(
			([_, ds]: [string, any]) => ds.fileName?.endsWith('.xml') && ds.ADaM === true
		);
		if (adamDefine) {
			const [_, dataset]: [string, any] = adamDefine;
			if (dataset.data && typeof dataset.data === 'object' && 'ItemGroups' in dataset.data) {
				if (!dataset.enhancedDefineXML) {
					try {
						dataset.enhancedDefineXML = graphXML.enhance(dataset.data);
						console.log('[VLMPage] Enhanced ADaM Define-XML');
					} catch (error) {
						console.error('[VLMPage] Failed to enhance ADaM Define-XML:', error);
					}
				}
			}
		}

		// Enhance SDTM Define-XML if present
		const sdtmDefine = Object.entries(datasets).find(
			([_, ds]: [string, any]) => ds.fileName?.endsWith('.xml') && ds.SDTM === true
		);
		if (sdtmDefine) {
			const [_, dataset]: [string, any] = sdtmDefine;
			if (dataset.data && typeof dataset.data === 'object' && 'ItemGroups' in dataset.data) {
				if (!dataset.enhancedDefineXML) {
					try {
						dataset.enhancedDefineXML = graphXML.enhance(dataset.data);
						console.log('[VLMPage] Enhanced SDTM Define-XML');
					} catch (error) {
						console.error('[VLMPage] Failed to enhance SDTM Define-XML:', error);
					}
				}
			}
		}
	});

	// Get params
	const itemType = $derived($page.params.type);
	const itemOid = $derived($page.params.oid);

	// For datasets only
	const isDataset = $derived(itemType === 'datasets');

	// For navigation tabs: get dataset name from OID
	const datasetNameForNav = $derived.by(() => {
		if (isDataset && itemOid) {
			return findDatasetNameFromOID(itemOid) || itemOid;
		}
		return null;
	});

	// Find the dataset item
	const dataset = $derived.by(() => {
		if (!defineBundle.combined || !isDataset) return null;
		const items = defineBundle.combined.ItemGroups || [];
		return items.find((i: any) => i.OID === itemOid || i.ID === itemOid);
	});

	// Determine define type (adam or sdtm)
	const defineType = $derived<DefineType>((defineBundle.adamData ? 'adam' : 'sdtm'));

	// Editable dataset with merged changes
	const editableDataset = $derived.by(() =>
		dataset ? mergeItemWithChanges(dataset, defineType, 'datasets', dataset.OID) : null
	);

	// Check if deleted
	const isAlreadyDeleted = $derived(isItemDeleted(defineType, 'datasets', dataset?.OID));

	// Navigation helpers
	function navigateToMethod(oid: string) {
		goto(`/metadata/methods/${oid}`);
	}

	function navigateToCodeList(oid: string) {
		goto(`/metadata/codelists/${oid}`);
	}

	function navigateToWhereClause(oid: string) {
		goto(`/metadata/whereclauses/${oid}`);
	}

	function navigateToComment(oid: string) {
		goto(`/metadata/comments/${oid}`);
	}

	// Transform VLM data for display
	const vlmTableData = $derived.by(() => {
		if (!dataset?.OID || !isDataset) return null;

		// Get the appropriate defineData based on defineType
		const activeDefineData = defineType === 'adam'
			? defineBundle.adamData?.defineData
			: defineBundle.sdtmData?.defineData;

		if (!activeDefineData) return null;

		return transformVLMForEditing(activeDefineData, dataset.OID, defineType, viewMode);
	});

	// Toggle view mode
	function toggleViewMode() {
		viewMode = viewMode === 'compact' ? 'expanded' : 'compact';
	}

	// VLM availability check
	const hasVLM = $derived(!!vlmTableData && vlmTableData.rows.length > 0);
</script>

{#if !dataset || !editableDataset}
	<div class="mx-auto max-w-2xl p-8 text-center">
		<h1 class="mb-4 text-2xl font-bold">Dataset Not Found</h1>
		<p class="text-muted-foreground">
			Could not find dataset with OID: <code class="rounded bg-muted px-1">{itemOid}</code>
		</p>
	</div>
{:else if !hasVLM}
	<div class="mx-auto max-w-2xl p-8 text-center">
		<h1 class="mb-4 text-2xl font-bold">No VLM Data</h1>
		<p class="text-muted-foreground">
			This dataset does not have Variable-Level Metadata (VLM).
		</p>
		<p class="mt-2 text-sm text-muted-foreground">
			VLM is only available for BDS (Basic Data Structure) class datasets.
		</p>
	</div>
{:else}
	<!-- VLM View -->
	<div class="mx-auto h-full overflow-auto p-3" style="max-width: 1400px;">
		<!-- Header -->
		<div class="mb-3">
			<div class="mb-1 flex items-center justify-between">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span>Dataset</span>
					<span>›</span>
					<span>{editableDataset.Name || dataset.OID}</span>
					<span>›</span>
					<span>VLM</span>
					{#if hasItemChanges(defineType, 'datasets', dataset.OID)}
						<span class="rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">Modified</span>
					{/if}
				</div>
			</div>

			<h1 class="text-2xl font-bold">{editableDataset.Name || dataset.OID}</h1>
			{#if editableDataset.Description}
				<p class="mt-1 text-sm text-muted-foreground">{editableDataset.Description}</p>
			{/if}
		</div>

		<!-- Dataset Navigation Tabs -->
		{#if datasetNameForNav}
			<div class="mb-2">
				<DatasetNavigationTabs
					datasetName={datasetNameForNav}
					currentView="vlm"
				/>
			</div>
		{/if}

		<!-- View Mode Toggle -->
		<div class="mb-3 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-sm text-muted-foreground">
					{vlmTableData?.rows.length || 0} rows
					{#if vlmTableData?.compactRowCount && vlmTableData?.expandedRowCount}
						<span class="text-xs">
							(compact: {vlmTableData.compactRowCount}, expanded: {vlmTableData.expandedRowCount})
						</span>
					{/if}
				</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">View:</span>
				<div class="flex rounded-md border">
					<button
						onclick={() => viewMode = 'compact'}
						class="px-3 py-1.5 text-xs font-medium transition-colors rounded-l-md
							{viewMode === 'compact'
							? 'bg-primary text-primary-foreground'
							: 'bg-background text-muted-foreground hover:bg-muted'}"
					>
						Compact
					</button>
					<button
						onclick={() => viewMode = 'expanded'}
						class="px-3 py-1.5 text-xs font-medium transition-colors rounded-r-md border-l
							{viewMode === 'expanded'
							? 'bg-primary text-primary-foreground'
							: 'bg-background text-muted-foreground hover:bg-muted'}"
					>
						Expanded
					</button>
				</div>
			</div>
		</div>

		<!-- VLM Content -->
		<div class="rounded-lg border bg-card">
			<div class="h-[calc(100vh-320px)] min-h-[400px]">
				<VLMTablePrototype
					vlmData={vlmTableData}
					defineData={defineType === 'adam' ? defineBundle.adamData?.defineData : defineBundle.sdtmData?.defineData}
					{defineType}
					editMode={metadataEditState.editMode && !isAlreadyDeleted}
					groupByParameter={viewMode === 'compact'}
					onNavigateToMethod={navigateToMethod}
					onNavigateToCodeList={navigateToCodeList}
					onNavigateToWhereClause={navigateToWhereClause}
					onNavigateToComment={navigateToComment}
				/>
			</div>
		</div>
	</div>
{/if}
