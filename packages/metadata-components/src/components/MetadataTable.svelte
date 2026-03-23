<!-- MetadataTable.svelte - Clean implementation using Direct Values Pattern -->
<script lang="ts">
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '@sden99/ui-components';
	import { Button } from '@sden99/ui-components';
	import { Badge } from '@sden99/ui-components';

	import { ChevronDown, ChevronRight } from '@lucide/svelte/icons';
	import { hasCodelist, handleExpandToggle } from '../utils/expansionUtils';
	import type { ValueLevelMetadata } from '@sden99/data-processing';

	// Props - following "dumb component" pattern
	let { datasetName, filteredVariables, expansionStates } = $props<{
		datasetName: string;
		filteredVariables: ValueLevelMetadata[];
		expansionStates: {
			expandedVariableIds: Set<string>;
			methodExpansions: Set<string>;
			codelistExpansions: Set<string>;
			commentsExpansions: Set<string>;
		};
	}>();

	// Helper functions using pre-computed state
	function getUniqueKey(variable: ValueLevelMetadata): string {
		return variable.variable.oid + (variable.whereClause?.oid || '');
	}

	function isVariableExpanded(variable: ValueLevelMetadata): boolean {
		const uniqueKey = getUniqueKey(variable);
		return expansionStates.expandedVariableIds.has(uniqueKey);
	}

	function isMethodExpanded(variable: ValueLevelMetadata): boolean {
		const uniqueKey = getUniqueKey(variable);
		return expansionStates.methodExpansions.has(uniqueKey);
	}

	function isCodelistExpanded(variable: ValueLevelMetadata): boolean {
		const uniqueKey = getUniqueKey(variable);
		return expansionStates.codelistExpansions.has(uniqueKey);
	}

	function isCommentsExpanded(variable: ValueLevelMetadata): boolean {
		const uniqueKey = getUniqueKey(variable);
		return expansionStates.commentsExpansions.has(uniqueKey);
	}

	function toggleExpansion(variable: ValueLevelMetadata) {
		handleExpandToggle(variable, datasetName);
	}

	// Helper to get the display text for origin
	function getOriginDisplay(variable: ValueLevelMetadata): string {
		if (variable.variable.origin.type) {
			return variable.variable.origin.type;
		}
		if (variable.variable.origin.source) {
			return variable.variable.origin.source;
		}
		return '-';
	}
</script>

