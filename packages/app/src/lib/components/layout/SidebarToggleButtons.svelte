<script lang="ts">
	import { Button } from '@sden99/ui-components';
	import {
		PanelLeftClose,
		PanelRightClose,
		PanelLeftOpen,
		PanelRightOpen
	} from '@lucide/svelte/icons';
	// NEW: Import directly from the appState module.
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { page } from '$app/stores';

	// Reactive state derived directly from the source of truth.
	let leftOpen = $derived(appState.leftSidebarOpen.value);
	let rightShouldShow = $derived(appState.shouldShowRightSidebar());

	// Only show right sidebar toggle on dataset detail pages
	let isOnDatasetDetailPage = $derived($page.route.id === '/datasets/[id]');
</script>

<div class="fixed bottom-4 left-4 z-50 flex gap-2">
	<Button
		variant="default"
		size="icon"
		onclick={() => appState.toggleSidebar('left')}
		aria-label={leftOpen ? 'Hide left sidebar' : 'Show left sidebar'}
	>
		{#if leftOpen}
			<PanelLeftOpen class="h-4 w-4" />
		{:else}
			<PanelLeftClose class="h-4 w-4" />
		{/if}
	</Button>

	{#if isOnDatasetDetailPage}
		<Button
			variant="default"
			size="icon"
			onclick={() => appState.toggleSidebar('right')}
			aria-label={rightShouldShow ? 'Hide right sidebar' : 'Show right sidebar'}
		>
			{#if rightShouldShow}
				<PanelRightOpen class="h-4 w-4" />
			{:else}
				<PanelRightClose class="h-4 w-4" />
			{/if}
		</Button>
	{/if}
</div>
