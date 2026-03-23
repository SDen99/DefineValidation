<script lang="ts">
	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import DataXmlList from '$lib/components/data/DataXmlList.svelte';
	import MetadataExplorer from '$lib/components/metadata/MetadataExplorer.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sden99/ui-components';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { FileUploadController } from '$lib/core/controllers/FileUploadController.svelte.ts';
	import { validationService } from '$lib/services/validationService.svelte';
	import EnhancedVariableList from '$lib/components/data/EnhancedVariableList.svelte';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { setContext } from 'svelte';
	import { page } from '$app/stores';

	let { children, data } = $props();

	// Tab state for left sidebar
	let activeTab = $state('datasets');

	// Check if Define-XML data is available for metadata tab visibility
	const hasDefineData = $derived.by(() => {
		const datasets = dataState.getDatasets();
		return Object.values(datasets).some((ds: any) => {
			return ds.fileName?.endsWith('.xml') && (ds.ADaM === true || ds.SDTM === true);
		});
	});

	// Initialize file upload controller
	let uploadController = $state<FileUploadController | null>(null);

	if (browser) {
		uploadController = new FileUploadController(data?.initialData?.container || null, {
			onDatasetReady: () => validationService.revalidate()
		});
	}

	let isLoading = $derived(uploadController?.isLoading ?? false);

	// Shared reference to the ClinicalVirtualTable for sidebar integration
	let clinicalTableRef = $state<any>(null);

	// Provide the ref via context so child pages can bind to it
	setContext('clinicalTableRef', {
		get ref() { return clinicalTableRef; },
		set ref(value: any) { clinicalTableRef = value; }
	});

	// Derived state to check if we're on a dataset detail page
	const isOnDatasetDetailPage = $derived($page.route.id === '/datasets/[id]');

	// Auto-close right sidebar when not on a dataset detail page
	$effect(() => {
		if (!isOnDatasetDetailPage && appState.rightSidebarOpen.value) {
			appState.rightSidebarOpen.value = false;
		}
	});

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

	// Auto-persist state when data changes
	$effect(() => {
		if (uploadController) {
			uploadController.triggerStatePersistence();
		}
	});

	// Auto-switch back to datasets tab when Define-XML is deleted
	$effect(() => {
		if (!hasDefineData && activeTab === 'metadata') {
			console.log('[DatasetsLayout] No Define-XML data - switching to datasets tab');
			activeTab = 'datasets';
		}
	});

	// Handle dataset selection from metadata tree
	function handleDatasetSelect(datasetInfo: { name: string; oid: string }) {
		console.log('[DatasetsLayout] Dataset selected from tree:', datasetInfo);

		// Check if this dataset exists with actual data
		const datasets = dataState.getDatasets();
		const normalizedName = datasetInfo.name.toLowerCase();

		const datasetExists = Object.keys(datasets).some(key => {
			const normalizedKey = key.toLowerCase();
			return normalizedKey === normalizedName ||
				   normalizedKey.includes(normalizedName) ||
				   datasets[key]?.fileName?.toLowerCase() === normalizedName;
		});

		if (datasetExists) {
			// Dataset has actual data - select it in current view
			console.log('[DatasetsLayout] Dataset found with data - selecting it');
			dataState.selectDataset(datasetInfo.name);
		} else {
			// Dataset is only in Define-XML metadata - navigate to metadata detail page
			console.log('[DatasetsLayout] Dataset only has metadata - navigating to metadata page');
			goto(`/metadata/datasets/${datasetInfo.oid}`);
		}
	}

	function handleMetadataSelect(type: string, oid: string) {
		console.log('[DatasetsLayout] Metadata item selected from tree:', { type, oid });
		goto(`/metadata/${type}/${oid}`);
	}
</script>

<!-- Hidden file input for splash screen -->
<input
	id="splash-upload"
	type="file"
	multiple
	accept=".sas7bdat,.xpt,.xml,.yaml,.yml"
	onchange={handleFileChangeEvent}
	class="hidden"
/>

{#if browser}
	{#snippet navigation()}
		<Navigation {handleFileChangeEvent} {isLoading} />
	{/snippet}

	{#snippet leftbar()}
		{#if hasDefineData}
			<Tabs bind:value={activeTab} class="flex h-full flex-col">
				<TabsList class="w-full flex-none justify-start rounded-none border-b bg-transparent px-2">
					<TabsTrigger
						value="datasets"
						class="rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-2 pt-2 font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
					>
						Datasets
					</TabsTrigger>
					<TabsTrigger
						value="metadata"
						class="rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-2 pt-2 font-medium text-muted-foreground shadow-none transition-none hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
					>
						Metadata
					</TabsTrigger>
				</TabsList>

				<TabsContent value="datasets" class="flex-1 min-h-0 overflow-auto">
					<DataXmlList />
				</TabsContent>

				<TabsContent value="metadata" class="flex-1 min-h-0 overflow-auto">
					<MetadataExplorer
						onDatasetSelect={handleDatasetSelect}
						onMetadataSelect={handleMetadataSelect}
						showDatasets={false}
					/>
				</TabsContent>
			</Tabs>
		{:else}
			<!-- No Define-XML: Show only datasets without tabs -->
			<DataXmlList />
		{/if}
	{/snippet}

	{#snippet mainContent()}
		<div class="h-full">
			{@render children()}
		</div>
	{/snippet}

	{#snippet rightbar()}
		<div class="h-full">
			{#if dataState.selectedDatasetId.value}
				<!-- Enhanced Variables with column management and drag-drop -->
				<div class="p-4">
					<EnhancedVariableList bind:clinicalTableRef />
				</div>
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
