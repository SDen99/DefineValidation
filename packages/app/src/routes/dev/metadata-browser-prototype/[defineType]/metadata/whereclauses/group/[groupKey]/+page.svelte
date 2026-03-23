<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import { createNavigationHandlers } from '$lib/utils/metadata/navigationHelpers';
	import { metadataEditState as editState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import { mergeItemWithChanges } from '$lib/utils/metadata/useEditableItem.svelte';
	import type { WhereClauseDef } from '@sden99/cdisc-types/define-xml';

	// Get reactive data from parent layout
	const getDefineData = getContext<() => any>('defineData');
	const activeData = $derived(getDefineData?.() ?? { defineData: null });

	// Get defineType from URL
	const defineType = $derived(($page.params.defineType || 'adam') as DefineType);

	// Navigation helpers
	const { navigateToVariable, navigateToWhereClause } = createNavigationHandlers($page.url.pathname);

	// Decode the groupKey from the URL (e.g., "DS.DSDECOD")
	const groupKey = $derived(decodeURIComponent($page.params.groupKey));
	const [dataset, variable] = $derived(groupKey.split('.'));

	// Find all WhereClauses that match this group
	const groupedWhereClauses = $derived.by(() => {
		const allWhereClauses = activeData.defineData.WhereClauseDefs || [];
		return allWhereClauses.filter((wc: any) => {
			if (!wc.OID) return false;
			const parts = wc.OID.split('.');
			// Match pattern: WC.{dataset}.{variable}.*
			return parts.length >= 3 && parts[0] === 'WC' && parts[1] === dataset && parts[2] === variable;
		});
	});

	// Merge each WhereClause with its pending edits
	const editableWhereClauses = $derived.by(() => {
		return groupedWhereClauses.map(wc =>
			mergeItemWithChanges(wc, defineType, 'whereclauses', wc.OID)
		).filter((wc): wc is WhereClauseDef => wc !== null);
	});

	// Handler for RangeCheck changes
	function handleRangeCheckChange(
		wcOID: string,
		index: number,
		field: 'Comparator' | 'SoftHard' | 'ItemOID' | 'CheckValues',
		newValue: any
	) {
		const wc = groupedWhereClauses.find(w => w.OID === wcOID);
		if (!wc) return;

		const updatedRangeChecks = [...(wc.RangeChecks || [])];

		if (field === 'CheckValues') {
			// Parse comma-separated string to array
			const valuesArray = newValue.split(',').map((v: string) => v.trim()).filter(Boolean);
			updatedRangeChecks[index] = { ...updatedRangeChecks[index], CheckValues: valuesArray };
		} else {
			updatedRangeChecks[index] = { ...updatedRangeChecks[index], [field]: newValue };
		}

		editState.recordChange(
			defineType,
			'whereclauses',
			wcOID,
			'RangeChecks',
			updatedRangeChecks,
			wc.RangeChecks
		);
	}

	// Handler for WhereClause deletion
	function handleDeleteWhereClause(wc: WhereClauseDef) {
		editState.recordDeletion(defineType, 'whereclauses', wc.OID, wc);
	}

	// Helper to get ItemDef name from OID
	function getItemDefName(oid: string): string {
		const itemDef = activeData.defineData.ItemDefs?.find((item: any) => item.OID === oid);
		return itemDef?.Name || oid;
	}
</script>

<div class="mx-auto max-w-4xl">
	<!-- Header -->
	<div class="mb-6">
		<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
			<span>WhereClause Group</span>
			<span>›</span>
			<span>{variable}</span>
		</div>
		<h1 class="mb-2 text-3xl font-bold">{variable}</h1>
		<p class="text-lg text-muted-foreground">
			{groupedWhereClauses.length} WhereClause{groupedWhereClauses.length !== 1 ? 's' : ''} for variable {variable} in {dataset} dataset
		</p>
	</div>

	<!-- All WhereClauses in this group -->
	<div class="space-y-4">
		{#if editState.editMode}
			<!-- EDIT MODE -->
			{#each editableWhereClauses as whereclause}
				<div class="rounded-lg border bg-card">
					<!-- WhereClause Header -->
					<div class="border-b bg-muted/30 p-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">{whereclause.OID}</h2>
							<button
								onclick={() => handleDeleteWhereClause(whereclause)}
								class="rounded border border-destructive/50 bg-destructive/10 px-3 py-1 text-sm text-destructive hover:bg-destructive/20"
							>
								Delete
							</button>
						</div>
					</div>

					<!-- RangeChecks Table -->
					<div class="p-4">
						{#if whereclause.RangeChecks && whereclause.RangeChecks.length > 0}
							<div class="mb-3">
								<h3 class="mb-2 text-sm font-semibold text-muted-foreground">
									Range Checks ({whereclause.RangeChecks.length})
								</h3>
								<div class="overflow-x-auto">
									<table class="w-full border-collapse">
										<thead>
											<tr class="border-b bg-muted/30">
												<th class="p-2 text-left text-xs font-medium">Variable (ItemOID)</th>
												<th class="p-2 text-left text-xs font-medium">Comparator</th>
												<th class="p-2 text-left text-xs font-medium">Soft/Hard</th>
												<th class="p-2 text-left text-xs font-medium">Check Values</th>
											</tr>
										</thead>
										<tbody>
											{#each whereclause.RangeChecks as check, index}
												<tr class="border-b">
													<td class="p-2">
														<input
															type="text"
															value={check.ItemOID}
															oninput={(e) => handleRangeCheckChange(whereclause.OID, index, 'ItemOID', e.currentTarget.value)}
															class="w-full rounded border bg-background px-2 py-1 text-sm"
														/>
													</td>
													<td class="p-2">
														<select
															value={check.Comparator}
															onchange={(e) => handleRangeCheckChange(whereclause.OID, index, 'Comparator', e.currentTarget.value)}
															class="w-full rounded border bg-background px-2 py-1 text-sm"
														>
															<option value="EQ">EQ</option>
															<option value="NE">NE</option>
															<option value="LT">LT</option>
															<option value="LE">LE</option>
															<option value="GT">GT</option>
															<option value="GE">GE</option>
															<option value="IN">IN</option>
															<option value="NOTIN">NOTIN</option>
														</select>
													</td>
													<td class="p-2">
														<select
															value={check.SoftHard}
															onchange={(e) => handleRangeCheckChange(whereclause.OID, index, 'SoftHard', e.currentTarget.value)}
															class="w-full rounded border bg-background px-2 py-1 text-sm"
														>
															<option value="Soft">Soft</option>
															<option value="Hard">Hard</option>
														</select>
													</td>
													<td class="p-2">
														<input
															type="text"
															value={check.CheckValues.join(', ')}
															oninput={(e) => handleRangeCheckChange(whereclause.OID, index, 'CheckValues', e.currentTarget.value)}
															placeholder="Comma-separated values"
															class="w-full rounded border bg-background px-2 py-1 text-sm font-mono"
														/>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">No range checks defined.</p>
						{/if}

						<!-- Comment if present -->
						{#if whereclause.CommentOID}
							{@const comment = activeData.defineData.Comments?.find((c: any) => c.OID === whereclause.CommentOID)}
							{#if comment}
								<div class="mt-3 rounded border bg-muted/20 p-3">
									<h4 class="mb-1 text-sm font-semibold">Comment</h4>
									<p class="text-sm text-muted-foreground">{comment.Description}</p>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		{:else}
			<!-- READ-ONLY MODE -->
			{#each groupedWhereClauses as whereclause}
				<div class="rounded-lg border bg-card">
					<!-- WhereClause Header -->
					<div class="border-b bg-muted/30 p-4">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold">{whereclause.OID}</h2>
							<button
								onclick={() => navigateToWhereClause(whereclause.OID)}
								class="text-sm text-primary hover:underline"
							>
								View Details →
							</button>
						</div>
					</div>

					<!-- RangeChecks -->
					<div class="p-4">
						{#if whereclause.RangeChecks && whereclause.RangeChecks.length > 0}
							<div class="mb-3">
								<h3 class="mb-2 text-sm font-semibold text-muted-foreground">
									Range Checks ({whereclause.RangeChecks.length})
								</h3>
								<div class="space-y-2">
									{#each whereclause.RangeChecks as check}
										<div class="rounded-md border bg-background p-3">
											<div class="mb-2 flex items-center justify-between">
												<div class="font-medium text-sm">
													Variable: {getItemDefName(check.ItemOID)}
												</div>
												<div class="flex gap-2">
													<span class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
														{check.Comparator}
													</span>
													{#if check.SoftHard}
														<span class="rounded bg-secondary/10 px-2 py-0.5 text-xs font-medium">
															{check.SoftHard}
														</span>
													{/if}
												</div>
											</div>
											<div class="text-sm text-muted-foreground">
												<div class="mb-1">
													<span class="font-medium">Item OID:</span>
													<button
														onclick={() => navigateToVariable(check.ItemOID)}
														class="ml-1 text-primary hover:underline"
													>
														{check.ItemOID}
													</button>
												</div>
												{#if check.CheckValues && check.CheckValues.length > 0}
													<div>
														<span class="font-medium">Check Values:</span>
														<span class="ml-2 font-mono">{check.CheckValues.join(', ')}</span>
													</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">No range checks defined.</p>
						{/if}

						<!-- Comment if present -->
						{#if whereclause.CommentOID}
							{@const comment = activeData.defineData.Comments?.find((c: any) => c.OID === whereclause.CommentOID)}
							{#if comment}
								<div class="mt-3 rounded border bg-muted/20 p-3">
									<h4 class="mb-1 text-sm font-semibold">Comment</h4>
									<p class="text-sm text-muted-foreground">{comment.Description}</p>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	{#if groupedWhereClauses.length === 0}
		<div class="rounded-lg border bg-card p-8 text-center">
			<p class="text-muted-foreground">
				No WhereClauses found for variable "{variable}" in dataset "{dataset}".
			</p>
		</div>
	{/if}
</div>
