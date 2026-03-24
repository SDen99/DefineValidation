<script lang="ts">
	import { Badge } from '@sden99/ui-components';
	import FileUpload from '$lib/components/data/shared/FileUpload.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ViewSwitcher from './ViewSwitcher.svelte';
	import StorageBadge from './StorageBadge.svelte';

	interface Props {
		handleFileChangeEvent: (event: Event) => void;
		isLoading: boolean;
		accept?: string;
	}

	let { handleFileChangeEvent, isLoading, accept }: Props = $props();
</script>

<header
	class="bg-muted/30 supports-[backdrop-filter]:bg-muted/30 dark:bg-background/95 dark:supports-[backdrop-filter]:bg-background/95 dark:border-border sticky top-0 z-50 w-full border-b backdrop-blur"
>
	<div class="container flex h-14 max-w-none px-6">
		<div class="flex w-full items-center justify-between">
			<div class="flex items-center gap-4">
				<FileUpload {handleFileChangeEvent} {accept} />
				{#if isLoading}
					<div class="text-muted-foreground flex items-center gap-2 text-sm">
						<div
							class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
						></div>
						<span>Processing files...</span>
					</div>
				{/if}
			</div>

			<!-- Left side with fixed positioning -->
			<div class="absolute left-1/2 flex -translate-x-1/2 transform items-center gap-2">
				<h1 class="text-foreground text-xl font-semibold">Data Viewer</h1>
				<Badge variant="outline" class="font-mono">v0.1</Badge>
			</div>

			<!-- Right side content -->
			<div class="text-foreground flex items-center gap-4">
				<StorageBadge />
				<ViewSwitcher />
				<ThemeToggle />
			</div>
		</div>
	</div>
</header>
