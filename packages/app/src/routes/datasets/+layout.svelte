<script lang="ts">
	import MainLayout from '$lib/components/layout/MainLayout.svelte';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import DataXmlList from '$lib/components/data/DataXmlList.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { browser } from '$app/environment';
	import { FileUploadController } from '$lib/core/controllers/FileUploadController.svelte.ts';
	import { validationService } from '$lib/services/validationService.svelte';
	import EnhancedVariableList from '$lib/components/data/EnhancedVariableList.svelte';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { setContext } from 'svelte';
	import { page } from '$app/stores';

	let { children, data } = $props();

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
		<DataXmlList />
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
