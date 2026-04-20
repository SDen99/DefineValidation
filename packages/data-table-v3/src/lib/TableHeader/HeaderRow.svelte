<script lang="ts">
	/**
	 * HeaderRow - Column headers with drag-drop, resize, sort, and chart mode toggles
	 */

	import ResizeHandle from '@sden99/table-components/ResizeHandle.svelte';
	import { ChartModeDropdown } from '../components/chart-filters';
	import type { ColumnConfig } from '../types/columns';
	import type { SortConfig } from '../types/sorting';
	import type { ChartDisplayMode } from '../components/chart-filters/NumericalChart.svelte';
	import type { ValidationCheckDetail, ColumnValidationInfo } from '../types/validation';

	interface Props {
		columns: ColumnConfig[];
		columnWidths: Record<string, number>;
		sortConfigs: SortConfig[];
		distributionTypes: Map<string, 'categorical' | 'numerical' | 'date'>;
		showChartFilters: boolean;
		chartDisplayModes: Map<string, ChartDisplayMode>;
		draggedColumnId: string | null;
		dragOverColumnId: string | null;
		validationResults?: Map<string, ColumnValidationInfo>;
		columnLabels?: Record<string, string>;

		// Actions
		onSort: (columnId: string) => void;
		onResize: (columnId: string, width: number) => void;
		onAutoFit: (columnId: string) => void;
		onChartModeChange: (columnId: string, mode: ChartDisplayMode) => void;
		onDragStart: (e: DragEvent, columnId: string) => void;
		onDragOver: (e: DragEvent, columnId: string) => void;
		onDragLeave: () => void;
		onDrop: (e: DragEvent, columnId: string) => void;
		onDragEnd: () => void;
		onValidationBadgeClick?: (columnId: string, affectedRows: number[], ruleId?: string) => void;
	}

	let {
		columns,
		columnWidths,
		sortConfigs,
		distributionTypes,
		showChartFilters,
		chartDisplayModes,
		draggedColumnId,
		dragOverColumnId,
		validationResults,
		columnLabels,
		onSort,
		onResize,
		onAutoFit,
		onChartModeChange,
		onDragStart,
		onDragOver,
		onDragLeave,
		onDrop,
		onDragEnd,
		onValidationBadgeClick
	}: Props = $props();

	// Only show visible columns
	const visibleColumns = $derived(columns.filter((c) => c.visible));

	function getSortDirection(columnId: string): 'asc' | 'desc' | null {
		const sortConfig = sortConfigs.find((s) => s.columnId === columnId);
		return sortConfig ? sortConfig.direction : null;
	}

	function getSortPriority(columnId: string): number | null {
		const index = sortConfigs.findIndex((s) => s.columnId === columnId);
		return index >= 0 ? index + 1 : null;
	}

	function getValidationInfo(columnId: string): ColumnValidationInfo | undefined {
		return validationResults?.get(columnId);
	}

	// Dropdown state for validation badge
	let openDropdownColumn = $state<string | null>(null);
	let dropdownPos = $state<{ top: number; left: number }>({ top: 0, left: 0 });

	function handleValidationClick(e: MouseEvent, columnId: string, affectedRows?: number[]) {
		e.stopPropagation();
		const validation = getValidationInfo(columnId);
		if (validation?.checks && validation.checks.length > 0) {
			// Has check-type breakdown — show dropdown
			if (openDropdownColumn === columnId) {
				openDropdownColumn = null;
			} else {
				const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
				dropdownPos = { top: rect.bottom + 4, left: rect.left };
				openDropdownColumn = columnId;
			}
		} else if (onValidationBadgeClick && affectedRows) {
			// No breakdown — fall back to original behavior
			onValidationBadgeClick(columnId, affectedRows);
		}
	}

	function handleCheckClick(columnId: string, check: ValidationCheckDetail) {
		openDropdownColumn = null;
		if (onValidationBadgeClick) {
			onValidationBadgeClick(columnId, check.affectedRows, check.ruleId);
		}
	}

	function getCheckLabel(checkType: string): string {
		switch (checkType) {
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
				return checkType || 'Check';
		}
	}

	// Close dropdown on outside click
	$effect(() => {
		if (!openDropdownColumn) return;
		function onClickOutside() {
			openDropdownColumn = null;
		}
		const timer = setTimeout(() => {
			document.addEventListener('click', onClickOutside);
		}, 0);
		return () => {
			clearTimeout(timer);
			document.removeEventListener('click', onClickOutside);
		};
	});
</script>

