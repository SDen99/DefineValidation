<!--
	MetadataCategory.svelte - Reusable component for rendering metadata categories

	Phase 3B: Extended to handle all 8 standard categories

	This component eliminates ADAM/SDTM duplication by accepting a defineType prop
	and rendering the appropriate category with consistent logic.

	Supports: CodeLists, Methods, Comments, ValueLists, Standards, Dictionaries, Documents, AnalysisResults
-->
<script lang="ts">
	import MetadataNode from './MetadataNode.svelte';
	import DatasetMetadataCard from './DatasetMetadataCard.svelte';
	import { metadataEditState, type ItemType } from '$lib/core/state/metadata';
	import * as dataState from '$lib/core/state/dataState.svelte';
	import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

	// Type definitions
	type DefineType = 'adam' | 'sdtm';

	// Props
	let {
		defineType,
		categoryName,
		categoryLabel,
		items,
		idField = 'OID', // Most categories use 'OID', but Documents/AnalysisResults use 'ID'
		getSublabel,
		isExpanded,
		visibleCount,
		totalCount,
		isFiltered,
		currentPath,
		filterState,
		onToggleSection,
		onNavigate,
		utils
	}: {
		defineType: DefineType;
		categoryName: ItemType;
		categoryLabel: string;
		items: any[];
		idField?: 'OID' | 'ID';
		getSublabel?: (item: any) => string;
		isExpanded: boolean;
		visibleCount: number;
		totalCount: number;
		isFiltered: boolean;
		currentPath: string;
		filterState: {
			filterActive: boolean;
			connectedNodes: Set<string>;
			matchingOids: Set<string> | null;
		};
		onToggleSection: () => void;
		onNavigate: (type: string, oid: string) => void;
		utils: {
			isVisible: (
				oid: string | null,
				filterActive: boolean,
				connectedNodes: Set<string>,
				matchingOids: Set<string> | null
			) => boolean;
			isItemSelected: (type: string, oid: string, currentPath: string) => boolean;
		};
	} = $props();

	// Helper to check if a dataset has data loaded
	function checkDatasetHasData(datasetName: string): boolean {
		const datasets = dataState.getDatasets();
		const normalizedName = datasetName.toLowerCase();

		// Check all dataset keys to see if any match this dataset name
		return Object.keys(datasets).some(key => {
			const normalizedKey = key.toLowerCase();
			const dataset = datasets[key];

			// Match by key name, dataset name, or if key contains dataset name
			return normalizedKey === normalizedName ||
				   normalizedKey.includes(normalizedName) ||
				   dataset?.fileName?.toLowerCase() === normalizedName ||
				   (dataset?.data && Array.isArray(dataset.data) && dataset.data.length > 0);
		});
	}
</script>

<!-- Category Header -->
<MetadataNode
	label={categoryLabel}
	level={1}
	{isExpanded}
	onToggle={onToggleSection}
	count={visibleCount}
	{totalCount}
	{isFiltered}
	isSelected={false}
/>

<!-- Category Items -->
{#if isExpanded}
	{#each items as item}
		{@const itemId = item[idField]}
		{@const visible = utils.isVisible(
			itemId,
			filterState.filterActive,
			filterState.connectedNodes,
			filterState.matchingOids
		)}
		{@const change = itemId ? metadataEditState.getChange(defineType, categoryName, itemId) : null}
		{@const isDeleted = change?.type === 'DELETED'}
		{@const isModified = change && !isDeleted}
		{@const displayName = change?.changes?.Name || item.Name || item.Display || itemId || 'Unknown'}
		{@const sublabel = getSublabel ? getSublabel(item) : ''}

		{#if visible}
			{#if categoryName === 'datasets'}
				<!-- Use compact card for datasets -->
				{@const hasData = checkDatasetHasData(displayName)}
				<div class="mb-2">
					<DatasetMetadataCard
						datasetId={itemId || ''}
						displayName={displayName}
						metadata={item}
						editMode={metadataEditState.editMode}
						pendingChanges={change?.changes || {}}
						isDeleted={isDeleted}
						hasMetadata={true}
						{hasData}
						isSelected={itemId ? utils.isItemSelected(categoryName, itemId, currentPath) : false}
						expandable={true}
						showArchiveInfo={true}
						onClick={() => {
							if (itemId) {
								onNavigate(categoryName, itemId);
							}
						}}
					/>
				</div>
			{:else}
				<!-- Use simple node for other categories -->
				<MetadataNode
					label={displayName}
					{sublabel}
					level={2}
					isSelected={itemId ? utils.isItemSelected(categoryName, itemId, currentPath) : false}
					onClick={() => itemId && onNavigate(categoryName, itemId)}
					leafId={itemId}
					isModified={!!isModified}
					{isDeleted}
				/>
			{/if}
		{/if}
	{/each}
{/if}
