<!-- Simplified +layout.svelte -->
<script lang="ts">
	import '../app.css';
	import ThemeProvider from '$lib/components/ThemeProvider.svelte';
	import PerformanceDashboard from '$lib/components/debug/PerformanceDashboard.svelte';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import * as errorState from '$lib/core/state/errorState.svelte.ts';
	import { browser, dev } from '$app/environment';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import { Button } from '@sden99/ui-components';
	import { FileImportManager } from '$lib/core/services/FileImportManager';
	import DataWorker from '$lib/core/services/data.worker?worker';
	import { initializeMetadataComponents } from '@sden99/metadata-components';
	import { metadataStateProvider } from '$lib/adapters/MetadataStateProviderAdapter';
	import { validationService } from '$lib/services/validationService.svelte';
	import { ruleState } from '$lib/core/state/ruleState.svelte';

	let { data, children } = $props();

	let fileManager = $state<FileImportManager | null>(null);
	let initialized = $state(false);
	let initializationFailed = $state(false);

	// Expose appState on window in dev mode for console toggling
	if (browser && dev) {
		(window as any).__appState = appState;
	}

	$effect(() => {
		if (!data?.initialData) {
			initializationFailed = true;
			return;
		}

		// Use untrack to prevent reactive loops during initialization
		untrack(() => initializeApp());

		return () => {
			console.log('🟡 Layout cleanup on unmount');
			dataState.cleanupWorker();
		};
	});

	async function initializeApp() {
		try {
			console.log('🟡 Starting app initialization...');

			// STEP 1: Create worker
			const worker = new DataWorker();
			dataState.initializeWorker(worker);
			console.log('✅ Worker initialized');

			// STEP 1.5: Initialize metadata components package
			console.log('🔄 Initializing metadata components with provider:', !!metadataStateProvider);
			initializeMetadataComponents(metadataStateProvider);
			console.log('✅ Metadata components initialized');

			// STEP 2: Create file manager
			fileManager = new FileImportManager(data.initialData.container, {
				onDatasetReady: () => validationService.revalidate()
			});
			console.log('✅ File manager created');

			// STEP 3: Load datasets
			const { existingDatasets, savedUiState } = data.initialData;
			if (Object.keys(existingDatasets).length > 0) {
				dataState.setDatasets(existingDatasets);
				console.log('✅ Datasets loaded:', Object.keys(existingDatasets));

				// Run validation immediately for all datasets with Define-XML matches
				validationService.revalidate();
			}

			// STEP 4: Restore UI state
			if (savedUiState?.uiPreferences) {
				appState.restoreAppState(savedUiState.uiPreferences);
				console.log('✅ UI state restored');
			}

			// STEP 4.5: Restore theme preferences
			if (savedUiState?.themePreferences) {
				appState.theme.value = { ...appState.theme.value, ...savedUiState.themePreferences };
				console.log('✅ Theme preferences restored:', savedUiState.themePreferences);
			}

			// STEP 4.7: Restore imported validation rules
			ruleState.loadFromStorage();

			// STEP 5: Restore last selected dataset immediately
			const restored = dataState.restoreLastSelection();
			if (restored) {
				console.log('✅ Restored last selected dataset');
			} else if (Object.keys(existingDatasets).length > 0) {
				const firstId = Object.keys(existingDatasets)[0];
				console.log(`✅ No saved selection, selecting first: ${firstId}`);
				dataState.selectDatasetWithWorker(firstId, null);
			}

			initialized = true;
			console.log('✅ App initialization complete');
		} catch (error) {
			console.error('🔴 Initialization failed:', error);
			initializationFailed = true;
			errorState.logError(error as Error, { context: 'App initialization' });
		}
	}

	// ✨ FIX: Simplified derived state to avoid loops
	let showWelcome = $derived(!initialized && !initializationFailed);
	let showError = $derived(initializationFailed);
	let showApp = $derived(initialized && !initializationFailed);

	async function handleFileChangeEvent(event: Event) {
		if (!fileManager) {
			errorState.logWarning('File manager not available');
			return;
		}

		const files = (event.target as HTMLInputElement).files;
		if (!files?.length) return;

		const validFiles = Array.from(files).filter((file) => {
			const validation = fileManager.validateFile(file);
			if (!validation.valid && validation.error) {
				errorState.logWarning(validation.error);
			}
			return validation.valid;
		});

		if (validFiles.length) {
			await Promise.allSettled(validFiles.map((file) => fileManager.processFile(file)));
		}
	}

	async function loadSampleFile() {
		if (!fileManager) {
			errorState.logWarning('File manager not available');
			return;
		}

		try {
			const response = await fetch('/defineV21-ADaM.xml');
			if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

			const blob = await response.blob();
			const file = new File([blob], 'defineV21-ADaM.xml', { type: 'application/xml' });
			const result = await fileManager.processFile(file);

			if (!result.success) {
				throw result.error || new Error('Processing failed');
			}
		} catch (error) {
			errorState.logError(error as Error, { context: 'Sample file load' });
		}
	}
</script>

<input
	id="splash-upload"
	type="file"
	multiple
	accept=".sas7bdat,.xpt,.xml,.yaml,.yml"
	onchange={handleFileChangeEvent}
	class="hidden"
/>

<ThemeProvider>
	{#if !browser}
		<!-- SSR fallback -->
		<div class="flex h-screen items-center justify-center">
			<div class="text-muted-foreground">Loading...</div>
		</div>
	{:else if showError}
		<!-- Error state -->
		<div
			class="bg-background flex h-screen w-full flex-col items-center justify-center text-center"
		>
			<h1 class="text-destructive mb-3 text-3xl font-bold tracking-tight">Initialization Error</h1>
			<p class="text-muted-foreground mb-10 max-w-md text-xl">
				The app failed to initialize. Please reload the page or check browser console.
			</p>
			<Button onclick={() => location.reload()}>Reload Page</Button>
		</div>
	{:else if showApp || $page.url.pathname.startsWith('/dev/')}
		<!-- Main app OR dev routes (don't block dev routes) -->
		{@render children()}

		<!-- Performance Dashboard (toggled via appState preference) -->
		{#if browser && appState.preferences.value.showPerformanceDashboard}
			<PerformanceDashboard />
		{/if}
	{:else if showWelcome}
		<!-- Welcome/Loading state -->
		<div class="bg-background flex h-screen w-full flex-col items-center justify-center">
			<div class="flex max-w-2xl flex-col items-center px-4 text-center">
				<div class="text-primary/80 mb-8">
					<div class="bg-primary/20 h-16 w-16 rounded-lg"></div>
				</div>
				<h1 class="mb-3 text-3xl font-bold tracking-tight">Define.xml & Data Viewer</h1>
				<p class="text-muted-foreground mb-10 max-w-md text-xl">
					{#if initialized}
						Get started by uploading your clinical datasets.
					{:else}
						Initializing application...
					{/if}
				</p>

				{#if initialized}
					<div class="flex flex-col gap-4 sm:flex-row">
						<Button onclick={() => document.getElementById('splash-upload')?.click()}>
							Upload Files
						</Button>
						<Button variant="outline" onclick={loadSampleFile}>Load Sample</Button>
					</div>
					<p class="text-muted-foreground mt-6 text-sm">Supports .sas7bdat and .xml files</p>
				{:else}
					<div class="flex items-center gap-2">
						<div
							class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
						></div>
						Loading...
					</div>
				{/if}
			</div>
		</div>
	{/if}
</ThemeProvider>
