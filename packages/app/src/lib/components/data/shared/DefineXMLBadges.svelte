<script lang="ts">
	import { X } from '@lucide/svelte/icons';
	import ConfirmationDialog from '$lib/components/shared/ConfirmationDialog.svelte';
	import * as appState from '$lib/core/state/appState.svelte.ts';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import { validationService } from '$lib/services/validationService.svelte';

	// --- LOCAL COMPONENT STATE ---
	let dialogOpen = $state(false);
	let defineTypeToDelete = $state<'SDTM' | 'ADaM' | 'SEND' | null>(null);

	// --- REACTIVE DERIVED STATE ---
	let datasets = $derived(dataState.getDatasets());
	let hasSDTM = $derived(appState.getHasSDTM(datasets));
	let hasADaM = $derived(appState.getHasADaM(datasets));
	let hasSEND = $derived(appState.getHasSEND(datasets));

	// --- COMPUTED VALUES ---
	const dialogTitle = $derived('Delete Define.xml');
	const dialogMessage = $derived(
		defineTypeToDelete
			? `Are you sure you want to delete the ${defineTypeToDelete} Define.xml? This will remove all associated metadata from the application.`
			: ''
	);

	// --- HANDLER FUNCTIONS ---
	function handleDeleteClick(type: 'SDTM' | 'ADaM' | 'SEND') {
		defineTypeToDelete = type;
		dialogOpen = true;
	}

	async function handleConfirmDelete() {
		if (!defineTypeToDelete) return;

		try {
			await dataState.deleteDefineXML(defineTypeToDelete);
			validationService.revalidate();
		} catch (error) {
			console.error(`[DefineXMLBadges] Deletion failed for ${defineTypeToDelete}:`, error);
		} finally {
			defineTypeToDelete = null;
			dialogOpen = false;
		}
	}

	function handleCancelDelete() {
		defineTypeToDelete = null;
		dialogOpen = false;
	}
</script>

<div class="flex items-center gap-2">
	{#if hasSDTM}
		<span
			class="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
			title="SDTM Define.xml loaded"
		>
			SDTM
			<button
				type="button"
				class="ml-1 h-4 w-4 rounded-full p-0.5 hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none transition-colors"
				onclick={() => handleDeleteClick('SDTM')}
				aria-label="Delete SDTM Define.xml"
				title="Delete SDTM Define.xml"
			>
				<X class="h-3 w-3" />
			</button>
		</span>
	{/if}

	{#if hasADaM}
		<span
			class="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors bg-primary/80 text-primary-foreground hover:bg-primary/70"
			title="ADaM Define.xml loaded"
		>
			ADaM
			<button
				type="button"
				class="ml-1 h-4 w-4 rounded-full p-0.5 hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none transition-colors"
				onclick={() => handleDeleteClick('ADaM')}
				aria-label="Delete ADaM Define.xml"
				title="Delete ADaM Define.xml"
			>
				<X class="h-3 w-3" />
			</button>
		</span>
	{/if}

	{#if hasSEND}
		<span
			class="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors bg-primary/60 text-primary-foreground hover:bg-primary/50"
			title="SEND Define.xml loaded"
		>
			SEND
			<button
				type="button"
				class="ml-1 h-4 w-4 rounded-full p-0.5 hover:bg-primary-foreground/10 focus:bg-primary-foreground/10 focus:outline-none transition-colors"
				onclick={() => handleDeleteClick('SEND')}
				aria-label="Delete SEND Define.xml"
				title="Delete SEND Define.xml"
			>
				<X class="h-3 w-3" />
			</button>
		</span>
	{/if}
</div>

<ConfirmationDialog
	open={dialogOpen}
	title={dialogTitle}
	message={dialogMessage}
	confirmText="Delete"
	cancelText="Cancel"
	variant="destructive"
	onConfirm={handleConfirmDelete}
	onCancel={handleCancelDelete}
/>
