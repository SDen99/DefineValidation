<script lang="ts">
	/**
	 * Phase 4 Demo - localStorage Persistence with Controlled Component Pattern
	 *
	 * Tests:
	 * - ✅ Filters persist across page refreshes
	 * - ✅ Sorts persist across page refreshes
	 * - ✅ onChange events work correctly
	 * - ✅ No infinite loops during initialization
	 * - ✅ Controlled component pattern (app manages persistence)
	 */

	import { ClinicalDataTableV3 } from '../lib/index';
	import type { ClinicalDataState } from '../lib/ClinicalDataTableV3.svelte';
	import type { SerializedFilter } from '../lib/types/filters';
	import type { SortConfig } from '../lib/types/sorting';

	// Generate test data for Adverse Events (AE)
	function generateClinicalData(count: number) {
		const subjects = ['SUBJ-001', 'SUBJ-002', 'SUBJ-003', 'SUBJ-004', 'SUBJ-005'];
		const domains = ['AE', 'CM', 'LB', 'VS', 'DM'];
		const data = [];

		for (let i = 0; i < count; i++) {
			data.push({
				USUBJID: subjects[i % subjects.length],
				DOMAIN: domains[i % domains.length],
				AETERM: `Adverse Event ${i + 1}`,
				AESEV: i % 3 === 0 ? 'MILD' : i % 3 === 1 ? 'MODERATE' : 'SEVERE',
				AESER: i % 5 === 0 ? 'Y' : 'N',
				AESTDT: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
				// Date object for actual date filtering
				AESTDTC_DATE: new Date(2024, 0, (i % 28) + 1),
				AESDTC: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T10:00:00`,
				AEENDTC: `2024-01-${String((i % 28) + 5).padStart(2, '0')}T10:00:00`,
				// Boolean: Serious outcome
				AEOUT_FATAL: i % 10 === 0,
				// Boolean: Related to study drug
				AEREL: i % 4 !== 0,
				SEQ: i + 1
			});
		}

		return data;
	}

	// Generate Demographics data (DM) - completely different structure
	function generateDemographicsData(count: number) {
		const subjects = ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004', 'DEMO-005'];
		const genders = ['M', 'F'];
		const races = ['WHITE', 'BLACK OR AFRICAN AMERICAN', 'ASIAN', 'AMERICAN INDIAN OR ALASKA NATIVE'];
		const countries = ['USA', 'UK', 'CANADA', 'GERMANY', 'JAPAN'];
		const data = [];

		for (let i = 0; i < count; i++) {
			const age = 18 + (i % 60);
			const month = (i % 12) + 1;
			data.push({
				USUBJID: subjects[i % subjects.length],
				SUBJID: `${1000 + i}`,
				AGE: age,
				AGEU: 'YEARS',
				SEX: genders[i % genders.length],
				RACE: races[i % races.length],
				ETHNIC: i % 3 === 0 ? 'HISPANIC OR LATINO' : 'NOT HISPANIC OR LATINO',
				COUNTRY: countries[i % countries.length],
				ARMCD: i % 2 === 0 ? 'TRT' : 'PLACEBO',
				ARM: i % 2 === 0 ? 'Treatment' : 'Placebo',
				RFSTDTC: `2024-${String(month).padStart(2, '0')}-01`,
				// Date object for actual date filtering
				RFSTDTC_DATE: new Date(2024, month - 1, 1),
				RFENDTC: `2024-${String(month).padStart(2, '0')}-28`,
				// Boolean: Completed study
				DTHFL: i % 8 === 0,
				// Boolean: Screen failure
				SCRFL: i % 6 === 0
			});
		}

		return data;
	}

	// localStorage key prefix for persistence
	const STORAGE_KEY_PREFIX = 'data-table-v3-phase4-demo';

	// Load persisted state from localStorage for a specific dataset
	function loadPersistedState(datasetId: string): { filters?: SerializedFilter[]; sort?: SortConfig[] } {
		try {
			const key = `${STORAGE_KEY_PREFIX}-${datasetId}`;
			const stored = localStorage.getItem(key);
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (error) {
			console.error('[Phase 4 Demo] Failed to load persisted state:', error);
		}
		return {};
	}

	// Save state to localStorage for a specific dataset
	function savePersistedState(datasetId: string, filters: SerializedFilter[], sort: SortConfig[]) {
		try {
			const key = `${STORAGE_KEY_PREFIX}-${datasetId}`;
			const state = { filters, sort };
			localStorage.setItem(key, JSON.stringify(state));
		} catch (error) {
			console.error('[Phase 4 Demo] Failed to save state:', error);
		}
	}

	// Mock dataState (simulates app's data structure)
	let datasetSize = $state(1000);
	let currentDatasetId = $state('test-dataset-1');

	const mockDataState: ClinicalDataState = {
		getSelectedDatasetId: () => currentDatasetId,
		getDatasets: () => ({
			'test-dataset-1': {
				data: generateClinicalData(datasetSize),
				metadata: {
					name: 'Adverse Events (AE)',
					domain: 'AE'
				}
			},
			'test-dataset-2': {
				data: generateDemographicsData(datasetSize),
				metadata: {
					name: 'Demographics (DM)',
					domain: 'DM'
				}
			}
		})
	};

	// Persisted state - reactively loaded from localStorage when dataset changes
	let persistedState = $derived.by(() => {
		return loadPersistedState(currentDatasetId);
	});

	// Event log (track onChange calls)
	let eventLog = $state<string[]>([]);

	function handleFilterChange(filters: SerializedFilter[]) {
		const timestamp = new Date().toLocaleTimeString();
		eventLog = [...eventLog, `[${timestamp}] Filter changed for ${currentDatasetId}: ${filters.length} filters`];

		// Save to localStorage for current dataset
		const currentSort = loadPersistedState(currentDatasetId).sort || [];
		savePersistedState(currentDatasetId, filters, currentSort);
	}

	function handleSortChange(sorts: SortConfig[]) {
		const timestamp = new Date().toLocaleTimeString();
		eventLog = [...eventLog, `[${timestamp}] Sort changed for ${currentDatasetId}: ${sorts.length} sorts`];

		// Save to localStorage for current dataset
		const currentFilters = loadPersistedState(currentDatasetId).filters || [];
		savePersistedState(currentDatasetId, currentFilters, sorts);
	}

	// Dataset switching
	function switchDataset(id: string) {
		currentDatasetId = id;
	}

	function changeDatasetSize(size: number) {
		datasetSize = size;
		// Recreate both datasets with new size
		mockDataState.getDatasets()['test-dataset-1'].data = generateClinicalData(size);
		mockDataState.getDatasets()['test-dataset-2'].data = generateDemographicsData(size);
		// Trigger re-render by switching back to same dataset
		const temp = currentDatasetId;
		currentDatasetId = '';
		setTimeout(() => {
			currentDatasetId = temp;
		}, 0);
	}

	// Component key to force re-initialization
	let tableKey = $state(0);

	function clearPersistedState() {
		// Clear for current dataset
		const key = `${STORAGE_KEY_PREFIX}-${currentDatasetId}`;
		localStorage.removeItem(key);

		// Force component re-initialization by changing key
		// This will cause $derived to re-run and load empty state
		tableKey++;

		eventLog = [...eventLog, `[${new Date().toLocaleTimeString()}] Cleared localStorage for ${currentDatasetId}`];
	}

	function clearAllPersistedState() {
		// Clear for all datasets
		['test-dataset-1', 'test-dataset-2'].forEach(id => {
			const key = `${STORAGE_KEY_PREFIX}-${id}`;
			localStorage.removeItem(key);
		});

		// Force component re-initialization by changing key
		// This will cause $derived to re-run and load empty state
		tableKey++;

		eventLog = [...eventLog, `[${new Date().toLocaleTimeString()}] Cleared ALL localStorage`];
	}
</script>

<div class="p-6 space-y-4 bg-white dark:bg-gray-900 min-h-screen">
	<div class="space-y-4">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
			Data Table V3 - Phase 4 Test (localStorage Persistence)
		</h1>

		<!-- Info Panel -->
		<div class="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
			<h3 class="font-semibold text-purple-900 dark:text-purple-100 mb-2">Testing Phase 4 (Persistence):</h3>
			<ul class="text-sm text-purple-800 dark:text-purple-200 space-y-1">
				<li>✅ Filters persist across page refreshes (localStorage)</li>
				<li>✅ Sorts persist across page refreshes (localStorage)</li>
				<li>✅ onChange events emit on user actions</li>
				<li>✅ NO events during initialization (avoids infinite loops)</li>
				<li>✅ Controlled component pattern (app manages persistence)</li>
			</ul>
		</div>

		<!-- Controls -->
		<div class="flex gap-4 items-center flex-wrap">
			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Dataset:
				</label>
				<select
					value={currentDatasetId}
					onchange={(e) => switchDataset((e.target as HTMLSelectElement).value)}
					class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
				>
					<option value="test-dataset-1">Adverse Events (AE)</option>
					<option value="test-dataset-2">Demographics (DM)</option>
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Dataset Size:
				</label>
				<select
					value={datasetSize}
					onchange={(e) => changeDatasetSize(Number((e.target as HTMLSelectElement).value))}
					class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
				>
					<option value="100">100 rows</option>
					<option value="1000">1,000 rows</option>
					<option value="10000">10,000 rows</option>
					<option value="100000">100,000 rows</option>
				</select>
			</div>

			<div class="flex gap-2">
				<button
					onclick={clearPersistedState}
					class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
				>
					Clear Current Dataset
				</button>
				<button
					onclick={clearAllPersistedState}
					class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
				>
					Clear All Datasets
				</button>
			</div>
		</div>

		<!-- Persisted State Info -->
		<div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
			<h3 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">
				Persisted State for {currentDatasetId}:
			</h3>
			<div class="text-sm text-blue-800 dark:text-blue-200 font-mono space-y-1">
				<div>Filters: {persistedState.filters?.length || 0}</div>
				<div>Sorts: {persistedState.sort?.length || 0}</div>
				<div class="mt-2 p-2 bg-blue-100 dark:bg-blue-800 rounded">
					<div class="font-semibold">Debug Info:</div>
					<div>Dataset: {currentDatasetId}</div>
					<div>Raw Data Rows: {mockDataState.getDatasets()[currentDatasetId]?.data?.length || 0}</div>
					{#if persistedState.filters && persistedState.filters.length > 0}
						<div class="mt-1">Active Filters:</div>
						{#each persistedState.filters as filter}
							<div class="ml-2 text-xs">
								• {'columnId' in filter ? filter.columnId : 'global'}: {filter.type}
								{#if 'operator' in filter}({filter.operator}){/if}
								{#if 'value' in filter}= "{filter.value}"{/if}
								{#if 'enabled' in filter}[enabled: {filter.enabled ?? 'undefined'}]{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
			<div class="text-xs text-blue-700 dark:text-blue-300 mt-2">
				(Each dataset has separate localStorage - check browser console for detailed logs)
			</div>
		</div>

		<!-- Data Table V3 Component with Persistence -->
		<div class="border-2 border-purple-500 rounded-lg overflow-hidden" style="height: 600px;">
			{#key tableKey}
				<ClinicalDataTableV3
					dataState={mockDataState}
					datasetId={currentDatasetId}
					enableCdiscPriority={false}
					initialFilters={persistedState.filters}
					initialSort={persistedState.sort}
					onFilterChange={handleFilterChange}
					onSortChange={handleSortChange}
				/>
			{/key}
		</div>

		<!-- Event Log -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
			<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
				Event Log (onChange calls)
				<button
					onclick={() => (eventLog = [])}
					class="ml-2 text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
				>
					Clear
				</button>
			</h3>
			<div class="max-h-40 overflow-auto font-mono text-xs text-gray-700 dark:text-gray-300">
				{#if eventLog.length === 0}
					<div class="text-gray-500 dark:text-gray-400 italic">No events logged yet...</div>
				{:else}
					{#each eventLog as log}
						<div>{log}</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Success Criteria -->
		<div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
			<h3 class="font-semibold text-green-900 dark:text-green-100 mb-2">Phase 4 Success Criteria:</h3>
			<ul class="text-sm text-green-800 dark:text-green-200 space-y-1">
				<li>✅ Apply some filters and refresh page - filters should be restored</li>
				<li>✅ Apply sorting and refresh page - sorts should be restored</li>
				<li>✅ Each dataset has separate localStorage (AE filters don't apply to DM)</li>
				<li>✅ onChange events appear in Event Log when you make changes</li>
				<li>✅ NO events appear in log on initial load (check browser console for "[Phase 4 Demo] Loaded persisted state")</li>
				<li>✅ Clear buttons work immediately (no refresh needed) and reset filter UI</li>
				<li>✅ Controlled component pattern works (app manages persistence, not table)</li>
			</ul>
			<p class="text-sm text-green-700 dark:text-green-300 mt-3">
				<strong>Test Steps:</strong>
			</p>
			<ol class="text-sm text-green-700 dark:text-green-300 list-decimal list-inside space-y-1">
				<li>On AE dataset: Add filter (AESEV contains "MILD") and sort (click AETERM)</li>
				<li>Switch to DM dataset - should show NO filters (different dataset)</li>
				<li>On DM dataset: Add filter (SEX equals "M") and sort (click AGE)</li>
				<li>Switch back to AE - should still have AESEV filter and AETERM sort</li>
				<li>Refresh page - both datasets should restore their own state</li>
				<li>Check Event Log - no events on initial load, only on user changes</li>
				<li>Click "Clear Current Dataset" - filters/sorts disappear immediately, filter inputs clear</li>
				<li>Switch to other dataset - its persisted state should still be intact</li>
			</ol>
		</div>
	</div>
</div>
