<script lang="ts">
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sden99/ui-components';
	import { ClinicalDataTableV3, type SerializedFilter, type SortConfig, type ColumnValidationInfo, type ValidationCheckDetail } from '@sden99/data-table-v3';
	import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';
	// --- NEW ARCHITECTURE IMPORTS ---
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import * as workerState from '$lib/core/state/workerState.svelte.ts';
	import { startMetric, endMetric } from '$lib/utils/performanceMetrics.svelte';
	import { validationService } from '$lib/services/validationService.svelte';
	import { exportResultsAsCSV, downloadCSV } from '$lib/services/validationExport';

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
		const define = defineXmlInfo.ADaM ?? defineXmlInfo.SDTM ?? defineXmlInfo.SEND;
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
	// Single derived to avoid multiple reactive subscriptions to resultsByDataset

	const validationResultsMap = $derived.by(() => {
		const columnMap = new Map<string, ColumnValidationInfo>();
		if (!currentDatasetId) return columnMap;
		const results = validationService.getResultsForDataset(currentDatasetId);
		if (results.length === 0) return columnMap;

		for (const result of results) {
			// Skip results with no column (dataset-level engine checks are on the Rules page)
			if (!result.columnId) continue;

			const existing = columnMap.get(result.columnId);
			const check: ValidationCheckDetail = {
				ruleId: result.ruleId,
				checkType: result.details?.rule?.Rule_Type || (result.ruleId.startsWith('ENGINE.') ? 'Engine' : 'Check'),
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
				columnMap.set(result.columnId, {
					issueCount: result.issueCount,
					severity: result.severity,
					affectedRows: [...result.affectedRows],
					checks: [check]
				});
			}
		}
		return columnMap;
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

	// Apply filter from Rules page "View" button (pendingRuleFilter in appState)
	$effect(() => {
		const ruleId = appState.pendingRuleFilter.value;
		if (!ruleId) return;
		if (!clinicalTableRef || !selectedDataset?.data || !currentDatasetId) return;

		const violations = validationService.getViolationsByRule(ruleId);
		const datasetViolations = violations.filter(v => v.datasetId === currentDatasetId);

		// Consume the pending filter
		appState.pendingRuleFilter.value = null;

		if (datasetViolations.length === 0) return;

		const rows = selectedDataset.data as Record<string, unknown>[];
		const byColumn = new Map<string, Set<unknown>>();
		for (const v of datasetViolations) {
			const valueSet = byColumn.get(v.columnId) ?? new Set();
			for (const rowIdx of v.affectedRows) {
				if (rowIdx < rows.length) {
					valueSet.add(rows[rowIdx][v.columnId]);
				}
			}
			byColumn.set(v.columnId, valueSet);
		}

		clinicalTableRef.clearAllFilters();
		for (const [columnId, values] of byColumn) {
			clinicalTableRef.applyFilter(columnId, {
				type: 'set',
				columnId,
				operator: 'in',
				values: Array.from(values)
			});
		}
	});

	const hasValidationResults = $derived(validationResultsMap.size > 0);

	function handleExportCSV() {
		if (!currentDatasetId) return;
		const results = validationService.getResultsForDataset(currentDatasetId);
		if (results.length === 0) return;
		const name = datasetDisplayName || currentDatasetId;
		const csv = exportResultsAsCSV(results, name);
		downloadCSV(csv, `${name}-validation.csv`);
	}

	const triggerClass =
		'relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none';

	let tableContainerHeight = $state(600);

	const datasetDisplayName = $derived.by(() => {
		const name = dataState.selectedDomain.value || dataState.selectedDatasetId.value;
		if (!name) return 'Dataset';
		const metadata = dataState.getItemGroupMetadata(name);
		return metadata?.Name || name.toUpperCase();
	});
</script>

<div class="bg-card dark:bg-background/90 flex h-full w-full flex-col rounded-md border">
	<Tabs value="data" class="flex flex-grow flex-col">
		<TabsList
			class="h-auto w-full flex-none justify-start rounded-none border-b border-border bg-transparent px-4 py-3"
		>
			<TabsTrigger value="data" class={triggerClass}>{datasetDisplayName}</TabsTrigger>
			{#if hasValidationResults}
				<button
					onclick={handleExportCSV}
					class="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
					title="Export validation results as CSV"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
					Export CSV
				</button>
			{/if}
		</TabsList>

		<TabsContent value="data" class="mt-0 flex flex-col flex-grow overflow-hidden">
			{#if selectedDataset?.data && Array.isArray(selectedDataset.data) && currentDatasetId}
				<div class="min-h-0 w-full flex-1" bind:clientHeight={tableContainerHeight}>
					<ClinicalDataTableV3
						bind:this={clinicalTableRef}
						workerState={workerState.getWorkerStateInterface()}
						dataState={dataState}
						datasetId={currentDatasetId}
						height={tableContainerHeight}
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
				</div>
			{:else}
				<div class="text-muted-foreground p-4">
					<p>No tabular data is available for the selected item.</p>
				</div>
			{/if}
		</TabsContent>
	</Tabs>
</div>
