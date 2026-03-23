<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { extractDefineDataForMetadata } from '$lib/utils/metadata';
	import ExpandableSection from '$lib/components/metadata/shared/ExpandableSection.svelte';
	import ConfirmDeleteModal from '$lib/components/metadata/shared/ConfirmDeleteModal.svelte';
	import VariablePickerModal from '$lib/components/metadata/edit/VariablePickerModal.svelte';
	import { metadataEditState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import { drawerState } from '$lib/core/state/metadata/drawerState.svelte';
	import {
		mergeItemWithChanges,
		hasItemChanges
	} from '$lib/utils/metadata/useEditableItem.svelte';
	import {
		isItemDeleted,
		handleDeleteOrReinstate
	} from '$lib/utils/metadata/useDeleteModal.svelte';
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
	const defineType = $derived<DefineType>(
		isDataset && itemOid &&
		defineBundle.sdtmData?.defineData?.ItemGroups?.some((ig) => ig.OID === itemOid)
			? 'sdtm'
			: defineBundle.adamData
				? 'adam'
				: 'sdtm'
	);

	// Editable dataset with merged changes
	const editableDataset = $derived.by(() =>
		dataset ? mergeItemWithChanges(dataset, defineType, 'datasets', dataset.OID) : null
	);

	// Delete modal state
	let showDeleteModal = $state(false);
	const isAlreadyDeleted = $derived(isItemDeleted(defineType, 'datasets', dataset?.OID));
	const deleteModalMode = $derived(isAlreadyDeleted ? 'reinstate' : 'delete');

	// Variable picker modal state
	let showVariablePicker = $state(false);

	// Get all available variables for the picker (from both ADaM and SDTM)
	const availableVariables = $derived.by(() => {
		return defineBundle.combined?.ItemDefs || [];
	});

	// Get OIDs of variables already in the dataset to exclude from picker
	const existingVariableOIDs = $derived.by(() => {
		if (!dataset?.OID || !editableDataset) return [];
		return (editableDataset.ItemRefs || []).map((ref) => ref.OID || '').filter(Boolean);
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

	// Variable management handlers
	function handleAddVariable() {
		showVariablePicker = true;
	}

	function handleSelectVariable(variable: ItemDef) {
		if (!dataset?.OID || !editableDataset || !variable.OID) return;

		// Get current ItemRefs
		const currentItemRefs = [...(editableDataset.ItemRefs || [])];

		// Check if variable is already in dataset
		if (currentItemRefs.some((ref) => ref.OID === variable.OID)) {
			console.warn(`Variable ${variable.OID} is already in dataset ${dataset.OID}`);
			showVariablePicker = false;
			return;
		}

		// Calculate next OrderNumber
		const maxOrderNumber = Math.max(
			0,
			...currentItemRefs.map((ref) => parseInt(ref.OrderNumber || '0'))
		);
		const nextOrderNumber = (maxOrderNumber + 1).toString();

		// Create new ItemRef
		const newItemRef = {
			OID: variable.OID,
			Mandatory: 'No',
			OrderNumber: nextOrderNumber,
			KeySequence: null,
			MethodOID: null,
			WhereClauseOID: null,
			Role: null,
			RoleCodeListOID: null
		};

		// Add to ItemRefs
		const updatedItemRefs = [...currentItemRefs, newItemRef];

		// Record change
		metadataEditState.recordChange(
			defineType,
			'datasets',
			dataset.OID,
			'ItemRefs',
			updatedItemRefs,
			editableDataset.ItemRefs || dataset.ItemRefs
		);

		showVariablePicker = false;
	}

	function handleRemoveVariable(variableOID: string) {
		if (!dataset?.OID || !editableDataset) return;

		// Confirm deletion
		if (!confirm(`Remove variable ${variableOID} from this dataset?`)) {
			return;
		}

		// Get current ItemRefs
		const currentItemRefs = [...(editableDataset.ItemRefs || [])];

		// Filter out the target ItemRef
		const updatedItemRefs = currentItemRefs.filter((ref) => ref.OID !== variableOID);

		// Renumber OrderNumbers
		const renumberedItemRefs = updatedItemRefs.map((ref, index) => ({
			...ref,
			OrderNumber: (index + 1).toString()
		}));

		// Record change
		metadataEditState.recordChange(
			defineType,
			'datasets',
			dataset.OID,
			'ItemRefs',
			renumberedItemRefs,
			editableDataset.ItemRefs || dataset.ItemRefs
		);
	}

	function handleCancelVariablePicker() {
		showVariablePicker = false;
	}

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

	// Drag and drop state for variable reordering
	let draggedIndex = $state<number | null>(null);
	let dropTargetIndex = $state<number | null>(null);

	// Drag and drop handlers
	function handleDragStart(event: DragEvent, index: number) {
		if (!metadataEditState.editMode || isAlreadyDeleted) return;
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragEnd() {
		draggedIndex = null;
		dropTargetIndex = null;
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (!metadataEditState.editMode || isAlreadyDeleted) return;
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		if (draggedIndex !== null && draggedIndex !== index) {
			dropTargetIndex = index;
		}
	}

	function handleDragLeave() {
		dropTargetIndex = null;
	}

	function handleDropVariable(event: DragEvent, toIndex: number) {
		event.preventDefault();

		if (!dataset?.OID || !editableDataset || draggedIndex === null) return;
		if (draggedIndex === toIndex) return;

		// Get current ItemRefs (with any pending changes applied)
		const items = [...(editableDataset.ItemRefs || [])];

		// Reorder the items
		const [movedItem] = items.splice(draggedIndex, 1);
		items.splice(toIndex, 0, movedItem);

		// Renumber OrderNumbers
		items.forEach((item, i) => {
			item.OrderNumber = (i + 1).toString();
		});

		// Record the change
		metadataEditState.recordChange(
			defineType,
			'datasets',
			dataset.OID,
			'ItemRefs',
			items,
			editableDataset.ItemRefs || dataset.ItemRefs
		);

		draggedIndex = null;
		dropTargetIndex = null;
	}

	// Get variable details for datasets
	const variablesWithDetails = $derived.by(() => {
		if (!isDataset || !dataset?.OID || !editableDataset) return [];

		// Search in combined data to find items from both ADaM and SDTM
		if (!defineBundle.combined) return [];

		// Use editableDataset.ItemRefs (same source we modify in drop handler)
		const itemRefs = editableDataset.ItemRefs || [];

		return itemRefs
			.map((ref: any) => {
				const variable = defineBundle.combined.ItemDefs?.find((v: any) => v.OID === ref.OID);

				// Check variable edit status
				const variableChange = variable?.OID
					? metadataEditState.getChange(defineType, 'variables', variable.OID)
					: null;
				const isVariableDeleted = variableChange?.type === 'DELETED';
				const isVariableModified = variableChange && !isVariableDeleted;
				const isVariableAdded = variableChange?.type === 'ADDED';

				const method = ref.MethodOID
					? defineBundle.combined.Methods?.find((m: any) => m.OID === ref.MethodOID)
					: null;
				const codelist = variable?.CodeListOID
					? defineBundle.combined.CodeLists?.find((cl: any) => cl.OID === variable.CodeListOID)
					: null;
				const comment = variable?.CommentOID
					? defineBundle.combined.Comments?.find((c: any) => c.OID === variable.CommentOID)
					: null;

				// Check if associated items are deleted or modified
				const codelistChange = codelist?.OID
					? metadataEditState.getChange(defineType, 'codelists', codelist.OID)
					: null;
				const isCodelistDeleted = codelistChange?.type === 'DELETED';
				const isCodelistModified = codelistChange && !isCodelistDeleted;

				const commentChange = comment?.OID
					? metadataEditState.getChange(defineType, 'comments', comment.OID)
					: null;
				const isCommentDeleted = commentChange?.type === 'DELETED';
				const isCommentModified = commentChange && !isCommentDeleted;

				const methodChange = method?.OID
					? metadataEditState.getChange(defineType, 'methods', method.OID)
					: null;
				const isMethodDeleted = methodChange?.type === 'DELETED';
				const isMethodModified = methodChange && !isMethodDeleted;

				return {
					ref,
					variable,
					name: variable?.Name || ref.OID || '(unknown)',
					dataType: variable?.DataType || '',
					length: variable?.Length || '',
					method,
					codelist,
					comment,
					hasWhereClause: !!ref.WhereClauseOID,
					// Status flags
					isVariableDeleted,
					isVariableModified,
					isVariableAdded,
					isCodelistDeleted,
					isCodelistModified,
					isCommentDeleted,
					isCommentModified,
					isMethodDeleted,
					isMethodModified
				};
			})
			.filter(({ isVariableDeleted }) => {
				// Exclude variables that are marked as deleted
				return !isVariableDeleted;
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
{:else if isDataset && dataset && editableDataset}
	<!-- Dataset Detail View -->
	<div class="mx-auto h-full overflow-auto p-3" style="max-width: 1400px;">
		<!-- Header -->
		<div class="mb-3">
			<div class="mb-1">
				<div class="text-muted-foreground flex items-center gap-2 text-sm">
					<span>Dataset</span>
					<span>›</span>
					<span>{editableDataset.Name || dataset.OID}</span>
					{#if hasItemChanges(defineType, 'datasets', dataset.OID)}
						<span class="bg-warning text-warning-foreground rounded-full px-2 py-0.5 text-xs"
							>Modified</span
						>
					{/if}
				</div>
			</div>

			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold">{editableDataset.Name || dataset.OID}</h1>
				<!-- Edit Details button (only in edit mode) -->
				{#if metadataEditState.editMode}
					<button
						onclick={() =>
							drawerState.open({
								oid: dataset.OID,
								itemType: 'datasets',
								defineType
							})}
						class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
						title="Edit dataset details"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
						Edit Details
					</button>
				{/if}
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
			{#if editableDataset.Description}
				<p class="text-muted-foreground mt-1 text-sm">{editableDataset.Description}</p>
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
				{#if metadataEditState.editMode && !isAlreadyDeleted}
					<button
						onclick={handleAddVariable}
						class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add Variable
					</button>
				{/if}
			</div>
			<div class="p-2">

				{#if variablesWithDetails.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-sm">
							<thead>
								<tr class="bg-muted/50 border-b">
									<th class="w-6 p-0"></th>
									<th class="w-14 p-0 text-center text-xs font-medium">
										{#if metadataEditState.editMode && !isAlreadyDeleted}
											Actions
										{/if}
									</th>
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
								{#each variablesWithDetails as { ref, variable, name, dataType, length, method, codelist, comment, hasWhereClause, isVariableModified, isVariableAdded, isCodelistDeleted, isCodelistModified, isCommentDeleted, isCommentModified, isMethodDeleted, isMethodModified }, index (ref.OID)}
									{@const variableOid = variable?.OID || ''}
									{@const hasDeletedDependencies =
										isCodelistDeleted || isCommentDeleted || isMethodDeleted}
									{@const hasModifiedDependencies =
										isCodelistModified || isCommentModified || isMethodModified}
									<tr
										draggable={metadataEditState.editMode && !isAlreadyDeleted}
										ondragstart={(e) => handleDragStart(e, index)}
										ondragend={handleDragEnd}
										ondragover={(e) => handleDragOver(e, index)}
										ondragleave={handleDragLeave}
										ondrop={(e) => handleDropVariable(e, index)}
										class="hover:bg-muted/30 border-b transition-colors
											       {isVariableAdded ? 'bg-green-50 dark:bg-green-950/20' : ''}
											       {draggedIndex === index ? 'opacity-50' : ''}
											       {dropTargetIndex === index ? 'border-primary bg-primary/5 border-l-4' : ''}"
									>
										<!-- Drag Handle -->
										<td class="w-6 p-0">
											{#if metadataEditState.editMode && !isAlreadyDeleted}
												<div class="text-muted-foreground flex cursor-move items-center justify-center" title="Drag to reorder">
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
														<path
															d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"
														/>
													</svg>
												</div>
											{/if}
										</td>

										<!-- Actions -->
										<td class="w-14 p-0 text-center">
											{#if metadataEditState.editMode && !isAlreadyDeleted}
												<div class="flex items-center justify-center gap-1">
													<!-- Edit button -->
													<button
														onclick={(e) => {
															e.preventDefault();
															e.stopPropagation();
															console.log('[Dataset] Opening drawer for variable:', ref.OID);
															ref.OID &&
																drawerState.open({
																	oid: ref.OID,
																	itemType: 'variables',
																	defineType
																});
														}}
														class="text-primary hover:bg-primary/10 inline-flex rounded p-1 transition-colors"
														title="Edit variable"
														aria-label="Edit variable {name}"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
															/>
														</svg>
													</button>
													<!-- Remove button -->
													<button
														onclick={() => ref.OID && handleRemoveVariable(ref.OID)}
														class="text-destructive hover:bg-destructive/10 inline-flex rounded p-1 transition-colors"
														title="Remove variable from dataset"
														aria-label="Remove variable {name} from dataset"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
													</button>
												</div>
											{/if}
										</td>

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
															: isCodelistDeleted
																? 'bg-red-500/10 text-red-600 line-through hover:bg-red-500/20'
																: isCodelistModified
																	? 'border border-orange-300 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'
																	: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}"
														title={isCodelistDeleted
															? 'CodeList deleted'
															: isCodelistModified
																? 'CodeList modified'
																: 'Click to toggle Codelist details'}
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
																? 'bg-red-500/10 text-red-600 line-through hover:bg-red-500/20'
																: isMethodModified
																	? 'border border-orange-300 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'
																	: 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}"
														title={isMethodDeleted
															? 'Method deleted'
															: isMethodModified
																? 'Method modified'
																: 'Click to toggle Method details'}
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
																? 'bg-red-500/10 text-red-600 line-through hover:bg-red-500/20'
																: isCommentModified
																	? 'border border-orange-300 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20'
																	: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'}"
														title={isCommentDeleted
															? 'Comment deleted'
															: isCommentModified
																? 'Comment modified'
																: 'Click to toggle Comment details'}
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

												<!-- Status Badges -->
												{#if isVariableAdded}
													<Badge variant="default" class="text-xs">Added</Badge>
												{:else if isVariableModified}
													<Badge
														variant="secondary"
														class="bg-orange-100 text-xs text-orange-700 dark:bg-orange-900 dark:text-orange-300"
														>Modified</Badge
													>
												{/if}

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

												<!-- Warnings for deleted dependencies -->
												{#if hasDeletedDependencies}
													<div
														class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
													>
														<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
															<path
																fill-rule="evenodd"
																d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
																clip-rule="evenodd"
															/>
														</svg>
														<span>
															{#if isCodelistDeleted}CodeList deleted{/if}
															{#if isCommentDeleted}{isCodelistDeleted ? ', ' : ''}Comment deleted{/if}
															{#if isMethodDeleted}{isCodelistDeleted || isCommentDeleted
																	? ', '
																	: ''}Method deleted{/if}
														</span>
													</div>
												{/if}

												<!-- Info for modified dependencies -->
												{#if hasModifiedDependencies && !hasDeletedDependencies}
													<div
														class="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400"
													>
														<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
															<path
																fill-rule="evenodd"
																d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
																clip-rule="evenodd"
															/>
														</svg>
														<span>
															{#if isCodelistModified}CodeList modified{/if}
															{#if isCommentModified}{isCodelistModified ? ', ' : ''}Comment
																modified{/if}
															{#if isMethodModified}{isCodelistModified || isCommentModified
																	? ', '
																	: ''}Method modified{/if}
														</span>
													</div>
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
												colspan="9"
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
																			method.OID &&
																				drawerState.open({
																					oid: method.OID,
																					itemType: 'methods',
																					defineType
																				});
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
																			codelist.OID &&
																				drawerState.open({
																					oid: codelist.OID,
																					itemType: 'codelists',
																					defineType
																				});
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
																			comment.OID &&
																				drawerState.open({
																					oid: comment.OID,
																					itemType: 'comments',
																					defineType
																				});
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

		<!-- Delete Confirmation Modal -->
		<ConfirmDeleteModal
			open={showDeleteModal}
			mode={deleteModalMode}
			itemType="Dataset"
			itemName={editableDataset.Name || dataset.OID || ''}
			impactedItems={[]}
			onConfirm={confirmDeleteDataset}
			onCancel={cancelDeleteDataset}
		/>

		<!-- Variable Picker Modal -->
		<VariablePickerModal
			bind:open={showVariablePicker}
			{availableVariables}
			excludeOIDs={existingVariableOIDs}
			{defineType}
			onSelect={handleSelectVariable}
			onCancel={handleCancelVariablePicker}
		/>
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
