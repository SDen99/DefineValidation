<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import { createNavigationHandlers } from '$lib/utils/metadata/navigationHelpers';

	// Get reactive data from parent layout
	const getDefineData = getContext<() => any>('defineData');
	const activeData = $derived(getDefineData?.() ?? { defineData: null });

	// Navigation helpers
	const { navigateToVariable } = createNavigationHandlers($page.url.pathname);

	// Find the valuelist
	const valuelist = $derived(
		activeData.defineData.ValueListDefs?.find((vl) => vl.OID === $page.params.oid)
	);

	// Find variables that use this valuelist with their dataset context
	const usedByVariables = $derived.by(() => {
		const variables = activeData.defineData.ItemDefs?.filter((item) => item.ValueListOID === $page.params.oid) || [];

		// For each variable, find which datasets use it
		return variables.flatMap((variable) => {
			const datasetsUsingVariable = activeData.defineData.ItemGroups?.filter((ig) =>
				ig.ItemRefs?.some((ref) => ref.OID === variable.OID)
			) || [];

			// Return one entry per dataset that uses this variable
			return datasetsUsingVariable.map((dataset) => ({
				variable,
				dataset,
				displayName: `${variable.Name} in ${dataset.Name || dataset.OID}`
			}));
		});
	});

	// Get ItemDef details for each ItemRef in the ValueList
	const valueListItems = $derived.by(() => {
		if (!valuelist?.ItemRefs) return [];

		return valuelist.ItemRefs.map((ref) => {
			const itemDef = activeData.defineData.ItemDefs?.find((item) => item.OID === ref.OID);
			return {
				ref,
				itemDef
			};
		});
	});
</script>

{#if valuelist}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>ValueList</span>
				<span>›</span>
				<span>{valuelist.OID}</span>
			</div>
			<h1 class="mb-2 text-3xl font-bold">{valuelist.OID}</h1>
			{#if valuelist.Description}
				<div class="text-sm text-muted-foreground">
					{valuelist.Description}
				</div>
			{/if}
		</div>

		<!-- Value-Level Items -->
		<div class="mb-6 rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">
					Value-Level Items ({valueListItems.length})
				</h2>
			</div>
			<div class="p-4">
				{#if valueListItems.length > 0}
					<div class="space-y-2">
						{#each valueListItems as { ref, itemDef }}
							<div class="rounded-md border p-3">
								<div class="mb-2 flex items-center justify-between">
									<div class="font-medium">
										{itemDef?.Name || ref.OID || 'Unknown'}
									</div>
									<div class="text-xs text-muted-foreground">
										{itemDef?.DataType || 'N/A'}
									</div>
								</div>
								{#if itemDef?.Label}
									<div class="text-sm text-muted-foreground">
										{itemDef.Label}
									</div>
								{/if}
								{#if ref.WhereClauseOID}
									<div class="mt-2 text-xs text-muted-foreground">
										Where Clause: {ref.WhereClauseOID}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No value-level items defined.</p>
				{/if}
			</div>
		</div>

		<!-- Used By (Variables) -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Used By ({usedByVariables.length} occurrences)</h2>
			</div>
			<div class="p-4">
				{#if usedByVariables.length > 0}
					<div class="space-y-1">
						{#each usedByVariables as { variable, dataset, displayName }}
							<button
								onclick={() => variable.OID && navigateToVariable(variable.OID)}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium">{displayName}</div>
									</div>
									<div class="flex-shrink-0">
										<span class="text-xs text-muted-foreground">
											{variable.DataType}
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						This valuelist is not currently used by any variables.
					</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">ValueList Not Found</h1>
		<p class="text-muted-foreground">
			The valuelist with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
