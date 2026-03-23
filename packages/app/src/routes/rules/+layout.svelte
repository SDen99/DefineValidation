<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ViewSwitcher from '$lib/components/layout/ViewSwitcher.svelte';
	import StorageBadge from '$lib/components/layout/StorageBadge.svelte';
	import FileUpload from '$lib/components/data/shared/FileUpload.svelte';
	import { Badge } from '@sden99/ui-components';
	import { browser } from '$app/environment';
	import { FileImportManager } from '$lib/core/services/FileImportManager';
	import { validationService } from '$lib/services/validationService.svelte';
	import { ruleState } from '$lib/core/state/ruleState.svelte';
	import * as errorState from '$lib/core/state/errorState.svelte.ts';

	let { children, data } = $props();

	let fileManager = $state<FileImportManager | null>(null);

	if (browser && data?.initialData?.container) {
		fileManager = new FileImportManager(data.initialData.container, {
			onDatasetReady: () => validationService.revalidate()
		});
	}

	async function handleFileChangeEvent(event: Event) {
		if (!fileManager) {
			errorState.logWarning('File manager not available');
			return;
		}

		const files = (event.target as HTMLInputElement).files;
		if (!files?.length) return;

		const validFiles = Array.from(files).filter((file) => {
			const validation = fileManager!.validateFile(file);
			if (!validation.valid && validation.error) {
				errorState.logWarning(validation.error);
			}
			return validation.valid;
		});

		if (validFiles.length) {
			await Promise.allSettled(validFiles.map((file) => fileManager!.processFile(file)));
		}
	}

	let ruleCount = $derived(ruleState.count);
</script>

<div class="bg-background flex h-full flex-col">
	<!-- Navigation bar -->
	<header
		class="bg-muted/30 supports-[backdrop-filter]:bg-muted/30 dark:bg-background/95 dark:supports-[backdrop-filter]:bg-background/95 dark:border-border sticky top-0 z-50 w-full border-b backdrop-blur"
	>
		<div class="container flex h-14 max-w-none px-6">
			<div class="flex w-full items-center justify-between">
				<div class="flex items-center gap-4">
					<FileUpload {handleFileChangeEvent} accept=".yaml,.yml" />
				</div>

				<div class="absolute left-1/2 flex -translate-x-1/2 transform items-center gap-2">
					<h1 class="text-foreground text-xl font-semibold">Validation Rules</h1>
					{#if ruleCount > 0}
						<Badge variant="secondary">{ruleCount}</Badge>
					{/if}
				</div>

				<div class="text-foreground flex items-center gap-4">
					<StorageBadge />
					<ViewSwitcher />
					<ThemeToggle />
				</div>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<div class="flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
