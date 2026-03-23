<!-- packages/app/src/lib/components/VLMView/VLMFilterControls.svelte -->
<script lang="ts">
	import {
		updateParamcdFilter,
		clearParamcdFilter,
		paramcdFilters
	} from '../../state/vlmUIState.svelte.ts';
	// UI components will be passed in via props

	let { 
		cleanDatasetName,
		allColumns,
		uiComponents = {}
	} = $props<{
		cleanDatasetName: string;
		allColumns: string[];
		uiComponents?: Record<string, any>;
	}>();

	// Extract UI components with defaults
	const Input = uiComponents.Input || 'input';
	const Button = uiComponents.Button || 'button';

	// Input-driven state - component owns the input value
	let paramcdFilter = $state('');
	
	// Initialize and sync with package state
	$effect(() => {
		paramcdFilter = paramcdFilters[cleanDatasetName] || '';
	});

	// Column visibility controls removed - focusing only on PARAMCD filtering

	// Handle PARAMCD filter change - update both local and package state
	function handleParamcdFilterChange(e: Event) {
		const target = e.target as HTMLInputElement;
		paramcdFilter = target.value; // Update local state immediately for responsiveness
		updateParamcdFilter(cleanDatasetName, target.value); // Update package state
	}

	// Column control functions removed - only PARAMCD filtering remains

	// Clear filter
	function handleClearFilter() {
		clearParamcdFilter(cleanDatasetName);
	}
</script>

<div class="space-y-4">
	<!-- PARAMCD Filter -->
	<div class="mb-4">
		<div class="flex items-center gap-2">
			<label for="paramcd-filter" class="text-foreground font-medium">Filter PARAMCD:</label>
			<Input
				id="paramcd-filter"
				type="text"
				placeholder="Enter PARAMCD..."
				value={paramcdFilter}
				oninput={handleParamcdFilterChange}
			/>
			{#if paramcdFilter.trim()}
				<Button variant="ghost" size="sm" onclick={handleClearFilter}>Clear</Button>
			{/if}
		</div>
	</div>

	<!-- Column visibility controls removed - cleaner, simpler interface -->
</div>
