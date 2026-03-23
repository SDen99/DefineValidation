<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sden99/ui-components';
	import { ClinicalDataTableV3, type SerializedFilter, type SortConfig } from '@sden99/data-table-v3';
	// Metadata view using package with reactive boundary pattern
	import MetadataView from '@sden99/metadata-components/components/MetadataView.svelte';
	import { metadataStateProvider } from '$lib/adapters/MetadataStateProviderAdapter';
	import VLMdataView from '@sden99/vlm-components/components/VLMView/VLMdataView.svelte';
	import { vlmStateProvider } from '$lib/adapters/VLMStateProviderAdapter';
	import { Alert, Button, Input, Table, TableBody } from '@sden99/ui-components';
	import { ChevronDown, ChevronRight } from '@lucide/svelte/icons';
	import { goto } from '$app/navigation';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';

	// --- NEW ARCHITECTURE IMPORTS ---
	// Import directly from the authoritative state modules.
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as workerState from '$lib/core/state/workerState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { startMetric, endMetric } from '$lib/utils/performanceMetrics.svelte';

	// V3 Persistence layer
	import { loadTableState, saveTableState } from '$lib/utils/tableStatePersistence.svelte';

	// --- REACTIVE DERIVED STATE ---

	// The available views (tabs) are now derived directly from the central data state.
	// This makes the component's logic much simpler and more declarative.
	const availableViews = $derived(dataState.getAvailableViews());

	// The currently selected dataset's content, also from the central state.
	const selectedDataset = $derived.by(() => {
		const selectedId = dataState.selectedDatasetId.value;
		if (!selectedId) return null;
		return dataState.getDatasets()[selectedId];
	});

	const selectedName = $derived(
		dataState.selectedDomain.value || dataState.selectedDatasetId.value || ''
	);

	// Current dataset ID for ClinicalVirtualTable
	const currentDatasetId = $derived(dataState.selectedDatasetId.value);

	// Dataset details (dtypes) for chart filter type resolution
	const datasetDetails = $derived(selectedDataset?.details);

	// Define-XML variable metadata for chart filter codelist/type resolution
	const defineVariables = $derived.by(() => {
		const name = dataState.selectedDomain.value || dataState.selectedDatasetId.value;
		const itemGroup = dataState.getItemGroupMetadata(name);
		if (!itemGroup) return [];
		const defineXmlInfo = dataState.getDefineXmlInfo();
		const define = defineXmlInfo.ADaM ?? defineXmlInfo.SDTM;
		return convertToDefineVariables(itemGroup, define);
	});

	// Reference to the ClinicalVirtualTable component for sidebar integration
	let { clinicalTableRef = $bindable() } = $props();

	// ClinicalVirtualTable is now fully integrated with sidebar via clinicalTableRef

	// The active tab is derived from the central app state for UI.
	let activeTab = $derived(appState.viewMode.value);

	// V3 Persistence: Load persisted table state for current dataset
	const tablePersistedState = $derived.by(() => {
		if (!currentDatasetId) return { filters: undefined, sort: undefined };
		const loaded = loadTableState(currentDatasetId);
		console.log('[Persistence] Loading table state for', currentDatasetId, loaded);
		return loaded;
	});

	// V3 Persistence handlers
	function handleTableFilterChange(filters: SerializedFilter[]) {
		if (!currentDatasetId) return;
		const currentSort = tablePersistedState.sort || [];
		const currentWidths = tablePersistedState.columnWidths;
		console.log('[Persistence] Saving filter change:', { currentDatasetId, filters, currentSort, currentWidths });
		saveTableState(currentDatasetId, filters, currentSort, currentWidths);
	}

	function handleTableSortChange(sorts: SortConfig[]) {
		if (!currentDatasetId) return;
		const currentFilters = tablePersistedState.filters || [];
		const currentWidths = tablePersistedState.columnWidths;
		console.log('[Persistence] Saving sort change:', { currentDatasetId, currentFilters, sorts, currentWidths });
		saveTableState(currentDatasetId, currentFilters, sorts, currentWidths);
	}

	function handleTableWidthChange(widths: Record<string, number>) {
		if (!currentDatasetId) return;
		const currentFilters = tablePersistedState.filters || [];
		const currentSort = tablePersistedState.sort || [];
		console.log('[Persistence] Saving width change:', { currentDatasetId, currentFilters, currentSort, widths });
		saveTableState(currentDatasetId, currentFilters, currentSort, widths);
	}

	// Debug logging to understand what's happening
	$effect(() => {
		console.log(`[DatasetViewTabs] Debug state:`, {
			selectedId: dataState.selectedDatasetId.value,
			selectedDomain: dataState.selectedDomain.value,
			selectedName,
			hasSelectedDataset: !!selectedDataset,
			selectedDatasetType: selectedDataset ? 'has data' : 'null',
			availableViews,
			activeTab,
			selectedDatasetDataType: selectedDataset?.data
				? Array.isArray(selectedDataset.data)
					? 'array'
					: 'object'
				: 'none'
		});
	});

	// --- HANDLER FUNCTIONS ---

	// This function now calls a simple, direct action on the appState module.
	function handleTabChange(newMode: string | undefined) {
		const newViewType = newMode as 'data' | 'metadata' | 'VLM';

		if (newViewType && newViewType !== activeTab && availableViews[newViewType]) {
			// Special handling for metadata tab - redirect to new metadata page
			if (newViewType === 'metadata' && selectedDataset) {
				// Find the dataset OID from Define-XML metadata
				const defineBundle = extractDefineDataForMetadata();
				let datasetOID: string | null = null;

				// Search in ADaM
				if (defineBundle.adamData?.defineData?.ItemGroups) {
					const dataset = defineBundle.adamData.defineData.ItemGroups.find((ig: any) => {
						const sasName = (ig.SASDatasetName || ig.Name || '').toLowerCase();
						const searchName = (selectedName || '').toLowerCase().replace('.sas7bdat', '');
						return sasName === searchName;
					});
					if (dataset) datasetOID = dataset.OID;
				}

				// Search in SDTM if not found
				if (!datasetOID && defineBundle.sdtmData?.defineData?.ItemGroups) {
					const dataset = defineBundle.sdtmData.defineData.ItemGroups.find((ig: any) => {
						const sasName = (ig.SASDatasetName || ig.Name || '').toLowerCase();
						const searchName = (selectedName || '').toLowerCase().replace('.sas7bdat', '');
						return sasName === searchName;
					});
					if (dataset) datasetOID = dataset.OID;
				}

				// Navigate to metadata detail page if found
				if (datasetOID) {
					goto(`/metadata/datasets/${datasetOID}`);
					return;
				}
			}

			// Create dataset key for tab memory
			const datasetKey = `${dataState.selectedDatasetId.value || ''}_${dataState.selectedDomain.value || ''}`;

			// The logic for handling sidebars on view change is now centralized in appState.
			appState.handleViewModeChange(newViewType, datasetKey);
		}
	}

	const triggerClass =
		'relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none';