<div class="metadata-table-wrapper overflow-auto rounded-lg border" style="height: calc(100vh - 350px);">
	<Table>
		<TableHeader class="bg-muted sticky top-0 z-10">
			<TableRow class="bg-muted/50 border-b">
				<TableHead class="w-16 p-2 text-xs font-medium text-foreground">Order</TableHead>
				<TableHead class="font-semibold text-foreground">Variable</TableHead>
				<TableHead class="font-semibold text-foreground">Type</TableHead>
				<TableHead class="font-semibold text-foreground">Length</TableHead>
				<TableHead class="font-semibold text-foreground">Origin</TableHead>
				<TableHead class="font-semibold text-foreground">Mandatory</TableHead>
				<TableHead class="font-semibold text-foreground">Description</TableHead>
			</TableRow>
		</TableHeader>

		<TableBody class="bg-background">
			{#each filteredVariables as variable (getUniqueKey(variable))}
				<!-- Main variable row -->
				<TableRow class="hover:bg-muted/50 border-b transition-colors">
					<TableCell class="w-16 p-2">
						<div class="flex items-center gap-1">
							<span class="min-w-0 font-mono text-sm font-medium text-foreground">
								{variable.variable.orderNumber || '-'}
							</span>
							{#if variable.method || hasCodelist(variable) || variable.comments?.length}
								<Button
									variant="ghost"
									size="sm"
									class="h-5 w-5 flex-shrink-0 p-0"
									onclick={() => toggleExpansion(variable)}
								>
									{#if isVariableExpanded(variable)}
										<ChevronDown class="h-3 w-3 text-foreground" />
									{:else}
										<ChevronRight class="h-3 w-3 text-foreground" />
									{/if}
								</Button>
							{/if}
						</div>
					</TableCell>

					<TableCell class="font-mono text-sm font-medium text-foreground">
						<div class="flex items-center gap-2">
							{variable.variable.name}
							{#if variable.variable.keySequence}
								<Badge
									variant="default"
									class="bg-primary px-1.5 py-0.5 text-xxs font-bold text-primary-foreground"
								>
									K{variable.variable.keySequence}
								</Badge>
							{/if}
							{#if variable.whereClause}
								<Badge variant="outline" class="px-1.5 py-0.5 text-xxs">Where</Badge>
							{/if}
							{#if hasCodelist(variable)}
								<Badge variant="secondary" class="px-1.5 py-0.5 text-xxs">CL</Badge>
							{/if}
							{#if variable.method}
								<Badge variant="secondary" class="px-1.5 py-0.5 text-xxs">M</Badge>
							{/if}
							{#if variable.comments?.length}
								<Badge variant="secondary" class="px-1.5 py-0.5 text-xxs">C</Badge>
							{/if}
						</div>
					</TableCell>

					<TableCell class="text-sm text-foreground">{variable.variable.dataType}</TableCell>
					<TableCell class="text-sm text-foreground">{variable.variable.length || '-'}</TableCell>
					<TableCell class="text-sm text-foreground">{getOriginDisplay(variable)}</TableCell>
					<TableCell class="text-sm">
						{#if variable.variable.mandatory}
							<Badge variant="outline" class="border-destructive text-destructive">Yes</Badge>
						{:else}
							<span class="text-muted-foreground">No</span>
						{/if}
					</TableCell>
					<TableCell class="text-sm text-foreground">{variable.variable.description || '-'}</TableCell>
				</TableRow>

				<!-- Expanded details row -->
				{#if isVariableExpanded(variable)}
					<TableRow class="bg-muted/20 border-b">
						<TableCell colspan={7} class="p-0">
							<div class="space-y-4 p-4">
								<!-- Method section -->
								{#if variable.method && isMethodExpanded(variable)}
									<div class="bg-card space-y-2 rounded border border-border p-3 shadow-sm">
										<h4 class="text-foreground text-sm font-semibold">
											Method: {variable.method.Name || variable.method.OID}
										</h4>
										{#if variable.method.Description}
											<p class="text-foreground text-sm whitespace-pre-wrap">
												{variable.method.Description}
											</p>
										{:else}
											<p class="text-muted-foreground text-sm italic">No method description.</p>
										{/if}
									</div>
								{/if}

								<!-- Codelist section -->
								{#if hasCodelist(variable) && isCodelistExpanded(variable)}
									{@const codeList = variable.codeList}
									{#if codeList}
										<div class="bg-card space-y-2 rounded border border-border p-3 shadow-sm">
											<h4 class="text-foreground text-sm font-semibold">
												CodeList: {codeList.name || codeList.oid}
											</h4>
											{#if codeList.items?.length}
												<div class="max-h-60 space-y-1 overflow-y-auto pr-2">
													{#each codeList.items as item (item.codedValue)}
														<div class="grid grid-cols-[auto,1fr] items-center gap-2 text-sm">
															<code class="bg-muted rounded px-1.5 py-0.5 text-xs text-foreground whitespace-nowrap"
																>{item.codedValue}</code
															>
															<div class="text-foreground min-w-0 truncate">
																{item.decode ?? '-'}
															</div>
														</div>
													{/each}
												</div>
											{:else}
												<p class="text-muted-foreground text-sm italic">
													No items found in codelist.
												</p>
											{/if}
										</div>
									{/if}
								{/if}

								<!-- Where clause section (if present) -->
								{#if variable.whereClause}
									<div class="bg-card space-y-2 rounded border border-border p-3 shadow-sm">
										<h4 class="text-foreground text-sm font-semibold">
											Where Clause: {variable.whereClause.oid}
										</h4>
										{#if variable.whereClause.conditions?.length}
											<div class="space-y-1">
												{#each variable.whereClause.conditions as condition}
													<div class="text-foreground text-sm">
														{condition.variable}
														{condition.comparator}
														{condition.checkValues.join(', ')}
													</div>
												{/each}
											</div>
										{/if}
									</div>
								{/if}

								<!-- Comments section (if present) -->
								{#if variable.comments?.length && isCommentsExpanded(variable)}
									<div class="bg-card space-y-2 rounded border border-border p-3 shadow-sm">
										<h4 class="text-foreground text-sm font-semibold">Comments</h4>
										{#each variable.comments as comment}
											<p class="text-foreground text-sm whitespace-pre-wrap">
												{comment.description}
											</p>
										{/each}
									</div>
								{/if}
							</div>
						</TableCell>
					</TableRow>
				{/if}
			{/each}
		</TableBody>
	</Table>
</div>

<style>
	/* Disable the Table component's inner overflow wrapper - we handle scrolling at the parent level */
	.metadata-table-wrapper :global(> div) {
		overflow: visible !important;
	}
</style>