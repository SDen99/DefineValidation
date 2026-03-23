<script lang="ts">
	import type { VLMCell } from '$lib/utils/metadata/vlmTableTransform';
	import { metadataEditState as editState, type DefineType } from '$lib/core/state/metadata/editState.svelte';
	import { page } from '$app/stores';
	import type { ParsedDefineXML } from '@sden99/cdisc-types';
	import InlineMethodDisplay from '$lib/components/metadata/shared/InlineMethodDisplay.svelte';
	import InlineCodeListDisplay from '$lib/components/metadata/shared/InlineCodeListDisplay.svelte';
	import InlineWhereClauseDisplay from '$lib/components/metadata/shared/InlineWhereClauseDisplay.svelte';
	import InlineCommentDisplay from '$lib/components/metadata/shared/InlineCommentDisplay.svelte';

	/**
	 * VLMCell - Display and navigate metadata references for a VLM cell
	 *
	 * Shows badges for:
	 * - M: Method
	 * - CL: CodeList
	 * - WC: WhereClause
	 * - C: Comment
	 *
	 * Features:
	 * - Click badges to toggle inline display OR navigate to detail pages
	 * - Show edit indicators (orange dots) for modified items
	 * - Empty state for cells without VLM data
	 * - Inline view of metadata (Phase 1: view-only)
	 */

	let {
		cell = null,
		defineData = null,
		defineType = 'adam',
		onNavigateToMethod,
		onNavigateToCodeList,
		onNavigateToWhereClause,
		onNavigateToComment,
		editMode = false,
		showWhereClause = true
	}: {
		cell: VLMCell | null | undefined;
		defineData?: ParsedDefineXML | null;
		defineType?: DefineType;
		onNavigateToMethod?: (oid: string) => void;
		onNavigateToCodeList?: (oid: string) => void;
		onNavigateToWhereClause?: (oid: string) => void;
		onNavigateToComment?: (oid: string) => void;
		editMode?: boolean;
		showWhereClause?: boolean;
	} = $props();

	// Expansion state for inline metadata display
	type MetadataType = 'method' | 'codelist' | 'whereclause' | 'comment';
	let expandedMetadata = $state<Set<MetadataType>>(new Set());

	/**
	 * Toggle expansion for a metadata type
	 */
	function toggleExpansion(type: MetadataType) {
		if (expandedMetadata.has(type)) {
			expandedMetadata.delete(type);
		} else {
			expandedMetadata.add(type);
		}
		expandedMetadata = new Set(expandedMetadata); // Trigger reactivity
	}

	/**
	 * Check if metadata type is expanded
	 */
	function isExpanded(type: MetadataType): boolean {
		return expandedMetadata.has(type);
	}

	// Fetch metadata objects by OID from defineData
	const methodObj = $derived(
		cell?.methodOID && defineData?.Methods
			? defineData.Methods.find((m) => m.OID === cell.methodOID)
			: null
	);

	const codelistObj = $derived(
		cell?.codeListOID && defineData?.CodeLists
			? defineData.CodeLists.find((cl) => cl.OID === cell.codeListOID)
			: null
	);

	const whereclauseObj = $derived(
		cell?.whereClauseOID && defineData?.WhereClauseDefs
			? defineData.WhereClauseDefs.find((wc) => wc.OID === cell.whereClauseOID)
			: null
	);

	const commentObj = $derived(
		cell?.commentOID && defineData?.Comments
			? defineData.Comments.find((c) => c.OID === cell.commentOID)
			: null
	);

	// Badge configurations with per-badge change detection
	const badges = $derived([
		{
			key: 'method',
			label: 'M',
			oid: cell?.methodOID,
			onClick: onNavigateToMethod,
			color: 'blue',
			metadataType: 'methods' as const,
			expansionKey: 'method' as MetadataType,
			metadataObj: methodObj
		},
		{
			key: 'codelist',
			label: 'CL',
			oid: cell?.codeListOID,
			onClick: onNavigateToCodeList,
			color: 'green',
			metadataType: 'codelists' as const,
			expansionKey: 'codelist' as MetadataType,
			metadataObj: codelistObj
		},
		{
			key: 'whereclause',
			label: 'WC',
			oid: cell?.whereClauseOID,
			onClick: onNavigateToWhereClause,
			color: 'purple',
			metadataType: 'whereclauses' as const,
			expansionKey: 'whereclause' as MetadataType,
			metadataObj: whereclauseObj
		},
		{
			key: 'comment',
			label: 'C',
			oid: cell?.commentOID,
			onClick: onNavigateToComment,
			color: 'amber',
			metadataType: 'comments' as const,
			expansionKey: 'comment' as MetadataType,
			metadataObj: commentObj
		}
	]);

	// Filter to only show badges that have values (and respect showWhereClause)
	const activeBadges = $derived(badges.filter((badge) => {
		if (!badge.oid) return false;
		if (badge.key === 'whereclause' && !showWhereClause) return false;
		return true;
	}));

	// Get color classes for badges with improved contrast
	function getBadgeClasses(color: string, isButton: boolean): string {
		const baseClasses = 'rounded px-2 py-0.5 text-xs font-medium';

		if (!isButton) {
			// Non-clickable badge with better dark mode contrast
			const colorMap: Record<string, string> = {
				blue: 'bg-blue-100 text-blue-900 dark:bg-blue-500/80 dark:text-white',
				green: 'bg-green-100 text-green-900 dark:bg-green-500/80 dark:text-white',
				purple: 'bg-purple-100 text-purple-900 dark:bg-purple-500/80 dark:text-white',
				amber: 'bg-amber-100 text-amber-900 dark:bg-amber-500/80 dark:text-white'
			};
			return `${baseClasses} ${colorMap[color] || colorMap.blue}`;
		}

		// Clickable badge button with better dark mode contrast
		const colorMapButton: Record<string, string> = {
			blue: 'bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-500/80 dark:text-white dark:hover:bg-blue-500',
			green:
				'bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-500/80 dark:text-white dark:hover:bg-green-500',
			purple:
				'bg-purple-100 text-purple-900 hover:bg-purple-200 dark:bg-purple-500/80 dark:text-white dark:hover:bg-purple-500',
			amber:
				'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-500/80 dark:text-white dark:hover:bg-amber-500'
		};
		return `${baseClasses} cursor-pointer transition-colors ${colorMapButton[color] || colorMapButton.blue}`;
	}
