<script lang="ts">
	import {
		Database,
		FileText,
		Files,
		Trash2,
		Loader2,
		AlertCircle,
		ChevronDown
	} from '@lucide/svelte/icons';
	import * as Button from '@sden99/ui-components';
	import { Progress } from '@sden99/ui-components';
	import * as Tooltip from '$lib/components/core/tooltip';
	import { Badge } from '@sden99/ui-components';
	import type { ItemGroup } from '@sden99/cdisc-types/define-xml';

	/**
	 * Pure presentational component for displaying dataset metadata in a compact card format.
	 * Works for both production (runtime data loading) and prototype (Define-XML editing) contexts.
	 */
	const {
		datasetId,
		displayName,
		metadata,
		// Optional runtime state (production context)
		isLoading = false,
		error = undefined,
		hasData = false,
		hasMetadata = true,
		progress = 0,
		// Optional edit state (prototype context)
		editMode = false,
		pendingChanges = {},
		isDeleted = false,
		// Display options
		isSelected = false,
		expandable = true,
		showArchiveInfo = false,
		// Event handlers
		onClick = undefined,
		onDelete = undefined,
		onEdit = undefined
	} = $props<{
		datasetId: string;
		displayName: string;
		metadata: ItemGroup | null;
		// Runtime state
		isLoading?: boolean;
		error?: string;
		hasData?: boolean;
		hasMetadata?: boolean;
		progress?: number;
		// Edit state
		editMode?: boolean;
		pendingChanges?: Record<string, any>;
		isDeleted?: boolean;
		// Display
		isSelected?: boolean;
		expandable?: boolean;
		showArchiveInfo?: boolean;
		// Events
		onClick?: () => void;
		onDelete?: () => void;
		onEdit?: (field: string, value: any) => void;
	}>();

	// State info derived from runtime/edit state
	const stateInfo = $derived.by(() => {
		if (isDeleted) {
			return {
				type: 'deleted' as const,
				tooltip: 'Marked for Deletion',
				icon: AlertCircle,
				iconClass: 'text-destructive'
			};
		}
		if (isLoading) {
			return {
				type: 'loading' as const,
				tooltip: 'Loading Dataset',
				icon: Loader2,
				iconClass: 'text-muted-foreground animate-spin'
			};
		}
		if (error) {
			return {
				type: 'error' as const,
				tooltip: error,
				icon: AlertCircle,
				iconClass: 'text-destructive'
			};
		}
		if (hasData && hasMetadata) {
			return {
				type: 'both' as const,
				tooltip: 'Data + Metadata Available',
				icon: Files,
				iconClass: 'text-primary'
			};
		}
		if (hasData) {
			return {
				type: 'data' as const,
				tooltip: 'Data Only',
				icon: Database,
				iconClass: 'text-primary'
			};
		}
		return {
			type: hasMetadata ? ('metadata' as const) : ('unknown' as const),
			tooltip: hasMetadata ? 'Metadata Only' : 'No Data/Metadata',
			icon: hasMetadata ? FileText : AlertCircle,
			iconClass: hasMetadata ? 'text-muted-foreground' : 'text-destructive'
		};
	});

	const Icon = $derived(stateInfo.icon);
	const isClickable = $derived((hasData || hasMetadata) && !isLoading && !isDeleted);

	const containerClass = $derived(
		`${'overflow-hidden rounded-lg transition-colors duration-150'} ${
			isDeleted
				? 'border-2 border-destructive bg-destructive/10 opacity-60'
				: isSelected
					? 'border-2 border-primary bg-primary/15 border-l-4 border-l-primary'
					: isClickable
						? 'border border-border hover:bg-accent hover:border-primary/50'
						: 'border border-border'
		} ${Object.keys(pendingChanges).length > 0 ? 'border-l-4 border-l-amber-500' : ''}`
	);

	const hasAdditionalMetadata = $derived(
		Boolean(
			metadata?.IsReferenceData ||
				metadata?.Purpose ||
				metadata?.Repeating ||
				metadata?.Structure ||
				(showArchiveInfo && (metadata?.SASDatasetName || metadata?.ArchiveLocationID))
		)
	);

	let isExpanded = $state(false);
	const toggleExpand = (event: MouseEvent) => {
		event.stopPropagation();
		isExpanded = !isExpanded;
	};
	const tooltipText = $derived(isExpanded ? 'Fewer details' : 'More details');

	const getClassAbbreviation = (classType: string | undefined | null) => {
		if (!classType) return '';
		const abbreviations: Record<string, string> = {
			'BASIC DATA STRUCTURE': 'BDS',
			'OCCURRENCE DATA STRUCTURE': 'OCCUR',
			'SUBJECT LEVEL ANALYSIS DATASET': 'SLAD'
		};
		return abbreviations[classType.toUpperCase()] || classType;
	};

	const handleClick = (event: MouseEvent) => {
		if (
			event.target instanceof Element &&
			!event.target.closest('[data-interactive]') &&
			isClickable &&
			onClick
		) {
			onClick();
		}
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if ((event.key === 'Enter' || event.key === ' ') && isClickable && onClick) {
			event.preventDefault();
			onClick();
		}
	};

	const handleDeleteClick = (e: MouseEvent) => {
		e.stopPropagation();
		if (onDelete) {
			onDelete();
		}
	};
</script>

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
				{#if Object.keys(pendingChanges).length > 0}
					<Badge variant="outline" class="text-amber-600 border-amber-500 text-xs">
						{Object.keys(pendingChanges).length} change{Object.keys(pendingChanges).length > 1
							? 's'
							: ''}
					</Badge>
				{/if}
			</div>

			<!-- Actions Section -->
			<div class="flex flex-shrink-0 items-center gap-2 pl-2">
				{#if metadata?.Class}
					<span
						class="inline-block border border-border bg-primary/10 text-card-foreground px-1.5 py-0.5 rounded-md text-xxs font-normal"
						title={metadata.Class}
					>
						{getClassAbbreviation(metadata.Class)}
					</span>
				{/if}

				{#if (hasData || editMode) && !isLoading && onDelete}
					<Button.Button
						variant="ghost"
						size="icon"
						class="text-muted-foreground hover:text-destructive h-8 w-8"
						onclick={handleDeleteClick}
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

			{#if expandable && hasAdditionalMetadata && !isLoading}
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
		{#if isLoading && progress > 0}
			<div class="mt-2">
				<Progress value={progress} max={100} class="h-1" />
			</div>
		{/if}

		<!-- Expanded Metadata -->
		{#if isExpanded && hasAdditionalMetadata}
			<div class="mt-3 space-y-2 text-sm">
				{#if showArchiveInfo && metadata?.SASDatasetName}
					<div>
						<span class="text-muted-foreground">SAS Name:</span>
						<span class="ml-2 text-foreground">{metadata.SASDatasetName}</span>
					</div>
				{/if}

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
						<span class="ml-2 text-foreground">{metadata.Purpose}</span>
					</div>
				{/if}

				{#if metadata?.Repeating}
					<div>
						<span class="text-muted-foreground">Repeating:</span>
						<span class="ml-2 text-foreground">{metadata.Repeating}</span>
					</div>
				{/if}

				{#if metadata?.Structure}
					<div>
						<span class="text-muted-foreground">Structure:</span>
						<span class="ml-2 text-foreground">{metadata.Structure}</span>
					</div>
				{/if}

				{#if showArchiveInfo && metadata?.ArchiveLocationID}
					<div>
						<span class="text-muted-foreground">Archive Location:</span>
						<span class="ml-2 text-foreground">{metadata.ArchiveLocationID}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
