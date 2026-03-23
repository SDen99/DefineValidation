<script lang="ts">
	import { ScrollArea } from '@sden99/ui-components';
	import { Button } from '@sden99/ui-components';
	import { PanelLeftOpen, PanelRightOpen } from '@lucide/svelte/icons';
	import type { Snippet } from 'svelte';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import ResizeHandle from './ResizeHandle.svelte';

	let { position, open, headerContent, sidebarContent, bgClass } = $props<{
		position: 'left' | 'right';
		open: boolean;
		headerContent: Snippet;
		sidebarContent: Snippet;
		bgClass?: string;
	}>();

	const Icon = $derived(position === 'left' ? PanelLeftOpen : PanelRightOpen);

	let currentWidth = $derived(appState.getSidebarWidth(position));

	function handleResize(delta: number) {
		const newWidth = currentWidth + delta;
		appState.updateSidebarWidth(position, newWidth);
	}
</script>

<div
	role="complementary"
	aria-label="{position} sidebar"
	class="relative overflow-hidden transition-[width] duration-300"
	style:width={open ? `${currentWidth}px` : '0'}
>
	<div class="absolute inset-0 {bgClass} flex flex-col">
		<div class="flex-shrink-0 p-4">
			<div class="flex items-center justify-between">
				{@render headerContent()}
				<Button variant="ghost" size="icon" onclick={() => appState.toggleSidebar(position)}>
					<Icon class="h-4 w-4" />
				</Button>
			</div>
		</div>
		<div class="flex-1 overflow-y-auto px-4 pb-4">
			{@render sidebarContent()}
		</div>
	</div>

	{#if open}
		<ResizeHandle {position} onResize={handleResize} />
	{/if}
</div>
