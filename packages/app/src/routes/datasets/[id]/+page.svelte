<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ClinicalDataTableV3, type SerializedFilter, type SortConfig, type ColumnValidationInfo, type ValidationCheckDetail } from '@sden99/data-table-v3';
	import { getContext } from 'svelte';

	// State management
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as workerState from '$lib/core/state/workerState.svelte.ts';
	import { startMetric, endMetric } from '$lib/utils/performanceMetrics.svelte';
	import { selectDataset as orchestrateSelection } from '$lib/core/actions/selectionAction';

	// Persistence
	import { loadTableState, saveTableState } from '$lib/utils/tableStatePersistence.svelte';

	// Define-XML codelist integration
	import { convertToDefineVariables } from '$lib/adapters/defineVariablesAdapter';

	// Validation service
	import { validationService } from '$lib/services/validationService.svelte';

	// --- ROUTE PARAMS ---
	// Get dataset ID from URL
	const datasetId = $derived($page.params.id);

	// --- DATASET SELECTION ---
	// Select the dataset when route loads/changes
	// Use orchestrateSelection() which resolves domain names to file IDs
	// Track previous datasetId to prevent infinite loops
	let previousDatasetId = $state<string | undefined>(undefined);

	$effect(() => {
		// Only run selection if the URL parameter actually changed
		if (datasetId && datasetId !== previousDatasetId) {
			previousDatasetId = datasetId;
			orchestrateSelection(datasetId);
		}
	});

	// --- REACTIVE DERIVED STATE ---
	const selectedDataset = $derived.by(() => {
		const selectedId = dataState.selectedDatasetId.value;
		if (!selectedId) return null;
		return dataState.getDatasets()[selectedId];
	});

	const selectedName = $derived(
		dataState.selectedDomain.value || dataState.selectedDatasetId.value || ''
	);

	const currentDatasetId = $derived(dataState.selectedDatasetId.value);

	// Get metadata from Define-XML if available (for consistent header display)
	const datasetMetadata = $derived.by(() => {
		if (!selectedName) return null;
		return dataState.getItemGroupMetadata(selectedName);
	});

	// Get Define-XML variables with codelists for chart filters
	const defineVariables = $derived.by(() => {
		if (!datasetMetadata) return undefined;
		const activeDefine = dataState.getActiveDefineInfo();
		if (!activeDefine.define) return undefined;
		return convertToDefineVariables(datasetMetadata, activeDefine.define);
	});

	// Get validation results for the current dataset
	const validationResults = $derived.by(() => {
		if (!currentDatasetId) return [];
		return validationService.getResultsForDataset(currentDatasetId);
	});

	const validationIsRunning = $derived(validationService.isValidating);

	// Convert validation results to Map format for table component
	// Aggregate multiple results per column with per-check-type breakdown
	const validationResultsMap = $derived.by(() => {
		const map = new Map<string, ColumnValidationInfo>();
		for (const result of validationResults) {
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

	// Display name: prefer metadata Name, fall back to selected name/ID
	const displayName = $derived(datasetMetadata?.Name || selectedName || datasetId);

	// Description from metadata
	const displayDescription = $derived(datasetMetadata?.Description || '');

	// Get the clinicalTableRef from context (provided by layout)
	const tableRefContext = getContext<{ ref: any }>('clinicalTableRef');
	let clinicalTableRef = $derived.by(() => tableRefContext.ref);

	// --- PERSISTENCE ---
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

	// Handle validation badge click - filter to show affected rows for a specific check
	function handleValidationBadgeClick(columnId: string, affectedRows: number[], ruleId?: string) {
		if (affectedRows.length === 0 || !selectedDataset?.data) return;

		// Always extract actual values from the data using affectedRows indices.
		// invalidValues keys use display strings like '(empty)' for null, which
		// don't match the set filter's string conversion (null → '').
		const rows = selectedDataset.data as Record<string, unknown>[];
		const valueSet = new Set<unknown>();
		for (const rowIdx of affectedRows) {
			if (rowIdx < rows.length) {
				valueSet.add(rows[rowIdx][columnId]);
			}
		}

		const filterValues = Array.from(valueSet);
		if (filterValues.length === 0) return;

		// Clear all existing filters first so validation filters don't accumulate
		tableRefContext.ref?.clearAllFilters();

		// Apply filter to show only rows with invalid values for this check
		tableRefContext.ref?.applyFilter(columnId, {
			type: 'set',
			columnId,
			operator: 'in',
			values: filterValues
		});
	}

	// Apply filter from query params (when navigating from metadata tab)
	let pendingFilterApplied = $state(false);
	$effect(() => {
		const filterCol = $page.url.searchParams.get('filterCol');
		const filterValuesRaw = $page.url.searchParams.get('filterValues');
		if (!filterCol || !filterValuesRaw || pendingFilterApplied) return;

		// Wait for the table ref to be available
		const ref = tableRefContext.ref;
		if (!ref) return;

		try {
			const values = JSON.parse(filterValuesRaw);
			ref.clearAllFilters();
			ref.applyFilter(filterCol, {
				type: 'set',
				columnId: filterCol,
				operator: 'in',
				values
			});
			pendingFilterApplied = true;

			// Clean up query params from URL without triggering navigation
			const url = new URL($page.url);
			url.searchParams.delete('filterCol');
			url.searchParams.delete('filterValues');
			goto(url.pathname, { replaceState: true });
		} catch (e) {
			console.error('[DatasetDetail] Failed to apply filter from query params:', e);
		}
	});

</script>

<div class="mx-auto h-full overflow-auto p-3" style="max-width: 1400px;">
	<!-- Header matching metadata view style -->
	<div class="mb-3">
		<div class="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
			<span>Dataset</span>
			<span>›</span>
			<span>{displayName}</span>
		</div>
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-bold">{displayName}</h1>
			<!-- Validation status indicator -->
			{#if validationIsRunning}
				<span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10 ring-inset">
					Validating...
				</span>
			{:else if validationResults.length > 0}
				{@const totalIssues = validationResults.reduce((sum, r) => sum + r.issueCount, 0)}
				<span class="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-700/10 ring-inset">
					{totalIssues} validation {totalIssues === 1 ? 'issue' : 'issues'}
				</span>
			{:else if defineVariables && defineVariables.length > 0}
				<span class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-700/10 ring-inset">
					No issues
				</span>
			{/if}
		</div>
		{#if displayDescription}
			<p class="mt-1 text-sm text-muted-foreground">{displayDescription}</p>
		{/if}
	</div>

	<!-- Dataset Content -->
	<div class="rounded-lg border bg-card flex-grow overflow-hidden">
		{#if selectedDataset?.data && Array.isArray(selectedDataset.data) && currentDatasetId}
			<ClinicalDataTableV3
				bind:this={tableRefContext.ref}
				workerState={workerState.getWorkerStateInterface()}
				dataState={dataState}
				datasetId={currentDatasetId}
				height="calc(100vh - 280px)"
				enableCdiscPriority={false}
				emergencyColumnCount={5}
				showChartFilters={true}
				chartFilterHeight={90}
				{defineVariables}
				chartLabelFormat="both"
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
	</div>
</div>
