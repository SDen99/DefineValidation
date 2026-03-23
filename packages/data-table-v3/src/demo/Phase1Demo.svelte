<script lang="ts">
	/**
	 * Phase 3 Demo - Test Event-Driven Filtering + Sorting + Virtual Scrolling
	 *
	 * Tests:
	 * - ✅ Filtering works (Phase 1)
	 * - ✅ Sorting works (Phase 2)
	 * - ✅ Virtual scrolling performance (Phase 3)
	 * - ✅ No infinite loops
	 * - ✅ Event-driven pattern (not effects)
	 * - ✅ dataState integration
	 */

	import { ClinicalDataTableV3 } from '../lib/index';
	import type { ClinicalDataState } from '../lib/ClinicalDataTableV3.svelte';

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

	// Performance metrics tracking
	let metricLog = $state<string[]>([]);

	function handleMetricStart(metric: string) {
		metricLog = [...metricLog, `[START] ${metric} at ${new Date().toLocaleTimeString()}`];
	}

	function handleMetricEnd(metric: string) {
		metricLog = [...metricLog, `[END] ${metric} at ${new Date().toLocaleTimeString()}`];
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
</script>

<div class="p-6 space-y-4 bg-white dark:bg-gray-900 min-h-screen">
	<div class="space-y-4">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
			Data Table V3 - Phase 3 Test
		</h1>

		<!-- Info Panel -->
		<div class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
			<h3 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">Testing Phase 3 (All Features):</h3>
			<ul class="text-sm text-blue-800 dark:text-blue-200 space-y-1">
				<li>✅ Phase 1: Event-driven filtering (no $effect for data processing)</li>
				<li>✅ Phase 2: Multi-column sorting</li>
				<li>✅ Phase 3: Virtual scrolling (renders only ~20-50 visible rows)</li>
				<li>✅ Smooth performance with 100K+ rows</li>
				<li>✅ No infinite loops or console spam</li>
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

			<div>
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Current Dataset:
				</label>
				<div class="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-900 dark:text-gray-100 font-mono text-sm">
					{currentDatasetId}
				</div>
			</div>
		</div>

		<!-- Data Table V3 Component -->
		<div class="border-2 border-purple-500 rounded-lg overflow-hidden" style="height: 600px;">
			<ClinicalDataTableV3
				dataState={mockDataState}
				datasetId={currentDatasetId}
				enableCdiscPriority={false}
				onMetricStart={handleMetricStart}
				onMetricEnd={handleMetricEnd}
			/>
		</div>

		<!-- Performance Log -->
		<div class="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
			<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">
				Performance Metrics Log
				<button
					onclick={() => (metricLog = [])}
					class="ml-2 text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
				>
					Clear
				</button>
			</h3>
			<div class="max-h-40 overflow-auto font-mono text-xs text-gray-700 dark:text-gray-300">
				{#if metricLog.length === 0}
					<div class="text-gray-500 dark:text-gray-400 italic">No metrics logged yet...</div>
				{:else}
					{#each metricLog as log}
						<div>{log}</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Success Criteria -->
		<div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
			<h3 class="font-semibold text-green-900 dark:text-green-100 mb-2">Phase 3 Success Criteria:</h3>
			<ul class="text-sm text-green-800 dark:text-green-200 space-y-1">
				<li>✅ Data loads from mock dataState</li>
				<li>✅ Filters work (all filter types: text, number, date, boolean)</li>
				<li>✅ Sorting works (click headers, multi-column support)</li>
				<li>✅ Virtual scrolling renders only visible rows (~20-50 rows max)</li>
				<li>✅ Smooth scrolling with 100,000 rows</li>
				<li>✅ Filtering + Sorting + Virtual scrolling work together seamlessly</li>
				<li>✅ NO infinite loops or console spam</li>
				<li>✅ Dataset switching works</li>
			</ul>
			<p class="text-sm text-green-700 dark:text-green-300 mt-3">
				<strong>If all criteria pass,</strong> Phase 3 is complete! Ready for Phase 4 (Persistence)!
			</p>
		</div>
	</div>
</div>
