<script lang="ts">
	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import MetadataExplorer from '$lib/components/metadata/MetadataExplorer.svelte';
	import DataXmlList from '$lib/components/data/DataXmlList.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import EditHistorySidebarNew from '$lib/components/metadata/edit/EditHistorySidebarNew.svelte';
	import EditDrawer from '$lib/components/metadata/edit/EditDrawer.svelte';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sden99/ui-components';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { metadataEditState } from '$lib/core/state/metadata/editState.svelte';
	import { FileUploadController } from '$lib/core/controllers/FileUploadController.svelte.ts';
	import { validationService } from '$lib/services/validationService.svelte';

	let { children, data } = $props();

	// Tab state for left sidebar
	let activeTab = $state('datasets');

	// Check if Define-XML data is available
	const defineBundle = $derived(extractDefineDataForMetadata());
	const hasDefineData = $derived(
		!!(defineBundle.adamData?.defineData || defineBundle.sdtmData?.defineData)
	);

	// Redirect to dataset view if no Define-XML data is available
	$effect(() => {
		if (!hasDefineData) {
			console.log('[MetadataLayout] No Define-XML data available - redirecting to dataset view');
			goto('/');
		}
	});

	// Auto-close right sidebar when on metadata routes (sidebar not applicable for metadata)
	$effect(() => {
		if (appState.rightSidebarOpen.value) {
			appState.rightSidebarOpen.value = false;
		}
	});

	// Initialize file upload controller
	let uploadController = $state<FileUploadController | null>(null);

	if (browser) {
		uploadController = new FileUploadController(data?.initialData?.container || null, {
			onDatasetReady: () => validationService.revalidate()
		});
	}

	let isLoading = $derived(uploadController?.isLoading ?? false);

	async function handleFileChangeEvent(event: Event) {
		if (!uploadController) return;
		await uploadController.onFileInputChange(event);
	}

	// Handle dataset selection from tree
	function handleDatasetSelect(datasetInfo: { name: string; oid: string }) {
		console.log('[MetadataLayout] Dataset selected from tree:', datasetInfo);

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
			// Dataset has actual data - navigate back to main app and select it
			console.log('[MetadataLayout] Dataset found with data - navigating to main app');
			dataState.selectDataset(datasetInfo.name);
			goto('/');
		} else {
			// Dataset is only in Define-XML metadata - stay on detail page
			console.log('[MetadataLayout] Dataset only has metadata - navigating to detail page');
			handleMetadataSelect('datasets', datasetInfo.oid);
		}
	}

	function handleMetadataSelect(type: string, oid: string) {
		console.log('[MetadataLayout] Metadata item selected from tree:', { type, oid });
		goto(`/metadata/${type}/${oid}`);
	}

</script>

{#snippet navigation()}
	<Navigation {handleFileChangeEvent} {isLoading} />
{/snippet}

{#snippet leftbar()}
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
{/snippet}

{#snippet mainContent()}
	<div class="h-full overflow-auto">
		{#if hasDefineData}
			{@render children()}
		{:else}
			<div class="flex h-full items-center justify-center p-8 text-center">
				<div class="text-muted-foreground">
					<p class="text-lg">No Define-XML data available</p>
					<p class="mt-2 text-sm">Redirecting to dataset view...</p>
				</div>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet rightbar()}
	<div class="p-4 text-center text-gray-500">
		<p>Metadata details</p>
	</div>
{/snippet}

{#snippet footer()}
	<Footer />
{/snippet}

<MainLayout {navigation} {leftbar} {mainContent} {rightbar} {footer} />

<!-- Edit History Sidebar (only show when edit mode is active) -->
{#if metadataEditState.editMode}
	<EditHistorySidebarNew />
{/if}

<!-- Edit Drawer (bottom drawer for inline editing) -->
<EditDrawer />