</script>

<div class="bg-card dark:bg-background/90 flex h-full w-full flex-col rounded-md border">
	<Tabs value={activeTab} onValueChange={handleTabChange} class="flex flex-grow flex-col">
		<TabsList
			class="from-background to-muted/30 w-full flex-none justify-start border-b bg-gradient-to-r px-4"
		>
			{#if availableViews.data}
				<TabsTrigger value="data" class={triggerClass}>Dataset</TabsTrigger>
			{/if}
			{#if availableViews.metadata}
				<TabsTrigger value="metadata" class={triggerClass}>Metadata</TabsTrigger>
			{/if}
			{#if availableViews.VLM}
				<TabsTrigger value="VLM" class={triggerClass}>VLM</TabsTrigger>
			{/if}
		</TabsList>

		<!-- The `if` blocks now correctly protect the content from trying to render when not available -->
		{#if availableViews.data}
			<TabsContent value="data" class="flex-grow overflow-hidden">
				{#if selectedDataset?.data && Array.isArray(selectedDataset.data) && currentDatasetId}
					<ClinicalDataTableV3
						bind:this={clinicalTableRef}
						workerState={workerState.getWorkerStateInterface()}
						dataState={dataState}
						datasetId={currentDatasetId}
						height="calc(100vh - 250px)"
						enableCdiscPriority={false}
						emergencyColumnCount={5}
						showChartFilters={true}
						chartFilterHeight={90}
						{datasetDetails}
						{defineVariables}
						initialFilters={tablePersistedState.filters}
						initialSort={tablePersistedState.sort}
						initialColumnWidths={tablePersistedState.columnWidths}
						onFilterChange={handleTableFilterChange}
						onSortChange={handleTableSortChange}
						onColumnWidthChange={handleTableWidthChange}
						onMetricStart={startMetric}
						onMetricEnd={endMetric}
					/>
				{:else}
					<div class="text-muted-foreground p-4">
						<p>No tabular data is available for the selected item.</p>
					</div>
				{/if}
			</TabsContent>
		{/if}

		{#if availableViews.metadata}
			<TabsContent value="metadata" class="flex-1 min-h-0 overflow-hidden">
				<MetadataView datasetName={selectedName} stateProvider={metadataStateProvider} />
			</TabsContent>
		{/if}

		{#if availableViews.VLM}
			<TabsContent value="VLM" class="h-full flex-grow overflow-auto">
				<VLMdataView
					datasetName={selectedName}
					stateProvider={vlmStateProvider}
					uiComponents={{
						Alert,
						Button,
						Input,
						Table,
						TableBody,
						ChevronDown,
						ChevronRight
					}}
				/>
			</TabsContent>
		{/if}

	</Tabs>
</div>
