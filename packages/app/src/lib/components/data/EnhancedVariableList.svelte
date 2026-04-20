<!-- packages/app/src/lib/components/data/EnhancedVariableList.svelte -->
<script lang="ts">
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import { Button, Input } from '@sden99/ui-components';
	import { Checkbox } from '@sden99/ui-components';
	import { Badge } from '@sden99/ui-components';
	import { GripVertical, Eye, EyeOff, Search, ChevronDown } from '@lucide/svelte/icons';
	import { mergeVariables } from '$lib/adapters/mergedVariableAdapter';
	import type { MergedVariable } from '$lib/types/mergedVariable';
	import type { DefineType } from '@sden99/cdisc-types/define-xml';
	import InlineCodeListDisplay from '$lib/components/metadata/shared/InlineCodeListDisplay.svelte';

	// Props - receive reference to ClinicalVirtualTable
	let { clinicalTableRef = $bindable() } = $props();

	// Get current dataset info for data types
	let currentDataset = $derived.by(() => {
		const selectedId = dataState.selectedDatasetId.value;
		if (!selectedId) return null;
		return dataState.getDatasets()[selectedId];
	});

	// Get column info from ClinicalVirtualTable reference
	let availableColumns = $derived.by(() => {
		return clinicalTableRef?.getAvailableColumns() || [];
	});
	let visibleColumns = $derived.by(() => {
		return clinicalTableRef?.getVisibleColumns() || [];
	});

	// Define-XML metadata lookup
	let defineMetadata = $derived.by(() => {
		const name = dataState.selectedDomain.value || dataState.selectedDatasetId.value;
		const itemGroup = dataState.getItemGroupMetadata(name);
		if (!itemGroup) return { itemGroup: null, define: null, defineType: null as DefineType | null };
		const defineXmlInfo = dataState.getDefineXmlInfo();
		const define = defineXmlInfo.ADaM ?? defineXmlInfo.SDTM;
		const defineType: DefineType | null = defineXmlInfo.ADaM ? 'ADaM' : defineXmlInfo.SDTM ? 'SDTM' : null;
		return { itemGroup, define, defineType };
	});

	// Merged variables combining data columns + Define-XML metadata
	let mergedVariables: MergedVariable[] = $derived.by(() => {
		return mergeVariables(
			availableColumns,
			visibleColumns,
			currentDataset?.details?.dtypes,
			defineMetadata.itemGroup,
			defineMetadata.define
		);
	});

	// Search state
	let searchTerm = $state('');

	let filteredVariables = $derived.by(() => {
		if (!searchTerm.trim()) return mergedVariables;
		const term = searchTerm.toLowerCase();
		return mergedVariables.filter(
			(v) =>
				v.name.toLowerCase().includes(term) ||
				v.label?.toLowerCase().includes(term)
		);
	});

	// Codelist expand/collapse state
	let expandedCodelists = $state<Set<string>>(new Set());
	function toggleCodelist(name: string) {
		const next = new Set(expandedCodelists);
		if (next.has(name)) {
			next.delete(name);
		} else {
			next.add(name);
		}
		expandedCodelists = next;
	}

	// Summary counts
	let defineOnlyCount = $derived(mergedVariables.filter((v) => v.source === 'define-only').length);
	let dataOnlyCount = $derived(mergedVariables.filter((v) => v.source === 'data-only').length);
	let hasDefine = $derived(defineMetadata.itemGroup !== null);

	// Drag and drop state
	let draggedColumn = $state<string | null>(null);
	let dragOverColumn = $state<string | null>(null);

	function handleColumnToggle(column: string) {
		console.log(`[EnhancedVariableList] Toggling column: ${column}`);
		clinicalTableRef?.toggleColumnVisibility(column);
	}

	function handleShowAll() {
		console.log(`[EnhancedVariableList] Show all columns`);
		clinicalTableRef?.showAllColumns();
	}

	function handleHideAll() {
		console.log(`[EnhancedVariableList] Hide all columns`);
		clinicalTableRef?.hideAllColumns();
	}

	function handleReset() {
		console.log(`[EnhancedVariableList] Reset columns`);
		clinicalTableRef?.resetColumns();
	}

	// Drag and drop handlers
	function handleDragStart(e: DragEvent, variable: MergedVariable) {
		if (variable.source === 'define-only') return;
		draggedColumn = variable.name;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', variable.name);
		}
	}

	function handleDragOver(e: DragEvent, variable: MergedVariable) {
		if (variable.source === 'define-only') return;
		e.preventDefault();
		if (draggedColumn !== variable.name) {
			dragOverColumn = variable.name;
		}
	}

	function handleDragLeave() {
		dragOverColumn = null;
	}

	function handleDrop(e: DragEvent, variable: MergedVariable) {
		if (variable.source === 'define-only') return;
		e.preventDefault();

		if (draggedColumn && draggedColumn !== variable.name) {
			console.log(`[EnhancedVariableList] Reordering: ${draggedColumn} -> ${variable.name}`);
			clinicalTableRef?.reorderColumns(draggedColumn, variable.name);
		}

		draggedColumn = null;
		dragOverColumn = null;
	}

	function getDataTypeColor(dtype: string): string {
		const type = dtype.toLowerCase();
		if (type.includes('int') || type.includes('float') || type.includes('number'))
			return 'bg-info/10 text-info';
		if (type.includes('str') || type.includes('object') || type.includes('text'))
			return 'bg-success/10 text-success';
		if (type.includes('date') || type.includes('time')) return 'bg-primary/10 text-primary';
		if (type.includes('bool')) return 'bg-warning/10 text-warning';
		return 'bg-muted text-muted-foreground';
	}

	function getCdiscTypeColor(_dtype: string): string {
		return 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
	}

	function abbreviate(value: string, max = 5): string {
		const v = value.toLowerCase();
		if (v === 'integer') return 'int';
		if (v === 'float' || v === 'float64') return 'f64';
		if (v === 'float32') return 'f32';
		if (v === 'int64') return 'i64';
		if (v === 'int32') return 'i32';
		if (v === 'object') return 'obj';
		if (v === 'string') return 'str';
		if (v === 'boolean') return 'bool';
		if (v === 'datetime64[ns]') return 'dt';
		if (v === 'identifier') return 'Id';
		if (v === 'topic') return 'Top';
		if (v === 'timing') return 'Tim';
		if (v === 'qualifier') return 'Qual';
		if (v === 'record qualifier') return 'RQual';
		if (v === 'grouping qualifier') return 'GQual';
		if (v === 'synonym qualifier') return 'SQual';
		if (v === 'result qualifier') return 'ResQ';
		if (v === 'variable qualifier') return 'VQual';
		if (v === 'assigned') return 'Asgn';
		if (v === 'derived') return 'Derv';
		if (v === 'predecessor') return 'Pred';
		if (v === 'collected') return 'Coll';
		if (value.length > max) return value.substring(0, max);
		return value;
	}

	function getVisibilityIcon(visible: boolean) {
		return visible ? Eye : EyeOff;
	}
