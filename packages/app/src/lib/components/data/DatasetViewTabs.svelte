<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sden99/ui-components';
	import { ClinicalDataTableV3, type SerializedFilter, type SortConfig } from '@sden99/data-table-v3';
	import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';

	// --- NEW ARCHITECTURE IMPORTS ---
	// Import directly from the authoritative state modules.
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as workerState from '$lib/core/state/workerState.svelte.ts';
	import { startMetric, endMetric } from '$lib/utils/performanceMetrics.svelte';

	// V3 Persistence layer
	import { loadTableState, saveTableState } from '$lib/utils/tableStatePersistence.svelte';

	// --- REACTIVE DERIVED STATE ---

	// The currently selected dataset's content, also from the central state.
	const selectedDataset = $derived.by(() => {
		const selectedId = dataState.selectedDatasetId.value;
		if (!selectedId) return null;
		return dataState.getDatasets()[selectedId];
	});

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

	// V3 Persistence: Load persisted table state for current dataset
	const tablePersistedState = $derived.by(() => {
		if (!currentDatasetId) return { filters: undefined, sort: undefined };
		return loadTableState(currentDatasetId);
	});

	// V3 Persistence handlers
	function handleTableFilterChange(filters: SerializedFilter[]) {
		if (!currentDatasetId) return;
		saveTableState(currentDatasetId, filters, tablePersistedState.sort || [], tablePersistedState.columnWidths);
	}

	function handleTableSortChange(sorts: SortConfig[]) {
		if (!currentDatasetId) return;
		saveTableState(currentDatasetId, tablePersistedState.filters || [], sorts, tablePersistedState.columnWidths);
	}

	function handleTableWidthChange(widths: Record<string, number>) {
		if (!currentDatasetId) return;
		saveTableState(currentDatasetId, tablePersistedState.filters || [], tablePersistedState.sort || [], widths);
	}

	const triggerClass =
		'relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none';
</script>

<div class="bg-card dark:bg-background/90 flex h-full w-full flex-col rounded-md border">
	<Tabs value="data" class="flex flex-grow flex-col">
		<TabsList
			class="from-background to-muted/30 w-full flex-none justify-start border-b bg-gradient-to-r px-4"
		>
			<TabsTrigger value="data" class={triggerClass}>Dataset</TabsTrigger>
		</TabsList>

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
	</Tabs>
</div>
