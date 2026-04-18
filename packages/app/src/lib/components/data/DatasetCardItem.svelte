<script lang="ts">
	import {
		Database,
		FileText,
		Files,
		Trash2,
		Loader2,
		AlertCircle,
		ChevronDown,
		CircleCheck
	} from '@lucide/svelte/icons';
	import * as Button from '@sden99/ui-components';
	import { Progress } from '@sden99/ui-components';
	import * as Tooltip from '$lib/components/core/tooltip';
	import { Badge } from '@sden99/ui-components';
	import type { ItemGroup } from '@sden99/cdisc-types/define-xml';
	import { getClassAbbreviation } from '$lib/utils/metadata/datasetClasses';

	const {
		datasetId,
		displayName,
		datasetState,
		metadata,
		isSelected,
		isDeleted = false,
		validationIssueCount = 0,
		hasValidationRun = false,
		onDelete,
		onClick
	} = $props<{
		datasetId: string;
		displayName: string;
		datasetState: {
			isLoading: boolean;
			error?: string;
			hasData: boolean;
			hasMetadata: boolean;
			progress: number;
		};
		metadata: ItemGroup | null;
		isSelected: boolean;
		isDeleted?: boolean;
		validationIssueCount?: number;
		hasValidationRun?: boolean;
		onDelete: () => void;
		onClick: () => void;
	}>();

	// --- THIS IS THE FIX: All variables depending on props are now derived. ---

	const stateInfo = $derived.by(() => {
		if (isDeleted) {
			return {
				type: 'deleted' as const,
				tooltip: 'Marked for Deletion',
				icon: AlertCircle,
				iconClass: 'text-destructive'
			};
		}
		if (datasetState.isLoading) {
			return {
				type: 'loading' as const,
				tooltip: 'Loading Dataset',
				icon: Loader2,
				iconClass: 'text-muted-foreground animate-spin'
			};
		}
		if (datasetState.error) {
			return {
				type: 'error' as const,
				tooltip: datasetState.error,
				icon: AlertCircle,
				iconClass: 'text-destructive'
			};
		}
		if (datasetState.hasData && datasetState.hasMetadata) {
			return {
				type: 'both' as const,
				tooltip: 'Data + Metadata Available',
				icon: Files,
				iconClass: 'text-primary'
			};
		}
		if (datasetState.hasData) {
			return {
				type: 'data' as const,
				tooltip: 'Data Only',
				icon: Database,
				iconClass: 'text-primary'
			};
		}
		return {
			type: datasetState.hasMetadata ? ('metadata' as const) : ('unknown' as const),
			tooltip: datasetState.hasMetadata ? 'Metadata Only' : 'No Data/Metadata',
			icon: datasetState.hasMetadata ? FileText : AlertCircle,
			iconClass: datasetState.hasMetadata ? 'text-muted-foreground' : 'text-destructive'
		};
	});

	const Icon = $derived(stateInfo.icon);
	const isClickable = $derived(
		(datasetState.hasData || datasetState.hasMetadata) && !datasetState.isLoading
	);

	const containerClass = $derived(
		`${'overflow-hidden rounded-lg transition-colors duration-150'} ${
			isDeleted
				? 'border-2 border-destructive bg-destructive/10 opacity-60'
				: isSelected
					? 'border-2 border-primary bg-primary/15 border-l-4 border-l-primary'
					: isClickable
						? 'border border-border hover:bg-accent hover:border-primary/50'
						: 'border border-border'
		}`
	);

	const hasAdditionalMetadata = $derived(
		Boolean(
			metadata?.IsReferenceData || metadata?.Purpose || metadata?.Repeating || metadata?.Structure
		)
	);

	// These are fine as they are not derived from props.
	let isExpanded = $state(false);
	const toggleExpand = (event: MouseEvent) => {
		event.stopPropagation();
		isExpanded = !isExpanded;
	};
	const tooltipText = $derived(isExpanded ? 'Fewer details' : 'More details');

	const handleClick = (event: MouseEvent) => {
		if (
			event.target instanceof Element &&
			!event.target.closest('[data-interactive]') &&
			isClickable
		) {
			onClick();
		}
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if ((event.key === 'Enter' || event.key === ' ') && isClickable) {
			event.preventDefault();
			onClick();
		}
	};
</script>

