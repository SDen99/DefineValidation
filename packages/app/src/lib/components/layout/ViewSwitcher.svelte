<script lang="ts">
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import { Table, ShieldCheck, ChevronDown } from '@lucide/svelte/icons';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/core/dropdown-menu';

	const views = [
		{ label: 'Datasets', key: 'datasets' as const, icon: Table },
		{ label: 'Checks', key: 'rules' as const, icon: ShieldCheck }
	];

	const currentView = $derived(
		views.find((v) => v.key === appState.appView.value) ?? views[0]
	);
</script>

<DropdownMenu>
	<!-- @ts-ignore -->
	<DropdownMenuTrigger>
		<button
			class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
		>
			View
			<ChevronDown class="h-3.5 w-3.5" />
		</button>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="start">
		{#each views as view (view.key)}
			<DropdownMenuItem class={currentView.key === view.key ? 'bg-accent' : ''}>
				<button onclick={() => (appState.appView.value = view.key)} class="flex w-full items-center gap-2">
					<view.icon class="h-4 w-4" />
					{view.label}
				</button>
			</DropdownMenuItem>
		{/each}
	</DropdownMenuContent>
</DropdownMenu>