</script>

{#if !cell}
	<!-- Empty cell - no VLM for this parameter-variable combination -->
	<span class="text-muted-foreground">—</span>
{:else if activeBadges.length === 0}
	<!-- Cell exists but has no metadata references (rare case) -->
	<span class="text-xs text-muted-foreground">No metadata</span>
{:else}
	<!-- Display badges and inline metadata -->
	<div class="flex flex-col gap-2 max-w-full overflow-hidden">
		<!-- Badges Row -->
		<div class="flex flex-wrap items-center gap-1">
			{#each activeBadges as badge}
				{@const expanded = isExpanded(badge.expansionKey)}
				<!-- Clickable badge button - toggles inline expansion -->
				<button
					type="button"
					class={getBadgeClasses(badge.color, true)}
					onclick={() => toggleExpansion(badge.expansionKey)}
					title="{badge.key} (click to {expanded ? 'collapse' : 'expand'} inline view)"
				>
					<span class="flex items-center gap-1">
						{#if expanded}
							<span class="mr-0.5">▼</span>
						{:else}
							<span class="mr-0.5">▶</span>
						{/if}
						{badge.label}
					</span>
				</button>
			{/each}

			<!-- Variant indicator if multiple conditional ItemDefs exist -->
			{#if cell.variants && cell.variants.length > 1}
				<div class="ml-2 text-xs text-muted-foreground">
					<span class="italic">{cell.variants.length} conditional variants</span>
				</div>
			{/if}
		</div>

		<!-- Inline Metadata Displays (expanded state) -->
		{#each activeBadges as badge}
			{#if isExpanded(badge.expansionKey)}
				<div class="mt-1 break-words overflow-hidden">
					{#if badge.key === 'method'}
						<InlineMethodDisplay
							method={methodObj}
							{defineType}
							onNavigateToDetail={badge.onClick ? () => badge.onClick?.(badge.oid!) : undefined}
						/>
					{:else if badge.key === 'codelist'}
						<InlineCodeListDisplay
							codelist={codelistObj}
							{defineType}
							onNavigateToDetail={badge.onClick ? () => badge.onClick?.(badge.oid!) : undefined}
						/>
					{:else if badge.key === 'whereclause'}
						<InlineWhereClauseDisplay
							whereClause={whereclauseObj}
							onNavigateToDetail={badge.onClick ? () => badge.onClick?.(badge.oid!) : undefined}
						/>
					{:else if badge.key === 'comment'}
						<InlineCommentDisplay
							comment={commentObj}
							{defineType}
							onNavigateToDetail={badge.onClick ? () => badge.onClick?.(badge.oid!) : undefined}
						/>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
{/if}
