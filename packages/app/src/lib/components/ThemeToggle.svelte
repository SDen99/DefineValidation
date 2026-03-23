<script lang="ts">
	import { Moon, Sun, Monitor, Palette } from '@lucide/svelte/icons';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
		DropdownMenuLabel,
		DropdownMenuSub,
		DropdownMenuSubTrigger,
		DropdownMenuSubContent
	} from '$lib/components/core/dropdown-menu';
	import { Button } from '@sden99/ui-components';
	import * as appState from '$lib/core/state/appState.svelte.ts';

	let mode = $derived(appState.theme.value.mode);
	let colorAccent = $derived(appState.theme.value.colorAccent);
</script>

<DropdownMenu>
	<!-- @ts-ignore -->
	<DropdownMenuTrigger>
		<Button variant="outline" size="icon" class="h-9 w-9">
			{#if mode === 'light'}
				<Sun class="h-5 w-5" />
			{:else if mode === 'dark'}
				<Moon class="h-5 w-5" />
			{:else}
				<Monitor class="h-5 w-5" />
			{/if}
			<span class="sr-only">Toggle theme</span>
		</Button>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end">
		<DropdownMenuLabel>Theme Mode</DropdownMenuLabel>
		<DropdownMenuItem onclick={() => appState.setThemeMode('light')}>
			<Sun class="mr-2 h-4 w-4" />
			Light
		</DropdownMenuItem>
		<DropdownMenuItem onclick={() => appState.setThemeMode('dark')}>
			<Moon class="mr-2 h-4 w-4" />
			Dark
		</DropdownMenuItem>
		<DropdownMenuItem onclick={() => appState.setThemeMode('system')}>
			<Monitor class="mr-2 h-4 w-4" />
			System
		</DropdownMenuItem>

		<DropdownMenuSeparator />

		<DropdownMenuSub>
			<DropdownMenuSubTrigger>
				<Palette class="mr-2 h-4 w-4" />
				Accent Color
			</DropdownMenuSubTrigger>
			<DropdownMenuSubContent>
				<DropdownMenuItem onclick={() => appState.setColorAccent('default')}>
					<div class="mr-2 h-4 w-4 rounded-full border {colorAccent === 'default' ? 'bg-primary' : 'bg-muted'}"></div>
					Default
				</DropdownMenuItem>
				<DropdownMenuItem onclick={() => appState.setColorAccent('blue')}>
					<div class="mr-2 h-4 w-4 rounded-full border {colorAccent === 'blue' ? 'ring-2 ring-offset-2' : ''} bg-blue-500"></div>
					Blue
				</DropdownMenuItem>
				<DropdownMenuItem onclick={() => appState.setColorAccent('green')}>
					<div class="mr-2 h-4 w-4 rounded-full border {colorAccent === 'green' ? 'ring-2 ring-offset-2' : ''} bg-green-500"></div>
					Green
				</DropdownMenuItem>
				<DropdownMenuItem onclick={() => appState.setColorAccent('red')}>
					<div class="mr-2 h-4 w-4 rounded-full border {colorAccent === 'red' ? 'ring-2 ring-offset-2' : ''} bg-red-500"></div>
					Red
				</DropdownMenuItem>
				<DropdownMenuItem onclick={() => appState.setColorAccent('purple')}>
					<div class="mr-2 h-4 w-4 rounded-full border {colorAccent === 'purple' ? 'ring-2 ring-offset-2' : ''} bg-purple-500"></div>
					Purple
				</DropdownMenuItem>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	</DropdownMenuContent>
</DropdownMenu>
