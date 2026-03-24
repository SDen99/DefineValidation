<script lang="ts">
	import type { VLMTableData, ParameterGroup } from '$lib/utils/metadata/vlmTableTransform';
	import { formatRowLabel } from '$lib/utils/metadata/vlmTableTransform';
	import VLMCell from './VLMCell.svelte';
	import { page } from '$app/stores';

	/**
	 * VLMTablePrototype - Editable Value-Level Metadata Table
	 *
	 * Displays a transposed table where:
	 * - Rows = Parameters (PARAMCD + stratification)
	 * - Columns = Variables
	 * - Cells = Metadata references (Method, CodeList, WhereClause, Comment)
	 *
	 * Features:
	 * - Parameter grouping with expand/collapse (Phase 1)
	 * - Variant count badges
	 * - Sticky header row and first column
	 * - Horizontal scrolling for wide tables
	 * - Badge-based navigation to metadata details
	 * - Inline metadata display (Phase 1: view-only)
	 */

	let {
		vlmData,
		defineData = null,
		defineType = 'adam',
		groupByParameter = true, // Toggle between grouped and flat view
		onNavigateToMethod = () => {},
		onNavigateToCodeList = () => {},
		onNavigateToWhereClause = () => {},
		onNavigateToComment = () => {}
	}: {
		vlmData: VLMTableData | null;
		defineData?: any; // ParsedDefineXML passed to VLMCell
		defineType?: 'adam' | 'sdtm';
		groupByParameter?: boolean;
		onNavigateToMethod?: (oid: string) => void;
		onNavigateToCodeList?: (oid: string) => void;
		onNavigateToWhereClause?: (oid: string) => void;
		onNavigateToComment?: (oid: string) => void;
	} = $props();

	// Expansion state for parameter groups (PARAMCD -> boolean)
	let expandedGroups = $state<Set<string>>(new Set());

	// Toggle parameter group expansion
	function toggleGroup(paramcd: string) {
		if (expandedGroups.has(paramcd)) {
			expandedGroups.delete(paramcd);
		} else {
			expandedGroups.add(paramcd);
		}
		expandedGroups = new Set(expandedGroups); // Trigger reactivity
	}

	// Check if group is expanded
	function isExpanded(paramcd: string): boolean {
		return expandedGroups.has(paramcd);
	}

	// Expand all groups
	function expandAll() {
		if (!vlmData) return;
		expandedGroups = new Set(vlmData.parameterGroups.map((g) => g.paramcd));
	}

	// Collapse all groups
	function collapseAll() {
		expandedGroups = new Set();
	}

</script>

