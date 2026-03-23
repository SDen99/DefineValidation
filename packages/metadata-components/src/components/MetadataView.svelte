<!-- MetadataView.svelte - Package component using reactive boundary pattern -->
<script lang="ts">
	// REACTIVE STATE IMPORTS - follows VLM pattern
	import * as metadataState from '../state/metadataReactiveState.svelte';
	import { Search, ChevronDown, ChevronRight } from '@lucide/svelte/icons';
	import { Input } from '@sden99/ui-components';
	import { Button } from '@sden99/ui-components';
	import MetadataTable from './MetadataTable.svelte';
	import {
		areAllSectionsExpanded,
		getAllExpansionKeys,
		getExpansionStates,
		hasCodelist
	} from '../utils/expansionUtils';
	import { untrack } from 'svelte';

	import type { MetadataStateProvider } from '../types';

	let { datasetName, stateProvider = null } = $props<{ 
		datasetName: string; 
		stateProvider?: MetadataStateProvider | null;
	}>();

	// ============================================
	// REACTIVE DERIVED STATE (following VLM pattern)
	// ============================================

	// Initialize metadata state when component mounts or dataset changes
	$effect(() => {
		if (datasetName) {
			untrack(() => metadataState.initializeMetadataView(datasetName));
		}
	});

	// Get search term reactively (Direct Values Pattern)
	let searchTerm = $derived(metadataState.getSearchTerm(datasetName));

	// Check if provider is available (for loading state)
	let providerInitialized = $derived(!!stateProvider || metadataState.isProviderInitialized());

	// Get filtered variables reactively - use direct provider or fallback to module state
	let filteredVariables = $derived.by(() => {
		if (!providerInitialized) return [];
		
		// Use direct provider if available, otherwise use module state
		const baseVars = stateProvider ? stateProvider.getActiveVariables() : metadataState.getActiveVariables();
		if (!baseVars || !Array.isArray(baseVars)) return [];
		if (!searchTerm) return baseVars;

		const searchLower = searchTerm.toLowerCase();
		return baseVars.filter(
			(v) =>
				v.variable.name.toLowerCase().includes(searchLower) ||
				v.variable.description?.toLowerCase().includes(searchLower)
		);
	});

	// Pre-compute expansion states for "dumb" components
	let expansionStates = $derived.by(() => {
		return getExpansionStates(filteredVariables, datasetName);
	});

	// Check if all expandable variables are fully expanded
	let allAreExpanded = $derived.by(() => {
		if (!filteredVariables || filteredVariables.length === 0) return false;
		const expandableVariables = filteredVariables.filter(
			(v) => v.method || hasCodelist(v) || v.comments?.length
		);
		if (expandableVariables.length === 0) return true;
		return expandableVariables.every((variable) => areAllSectionsExpanded(variable, datasetName));
	});

	// ============================================
	// EVENT HANDLERS (following VLM pattern - direct manipulation)
	// ============================================

	function toggleAll() {
		if (allAreExpanded) {
			untrack(() => metadataState.collapseAll(datasetName));
		} else {
			const expansionKeys = getAllExpansionKeys(filteredVariables, datasetName);
			untrack(() => metadataState.expandAll(datasetName, expansionKeys));
		}
	}

	function updateSearch(term: string) {
		untrack(() => metadataState.updateSearch(datasetName, term));
	}

	// ============================================
	// DEBUG EFFECT (simplified)
	// ============================================

	$effect(() => {
		console.log(`[MetadataComponents] State for ${datasetName}:`, {
			variablesCount: filteredVariables.length,
			searchTerm,
			providerInitialized,
			hasDirectProvider: !!stateProvider,
			moduleProviderInitialized: metadataState.isProviderInitialized()
		});
	});
</script>

<!-- Main MetadataView Layout -->
<div class="flex h-full flex-col">
	<!-- Controls section -->
	<div class="flex-none p-4">
		<div class="flex items-center gap-4">
			<!-- Search Input -->
			<div class="relative w-64">
				<Search class="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
				<Input
					type="text"
					placeholder="Search variables..."
					class="pl-8"
					value={searchTerm}
					oninput={(e: Event) => {
						const target = e.target as HTMLInputElement;
						updateSearch(target.value);
					}}
				/>
			</div>

			<!-- Expand/Collapse All Button -->
			{#if filteredVariables.length > 0}
				<Button variant="outline" size="sm" class="gap-2" onclick={toggleAll}>
					{#if allAreExpanded}
						<ChevronDown class="text-foreground h-4 w-4" />
						<span class="text-foreground">Collapse All</span>
					{:else}
						<ChevronRight class="text-foreground h-4 w-4" />
						<span class="text-foreground">Expand All</span>
					{/if}
				</Button>
			{/if}
		</div>
	</div>

	<!-- Main Content Area -->
	{#if !providerInitialized}
		<div
			class="text-muted-foreground flex h-[200px] flex-col items-center justify-center space-y-4"
		>
			<div class="flex items-center gap-2">
				<div
					class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
				></div>
				<span>Initializing metadata components...</span>
			</div>
		</div>
	{:else if filteredVariables.length > 0}
		<div class="flex-1 min-h-0">
			<MetadataTable {datasetName} {filteredVariables} {expansionStates} />
		</div>
	{:else}
		<div
			class="text-muted-foreground flex h-[200px] flex-col items-center justify-center space-y-4"
		>
			{#if searchTerm}
				<p>No variables found matching search criteria "{searchTerm}"</p>
			{:else}
				<div class="text-center">
					<p class="font-medium">No metadata variables available for this dataset.</p>
					<p class="mt-2 text-sm">This could happen if:</p>
					<ul class="mt-2 space-y-1 text-left text-xs">
						<li>• Define-XML files are still being processed</li>
						<li>• No Define-XML file was provided for this dataset</li>
						<li>• The dataset name doesn't match any ItemGroups in the Define-XML</li>
						<li>• The Define-XML doesn't contain Value-Level Metadata</li>
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</div>