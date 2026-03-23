<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { metadataEditState as editState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import EditableText from '$lib/components/metadata/edit/EditableText.svelte';
	import EditableTextArea from '$lib/components/metadata/edit/EditableTextArea.svelte';
	import ConfirmDeleteModal from '$lib/components/metadata/shared/ConfirmDeleteModal.svelte';
	import ExpandableSection from '$lib/components/metadata/shared/ExpandableSection.svelte';
	import VLMTablePrototype from '$lib/components/metadata/VLMTablePrototype.svelte';
	import type { ItemGroup } from '@sden99/cdisc-types/define-xml';
	import { transformVLMForEditing, formatRowLabel } from '$lib/utils/metadata/vlmTableTransform';

	// Tabs UI components
	import { Tabs, TabsContent, TabsList, TabsTrigger, Badge } from '@sden99/ui-components';

	// Import shared utilities
	import { mergeItemWithChanges, recordFieldChange, hasItemChanges } from '$lib/utils/metadata/useEditableItem.svelte';
	import { isItemDeleted, handleDeleteOrReinstate } from '$lib/utils/metadata/useDeleteModal.svelte';
	import { createNavigationHandlers } from '$lib/utils/metadata/navigationHelpers';

	// Get reactive data from parent layout
	const getDefineData = getContext<() => any>('defineData');
	const activeData = $derived(getDefineData?.() ?? { defineData: null });

	// Get define type from URL (type-cast to DefineType)
	const defineType = $derived(($page.params.defineType || 'adam') as DefineType);

	// Find the dataset
	const dataset = $derived(
		activeData.defineData.ItemGroups?.find((ig) => ig.OID === $page.params.oid)
	);

	// Use shared utility for editable state
	const editableDataset = $derived.by(() =>
		mergeItemWithChanges(dataset, defineType, 'datasets', dataset?.OID)
	);

	// Expansion state tracking: Set of keys like "USUBJID-method", "USUBJID-codelist", "USUBJID-comments"
	let expandedSections = $state<Set<string>>(new Set());

	// Helper to check if a section is expanded
	function isExpanded(variableOid: string, section: 'method' | 'codelist' | 'comment'): boolean {
		return expandedSections.has(`${variableOid}-${section}`);
	}

	// Helper to toggle expansion (called from both badges and section headers)
	function toggleExpansion(variableOid: string, section: 'method' | 'codelist' | 'comment') {
		const key = `${variableOid}-${section}`;
		if (expandedSections.has(key)) {
			expandedSections.delete(key);
		} else {
			expandedSections.add(key);
		}
		expandedSections = new Set(expandedSections); // Trigger reactivity
	}

	// Get variable details for ItemRefs with metadata lookup
	const variablesWithDetails = $derived.by(() => {
		if (!editableDataset?.ItemRefs) return [];

		return editableDataset.ItemRefs
			.map((ref) => {
				const variable = activeData.defineData.ItemDefs?.find((v) => v.OID === ref.OID);

				// Check variable edit status
				const variableChange = variable?.OID ? editState.getChange(defineType, 'variables', variable.OID) : null;
				const isVariableDeleted = variableChange?.type === 'DELETED';
				const isVariableModified = variableChange && !isVariableDeleted;
				const isVariableAdded = variableChange?.type === 'ADDED';

				// Lookup metadata objects
				const method = ref.MethodOID
					? activeData.defineData.Methods?.find((m) => m.OID === ref.MethodOID)
					: null;
				const codelist = variable?.CodeListOID
					? activeData.defineData.CodeLists?.find((cl) => cl.OID === variable.CodeListOID)
					: null;
				const comment = variable?.CommentOID
					? activeData.defineData.Comments?.find((c) => c.OID === variable.CommentOID)
					: null;

				// Check if associated items are deleted
				const isCodelistDeleted = codelist?.OID ? editState.getChange(defineType, 'codelists', codelist.OID)?.type === 'DELETED' : false;
				const isCommentDeleted = comment?.OID ? editState.getChange(defineType, 'comments', comment.OID)?.type === 'DELETED' : false;
				const isMethodDeleted = method?.OID ? editState.getChange(defineType, 'methods', method.OID)?.type === 'DELETED' : false;

				return {
					ref,
					variable,
					name: variable?.Name || ref.OID || '(unknown)',
					dataType: variable?.DataType || '',
					length: variable?.Length || '',
					// Metadata
					method,
					codelist,
					comment,
					hasWhereClause: !!ref.WhereClauseOID,
					// Status flags
					isVariableDeleted,
					isVariableModified,
					isVariableAdded,
					isCodelistDeleted,
					isCommentDeleted,
					isMethodDeleted
				};
			})
			.filter(({ isVariableDeleted }) => {
				// Exclude variables that are marked as deleted
				return !isVariableDeleted;
			});
	});

	// Use shared navigation helpers (reactive to URL changes)
	const navigationHandlers = $derived(createNavigationHandlers($page.url.pathname));
	const { navigateToVariable, navigateToCodeList, navigateToMethod, navigateToComment, navigateToWhereClause } = navigationHandlers;

	// Field change handler
	function handleFieldChange(fieldName: keyof ItemGroup, newValue: any) {
		recordFieldChange(dataset, defineType, 'datasets', fieldName, newValue);
	}

	// Delete modal state
	let showDeleteModal = $state(false);
	const isAlreadyDeleted = $derived(isItemDeleted(defineType, 'datasets', dataset?.OID));
	const deleteModalMode = $derived(isAlreadyDeleted ? 'reinstate' : 'delete');

	// Get impacted items for delete confirmation (for now, none - could add later)
	const impactedItemsForDelete = $derived.by(() => {
		// Could potentially show which analyses or reports reference this dataset
		return [];
	});

	// Delete action handlers
	function handleDeleteDataset() {
		showDeleteModal = true;
	}

	function confirmDeleteDataset() {
		handleDeleteOrReinstate(dataset, defineType, 'datasets', isAlreadyDeleted);
		showDeleteModal = false;
	}

	function cancelDeleteDataset() {
		showDeleteModal = false;
	}

	// Track the last synced tab to prevent infinite loops between activeTab and URL
	let lastSyncedTab = $state<'variables' | 'vlm'>(
		($page.url.searchParams.get('tab') === 'vlm' ? 'vlm' : 'variables')
	);

	// Tab state - read from URL search params for persistence across navigation
	let activeTab = $state<'variables' | 'vlm'>(lastSyncedTab);

	// Effect 1: Sync activeTab changes to URL (user clicks tab)
	$effect(() => {
		const currentTab = activeTab; // Track dependency

		// Only update URL if tab actually changed from last sync
		if (currentTab !== lastSyncedTab) {
			const url = new URL(window.location.href);

			if (currentTab === 'vlm') {
				url.searchParams.set('tab', 'vlm');
			} else {
				url.searchParams.delete('tab');
			}

			lastSyncedTab = currentTab;
			goto(url, { replaceState: true, noScroll: true, keepFocus: true });
		}
	});

	// Effect 2: Sync URL changes to activeTab (browser back/forward)
	$effect(() => {
		const urlTab = $page.url.searchParams.get('tab') === 'vlm' ? 'vlm' : 'variables';

		// Only update activeTab if URL changed from last sync
		if (urlTab !== lastSyncedTab) {
			activeTab = urlTab;
			lastSyncedTab = urlTab;
		}
	});

	// Transform VLM data for display
	const vlmTableData = $derived.by(() => {
		if (!dataset?.OID || !activeData.defineData) return null;
		const result = transformVLMForEditing(activeData.defineData, dataset.OID, defineType);

		// DEBUG: Expose to window for inspection
		if (typeof window !== 'undefined') {
			(window as any).$temp_vlmTableData = result;
		}

		return result;
	});

	// VLM availability check - dataset has VLM if any variable has a ValueListRef
	const hasVLM = $derived(!!vlmTableData && vlmTableData.rows.length > 0);
</script>

{#if dataset && editableDataset}
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<div class="mb-6">
			<div class="mb-2 flex items-center justify-between">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span>Dataset</span>
					<span>›</span>
					<span>{dataset.OID}</span>
					{#if hasItemChanges(defineType, 'datasets', dataset.OID)}
						<span class="rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">Modified</span>
					{/if}
				</div>

				<!-- Delete/Reinstate button (only in edit mode) -->
				{#if editState.editMode}
					{#if isAlreadyDeleted}
						<button
							onclick={handleDeleteDataset}
							class="flex items-center gap-2 rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-success-foreground transition-colors hover:bg-success/90"
							title="Reinstate this dataset"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							Reinstate Dataset
						</button>
					{:else}
						<button
							onclick={handleDeleteDataset}
							class="flex items-center gap-2 rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
							title="Delete this dataset"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
							Delete Dataset
						</button>
					{/if}
				{/if}
			</div>

		</div>

		<!-- Basic Information - Only shown in edit mode -->
	{#if editState.editMode}
		<div class="mb-6 rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="text-lg font-semibold">Basic Information</h2>
			</div>
			<div class="p-4">
				<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<!-- Name -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Name</dt>
						<dd class="mt-1">
							{#if editState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableDataset.Name || ''}
									onSave={(val) => handleFieldChange('Name', val)}
									placeholder="Dataset name"
								/>
							{:else}
								<span class="text-sm">{editableDataset.Name || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- SASDatasetName -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">SAS Dataset Name</dt>
						<dd class="mt-1">
							{#if editState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableDataset.SASDatasetName || ''}
									onSave={(val) => handleFieldChange('SASDatasetName', val)}
									placeholder="SAS dataset name (max 8 chars)"
								/>
							{:else}
								<span class="text-sm font-mono">{editableDataset.SASDatasetName || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- Class -->
					{#if editableDataset.Class || editState.editMode}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Class</dt>
							<dd class="mt-1">
								{#if editState.editMode && !isAlreadyDeleted}
									<EditableText
										value={editableDataset.Class || ''}
										onSave={(val) => handleFieldChange('Class', val)}
										placeholder="Dataset class"
									/>
								{:else}
									<span class="text-sm">{editableDataset.Class || '—'}</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- Purpose -->
					{#if editableDataset.Purpose || editState.editMode}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Purpose</dt>
							<dd class="mt-1">
								{#if editState.editMode && !isAlreadyDeleted}
									<EditableText
										value={editableDataset.Purpose || ''}
										onSave={(val) => handleFieldChange('Purpose', val)}
										placeholder="Tabulation, Analysis, etc."
									/>
								{:else}
									<span class="text-sm">{editableDataset.Purpose || '—'}</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- Repeating -->
					<div>
						<dt class="text-sm font-medium text-muted-foreground">Repeating</dt>
						<dd class="mt-1">
							{#if editState.editMode && !isAlreadyDeleted}
								<EditableText
									value={editableDataset.Repeating || ''}
									onSave={(val) => handleFieldChange('Repeating', val)}
									placeholder="Yes or No"
								/>
							{:else}
								<span class="text-sm">{editableDataset.Repeating || '—'}</span>
							{/if}
						</dd>
					</div>

					<!-- IsReferenceData -->
					{#if editableDataset.IsReferenceData || editState.editMode}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Is Reference Data</dt>
							<dd class="mt-1">
								{#if editState.editMode && !isAlreadyDeleted}
									<EditableText
										value={editableDataset.IsReferenceData || ''}
										onSave={(val) => handleFieldChange('IsReferenceData', val)}
										placeholder="Yes or No"
									/>
								{:else}
									<span class="text-sm">{editableDataset.IsReferenceData || '—'}</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- Structure -->
					{#if editableDataset.Structure || editState.editMode}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Structure</dt>
							<dd class="mt-1">
								{#if editState.editMode && !isAlreadyDeleted}
									<EditableText
										value={editableDataset.Structure || ''}
										onSave={(val) => handleFieldChange('Structure', val)}
										placeholder="Dataset structure"
									/>
								{:else}
									<span class="text-sm">{editableDataset.Structure || '—'}</span>
								{/if}
							</dd>
						</div>
					{/if}

					<!-- ArchiveLocationID -->
					{#if editableDataset.ArchiveLocationID || editState.editMode}
						<div>
							<dt class="text-sm font-medium text-muted-foreground">Archive Location</dt>
							<dd class="mt-1">
								{#if editState.editMode && !isAlreadyDeleted}
									<EditableText
										value={editableDataset.ArchiveLocationID || ''}
										onSave={(val) => handleFieldChange('ArchiveLocationID', val)}
										placeholder="Archive location ID"
									/>
								{:else}
									<span class="text-sm">{editableDataset.ArchiveLocationID || '—'}</span>
								{/if}
							</dd>
						</div>
					{/if}
				</dl>

				<!-- Description (full width) -->
				{#if editableDataset.Description || editState.editMode}
					<div class="mt-4">
						<dt class="text-sm font-medium text-muted-foreground">Description</dt>
						<dd class="mt-1">
							{#if editState.editMode && !isAlreadyDeleted}
								<EditableTextArea
									value={editableDataset.Description || ''}
									onSave={(val) => handleFieldChange('Description', val)}
									placeholder="Dataset description"
									rows={3}
								/>
							{:else}
								<p class="text-sm whitespace-pre-wrap">{editableDataset.Description || '—'}</p>
							{/if}
						</dd>
					</div>
				{/if}
			</div>
		</div>
	{/if}

		<!-- Variables and VLM Tabs -->
		<Tabs bind:value={activeTab} class="rounded-lg border bg-card">
			<TabsList class="w-full justify-start rounded-none border-b px-4">
				<TabsTrigger value="variables">
					Variables ({variablesWithDetails.length})
				</TabsTrigger>
				{#if hasVLM}
					<TabsTrigger value="vlm">
						VLM
					</TabsTrigger>
				{/if}
			</TabsList>

			<!-- Variables Tab -->
			<TabsContent value="variables" class="p-0">
			<div class="p-4">
				{#if editState.editMode && !isAlreadyDeleted}
					<div class="mb-4 text-xs text-muted-foreground italic">
						To edit variables, click on a variable name below
					</div>
				{/if}
				{#if variablesWithDetails.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full border-collapse">
							<thead>
								<tr class="border-b bg-muted/50">
									<th class="p-2 text-center text-xs font-medium">Key</th>
									<th class="p-2 text-left text-xs font-medium">Order</th>
									<th class="p-2 text-left text-xs font-medium">Metadata</th>
									<th class="p-2 text-left text-xs font-medium">Variable</th>
									<th class="p-2 text-left text-xs font-medium">Type</th>
									<th class="p-2 text-left text-xs font-medium">Length</th>
									<th class="p-2 text-center text-xs font-medium">Mandatory</th>
								</tr>
							</thead>
							<tbody>
								{#each variablesWithDetails as { ref, variable, name, dataType, length, method, codelist, comment, hasWhereClause, isVariableModified, isVariableAdded, isCodelistDeleted, isCommentDeleted, isMethodDeleted }}
									{@const variableOid = variable?.OID || ''}
									{@const hasDeletedDependencies = isCodelistDeleted || isCommentDeleted || isMethodDeleted}
									<tr class="border-b transition-colors hover:bg-muted/30 {isVariableAdded ? 'bg-green-50 dark:bg-green-950/20' : ''}">
										<!-- Key Sequence (K1, K2 format) -->
										<td class="p-2 text-center">
											{#if ref.KeySequence}
												<span class="inline-flex rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
													K{ref.KeySequence}
												</span>
											{:else}
												<span class="text-sm text-muted-foreground">—</span>
											{/if}
										</td>

										<!-- Order -->
										<td class="p-2">
											<span class="text-sm text-muted-foreground">
												{ref.OrderNumber || '—'}
											</span>
										</td>

										<!-- Metadata Badges (now clickable buttons) -->
										<td class="p-2">
											<div class="flex gap-1">
												{#if hasWhereClause}
													<span
														class="inline-flex rounded bg-purple-500/10 px-1.5 py-0.5 text-xs font-medium text-purple-600"
														title="Has Where Clause (not expandable)"
													>
														Where
													</span>
												{/if}
												{#if codelist}
													<button
														onclick={() => toggleExpansion(variableOid, 'codelist')}
														class="inline-flex rounded px-1.5 py-0.5 text-xs font-medium transition-colors relative
														       {isExpanded(variableOid, 'codelist')
														         ? 'bg-blue-600 text-white'
														         : isCodelistDeleted
														           ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 line-through'
														           : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}"
														title={isCodelistDeleted ? 'CodeList deleted' : 'Click to toggle Codelist details'}
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
														         : isMethodDeleted
														           ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 line-through'
														           : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}"
														title={isMethodDeleted ? 'Method deleted' : 'Click to toggle Method details'}
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
														         : isCommentDeleted
														           ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 line-through'
														           : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'}"
														title={isCommentDeleted ? 'Comment deleted' : 'Click to toggle Comment details'}
													>
														C
													</button>
												{/if}
											</div>
										</td>

										<!-- Variable Name (clickable) -->
										<td class="p-2">
											<div class="flex items-center gap-2 flex-wrap">
												<button
													onclick={() => ref.OID && navigateToVariable(ref.OID)}
													class="text-sm font-medium text-primary hover:underline"
												>
													{name}
												</button>

												<!-- Status Badges -->
												{#if isVariableAdded}
													<Badge variant="default" class="text-xs">Added</Badge>
												{:else if isVariableModified}
													<Badge variant="secondary" class="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">Modified</Badge>
												{/if}

												<!-- Warnings for deleted dependencies -->
												{#if hasDeletedDependencies}
													<div class="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
														<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
															<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
														</svg>
														<span>
															{#if isCodelistDeleted}CodeList deleted{/if}
															{#if isCommentDeleted}{isCodelistDeleted ? ', ' : ''}Comment deleted{/if}
															{#if isMethodDeleted}{isCodelistDeleted || isCommentDeleted ? ', ' : ''}Method deleted{/if}
														</span>
													</div>
												{/if}
											</div>
										</td>

										<!-- Data Type -->
										<td class="p-2">
											<span class="text-sm text-muted-foreground">
												{dataType || '—'}
											</span>
										</td>

										<!-- Length -->
										<td class="p-2">
											<span class="text-sm text-muted-foreground">
												{length || '—'}
											</span>
										</td>

										<!-- Mandatory -->
										<td class="p-2 text-center">
											{#if ref.Mandatory === 'Yes'}
												<span class="inline-flex rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
													Yes
												</span>
											{:else if ref.Mandatory === 'No'}
												<span class="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
													No
												</span>
											{:else}
												<span class="text-sm text-muted-foreground">—</span>
											{/if}
										</td>
									</tr>

									<!-- Expandable Metadata Sections (nested under each variable) -->
									{#if variable?.OID && (method || codelist || comment)}
										<tr>
											<td colspan="7" class="p-0">
												<div class="border-t bg-muted/20">
													<!-- Method Section -->
													{#if method}
														<ExpandableSection
															title="Method: {method.Name || method.OID}"
															expanded={isExpanded(variableOid, 'method')}
														>
															<div class="text-sm">
																<div class="mb-2">
																	<span class="font-medium">OID:</span>
																	<button
																		onclick={() => method.OID && navigateToMethod(method.OID)}
																		class="ml-2 text-primary hover:underline"
																	>
																		{method.OID}
																	</button>
																</div>
																{#if method.Type}
																	<div class="mb-2">
																		<span class="font-medium">Type:</span>
																		<span class="ml-2 text-muted-foreground">{method.Type}</span>
																	</div>
																{/if}
																{#if method.Description}
																	<div>
																		<span class="font-medium">Description:</span>
																		<p class="mt-1 whitespace-pre-wrap text-muted-foreground">
																			{method.Description}
																		</p>
																	</div>
																{/if}
															</div>
														</ExpandableSection>
													{/if}

													<!-- Codelist Section -->
													{#if codelist}
														<ExpandableSection
															title="Codelist: {codelist.Name || codelist.OID}"
															expanded={isExpanded(variableOid, 'codelist')}
														>
															<div class="text-sm">
																<div class="mb-2">
																	<span class="font-medium">OID:</span>
																	<button
																		onclick={() => codelist.OID && navigateToCodeList(codelist.OID)}
																		class="ml-2 text-primary hover:underline"
																	>
																		{codelist.OID}
																	</button>
																</div>
																{#if codelist.DataType}
																	<div class="mb-2">
																		<span class="font-medium">Data Type:</span>
																		<span class="ml-2 text-muted-foreground">{codelist.DataType}</span>
																	</div>
																{/if}
																{#if (codelist.CodeListItems && codelist.CodeListItems.length > 0) || (codelist.EnumeratedItems && codelist.EnumeratedItems.length > 0)}
																	{@const allItems = [...(codelist.CodeListItems || []), ...(codelist.EnumeratedItems || [])]}
																	<div>
																		<span class="font-medium">Items ({allItems.length}):</span>
																		<ul class="mt-1 ml-4 list-disc text-muted-foreground">
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

													<!-- Comment Section -->
													{#if comment}
														<ExpandableSection
															title="Comment"
															expanded={isExpanded(variableOid, 'comment')}
														>
															<div class="text-sm">
																<div class="mb-2">
																	<span class="font-medium">OID:</span>
																	<button
																		onclick={() => comment.OID && navigateToComment(comment.OID)}
																		class="ml-2 text-primary hover:underline"
																	>
																		{comment.OID}
																	</button>
																</div>
																{#if comment.Description}
																	<div>
																		<span class="font-medium">Text:</span>
																		<p class="mt-1 whitespace-pre-wrap text-muted-foreground">
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
					<p class="text-sm text-muted-foreground">
						No variables defined in this dataset.
					</p>
				{/if}
			</div>
			</TabsContent>

			<!-- VLM Tab -->
			<TabsContent value="vlm" class="p-0">
				<div class="h-[600px]">
					<VLMTablePrototype
						vlmData={vlmTableData}
						defineData={activeData.defineData}
						{defineType}
						editMode={editState.editMode && !isAlreadyDeleted}
						onNavigateToMethod={navigateToMethod}
						onNavigateToCodeList={navigateToCodeList}
						onNavigateToWhereClause={navigateToWhereClause}
						onNavigateToComment={navigateToComment}
					/>
				</div>
			</TabsContent>
		</Tabs>
	</div>

	<!-- Delete Confirmation Modal -->
	<ConfirmDeleteModal
		open={showDeleteModal}
		mode={deleteModalMode}
		itemType="Dataset"
		itemName={editableDataset.Name || dataset.OID || ''}
		impactedItems={impactedItemsForDelete}
		onConfirm={confirmDeleteDataset}
		onCancel={cancelDeleteDataset}
	/>
{:else}
	<div class="mx-auto max-w-2xl text-center">
		<h1 class="mb-4 text-2xl font-bold">Dataset Not Found</h1>
		<p class="text-muted-foreground">
			The dataset with OID "{$page.params.oid}" was not found in this Define-XML.
		</p>
	</div>
{/if}
