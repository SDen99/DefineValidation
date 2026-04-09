<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Table, ShieldCheck, ChevronDown } from '@lucide/svelte/icons';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/core/dropdown-menu';

	const views = [
		{ label: 'Datasets', href: '/datasets', icon: Table },
		{ label: 'Checks', href: '/rules', icon: ShieldCheck }
	] as const;

	const currentView = $derived(
		views.find((v) => $page.url.pathname.startsWith(v.href)) ?? views[0]
	);

	function navigateTo(href: string) {
		goto(href);
	}
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
		{#each views as view (view.href)}
			<DropdownMenuItem class={currentView.href === view.href ? 'bg-accent' : ''}>
				<button onclick={() => navigateTo(view.href)} class="flex w-full items-center gap-2">
					<view.icon class="h-4 w-4" />
					{view.label}
				</button>
			</DropdownMenuItem>
		{/each}
	</DropdownMenuContent>
</DropdownMenu>