{#if !vlmData}
	<div class="flex items-center justify-center p-12">
		<p class="text-muted-foreground">No VLM data available for this dataset</p>
	</div>
{:else if vlmData.rows.length === 0}
	<div class="flex items-center justify-center p-12">
		<p class="text-muted-foreground">
			No parameters defined in VLM for this dataset
		</p>
	</div>
{:else}
	<!-- Controls -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="text-sm text-muted-foreground">
				{#if groupByParameter}
					{vlmData.parameterGroups.length} parameters ({vlmData.rows.length} total rows)
				{:else}
					{vlmData.rows.length} rows
				{/if}
			</span>
			{#if vlmData?.isAmbiguous}
				<div class="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300" title={vlmData.ambiguityReason}>
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>Ambiguous Structure</span>
				</div>
			{:else if vlmData?.dominantVariable}
				<div class="inline-flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-xs text-green-700 dark:text-green-300" title={`${vlmData.stratificationCoverage}% of variables stratified by ${vlmData.dominantVariable}`}>
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>By {vlmData.dominantVariable}</span>
				</div>
			{/if}
		</div>
		{#if groupByParameter}
			<div class="flex items-center gap-2">
				<button
					onclick={expandAll}
					class="rounded border px-3 py-1 text-sm hover:bg-muted"
				>
					Expand All
				</button>
				<button
					onclick={collapseAll}
					class="rounded border px-3 py-1 text-sm hover:bg-muted"
				>
					Collapse All
				</button>
			</div>
		{/if}
	</div>

	<!-- VLM Table Container -->
	<div class="vlm-table-container h-full overflow-auto">
		<table class="vlm-table w-full border-collapse">
			<!-- Header Row -->
			<thead>
				<tr>
					<!-- Parameter Column Header (sticky) -->
					<th
						class="sticky left-0 top-0 z-20 border-b border-r bg-muted px-4 py-3 text-left text-sm font-semibold"
					>
						Parameter
					</th>

					<!-- Variable Column Headers (sticky top) -->
					{#each vlmData.variables as variable}
						<th
							class="sticky top-0 z-10 min-w-[200px] max-w-[400px] border-b bg-muted px-4 py-3 text-left text-sm font-semibold"
							title={variable.label}
						>
							<div class="flex flex-col gap-1">
								<span>{variable.name}</span>
								<span class="text-xs font-normal text-muted-foreground">
									{variable.dataType}
								</span>
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			<!-- Data Rows -->
			<tbody>
				{#if groupByParameter}
					<!-- GROUPED VIEW: Rows grouped by PARAMCD with expand/collapse -->
					{#each vlmData.parameterGroups as group}
						{@const expanded = isExpanded(group.paramcd)}
						{@const baseLabel = formatRowLabel(group.baseRow)}

						<!-- Base Row (always visible) -->
						<tr class="border-b hover:bg-muted/50">
							<!-- Parameter Cell with expand/collapse -->
							<td
								class="sticky left-0 z-10 border-r bg-background px-4 py-3 text-sm"
							>
								<div class="flex items-start gap-2">
									<!-- Expand/Collapse Button -->
									{#if group.variantCount > 0}
										<button
											onclick={() => toggleGroup(group.paramcd)}
											class="mt-1 flex-shrink-0 text-muted-foreground hover:text-foreground"
											aria-label={expanded ? 'Collapse' : 'Expand'}
										>
											{#if expanded}
												▼
											{:else}
												▶
											{/if}
										</button>
									{:else}
										<span class="mt-1 w-4"></span>
									{/if}

									<!-- Parameter Info -->
									<div class="flex flex-col gap-1">
										<div class="font-mono font-bold text-foreground">{baseLabel.code}</div>
										<div class="text-xs text-muted-foreground">{baseLabel.description}</div>

										<!-- Variant Count Badge -->
										{#if group.variantCount > 0}
											<div class="mt-1 flex items-center gap-1">
												<span
													class="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
													title="{group.variantCount} stratification variant(s)"
												>
													{group.variantCount} variant{group.variantCount > 1 ? 's' : ''}
												</span>
												{#if group.stratificationSummary}
													<span class="text-xs text-muted-foreground">
														({group.stratificationSummary})
													</span>
												{/if}
											</div>
										{/if}

										<!-- Base Row Stratification (if any) -->
										{#if baseLabel.stratification}
											<div class="mt-1 flex items-center gap-1">
												<span class="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
													{baseLabel.stratification}
												</span>
											</div>
										{/if}
									</div>
								</div>
							</td>

							<!-- Variable Cells for Base Row -->
							{#each vlmData.variables as variable}
								{@const cell = group.baseRow.cells.get(variable.oid)}
								<td class="border-r px-4 py-3 text-sm max-w-[400px]">
									<VLMCell
										{cell}
										{defineData}
										{defineType}
										{onNavigateToMethod}
										{onNavigateToCodeList}
										{onNavigateToWhereClause}
										{onNavigateToComment}
										showWhereClause={true}
									/>
								</td>
							{/each}
						</tr>

						<!-- Variant Rows (shown when expanded) -->
						{#if expanded && group.variantRows.length > 0}
							{#each group.variantRows as variantRow}
								{@const variantLabel = formatRowLabel(variantRow)}
								<tr class="border-b bg-muted/30 hover:bg-muted/50">
									<!-- Parameter Cell (indented variant) -->
									<td
										class="sticky left-0 z-10 border-r bg-background px-4 py-3 text-sm"
									>
										<div class="flex items-start gap-2">
											<span class="mt-1 w-4"></span><!-- Spacer for alignment -->
											<div class="ml-4 flex flex-col gap-1">
												<div class="text-xs font-medium text-muted-foreground">Variant:</div>
												{#if variantLabel.stratification}
													<span class="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
														{variantLabel.stratification}
													</span>
												{/if}
											</div>
										</div>
									</td>

									<!-- Variable Cells for Variant Row -->
									{#each vlmData.variables as variable}
										{@const cell = variantRow.cells.get(variable.oid)}
										<td class="border-r bg-muted/30 px-4 py-3 text-sm max-w-[400px]">
											<VLMCell
												{cell}
												{defineData}
												{defineType}
												{onNavigateToMethod}
												{onNavigateToCodeList}
												{onNavigateToWhereClause}
												{onNavigateToComment}
												showWhereClause={true}
											/>
										</td>
									{/each}
								</tr>
							{/each}
						{/if}
					{/each}
				{:else}
					<!-- FLAT VIEW: All rows displayed individually (expanded mode) -->
					{#each vlmData.rows as row}
						{@const rowLabel = formatRowLabel(row)}
						<tr class="border-b hover:bg-muted/50">
							<!-- Parameter Cell -->
							<td
								class="sticky left-0 z-10 border-r bg-background px-4 py-3 text-sm"
							>
								<div class="flex flex-col gap-1">
									<div class="font-mono font-bold text-foreground">{rowLabel.code}</div>
									<div class="text-xs text-muted-foreground">{rowLabel.description}</div>
									<!-- Stratification (the expanded dimension values) -->
									{#if rowLabel.stratification}
										<div class="mt-1">
											<span class="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
												{rowLabel.stratification}
											</span>
										</div>
									{/if}
								</div>
							</td>

							<!-- Variable Cells -->
							{#each vlmData.variables as variable}
								{@const cell = row.cells.get(variable.oid)}
								<td class="border-r px-4 py-3 text-sm max-w-[400px]">
									<VLMCell
										{cell}
										{defineData}
										{defineType}
										{onNavigateToMethod}
										{onNavigateToCodeList}
										{onNavigateToWhereClause}
										{onNavigateToComment}
										showWhereClause={false}
									/>
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
</div>

{/if}

<style>
	/* Ensure proper z-index stacking for sticky elements */
	.vlm-table-container {
		position: relative;
	}

	.vlm-table th,
	.vlm-table td {
		/* Prevent text wrapping in cells */
		white-space: nowrap;
	}

	/* Sticky intersection styling */
	.vlm-table thead th:first-child {
		/* Top-left corner cell has highest z-index */
		z-index: 20 !important;
	}

	.vlm-table tbody td:first-child {
		/* Parameter cells stick to left */
		background-color: hsl(var(--background));
	}

	/* Dark mode support for sticky cells */
	:global(.dark) .vlm-table tbody td:first-child {
		background-color: hsl(var(--background));
	}
</style>
