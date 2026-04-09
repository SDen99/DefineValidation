<script lang="ts">
	import { browser } from '$app/environment';

	// SVELTE COMPONENT IMPORTS
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DataXmlList from '$lib/components/data/DataXmlList.svelte';
	import DatasetViewTabs from '$lib/components/data/DatasetViewTabs.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sden99/ui-components';
	import EnhancedVariableList from '$lib/components/data/EnhancedVariableList.svelte';

	// Rules view components
	import RulesPage from '$lib/components/rules/RulesPage.svelte';

	// CONTROLLERS & STATE
	import { FileUploadController } from '$lib/core/controllers/FileUploadController.svelte.ts';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';

	import { validationService } from '$lib/services/validationService.svelte';

	let { data } = $props();
	let uploadController = $state<FileUploadController | null>(null);

	// Shared reference to the ClinicalVirtualTable for sidebar integration
	let clinicalTableRef = $state<any>(null);

	// Initialize controller when browser and service container are available
	if (browser) {
		uploadController = new FileUploadController(data.initialData?.container || null, {
			onDatasetReady: () => validationService.revalidate()
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
			<div class="h-full">
				{#if dataState.selectedDatasetId.value}
					<Tabs value="variables" class="flex h-full flex-col">
						<TabsList class="flex-shrink-0">
							<TabsTrigger value="variables">Variables</TabsTrigger>
						</TabsList>
						<div class="flex-grow overflow-auto">
							<TabsContent value="variables">
								<div class="p-4">
									<EnhancedVariableList bind:clinicalTableRef />
								</div>
							</TabsContent>
						</div>
					</Tabs>
				{:else}
					<div class="p-4 text-center text-gray-500">
						<p>Select a dataset to view variables</p>
					</div>
				{/if}
			</div>
		{/snippet}

		{#snippet footer()}
			<Footer />
		{/snippet}

		<MainLayout {navigation} {leftbar} {mainContent} {rightbar} {footer} />
	{/if}
{/if}