<!-- Fixed: Changed from button to div to prevent nested button issues -->
<div
	class="{containerClass} w-full text-left {!isClickable
		? 'cursor-not-allowed opacity-70'
		: 'cursor-pointer'}"
	onclick={handleClick}
	onkeydown={handleKeyDown}
	role="button"
	tabindex="0"
	aria-pressed={isSelected}
	aria-label="Select dataset {displayName}"
>
	<div
		class="flex flex-col p-3 shadow-sm {isSelected
			? 'border-primary/50 bg-primary/5 border'
			: !isClickable
				? 'border-border bg-muted/20 border'
				: 'border-border bg-card border'}"
	>
		<!-- Main Content -->
		<div class="flex items-center justify-between">
			<div class="flex flex-1 items-center gap-2 overflow-hidden">
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<span class="inline-block flex-shrink-0">
								<Icon class="h-4 w-4 {stateInfo.iconClass}" />
							</span>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>{stateInfo.tooltip}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				<span class="text-foreground truncate text-base font-medium">{displayName}</span>
			</div>

			<!-- Actions Section -->
			<div class="flex flex-shrink-0 items-center gap-2 pl-2">
				{#if hasValidationRun && validationIssueCount > 0}
					<span
						class="bg-destructive text-destructive-foreground inline-flex h-[14px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[8px] font-semibold"
						title="{validationIssueCount} validation {validationIssueCount === 1
							? 'issue'
							: 'issues'}"
					>
						{validationIssueCount}
					</span>
				{:else if hasValidationRun && validationIssueCount === 0}
					<span title="No validation issues">
						<CircleCheck class="h-4 w-4 text-green-500" />
					</span>
				{/if}

				{#if metadata?.Class}
					<span
						class="border-border bg-primary/10 text-card-foreground text-xxs inline-block rounded-md border px-1.5 py-0.5 font-normal"
						title={metadata.Class}
					>
						{getClassAbbreviation(metadata.Class)}
					</span>
				{/if}

				{#if datasetState.hasData && !datasetState.isLoading}
					<Button.Button
						variant="ghost"
						size="icon"
						class="text-muted-foreground hover:text-destructive h-8 w-8"
						onclick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
						data-delete-button
						data-interactive
						aria-label="Delete dataset {displayName}"
					>
						<Trash2 class="h-4 w-4" />
					</Button.Button>
				{/if}
			</div>
		</div>

		<!-- Description -->
		<div class="mt-1.5 flex items-start justify-between gap-2">
			{#if metadata?.Description}
				<p class="text-muted-foreground line-clamp-2 flex-1 text-sm">{metadata.Description}</p>
			{:else}
				<div class="flex-1"></div>
			{/if}

			{#if hasAdditionalMetadata && !datasetState.isLoading}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Button.Button
								variant="ghost"
								size="icon"
								class="text-muted-foreground ml-auto h-6 w-6 flex-shrink-0"
								onclick={toggleExpand}
								data-expand-button
								data-interactive
								aria-label={tooltipText}
								aria-expanded={isExpanded}
							>
								<ChevronDown
									class="h-4 w-4 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
								/>
							</Button.Button>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>{tooltipText}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if}
		</div>

		<!-- Loading Progress -->
		{#if datasetState.isLoading && datasetState.progress > 0}
			<div class="mt-2">
				<Progress value={datasetState.progress} max={100} class="h-1" />
			</div>
		{/if}

		<!-- Expanded Metadata -->
		{#if isExpanded && hasAdditionalMetadata}
			<div class="mt-3 space-y-2 text-sm">
				{#if metadata?.IsReferenceData}
					<div class="flex items-center gap-2">
						<span class="text-muted-foreground">Reference Data:</span>
						<Badge variant="outline" class="text-xs">
							{metadata.IsReferenceData}
						</Badge>
					</div>
				{/if}

				{#if metadata?.Purpose}
					<div>
						<span class="text-muted-foreground">Purpose:</span>
						<span class="text-foreground ml-2">{metadata.Purpose}</span>
					</div>
				{/if}

				{#if metadata?.Repeating}
					<div>
						<span class="text-muted-foreground">Repeating:</span>
						<span class="text-foreground ml-2">{metadata.Repeating}</span>
					</div>
				{/if}

				{#if metadata?.Structure}
					<div>
						<span class="text-muted-foreground">Structure:</span>
						<span class="text-foreground ml-2">{metadata.Structure}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
