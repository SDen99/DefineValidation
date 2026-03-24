<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import ExpandableSection from '$lib/components/metadata/shared/ExpandableSection.svelte';
	import type { ItemDef } from '@sden99/cdisc-types/define-xml';
	import { Badge } from '@sden99/ui-components';
	import DatasetNavigationTabs from '$lib/components/navigation/DatasetNavigationTabs.svelte';
	import { findDatasetNameFromOID } from '$lib/utils/datasetOIDLookup';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import { graphXML } from '@sden99/data-processing';
	import { validationService } from '$lib/services/validationService.svelte';
	import type { ValidationResult } from '@sden99/validation-engine';

	// Extract Define-XML data
	const defineBundle = $derived(extractDefineDataForMetadata());

	// Ensure Define-XML is enhanced (needed for VLM data)
	// This happens automatically during dataset selection, but when navigating
	// directly to metadata pages, we need to trigger it manually
	$effect(() => {
		const datasets = dataState.getDatasets();

		// Enhance ADaM Define-XML if present
		const adamDefine = Object.entries(datasets).find(
			([_, ds]: [string, any]) => ds.fileName?.endsWith('.xml') && ds.ADaM === true
		);
		if (adamDefine) {
			const [_, dataset]: [string, any] = adamDefine;
			if (dataset.data && typeof dataset.data === 'object' && 'ItemGroups' in dataset.data) {
				if (!dataset.enhancedDefineXML) {
					try {
						dataset.enhancedDefineXML = graphXML.enhance(dataset.data);
						console.log('[MetadataPage] Enhanced ADaM Define-XML');
					} catch (error) {
						console.error('[MetadataPage] Failed to enhance ADaM Define-XML:', error);
					}
				}
			}
		}

		// Enhance SDTM Define-XML if present
		const sdtmDefine = Object.entries(datasets).find(
			([_, ds]: [string, any]) => ds.fileName?.endsWith('.xml') && ds.SDTM === true
		);
		if (sdtmDefine) {
			const [_, dataset]: [string, any] = sdtmDefine;
			if (dataset.data && typeof dataset.data === 'object' && 'ItemGroups' in dataset.data) {
				if (!dataset.enhancedDefineXML) {
					try {
						dataset.enhancedDefineXML = graphXML.enhance(dataset.data);
						console.log('[MetadataPage] Enhanced SDTM Define-XML');
					} catch (error) {
						console.error('[MetadataPage] Failed to enhance SDTM Define-XML:', error);
					}
				}
			}
		}
	});

	// Get params
	const itemType = $derived($page.params.type);
	const itemOid = $derived($page.params.oid);

	// For datasets, use the rich detail view
	const isDataset = $derived(itemType === 'datasets');

	// For navigation tabs: get dataset name from OID
	const datasetNameForNav = $derived.by(() => {
		if (isDataset && itemOid) {
			return findDatasetNameFromOID(itemOid) || itemOid;
		}
		return null;
	});

	// Find the item in combined metadata
	const item = $derived.by(() => {
		if (!defineBundle.combined) return null;

		const typeMap: Record<string, keyof typeof defineBundle.combined> = {
			datasets: 'ItemGroups',
			variables: 'ItemDefs',
			codelists: 'CodeLists',
			methods: 'Methods',
			comments: 'Comments',
			valuelists: 'ValueListDefs',
			whereclauses: 'WhereClauseDefs',
			standards: 'Standards',
			dictionaries: 'Dictionaries',
			documents: 'Documents',
			analysisresults: 'AnalysisResults'
		};

		const arrayKey = typeMap[itemType];
		if (!arrayKey) return null;

		const items = defineBundle.combined[arrayKey] || [];
		return items.find((i: any) => i.OID === itemOid || i.ID === itemOid);
	});

	// Navigation helpers
	function navigateToVariable(oid: string) {
		goto(`/metadata/variables/${oid}`);
	}

	// Convert data type to single letter abbreviation
	function getDataTypeAbbrev(dataType: string | undefined): string {
		if (!dataType) return '—';
		const type = dataType.toLowerCase();
		if (type.includes('text') || type.includes('char')) return 'T';
		if (type.includes('int')) return 'I';
		if (type.includes('float') || type.includes('decimal') || type.includes('num')) return 'F';
		if (type.includes('datetime')) return 'DT';
		if (type.includes('date')) return 'D';
		return dataType.charAt(0).toUpperCase();
	}

	// Dataset-specific logic
	const dataset = $derived(isDataset ? item : null);

	// Determine define type based on where the current dataset is actually found
	const defineType = $derived<'adam' | 'sdtm'>(
		isDataset && itemOid &&
		defineBundle.sdtmData?.defineData?.ItemGroups?.some((ig) => ig.OID === itemOid)
			? 'sdtm'
			: defineBundle.adamData
				? 'adam'
				: 'sdtm'
	);

	// Expansion state for inline metadata
	let expandedSections = $state<Set<string>>(new Set());

	function isExpanded(variableOid: string, section: 'method' | 'codelist' | 'comment'): boolean {
		return expandedSections.has(`${variableOid}-${section}`);
	}

	function toggleExpansion(variableOid: string, section: 'method' | 'codelist' | 'comment') {
		const key = `${variableOid}-${section}`;
		if (expandedSections.has(key)) {
			expandedSections.delete(key);
		} else {
			expandedSections.add(key);
		}
		expandedSections = new Set(expandedSections);
	}

	// Get variable details for datasets
	const variablesWithDetails = $derived.by(() => {
		if (!isDataset || !dataset?.OID) return [];
		if (!defineBundle.combined) return [];

		const itemRefs = dataset.ItemRefs || [];

		return itemRefs.map((ref: any) => {
			const variable = defineBundle.combined.ItemDefs?.find((v: any) => v.OID === ref.OID);
			const method = ref.MethodOID
				? defineBundle.combined.Methods?.find((m: any) => m.OID === ref.MethodOID)
				: null;
			const codelist = variable?.CodeListOID
				? defineBundle.combined.CodeLists?.find((cl: any) => cl.OID === variable.CodeListOID)
				: null;
			const comment = variable?.CommentOID
				? defineBundle.combined.Comments?.find((c: any) => c.OID === variable.CommentOID)
				: null;

			return {
				ref,
				variable,
				name: variable?.Name || ref.OID || '(unknown)',
				dataType: variable?.DataType || '',
				length: variable?.Length || '',
				method,
				codelist,
				comment,
				hasWhereClause: !!ref.WhereClauseOID
			};
		});
	});

	// Get validation results for this dataset
	const validationResults = $derived.by(() => {
		if (!isDataset || !datasetNameForNav) return [];
		// Try to find dataset ID by name
		const datasets = dataState.getDatasets();
		const matchingEntry = Object.entries(datasets).find(([id, ds]) => {
			const dsName = ds.fileName?.replace(/\.[^.]+$/, '').toUpperCase();
			return (
				dsName === datasetNameForNav.toUpperCase() ||
				id.toUpperCase() === datasetNameForNav.toUpperCase()
			);
		});
		if (!matchingEntry) return [];
		return validationService.getResultsForDataset(matchingEntry[0]);
	});

	const validationByColumn = $derived.by(() => {
		const map = new Map<string, ValidationResult[]>();
		for (const result of validationResults) {
			const existing = map.get(result.columnId) || [];
			existing.push(result);
			map.set(result.columnId, existing);
		}
		return map;
	});

	// Dropdown state for validation badges — use fixed positioning to escape overflow containers
	let openValidationDropdown = $state<string | null>(null);
	let dropdownPosition = $state<{ top: number; left: number }>({ top: 0, left: 0 });

	function toggleValidationDropdown(variableName: string, event: MouseEvent) {
		if (openValidationDropdown === variableName) {
			openValidationDropdown = null;
		} else {
			// Calculate position from the clicked badge button
			const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
			dropdownPosition = { top: rect.bottom + 4, left: rect.left };
			openValidationDropdown = variableName;
		}
	}

	function closeValidationDropdown() {
		openValidationDropdown = null;
	}

	// Navigate to dataset view and apply filter for a specific validation result
	function handleValidationCheckClick(result: ValidationResult) {
		closeValidationDropdown();

		if (!datasetNameForNav || result.affectedRows.length === 0) return;

		// Extract actual column values from the dataset using affectedRows indices.
		// invalidValues.keys() uses display strings like '(empty)' for null which
		// won't match the set filter's string conversion (null → '').
		const datasets = dataState.getDatasets();
		const matchingEntry = Object.entries(datasets).find(([id, ds]) => {
			const dsName = ds.fileName?.replace(/\.[^.]+$/, '').toUpperCase();
			return (
				dsName === datasetNameForNav.toUpperCase() ||
				id.toUpperCase() === datasetNameForNav.toUpperCase()
			);
		});

		let filterValues: unknown[];
		if (matchingEntry && Array.isArray(matchingEntry[1]?.data)) {
			const rows = matchingEntry[1].data as Record<string, unknown>[];
			const valueSet = new Set<unknown>();
			for (const rowIdx of result.affectedRows) {
				if (rowIdx < rows.length) {
					valueSet.add(rows[rowIdx][result.columnId]);
				}
			}
			filterValues = Array.from(valueSet);
		} else if (result.details?.invalidValues && result.details.invalidValues.size > 0) {
			filterValues = Array.from(result.details.invalidValues.keys());
		} else {
			return;
		}

		if (filterValues.length === 0) return;

		// Use the actual file ID (e.g. 'DM.json') for navigation, not the domain name ('DM').
		// The domain name resolves to the Define-XML file which has no tabular data.
		const datasetFileId = matchingEntry ? matchingEntry[0] : datasetNameForNav;

		console.log('[MetadataPage] Navigating to dataset with filter:', {
			column: result.columnId,
			checkType: result.details?.rule?.Rule_Type,
			filterValues,
			datasetFileId
		});

		// Navigate to dataset page with filter info as query params
		const params = new URLSearchParams();
		params.set('filterCol', result.columnId);
		params.set('filterValues', JSON.stringify(filterValues));
		goto(`/datasets/${datasetFileId}?${params.toString()}`);
	}

	// Close dropdown when clicking outside
	$effect(() => {
		if (!openValidationDropdown) return;
		function handleClickOutside() {
			openValidationDropdown = null;
		}
		// Delay to avoid closing immediately from the same click
		const timer = setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
		}, 0);
		return () => {
			clearTimeout(timer);
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function getHighestSeverity(results: ValidationResult[]): 'error' | 'warning' | 'info' {
		if (results.some((r) => r.severity === 'error')) return 'error';
		if (results.some((r) => r.severity === 'warning')) return 'warning';
		return 'info';
	}

	function getCheckTypeLabel(ruleType: string | undefined): string {
		switch (ruleType) {
			case 'Codelist Check':
				return 'Codelist';
			case 'Length Check':
				return 'Length';
			case 'Type Check':
				return 'Type';
			case 'Required Check':
				return 'Required';
			case 'Missing Variable':
				return 'Missing';
			case 'Undocumented Variable':
				return 'Undocumented';
			default:
				return ruleType || 'Check';
		}
	}

	const totalValidationIssues = $derived(
		validationResults.reduce((sum, r) => sum + r.issueCount, 0)
	);

	const undocumentedVariableCount = $derived(
		validationResults.filter((r) => r.details?.rule?.Rule_Type === 'Undocumented Variable').length
	);
</script>

{#if !item}
	<div class="mx-auto max-w-2xl p-8 text-center">
		<h1 class="mb-4 text-2xl font-bold">Item Not Found</h1>
		<p class="text-muted-foreground">
			Could not find {itemType} item with OID: <code class="bg-muted rounded px-1">{itemOid}</code>
		</p>
	</div>
{:else if isDataset && dataset}
	<!-- Dataset Detail View -->
	<div class="mx-auto h-full overflow-auto p-3" style="max-width: 1400px;">
		<!-- Header -->
		<div class="mb-3">
			<div class="mb-1">
				<div class="text-muted-foreground flex items-center gap-2 text-sm">
					<span>Dataset</span>
					<span>›</span>
					<span>{dataset.Name || dataset.OID}</span>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold">{dataset.Name || dataset.OID}</h1>
				<!-- Validation status indicator -->
				{#if totalValidationIssues > 0}
					<span
						class="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-700/10 ring-inset dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20"
					>
						{totalValidationIssues} validation {totalValidationIssues === 1 ? 'issue' : 'issues'}
					</span>
				{:else if validationResults.length === 0 && datasetNameForNav}
					<!-- No validation run yet or no Define-XML match -->
				{:else}
					<span
						class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-700/10 ring-inset dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/20"
					>
						No issues
					</span>
				{/if}
			</div>
			{#if dataset.Description}
				<p class="text-muted-foreground mt-1 text-sm">{dataset.Description}</p>
			{/if}
		</div>

		<!-- Dataset Navigation Tabs (routes between /datasets and /metadata) -->
		{#if datasetNameForNav}
			<div class="mb-2">
				<DatasetNavigationTabs datasetName={datasetNameForNav} currentView="metadata" />
			</div>
		{/if}

		<!-- Variables Section -->
		<div class="bg-card rounded-lg border">
			<div class="bg-muted/30 flex items-center gap-3 border-b px-3 py-2">
				<h2 class="text-sm font-semibold">
					Variables ({variablesWithDetails.length})
					{#if undocumentedVariableCount > 0}
						<span
							class="ml-2 text-xs font-normal text-muted-foreground"
							title="Undocumented variables exist in the dataset but are not defined in the Define-XML"
						>
							Undocumented ({undocumentedVariableCount})
						</span>
					{/if}
				</h2>
			</div>
			<div class="p-2">

				{#if variablesWithDetails.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-sm">
							<thead>
								<tr class="bg-muted/50 border-b">
									<th class="px-1.5 py-0.5 text-center text-xs font-medium">Key</th>
									<th class="px-1.5 py-0.5 text-left text-xs font-medium">Order</th>
									<th class="px-1.5 py-0.5 text-left text-xs font-medium">Metadata</th>
									<th class="px-1.5 py-0.5 text-left text-xs font-medium">Variable</th>
									<th class="px-1.5 py-0.5 text-left text-xs font-medium">Type</th>
									<th class="px-1.5 py-0.5 text-left text-xs font-medium">Length</th>
									<th class="px-1.5 py-0.5 text-center text-xs font-medium">Mandatory</th>
								</tr>
							</thead>
							<tbody>
								{#each variablesWithDetails as { ref, variable, name, dataType, length, method, codelist, comment, hasWhereClause }, index (ref.OID)}
									{@const variableOid = variable?.OID || ''}
									<tr
										class="hover:bg-muted/30 border-b transition-colors"
									>
										<!-- Key Sequence -->
										<td class="px-1.5 py-0.5 text-center">
											{#if ref.KeySequence}
												<span
													class="bg-primary/10 text-primary inline-flex rounded px-2 py-0.5 text-xs font-medium"
												>
													K{ref.KeySequence}
												</span>
											{:else}
												<span class="text-muted-foreground text-sm">—</span>
											{/if}
										</td>

										<!-- Order -->
										<td class="px-1.5 py-0.5">
											<span class="text-muted-foreground text-xs">
												{ref.OrderNumber || '—'}
											</span>
										</td>

										<!-- Metadata Badges -->
										<td class="px-1.5 py-0.5">
											<div class="flex gap-1">
												{#if hasWhereClause}
													<span
														class="inline-flex rounded bg-purple-500/10 px-1.5 py-0.5 text-xs font-medium text-purple-600"
														title="Has Where Clause"
													>
														Where
													</span>
												{/if}
												{#if codelist}
													<button
														onclick={() => toggleExpansion(variableOid, 'codelist')}
														class="inline-flex rounded px-1.5 py-0.5 text-xs font-medium transition-colors
															       {isExpanded(variableOid, 'codelist')
															? 'bg-blue-600 text-white'
															: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}"
														title="Click to toggle Codelist details"
													>
														CL
													</button>
												{/if}
												{#if method}
													<button
														onclick={() => toggleExpansion(variableOid, 'method')}
														class="inline-flex rounded px-1.5 py-0.5 text-xs font-medium transition-colors
															       {isExpanded(variableOid, 'method')
															? 'bg-green-600 text-white'
															: 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}"
														title="Click to toggle Method details"
													>
														M
													</button>
												{/if}
												{#if comment}
													<button
														onclick={() => toggleExpansion(variableOid, 'comment')}
														class="inline-flex rounded px-1.5 py-0.5 text-xs font-medium transition-colors
															       {isExpanded(variableOid, 'comment')
															? 'bg-amber-600 text-white'
															: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'}"
														title="Click to toggle Comment details"
													>
														C
													</button>
												{/if}
											</div>
										</td>

										<!-- Variable Name -->
										<td class="px-1.5 py-0.5">
											<div class="flex flex-wrap items-center gap-2">
												<button
													onclick={() => ref.OID && navigateToVariable(ref.OID)}
													class="text-primary text-xs font-medium hover:underline"
												>
													{name}
												</button>

												<!-- Validation Badge (click opens fixed dropdown) -->
												{#if (validationByColumn.get(name) || []).length > 0}
													{@const columnResults = validationByColumn.get(name) || []}
													{@const totalIssues = columnResults.reduce(
														(sum, r) => sum + r.issueCount,
														0
													)}
													{@const severity = getHighestSeverity(columnResults)}
													<button
														onclick={(e) => {
															e.stopPropagation();
															toggleValidationDropdown(name, e);
														}}
														class="inline-flex h-[10px] min-w-[14px] cursor-pointer items-center justify-center rounded-full px-[3px] text-[7px] font-semibold transition-opacity hover:opacity-80
																{severity === 'error' ? 'bg-red-500 text-white' : ''}
																{severity === 'warning' ? 'bg-amber-500 text-amber-950' : ''}
																{severity === 'info' ? 'bg-blue-500 text-white' : ''}"
														title="{totalIssues} validation {totalIssues === 1
															? 'issue'
															: 'issues'} — click for details"
													>
														{totalIssues}
													</button>
												{/if}
											</div>
										</td>

										<!-- Data Type -->
										<td class="px-1.5 py-0.5">
											<span
												class="text-muted-foreground font-mono text-xs"
												title={dataType || 'Unknown'}
											>
												{getDataTypeAbbrev(dataType)}
											</span>
										</td>

										<!-- Length -->
										<td class="px-1.5 py-0.5">
											<span class="text-muted-foreground text-xs">
												{length || '—'}
											</span>
										</td>

										<!-- Mandatory -->
										<td class="px-1.5 py-0.5 text-center">
											{#if ref.Mandatory === 'Yes'}
												<span
													class="bg-destructive/10 text-destructive inline-flex rounded px-2 py-0.5 text-xs font-medium"
												>
													Yes
												</span>
											{:else if ref.Mandatory === 'No'}
												<span
													class="bg-muted text-muted-foreground inline-flex rounded px-2 py-0.5 text-xs font-medium"
												>
													No
												</span>
											{:else}
												<span class="text-muted-foreground text-sm">—</span>
											{/if}
										</td>

									</tr>

									<!-- Expandable Metadata Sections -->
									{#if variable?.OID && (method || codelist || comment)}
										<tr>
											<td
												colspan="7"
												class="p-0"
											>
												<div class="bg-muted/20 border-t">
													{#if method}
														<ExpandableSection
															title="Method: {method.Name || method.OID}"
															expanded={isExpanded(variableOid, 'method')}
														>
															<div class="text-sm">
																<div class="mb-2">
																	<span class="font-medium">OID:</span>
																	<button
																		onclick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			method.OID && goto('/metadata/methods/' + method.OID);
																		}}
																		class="text-primary ml-2 hover:underline"
																	>
																		{method.OID}
																	</button>
																</div>
																{#if method.Type}
																	<div class="mb-2">
																		<span class="font-medium">Type:</span>
																		<span class="text-muted-foreground ml-2">{method.Type}</span>
																	</div>
																{/if}
																{#if method.Description}
																	<div>
																		<span class="font-medium">Description:</span>
																		<p class="text-muted-foreground mt-1 whitespace-pre-wrap">
																			{method.Description}
																		</p>
																	</div>
																{/if}
															</div>
														</ExpandableSection>
													{/if}

													{#if codelist}
														<ExpandableSection
															title="Codelist: {codelist.Name || codelist.OID}"
															expanded={isExpanded(variableOid, 'codelist')}
														>
															<div class="text-sm">
																<div class="mb-2">
																	<span class="font-medium">OID:</span>
																	<button
																		onclick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			codelist.OID && goto('/metadata/codelists/' + codelist.OID);
																		}}
																		class="text-primary ml-2 hover:underline"
																	>
																		{codelist.OID}
																	</button>
																</div>
																{#if codelist.DataType}
																	<div class="mb-2">
																		<span class="font-medium">Data Type:</span>
																		<span class="text-muted-foreground ml-2"
																			>{codelist.DataType}</span
																		>
																	</div>
																{/if}
																{#if (codelist.CodeListItems && codelist.CodeListItems.length > 0) || (codelist.EnumeratedItems && codelist.EnumeratedItems.length > 0)}
																	{@const allItems = [
																		...(codelist.CodeListItems || []),
																		...(codelist.EnumeratedItems || [])
																	]}
																	<div>
																		<span class="font-medium">Items ({allItems.length}):</span>
																		<ul class="text-muted-foreground mt-1 ml-4 list-disc">
																			{#each allItems.slice(0, 5) as item}
																				<li>
																					<span class="font-mono">{item.CodedValue}</span>
																					{#if item.Decode?.TranslatedText}
																						- {item.Decode.TranslatedText}
																					{/if}
																				</li>
																			{/each}
																			{#if allItems.length > 5}
																				<li class="text-xs italic">
																					... and {allItems.length - 5} more
																				</li>
																			{/if}
																		</ul>
																	</div>
																{/if}
															</div>
														</ExpandableSection>
													{/if}

													{#if comment}
														<ExpandableSection
															title="Comment"
															expanded={isExpanded(variableOid, 'comment')}
														>
															<div class="text-sm">
																<div class="mb-2">
																	<span class="font-medium">OID:</span>
																	<button
																		onclick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			comment.OID && goto('/metadata/comments/' + comment.OID);
																		}}
																		class="text-primary ml-2 hover:underline"
																	>
																		{comment.OID}
																	</button>
																</div>
																{#if comment.Description}
																	<div>
																		<span class="font-medium">Text:</span>
																		<p class="text-muted-foreground mt-1 whitespace-pre-wrap">
																			{comment.Description}
																		</p>
																	</div>
																{/if}
															</div>
														</ExpandableSection>
													{/if}
												</div>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="text-muted-foreground text-sm">No variables defined in this dataset.</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<!-- Generic detail view for non-dataset items -->
	<div class="mx-auto max-w-4xl p-8">
		<div class="mb-6">
			<h1 class="mb-2 text-2xl font-bold capitalize">{itemType}</h1>
			<p class="text-muted-foreground text-sm">OID: {itemOid}</p>
		</div>

		<div class="space-y-6">
			<section class="rounded-md border p-4">
				<h2 class="mb-4 text-lg font-semibold">Basic Information</h2>
				<div class="grid gap-4 md:grid-cols-2">
					{#each Object.entries(item) as [key, value]}
						{#if typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'}
							<div>
								<dt class="text-muted-foreground text-sm font-medium">{key}</dt>
								<dd class="mt-1 text-sm">{value}</dd>
							</div>
						{/if}
					{/each}
				</div>
			</section>

			<section class="rounded-md border p-4">
				<h2 class="mb-4 text-lg font-semibold">Raw Data (Development View)</h2>
				<details>
					<summary class="text-muted-foreground cursor-pointer text-sm">
						Click to view full object
					</summary>
					<pre class="bg-muted mt-4 overflow-x-auto rounded p-4 text-xs">{JSON.stringify(
							item,
							null,
							2
						)}</pre>
				</details>
			</section>
		</div>
	</div>
{/if}

<!-- Fixed-position validation dropdown portal (escapes overflow containers) -->
{#if openValidationDropdown}
	{@const dropdownResults = validationByColumn.get(openValidationDropdown) || []}
	{#if dropdownResults.length > 0}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-popover fixed z-[9999] min-w-[200px] rounded-md border p-1 shadow-lg"
			style="top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
			onclick={(e) => e.stopPropagation()}
		>
			<div
				class="text-muted-foreground mb-1 border-b px-2 py-1.5 text-[10px] font-semibold tracking-wider uppercase"
			>
				{openValidationDropdown} — Validation Issues
			</div>
			{#each dropdownResults as result}
				<button
					onclick={() => handleValidationCheckClick(result)}
					class="hover:bg-muted/50 flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors"
				>
					<span class="flex items-center gap-1.5">
						<span
							class="inline-block h-2 w-2 rounded-full
							{result.severity === 'error' ? 'bg-red-500' : ''}
							{result.severity === 'warning' ? 'bg-amber-500' : ''}
							{result.severity === 'info' ? 'bg-blue-500' : ''}"
						></span>
						<span>{getCheckTypeLabel(result.details?.rule?.Rule_Type)}</span>
					</span>
					<span class="font-semibold tabular-nums">{result.issueCount}</span>
				</button>
			{/each}
		</div>
	{/if}
{/if}