<tr>
	{#each visibleColumns as column (column.id)}
		{@const width = columnWidths[column.id] || column.width || 150}
		{@const isDragging = draggedColumnId === column.id}
		{@const isDragOver = dragOverColumnId === column.id}
		{@const sortDirection = getSortDirection(column.id)}
		{@const sortPriority = getSortPriority(column.id)}
		{@const isActive = sortDirection !== null}
		{@const validation = getValidationInfo(column.id)}

		<th
			class="relative border border-border px-2 py-2 text-left text-foreground font-semibold text-sm cursor-grab transition-all duration-150"
			class:opacity-50={isDragging}
			class:drag-over={isDragOver}
			style="width: {width}px; min-width: {width}px;"
			draggable={true}
			ondragstart={(e) => onDragStart(e, column.id)}
			ondragover={(e) => onDragOver(e, column.id)}
			ondragleave={onDragLeave}
			ondrop={(e) => onDrop(e, column.id)}
			ondragend={onDragEnd}
		>
			<div class="flex items-center justify-between gap-1">
				{#if column.sortable}
					<button
						onclick={() => onSort(column.id)}
						class="flex items-center gap-1 flex-1 min-w-0 hover:text-primary transition-colors cursor-pointer"
						title={columnLabels?.[column.id] || column.header}
					>
						<span class="truncate">{column.header}</span>

						{#if isActive}
							<div class="sort-badge active" title="Click to sort">
								<span class="sort-arrow">{sortDirection === 'asc' ? '↑' : '↓'}</span>
								{#if sortPriority !== null && sortConfigs.length > 1}
									<sup class="sort-super">{sortPriority}</sup>
								{/if}
							</div>
						{:else}
							<div class="sort-badge inactive" title="Click to sort">
								<span class="sort-arrow">↕</span>
							</div>
						{/if}
					</button>
				{:else}
					<span class="truncate flex-1 min-w-0" title={columnLabels?.[column.id] || column.header}>{column.header}</span>
				{/if}

				<!-- Validation Badge -->
				{#if validation && validation.issueCount > 0}
					<button
						class="validation-badge"
						class:error={validation.severity === 'error'}
						class:warning={validation.severity === 'warning'}
						class:info={validation.severity === 'info'}
						onclick={(e) => handleValidationClick(e, column.id, validation.affectedRows)}
						title="{validation.issueCount} validation {validation.issueCount === 1
							? 'issue'
							: 'issues'}"
					>
						{validation.issueCount}
					</button>
				{/if}

				<!-- Chart Mode Toggle -->
				{#if showChartFilters && distributionTypes.get(column.id) === 'numerical'}
					<ChartModeDropdown
						mode={chartDisplayModes.get(column.id) ?? 'bar'}
						onModeChange={(mode) => onChartModeChange(column.id, mode)}
					/>
				{/if}
			</div>

			<!-- Resize Handle -->
			{#if column.resizable}
				<ResizeHandle
					onResize={(width) => onResize(column.id, width)}
					onAutoFit={() => onAutoFit(column.id)}
				/>
			{/if}
		</th>
	{/each}
</tr>

<!-- Fixed-position validation dropdown (escapes table overflow) -->
{#if openDropdownColumn}
	{@const dropdownValidation = getValidationInfo(openDropdownColumn)}
	{#if dropdownValidation?.checks}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="validation-dropdown"
			style="position: fixed; top: {dropdownPos.top}px; left: {dropdownPos.left}px; z-index: 9999;"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="dropdown-header">
				{openDropdownColumn} — Validation Issues
			</div>
			{#each dropdownValidation.checks as check}
				<button class="dropdown-item" onclick={() => handleCheckClick(openDropdownColumn!, check)}>
					<span class="dropdown-item-label">
						<span
							class="severity-dot"
							class:error={check.severity === 'error'}
							class:warning={check.severity === 'warning'}
							class:info={check.severity === 'info'}
						></span>
						<span>{getCheckLabel(check.checkType)}</span>
					</span>
					<span class="dropdown-item-count">{check.issueCount}</span>
				</button>
			{/each}
		</div>
	{/if}
{/if}

<style>
	/* Sort badge styling */
	.sort-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		font-size: 11px;
		font-weight: 600;
		border-radius: 0.25rem;
		transition: all 0.15s;
		user-select: none;
		position: relative;
	}

	.sort-badge.active {
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.sort-badge.inactive {
		background: transparent;
		color: var(--color-muted-foreground);
		opacity: 0.4;
	}

	.sort-badge:hover {
		opacity: 1;
	}

	.sort-arrow {
		line-height: 1;
	}

	.sort-super {
		font-size: 8px;
		font-weight: 700;
		line-height: 1;
		position: absolute;
		top: 2px;
		right: 2px;
	}

	/* Drag and drop styling */
	.drag-over {
		border-left: 3px solid var(--color-primary, #3b82f6) !important;
		background: color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent);
	}

	th[draggable='true']:active {
		cursor: grabbing;
	}

	/* Validation badge styling */
	.validation-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 14px;
		height: 10px;
		padding: 0 3px;
		font-size: 6px;
		font-weight: 600;
		border-radius: 7px;
		cursor: pointer;
		transition: all 0.15s;
		user-select: none;
		flex-shrink: 0;
	}

	.validation-badge.error {
		background: hsl(0 84% 60%);
		color: white;
	}

	.validation-badge.error:hover {
		background: hsl(0 84% 50%);
	}

	.validation-badge.warning {
		background: hsl(45 93% 47%);
		color: hsl(45 93% 15%);
	}

	.validation-badge.warning:hover {
		background: hsl(45 93% 40%);
	}

	.validation-badge.info {
		background: hsl(217 91% 60%);
		color: white;
	}

	.validation-badge.info:hover {
		background: hsl(217 91% 50%);
	}

	/* Validation dropdown */
	.validation-dropdown {
		min-width: 200px;
		border-radius: 6px;
		border: 1px solid var(--color-border, hsl(220 13% 91%));
		background: var(--color-popover, white);
		padding: 4px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		font-family: inherit;
	}

	.dropdown-header {
		padding: 4px 8px 6px;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-muted-foreground, hsl(220 8.9% 46.1%));
		border-bottom: 1px solid var(--color-border, hsl(220 13% 91%));
		margin-bottom: 4px;
	}

	.dropdown-item {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		border-radius: 4px;
		padding: 6px 8px;
		font-size: 12px;
		cursor: pointer;
		transition: background 0.1s;
		border: none;
		background: transparent;
		color: var(--color-foreground, inherit);
	}

	.dropdown-item:hover {
		background: var(--color-muted, hsl(220 14.3% 95.9%));
	}

	.dropdown-item-label {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.dropdown-item-count {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.severity-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.severity-dot.error {
		background: hsl(0 84% 60%);
	}

	.severity-dot.warning {
		background: hsl(45 93% 47%);
	}

	.severity-dot.info {
		background: hsl(217 91% 60%);
	}
</style>
