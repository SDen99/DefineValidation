<script lang="ts">
	import type { Snippet } from 'svelte';
	import UnifiedSidebar from '$lib/components/layout/UnifiedSidebar.svelte';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import DefineXMLBadges from '$lib/components/data/shared/DefineXMLBadges.svelte';

	let { navigation, leftbar, mainContent, rightbar, footer } = $props<{
		navigation: Snippet;
		leftbar: Snippet;
		mainContent: Snippet;
		rightbar: Snippet;
		footer: Snippet;
	}>();
</script>

{#snippet leftSidebarHeader()}
	<div class="flex items-center justify-between">
		<h2 class="text-foreground mr-2 text-lg font-semibold">Define(s):</h2>
		<DefineXMLBadges />
	</div>
{/snippet}

{#snippet rightSidebarHeader()}
	<h2 class="text-foreground text-lg font-semibold">Variables</h2>
{/snippet}

<!--
  FIX:
  - Remove `max-h-screen` and `min-h-screen`.
  - Add `h-full` to make it fill the parent (body).
-->
<main class="bg-muted/10 dark:bg-background flex h-full flex-col">
	{@render navigation()}

	<!-- This div is now correct. `flex-1` will work properly inside a parent with `h-full`. -->
	<div class="flex flex-1 overflow-hidden">
		<UnifiedSidebar
			position="left"
			open={appState.leftSidebarOpen.value}
			width={appState.leftSidebarWidth.value}
			onToggle={() => appState.toggleSidebar('left')}
			onResize={(delta) => {
				const newWidth = appState.leftSidebarWidth.value + delta;
				appState.updateSidebarWidth('left', newWidth);
			}}
			headerContent={leftSidebarHeader}
			sidebarContent={leftbar}
			bgClass="bg-muted/30 dark:bg-card/95 dark:border-border"
		/>

		<div class="bg-background/90 dark:bg-background min-w-0 flex-1 overflow-hidden">
			{@render mainContent()}
		</div>

		<UnifiedSidebar
			position="right"
			open={appState.shouldShowRightSidebar()}
			width={appState.rightSidebarWidth.value}
			onToggle={() => appState.toggleSidebar('right')}
			onResize={(delta) => {
				const newWidth = appState.rightSidebarWidth.value + delta;
				appState.updateSidebarWidth('right', newWidth);
			}}
			headerContent={rightSidebarHeader}
			sidebarContent={rightbar}
			bgClass="bg-muted/30 dark:bg-card/95 dark:border-border"
		/>
	</div>

	{@render footer()}
</main>
