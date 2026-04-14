<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sden99/ui-components';
	import { ClinicalDataTableV3, type SerializedFilter, type SortConfig, type ColumnValidationInfo, type ValidationCheckDetail } from '@sden99/data-table-v3';
	import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';

	// --- NEW ARCHITECTURE IMPORTS ---
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as workerState from '$lib/core/state/workerState.svelte.ts';
	import { startMetric, endMetric } from '$lib/utils/performanceMetrics.svelte';
	import { validationService } from '$lib/services/validationService.svelte';

	// V3 Persistence layer
	import { loadTableState, saveTableState } from '$lib/utils/tableStatePersistence.svelte';

	// --- REACTIVE DERIVED STATE ---

	const selectedDataset = $derived.by(() => {
		const selectedId = dataState.selectedDatasetId.value;
		if (!selectedId) return null;
		return dataState.getDatasets()[selectedId];
	});

	const currentDatasetId = $derived(dataState.selectedDatasetId.value);

	const datasetDetails = $derived(selectedDataset?.details);

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

	// V3 Persistence
	const tablePersistedState = $derived.by(() => {
		if (!currentDatasetId) return { filters: undefined, sort: undefined };
		return loadTableState(currentDatasetId);
	});

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

	// --- VALIDATION BADGES ---

	const validationResultsMap = $derived.by(() => {
		if (!currentDatasetId) return new Map<string, ColumnValidationInfo>();
		const results = validationService.getResultsForDataset(currentDatasetId);
		const map = new Map<string, ColumnValidationInfo>();
		for (const result of results) {
			const existing = map.get(result.columnId);
			const check: ValidationCheckDetail = {
				ruleId: result.ruleId,
				checkType: result.details?.rule?.Rule_Type || 'Check',
				issueCount: result.issueCount,
				severity: result.severity,
				affectedRows: [...result.affectedRows],
				invalidValues: result.details?.invalidValues
			};
			if (existing) {
				existing.issueCount += result.issueCount;
				existing.affectedRows = [...new Set([...(existing.affectedRows || []), ...result.affectedRows])];
				if (result.severity === 'error') existing.severity = 'error';
				else if (result.severity === 'warning' && existing.severity !== 'error') existing.severity = 'warning';
				existing.checks!.push(check);
			} else {
				map.set(result.columnId, {
					issueCount: result.issueCount,
					severity: result.severity,
					affectedRows: [...result.affectedRows],
					checks: [check]
				});
			}
		}
		return map;
	});

	function handleValidationBadgeClick(columnId: string, affectedRows: number[], ruleId?: string) {
		if (affectedRows.length === 0 || !selectedDataset?.data) return;

		const rows = selectedDataset.data as Record<string, unknown>[];
		const valueSet = new Set<unknown>();
		for (const rowIdx of affectedRows) {
			if (rowIdx < rows.length) {
				valueSet.add(rows[rowIdx][columnId]);
			}
		}

		const filterValues = Array.from(valueSet);
		if (filterValues.length === 0) return;

		clinicalTableRef?.clearAllFilters();
		clinicalTableRef?.applyFilter(columnId, {
			type: 'set',
			columnId,
			operator: 'in',
			values: filterValues
		});
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
					validationResults={validationResultsMap}
					onValidationBadgeClick={handleValidationBadgeClick}
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
