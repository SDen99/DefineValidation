<script lang="ts">
	import type { WhereClauseDef } from '@sden99/cdisc-types/define-xml';

	/**
	 * InlineWhereClauseDisplay - View-only display of WhereClause metadata
	 *
	 * Shows formatted conditions inline within VLM cell
	 * Provides link to editing page for complex modifications
	 */
	let {
		whereClause,
		onNavigateToDetail
	}: {
		whereClause: WhereClauseDef | null | undefined;
		onNavigateToDetail?: () => void;
	} = $props();

	/**
	 * Format RangeCheck condition into readable text
	 */
	function formatCondition(rangeCheck: any): string {
		const itemOID = rangeCheck.ItemOID || rangeCheck['@_ItemOID'] || '';
		const comparator = rangeCheck.Comparator || rangeCheck['@_Comparator'] || '';

		// Extract variable name from ItemOID (e.g., "IT.ADAG.PARAMCD" -> "PARAMCD")
		const varName = itemOID.split('.').pop() || itemOID;

		// Get check values
		const checkValues = rangeCheck.CheckValues || [];
		const values = checkValues
			.map((cv: any) => cv.CheckValue || cv)
			.filter(Boolean)
			.join(', ');

		// Format based on comparator
		if (comparator === 'IN') {
			return `${varName} IN (${values})`;
		} else if (comparator === 'NOTIN') {
			return `${varName} NOT IN (${values})`;
		} else if (comparator === 'EQ') {
			return `${varName} = ${values}`;
		} else if (comparator === 'NE') {
			return `${varName} ≠ ${values}`;
		} else if (comparator === 'GT') {
			return `${varName} > ${values}`;
		} else if (comparator === 'GE') {
			return `${varName} ≥ ${values}`;
		} else if (comparator === 'LT') {
			return `${varName} < ${values}`;
		} else if (comparator === 'LE') {
			return `${varName} ≤ ${values}`;
		} else {
			return `${varName} ${comparator} ${values}`;
		}
	}

	const formattedConditions = $derived.by(() => {
		if (!whereClause?.RangeChecks) return [];
		return whereClause.RangeChecks.map(formatCondition);
	});
</script>

{#if whereClause}
	<div class="rounded-md border border-border bg-muted/30 p-3 text-xs break-words">
		<div class="mb-2 flex items-center justify-between gap-2">
			<span class="font-semibold text-foreground">WhereClause</span>
			{#if onNavigateToDetail}
				<button
					onclick={onNavigateToDetail}
					class="text-primary hover:underline flex-shrink-0"
					title="Edit conditions (redirects to editing page)"
				>
					→ Edit
				</button>
			{/if}
		</div>

		{#if formattedConditions.length > 0}
			<div class="space-y-1.5">
				<div class="font-medium text-foreground">Conditions:</div>
				{#each formattedConditions as condition, i}
					<div class="flex items-start gap-2">
						{#if i > 0}
							<span class="font-medium text-primary flex-shrink-0">AND</span>
						{/if}
						<div class="flex-1 rounded bg-background/50 px-2 py-1 font-mono text-foreground ring-1 ring-purple-200 dark:ring-purple-700 break-words">
							{condition}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="italic text-muted-foreground/50">No conditions defined</div>
		{/if}
	</div>
{:else}
	<div class="rounded-md border border-border bg-muted/30 p-3 text-xs">
		<span class="italic text-muted-foreground/50">WhereClause not found</span>
	</div>
{/if}