</script>

<div class="flex h-full flex-col">
	<!-- Fixed: Search bar -->
	<div class="relative mb-3 flex-none">
		<Search class="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
		<Input type="text" placeholder="Search variables..." bind:value={searchTerm} class="pl-8" />
	</div>

	<!-- Fixed: Control buttons -->
	<div class="mb-3 flex flex-none flex-wrap gap-2">
		<Button size="sm" variant="outline" onclick={handleShowAll}>Show All</Button>
		<Button size="sm" variant="outline" onclick={handleHideAll}>Hide All</Button>
		<Button size="sm" variant="outline" onclick={handleReset}>Reset</Button>
	</div>

	<!-- Scrollable: Variable list -->
	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="space-y-1">
			{#each filteredVariables as variable}
				{@const isDefineOnly = variable.source === 'define-only'}
				{@const isDraggable = !isDefineOnly && variable.visible}
				{@const IconComponent = getVisibilityIcon(variable.visible)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="rounded border p-2
						{dragOverColumn === variable.name ? 'border-info bg-info/10' : 'border-border'}
						{isDefineOnly ? 'border-dashed opacity-60' : variable.visible ? 'bg-card' : 'bg-muted/50 opacity-75'}
						hover:bg-muted/50 transition-colors"
					draggable={isDraggable}
					ondragstart={(e) => handleDragStart(e, variable)}
					ondragover={(e) => handleDragOver(e, variable)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, variable)}
					role={isDefineOnly ? 'listitem' : 'button'}
					tabindex={isDefineOnly ? -1 : 0}
				>
					<div class="flex items-center gap-1.5">
						<!-- Drag handle -->
						{#if isDraggable}
							<div class="flex-shrink-0 cursor-move opacity-50 hover:opacity-100">
								<GripVertical class="h-4 w-4" />
							</div>
						{:else}
							<div class="w-4 flex-shrink-0"></div>
						{/if}

						<!-- Checkbox (data columns only) -->
						{#if !isDefineOnly}
							<Checkbox
								checked={variable.visible}
								onCheckedChange={() => handleColumnToggle(variable.name)}
							/>
							<IconComponent
								class="h-4 w-4 flex-shrink-0 {variable.visible ? 'text-success' : 'text-muted-foreground'}"
							/>
						{:else}
							<div class="w-10 flex-shrink-0"></div>
						{/if}

						<!-- Left: Name + label (flexible, truncates) -->
						<div class="min-w-0 flex-1 flex items-center gap-1 overflow-hidden" title={variable.label ?? ''}>
							<span class="w-16 flex-shrink-0 text-sm font-medium {isDefineOnly ? 'italic' : ''}">
								{variable.name}
							</span>
							{#if variable.label}
								<span class="text-foreground/50 min-w-0 truncate text-[11px] italic">
									{variable.label}
								</span>
							{/if}
						</div>

						<!-- Right: Compact badges + chevron -->
						<div class="flex flex-shrink-0 items-center gap-0.5">
							{#if variable.cdiscDataType}
								<Badge variant="outline" class="{getCdiscTypeColor(variable.cdiscDataType)} text-[9px] px-1 py-0" title="{variable.cdiscDataType}{variable.length ? `(${variable.length})` : ''}">
									{abbreviate(variable.cdiscDataType)}{#if variable.length}<span class="opacity-60">{variable.length}</span>{/if}
								</Badge>
							{/if}
							{#if variable.pandasDtype}
								<Badge variant="outline" class="{getDataTypeColor(variable.pandasDtype)} text-[9px] px-1 py-0" title={variable.pandasDtype}>
									{abbreviate(variable.pandasDtype)}
								</Badge>
							{/if}
							{#if variable.isKey}
								<Badge variant="outline" class="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] px-1 py-0" title="Key variable">
									K
								</Badge>
							{/if}
							{#if variable.mandatory === 'Yes'}
								<Badge variant="outline" class="bg-destructive/10 text-destructive text-[9px] px-1 py-0" title="Mandatory / Required">
									R
								</Badge>
							{/if}
							{#if variable.role}
								<Badge variant="outline" class="bg-muted text-muted-foreground text-[9px] px-1 py-0" title="Role: {variable.role}">
									{abbreviate(variable.role)}
								</Badge>
							{/if}
							{#if variable.originType}
								<Badge variant="outline" class="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[9px] px-1 py-0" title="Origin: {variable.originType}">
									{abbreviate(variable.originType)}
								</Badge>
							{/if}
							{#if variable.codeList}
								<button
									class="text-muted-foreground hover:text-foreground flex-shrink-0 p-0.5 transition-transform"
									onclick={() => toggleCodelist(variable.name)}
									title={expandedCodelists.has(variable.name) ? 'Collapse codelist' : 'Expand codelist'}
								>
									<ChevronDown
										class="h-3 w-3 transition-transform {expandedCodelists.has(variable.name) ? 'rotate-180' : ''}"
									/>
								</button>
							{/if}
							{#if variable.source === 'data-only' && hasDefine}
								<Badge variant="outline" class="bg-warning/10 text-warning text-[9px] px-1 py-0" title="Variable exists in data but not in Define-XML">
									DO
								</Badge>
							{:else if variable.source === 'define-only'}
								<Badge variant="outline" class="bg-destructive/10 text-destructive text-[9px] px-1 py-0" title="Variable exists in Define-XML but not in data">
									Def
								</Badge>
							{/if}
						</div>
					</div>

					<!-- Expandable codelist -->
					{#if variable.codeList && expandedCodelists.has(variable.name)}
						<div class="mt-1 ml-6">
							<InlineCodeListDisplay
								codelist={variable.codeList}
								defineType={defineMetadata.defineType ?? 'SDTM'}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Fixed: Status info -->
	<div class="text-muted-foreground flex-none border-t pt-2 text-xs">
		<div>{visibleColumns.length} of {availableColumns.length} data columns visible</div>
		{#if hasDefine && (defineOnlyCount > 0 || dataOnlyCount > 0)}
			<div class="mt-0.5">
				{#if defineOnlyCount > 0}
					<span class="text-destructive">{defineOnlyCount} define-only</span>
				{/if}
				{#if defineOnlyCount > 0 && dataOnlyCount > 0}
					<span> · </span>
				{/if}
				{#if dataOnlyCount > 0}
					<span class="text-warning">{dataOnlyCount} data-only</span>
				{/if}
			</div>
		{/if}
	</div>
</div>
