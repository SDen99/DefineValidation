<script lang="ts">
	import { page } from '$app/stores';
	import { getContext } from 'svelte';
	import { createNavigationHandlers } from '$lib/utils/metadata/navigationHelpers';

	// Get reactive data from parent layout
	const getDefineData = getContext<() => any>('defineData');
	const activeData = $derived(getDefineData?.() ?? { defineData: null });

	// Navigation helpers
	const { navigateToVariable, navigateToDataset } = createNavigationHandlers($page.url.pathname);

	// Find the analysis result
	const analysisResult = $derived(
		activeData.defineData.AnalysisResults?.find((ar) => ar.ID === $page.params.id)
	);

	// Get parameter name from ParameterOID
	const parameter = $derived(
		analysisResult?.ParameterOID
			? activeData.defineData.ItemDefs?.find((item) => item.OID === analysisResult.ParameterOID)
			: null
	);

	// Parse variables (comma-separated OIDs)
	const variableOids = $derived(
		analysisResult?.Variables ? analysisResult.Variables.split(',').map((v) => v.trim()) : []
	);

	// Get ItemDef details for each variable
	const variables = $derived(
		variableOids
			.map((oid) => activeData.defineData.ItemDefs?.find((item) => item.OID === oid))
			.filter((v) => v != null)
	);

	// Get dataset details for AnalysisDatasets
	const dataReferences = $derived(
		analysisResult?.AnalysisDatasets?.map((ad) => {
			const dataset = activeData.defineData.ItemGroups?.find(
				(ig: any) => ig.OID === ad.ItemGroupOID
			);
			return {
				dataset,
				whereClauseOIDs: ad.WhereClauseOIDs,
				analysisVariables: ad.AnalysisVariables
			};
		}) || []
	);
</script>

{#if analysisResult}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
				<span>Analysis Result</span>
				<span>›</span>
				<span>{analysisResult.ID}</span>
			</div>
			<h1 class="mb-2 text-3xl font-bold">
				{analysisResult.Display || analysisResult.ID}
			</h1>
			{#if analysisResult.Description}
				<p class="text-lg text-muted-foreground">{analysisResult.Description}</p>
			{/if}
		</div>

		<!-- Analysis Properties -->
		<div class="mb-6 rounded-lg border bg-card p-6">
			<h2 class="mb-4 text-lg font-semibold">Properties</h2>
			<dl class="grid gap-4 sm:grid-cols-2">
				<div>
					<dt class="text-sm font-medium text-muted-foreground">Analysis ID</dt>
					<dd class="mt-1 text-sm">{analysisResult.ID}</dd>
				</div>
				{#if analysisResult.Display}
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Display Name</dt>
						<dd class="mt-1 text-sm">{analysisResult.Display}</dd>
					</div>
				{/if}
				{#if analysisResult.Purpose}
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Analysis Purpose</dt>
						<dd class="mt-1 text-sm">{analysisResult.Purpose}</dd>
					</div>
				{/if}
				{#if analysisResult.Reason}
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Analysis Reason</dt>
						<dd class="mt-1 text-sm">{analysisResult.Reason}</dd>
					</div>
				{/if}
			</dl>
		</div>

		<!-- Analysis Parameter(s) -->
		{#if parameter}
			<div class="mb-6 rounded-lg border bg-card p-4">
				<h2 class="mb-2 text-lg font-semibold">Analysis Parameter(s)</h2>
				<button
					onclick={() => parameter.OID && navigateToVariable(parameter.OID)}
					class="rounded border p-2 text-left transition-colors hover:bg-muted"
				>
					<div class="text-sm font-medium">{parameter.Name || parameter.OID}</div>
					{#if parameter.Description}
						<div class="text-xs text-muted-foreground">{parameter.Description}</div>
					{/if}
				</button>
			</div>
		{/if}

		<!-- Analysis Variables -->
		{#if variables.length > 0}
			<div class="mb-6 rounded-lg border bg-card">
				<div class="border-b p-4">
					<h2 class="text-lg font-semibold">Analysis Variable(s)</h2>
				</div>
				<div class="p-4">
					<div class="space-y-1">
						{#each variables as variable}
							<button
								onclick={() => variable.OID && navigateToVariable(variable.OID)}
								class="w-full rounded border p-2 text-left transition-colors hover:bg-muted"
							>
								<div class="flex items-center justify-between gap-4">
									<div class="flex-1">
										<div class="text-sm font-medium text-primary">
											{variable.Name || variable.OID}
										</div>
										{#if variable.Description}
											<div class="text-xs text-muted-foreground">{variable.Description}</div>
										{/if}
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
				</div>
			</div>
		{/if}

		<!-- Data References (incl. Selection Criteria) -->
		{#if dataReferences.length > 0}
			<div class="mb-6 rounded-lg border bg-card">
				<div class="border-b p-4">
					<h2 class="text-lg font-semibold">Data References (incl. Selection Criteria)</h2>
				</div>
				<div class="p-4">
					<div class="space-y-3">
						{#each dataReferences as ref}
							{#if ref.dataset}
								<div class="rounded border bg-muted/30 p-3">
									<button
										onclick={() => ref.dataset.OID && navigateToDataset(ref.dataset.OID)}
										class="mb-2 text-sm font-medium text-primary hover:underline"
									>
										{ref.dataset.Name || ref.dataset.OID}
									</button>
									{#if ref.whereClauseOIDs.length > 0}
										<div class="mt-1 text-xs text-muted-foreground">
											<span class="font-medium">Selection Criteria:</span>
											{ref.whereClauseOIDs.join(', ')}
										</div>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Documentation -->
		{#if analysisResult.Documentation}
			<div class="mb-6 rounded-lg border bg-card p-4">
				<h2 class="mb-2 text-lg font-semibold">Documentation</h2>
				<p class="whitespace-pre-wrap text-sm">{analysisResult.Documentation}</p>
				{#if analysisResult.DocumentationRefs}
					<div class="mt-2 text-xs text-muted-foreground">
						Document References: {analysisResult.DocumentationRefs}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Programming Statements -->
		{#if analysisResult.ProgrammingCode}
			<div class="mb-6 rounded-lg border bg-card p-4">
				<h2 class="mb-2 text-lg font-semibold">Programming Statements</h2>
				{#if analysisResult.ProgrammingContext}
					<div class="mb-2 text-xs text-muted-foreground">
						[{analysisResult.ProgrammingContext}]
					</div>
				{/if}
				<pre
					class="overflow-x-auto rounded bg-muted p-3 text-xs font-mono"><code>{analysisResult.ProgrammingCode}</code></pre>
			</div>
		{:else if analysisResult.ProgrammingContext || analysisResult.ProgrammingDocument}
			<div class="mb-6 rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-lg font-semibold">Programming Information</h2>
				<dl class="grid gap-4">
					{#if analysisResult.ProgrammingContext}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Context</dt>
							<dd class="mt-1 text-sm">{analysisResult.ProgrammingContext}</dd>
						</div>
					{/if}
					{#if analysisResult.ProgrammingDocument}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Program Document</dt>
							<dd class="mt-1 text-sm">{analysisResult.ProgrammingDocument}</dd>
						</div>
					{/if}
					{#if analysisResult.Pages}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Pages</dt>
							<dd class="mt-1 text-sm">{analysisResult.Pages}</dd>
						</div>
					{/if}
				</dl>
			</div>
		{/if}
	</div>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">Analysis Result Not Found</h1>
		<p class="text-muted-foreground">
			The analysis result with ID "{$page.params.id}" was not found in this Define-XML.
		</p>
	</div>
{/if}
