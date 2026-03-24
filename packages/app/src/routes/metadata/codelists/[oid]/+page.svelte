<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';

	// Extract Define-XML data
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Navigation helper
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	// Find the codelist in BOTH sources (search combined data)
	const codelist = $derived(
		defineBundle.combined?.CodeLists?.find((cl) => cl.OID === $page.params.oid)
	);

	// Determine which source the codelist came from
	const defineType = $derived.by((): 'adam' | 'sdtm' => {
		if (!codelist?.OID) return 'adam'; // Default to adam if not found

		// Check if it exists in ADaM
		const inAdam = defineBundle.adamData?.defineData.CodeLists?.some(
			(cl) => cl.OID === codelist.OID
		);

		// If found in ADaM, use 'adam', otherwise use 'sdtm'
		return inAdam ? 'adam' : 'sdtm';
	});

	// Get the active defineData based on which source contains the codelist
	const activeDefineData = $derived(
		defineType === 'adam'
			? defineBundle.adamData?.defineData
			: defineBundle.sdtmData?.defineData
	);

	// Find variables that use this codelist with their dataset context
	const usedByVariables = $derived.by(() => {
		if (!activeDefineData) return [];

		const variables = activeDefineData.ItemDefs?.filter((item) => {
			return item.CodeListOID === $page.params.oid;
		}) || [];

		// For each variable, find which datasets use it
		return variables.flatMap((variable) => {
			const datasetsUsingVariable = activeDefineData.ItemGroups?.filter((ig) => {
				return ig.ItemRefs?.some((ref) => ref.OID === variable.OID);
			}) || [];

			// Return one entry per dataset that uses this variable
			return datasetsUsingVariable.map((dataset) => ({
				variable,
				dataset,
				displayName: `${variable.Name} in ${dataset.Name || dataset.OID}`
			}));
		});
	});

	// Determine codelist type - EITHER CodeListItems OR EnumeratedItems (mutually exclusive)
	const isEnumerated = $derived((codelist?.EnumeratedItems?.length ?? 0) > 0);
	const codelistType = $derived(isEnumerated ? 'enumerated' : 'decoded');

	// Get the appropriate items array based on type
	const codelistItems = $derived(
		isEnumerated
			? (codelist?.EnumeratedItems || [])
			: (codelist?.CodeListItems || [])
	);
</script>

{#if codelist}
	<div class="mx-auto max-w-4xl p-6">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span>CodeList</span>
					<span>›</span>
					<span>{codelist.OID}</span>
				</div>
			</div>

			<!-- Name -->
			<div class="mb-2 flex items-center gap-3">
				<h1 class="text-3xl font-bold">{codelist.Name || codelist.OID}</h1>
			</div>

			<div class="flex gap-4 text-sm text-muted-foreground">
				<span>Type: {codelist.DataType || 'text'}</span>
				{#if codelist.SASFormatName}
					<span>SAS Format: {codelist.SASFormatName}</span>
				{/if}
				{#if codelist.StandardOID}
					<span>Standard: {codelist.StandardOID}</span>
				{/if}
			</div>
		</div>

		<!-- CodeList Items -->
		<div class="mb-6 rounded-lg border bg-card">
			<div class="border-b p-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">
					{isEnumerated ? 'Enumerated Values' : 'Coded Values'} ({codelistItems.length})
				</h2>
			</div>
			<div class="p-4">
				{#if codelistItems.length > 0}
					<!-- Read-only view -->
					<div class="space-y-2">
						{#each codelistItems as item}
							<div class="flex items-start gap-4 rounded-md border p-3">
								<div class="flex-shrink-0">
									<div class="rounded bg-primary/10 px-2 py-1 font-mono text-sm font-medium">
										{item.CodedValue}
										{#if item.ExtendedValue}
											<span class="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400" title="Extended value">Ext</span>
										{/if}
									</div>
								</div>
								<div class="flex-1">
									<div class="font-medium">
										{isEnumerated ? item.CodedValue : (item.Decode?.TranslatedText || item.CodedValue)}
									</div>
									{#if item.OrderNumber || item.Rank}
										<div class="text-xs text-muted-foreground">Order: {item.OrderNumber || item.Rank}</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						No coded values defined.
					</p>
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
						This codelist is not currently used by any variables.
					</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-2xl p-8 text-center">
		<h1 class="mb-4 text-2xl font-bold">CodeList Not Found</h1>
		<p class="text-muted-foreground">
			The codelist with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
