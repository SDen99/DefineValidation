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
	let isDragging = $state(false);
	let dragCounter = 0;
	let droppedFileCount = $state(0);
	let dropNotificationTimer: ReturnType<typeof setTimeout> | undefined;

	// Expose appState on window in dev mode for console toggling
	if (browser && dev) {
		(window as any).__appState = appState;
	}

	// Build identifier — visible in Domino console to confirm deployment
	if (browser) {
		console.warn('[DEPLOY] Build upload-diag — ' + new Date().toISOString());
		console.warn('[DEPLOY] URL:', window.location.href);

		// Detect long tasks blocking the main thread (>50ms)
		if ('PerformanceObserver' in window) {
			try {
				const obs = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						console.warn(`[PERF] Long task detected: ${entry.duration.toFixed(0)}ms (started at ${entry.startTime.toFixed(0)}ms)`);
					}
				});
				obs.observe({ type: 'longtask', buffered: true });
			} catch (_) { /* longtask not supported */ }
		}
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
			// STEP 1: Core services (worker + metadata + file manager)
			const worker = new DataWorker();
			dataState.initializeWorker(worker);
			initializeMetadataComponents(metadataStateProvider);
			fileManager = new FileImportManager(data.initialData.container, {
				onDatasetReady: () => setTimeout(() => validationService.revalidate(), 0)
			});

			// STEP 2: Load datasets + restore all saved state
			const { existingDatasets, savedUiState } = data.initialData;
			if (Object.keys(existingDatasets).length > 0) {
				dataState.setDatasets(existingDatasets);
			}
			if (savedUiState?.uiPreferences) {
				appState.restoreAppState(savedUiState.uiPreferences);
			}
			if (savedUiState?.themePreferences) {
				appState.theme.value = { ...appState.theme.value, ...savedUiState.themePreferences };
			}
			ruleState.loadFromStorage();

			// STEP 3: Restore dataset selection
			const restored = dataState.restoreLastSelection();
			if (!restored && Object.keys(existingDatasets).length > 0) {
				dataState.selectDatasetWithWorker(Object.keys(existingDatasets)[0], null);
			}

			// Mark interactive — UI renders now
			initialized = true;

			// STEP 4: Deferred — run validation after UI is painted
			if (Object.keys(existingDatasets).length > 0) {
				setTimeout(() => validationService.revalidate(), 0);
			}
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
			droppedFileCount = validFiles.length;
			clearTimeout(dropNotificationTimer);
			dropNotificationTimer = setTimeout(() => { droppedFileCount = 0; }, 3000);
			await Promise.allSettled(validFiles.map((file) => fileManager.processFile(file)));
		}
	}

	async function handleDroppedFiles(files: File[]) {
		if (!fileManager) {
			errorState.logWarning('File manager not available');
			return;
		}

		const validFiles = files.filter((file) => {
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

	function isFileDrag(e: DragEvent): boolean {
		return e.dataTransfer?.types.includes('Files') ?? false;
	}

	function handleDragEnter(e: DragEvent) {
		if (!isFileDrag(e)) return;
		e.preventDefault();
		dragCounter++;
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		if (!isFileDrag(e)) return;
		e.preventDefault();
		dragCounter--;
		if (dragCounter <= 0) {
			dragCounter = 0;
			isDragging = false;
		}
	}

	function handleDragOver(e: DragEvent) {
		if (!isFileDrag(e)) return;
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
	}

	function handleDrop(e: DragEvent) {
		if (!isFileDrag(e)) return;
		e.preventDefault();
		dragCounter = 0;
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files?.length) {
			droppedFileCount = files.length;
			clearTimeout(dropNotificationTimer);
			dropNotificationTimer = setTimeout(() => { droppedFileCount = 0; }, 3000);
			handleDroppedFiles(Array.from(files));
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative h-full"
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
{#if isDragging}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="rounded-xl border-2 border-dashed border-white/60 bg-white/10 px-12 py-10 text-center">
			<p class="text-2xl font-semibold text-white">Drop files here</p>
			<p class="mt-2 text-sm text-white/70">.sas7bdat, .xpt, .xml, .json, .yaml</p>
		</div>
	</div>
{/if}
{#if droppedFileCount > 0}
	<div class="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-200">
		<div class="bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg">
			<div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
			Processing {droppedFileCount} {droppedFileCount === 1 ? 'file' : 'files'}...
		</div>
	</div>
{/if}
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
</div>
