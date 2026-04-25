<script lang="ts">
	import { browser } from '$app/environment';

	// SVELTE COMPONENT IMPORTS
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DataXmlList from '$lib/components/data/DataXmlList.svelte';
	import DatasetViewTabs from '$lib/components/data/DatasetViewTabs.svelte';
	import EnhancedVariableList from '$lib/components/data/EnhancedVariableList.svelte';

	// Rules view components
	import RulesPage from '$lib/components/rules/RulesPage.svelte';

	// CONTROLLERS & STATE
	import { FileUploadController } from '$lib/core/controllers/FileUploadController.svelte.ts';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';

	import { validationService } from '$lib/services/validationService.svelte';
	import { cdiscEngineService, clearStashedFiles } from '$lib/services/cdiscEngineService.svelte';

	let { data } = $props();
	let uploadController = $state<FileUploadController | null>(null);

	// Shared reference to the ClinicalVirtualTable for sidebar integration
	let clinicalTableRef = $state<any>(null);

	let engineValidationTimer: ReturnType<typeof setTimeout> | undefined;
	let engineValidationInFlight = false;

	// Debug: expose validation service on window for console inspection
	if (browser) {
		(window as any).__validationService = validationService;
		(window as any).__engineService = cdiscEngineService;
	}

	async function runEngineValidation() {
		if (engineValidationInFlight) {
			console.warn('[+page] Engine validation already in-flight, skipping');
			return;
		}
		engineValidationInFlight = true;
		console.warn('[+page] Engine validation timer fired');
		try {
			const results = await cdiscEngineService.validate();
			if (results.size > 0) {
				validationService.addEngineResults(results);
				console.warn('[+page] Engine results merged. Check cache via: window.__validationService');
			}
		} catch (e) {
			console.warn('[+page] Engine validation failed (non-fatal):', e);
		} finally {
			clearStashedFiles();
			engineValidationInFlight = false;
		}
	}

	// Initialize controller when browser and service container are available
	if (browser) {
		uploadController = new FileUploadController(data.initialData?.container || null, {
			onDatasetReady: () => {
				setTimeout(() => validationService.revalidate(), 0);

				// Server-side engine validation (debounced — wait for batch to finish)
				console.warn('[+page] onDatasetReady: scheduling engine validation in 2s');
				clearTimeout(engineValidationTimer);
				engineValidationTimer = setTimeout(() => runEngineValidation(), 2000);
			}
		});
	}

	// Derived state for UI
	let isLoading = $derived(uploadController?.isLoading ?? false);

	// Auto-persist state when data changes
	$effect(() => {
		if (uploadController && (Object.keys(dataState.getDatasets()).length > 0 || isLoading)) {
			uploadController.triggerStatePersistence();
		}
	});

	// SIMPLIFIED EVENT HANDLERS
	async function handleFileChangeEvent(event: Event) {
		if (!uploadController) return;
		await uploadController.onFileInputChange(event);
	}

	async function loadSampleFile() {
		if (!uploadController) return;
		await uploadController.onLoadSampleFile();
	}

	// Sample file loading event listener
	$effect(() => {
		const handleLoadSample = () => {
			loadSampleFile();
		};
		document.addEventListener('load-sample', handleLoadSample);
		return () => {
			document.removeEventListener('load-sample', handleLoadSample);
		};
	});

	// Top-level view state
	let currentAppView = $derived(appState.appView.value);
</script>

<!-- FIX: Add the hidden file input that the splash screen's label will trigger -->
<input
	id="splash-upload"
	type="file"
	multiple
	accept=".sas7bdat,.xpt,.xml"
	onchange={handleFileChangeEvent}
	class="hidden"
/>

{#if browser}
	{#if currentAppView === 'rules'}
		<!-- Rules view — rendered inline (no URL navigation needed) -->
		<RulesPage {data} />
	{:else}
		{#snippet navigation()}
			<Navigation {handleFileChangeEvent} {isLoading} />
		{/snippet}

		{#snippet leftbar()}
			<DataXmlList />
		{/snippet}

		{#snippet mainContent()}
			<div class="h-full">
				{#if dataState.selectedDatasetId.value}
					<DatasetViewTabs bind:clinicalTableRef />
				{:else}
					<div class="text-muted-foreground flex h-full items-center justify-center">
						<p>Select a dataset to view</p>
					</div>
				{/if}
			</div>
		{/snippet}

		{#snippet rightbar()}
			{#if dataState.selectedDatasetId.value}
				<EnhancedVariableList bind:clinicalTableRef />
			{:else}
				<div class="text-center text-gray-500">
					<p>Select a dataset to view variables</p>
				</div>
			{/if}
		{/snippet}

		{#snippet footer()}
			<Footer />
		{/snippet}

		<MainLayout {navigation} {leftbar} {mainContent} {rightbar} {footer} />
	{/if}
{/if}
