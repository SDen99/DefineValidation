<!-- packages/app/src/lib/components/VLMView/VLMTableRow.svelte -->
<!-- FIXED: Made expansion state properly reactive in Svelte 5 -->
<script lang="ts">
	import {
		getColumnWidth as getVLMColumnWidth,
		expandedSections,
		toggleSection
	} from '../../state/vlmUIState.svelte.ts';
	// UI components will be passed in via VLMTable
	import VLMParameterCell from './cells/VLMParameterCell.svelte';
	import VLMMethodSection from './cells/VLMMethodSection.svelte';
	import VLMWhereClauseSection from './cells/VLMWhereClauseSection.svelte';
	import VLMCommentSection from './cells/VLMCommentSection.svelte';
	import VLMCodelistSection from './cells/VLMCodelistSection.svelte';
	import VLMOriginSection from './cells/VLMOriginSection.svelte';
	import VLMDebugSection from './cells/VLMDebugSection.svelte';
	import VLMStratificationCell from './cells/VLMStratificationCell.svelte';

	let { 
		row, 
		index,
		columns, 
		columnWidths, 
		datasetName, 
		stratificationColumns 
	} = $props<{
		row: any;
		index: number;
		columns: string[];
		columnWidths: Record<string, number>;
		datasetName: string;
		stratificationColumns: Set<string>;
	}>();

	// Use the passed datasetName as cleanDatasetName for consistency
	const cleanDatasetName = datasetName;

	// Column widths are now handled by colgroup in VLMTable component

	function getSectionId(rowKey: string, column: string, sectionType: string): string {
		return `${rowKey}_${column}_${sectionType}`;
	}

	// FIXED: Create reactive derived state that directly tracks the expandedSections state
	// This ensures Svelte 5 properly detects Set changes
	let sectionExpansions = $derived.by(() => {
		// Force dependency on the expandedSections state
		const currentExpanded = expandedSections[cleanDatasetName];

		const expansions: Record<string, { expanded: boolean; onToggle: () => void }> = {};

		// Pre-compute all possible section IDs for this row
		columns.forEach((column) => {
			const variable = row[column];
			if (variable && typeof variable === 'object') {
				// Method section
				if (variable.method) {
					const sectionId = getSectionId(row.rowKey, column, 'method');
					expansions[sectionId] = {
						expanded: currentExpanded?.has(sectionId) || false,
						onToggle: () => toggleSection(cleanDatasetName, sectionId)
					};
				}

				// Codelist section
				if (variable.codeList) {
					const sectionId = getSectionId(row.rowKey, column, 'codelist');
					expansions[sectionId] = {
						expanded: currentExpanded?.has(sectionId) || false,
						onToggle: () => toggleSection(cleanDatasetName, sectionId)
					};
				}

				// WhereClause section
				if (variable.whereClause) {
					const sectionId = getSectionId(row.rowKey, column, 'whereClause');
					expansions[sectionId] = {
						expanded: currentExpanded?.has(sectionId) || false,
						onToggle: () => toggleSection(cleanDatasetName, sectionId)
					};
				}

				// Comment section
				if (variable.comments?.length) {
					const sectionId = getSectionId(row.rowKey, column, 'comment');
					expansions[sectionId] = {
						expanded: currentExpanded?.has(sectionId) || false,
						onToggle: () => toggleSection(cleanDatasetName, sectionId)
					};
				}

				// Origin section
				if (variable.origin) {
					const sectionId = getSectionId(row.rowKey, column, 'origin');
					expansions[sectionId] = {
						expanded: currentExpanded?.has(sectionId) || false,
						onToggle: () => toggleSection(cleanDatasetName, sectionId)
					};
				}

				// Debug section (always available)
				const debugSectionId = getSectionId(row.rowKey, column, 'debug');
				expansions[debugSectionId] = {
					expanded: currentExpanded?.has(debugSectionId) || false,
					onToggle: () => toggleSection(cleanDatasetName, debugSectionId)
				};
			}
		});

		return expansions;
	});
</script>

<tr class={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
	{#each columns as column}
		<td class="relative border-b p-2 align-top text-sm" data-column={column}>
			{#if column === 'PARAMCD' || column === 'PARAM'}
				<VLMParameterCell {row} {column} />
			{:else if stratificationColumns.has(column)}
				<VLMStratificationCell {row} {column} />
			{:else}
				{@const variable = row[column]}
				{#if variable && typeof variable === 'object'}
					<!-- Basic variable info -->
					<div class="mb-2">
						<div class="text-foreground text-sm font-medium">
							{variable.variable?.name || column}
						</div>
						{#if variable.variable?.label}
							<div class="text-muted-foreground text-xs">
								{variable.variable.label}
							</div>
						{/if}
						{#if variable.variable?.dataType}
							<div class="text-muted-foreground text-xs">
								Type: {variable.variable.dataType}
								{#if variable.variable?.length}
									(Length: {variable.variable.length})
								{/if}
							</div>
						{/if}
					</div>

					<!-- Method Section -->
					{#if variable.method}
						{@const sectionId = getSectionId(row.rowKey, column, 'method')}
						{@const expansion = sectionExpansions[sectionId]}
						{#if expansion}
							<VLMMethodSection
								method={variable.method}
								{sectionId}
								expanded={expansion.expanded}
								onToggle={expansion.onToggle}
							/>
						{/if}
					{/if}

					<!-- Codelist Section -->
					{#if variable.codeList}
						{@const sectionId = getSectionId(row.rowKey, column, 'codelist')}
						{@const expansion = sectionExpansions[sectionId]}
						{#if expansion}
							<VLMCodelistSection
								codelist={variable.codeList}
								{sectionId}
								expanded={expansion.expanded}
								onToggle={expansion.onToggle}
							/>
						{/if}
					{/if}

					<!-- WhereClause Section -->
					{#if variable.whereClause}
						{@const sectionId = getSectionId(row.rowKey, column, 'whereClause')}
						{@const expansion = sectionExpansions[sectionId]}
						{#if expansion}
							<VLMWhereClauseSection
								whereClause={variable.whereClause}
								{sectionId}
								expanded={expansion.expanded}
								onToggle={expansion.onToggle}
							/>
						{/if}
					{/if}

					<!-- Comment Section -->
					{#if variable.comments?.length}
						{@const sectionId = getSectionId(row.rowKey, column, 'comment')}
						{@const expansion = sectionExpansions[sectionId]}
						{#if expansion}
							<VLMCommentSection
								comment={variable.comments[0]}
								{sectionId}
								expanded={expansion.expanded}
								onToggle={expansion.onToggle}
							/>
						{/if}
					{/if}

					<!-- Origin Section -->
					{#if variable.origin}
						{@const sectionId = getSectionId(row.rowKey, column, 'origin')}
						{@const expansion = sectionExpansions[sectionId]}
						{#if expansion}
							<VLMOriginSection
								origin={variable.origin}
								{sectionId}
								expanded={expansion.expanded}
								onToggle={expansion.onToggle}
							/>
						{/if}
					{/if}

					<!-- Debug Section -->
					{@const debugSectionId = getSectionId(row.rowKey, column, 'debug')}
					{@const debugExpansion = sectionExpansions[debugSectionId]}
					{#if debugExpansion}
						<VLMDebugSection
							data={variable}
							sectionId={debugSectionId}
							expanded={debugExpansion.expanded}
							onToggle={debugExpansion.onToggle}
						/>
					{/if}
				{:else}
					<!-- Simple value display -->
					<div class="text-foreground text-sm">
						{String(variable || '')}
					</div>
				{/if}
			{/if}
		</td>
	{/each}
</tr>
