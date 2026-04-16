<script lang="ts">
	/**
	 * UnifiedSidebar - Consolidated sidebar component combining best patterns
	 *
	 * Features:
	 * - Collapses to thin button strip (always visible)
	 * - Toggle button fixed on edge
	 * - Flexible content via snippets
	 * - Shared ResizeHandle integration
	 * - Empty state support
	 * - Relative positioning in flex layout
	 * - Customizable styling
	 */
	import { Button } from '@sden99/ui-components';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte/icons';
	import type { Snippet } from 'svelte';
	import ResizeHandle from './ResizeHandle.svelte';

	let {
		position,
		open,
		width,
		onToggle,
		onResize,
		headerContent,
		sidebarContent,
		emptyState,
		isEmpty = false,
		bgClass = 'bg-muted/30 dark:bg-card/95',
		collapsedWidth = 20,
		minWidth = 200,
		maxWidth = 600
	} = $props<{
		position: 'left' | 'right';
		open: boolean;
		width: number;
		onToggle: () => void;
		onResize: (delta: number) => void;
		headerContent?: Snippet;
		sidebarContent?: Snippet;
		emptyState?: Snippet;
		isEmpty?: boolean;
		bgClass?: string;
		collapsedWidth?: number;
		minWidth?: number;
		maxWidth?: number;
	}>();

	// Track resize state to disable transitions during drag
	let isResizing = $state(false);
	let resizeTimeout = $state<number | null>(null);

	// Local drag state - use this during resize for instant feedback
	let dragWidth = $state<number | null>(null);
	let throttleTimeout = $state<number | null>(null);

	// Determine current width based on open state
	// During drag, use local dragWidth for instant feedback
	const currentWidth = $derived(open ? (dragWidth ?? width) : collapsedWidth);

	// Toggle button icon based on position and open state
	const ToggleIcon = $derived.by(() => {
		if (position === 'left') {
			return open ? ChevronLeft : ChevronRight;
		} else {
			return open ? ChevronRight : ChevronLeft;
		}
	});

	// Handle resize with clamping and throttling
	function handleResize(delta: number) {
		// Mark as resizing and clear any pending timeout
		if (!isResizing) {
			isResizing = true;
			dragWidth = width; // Initialize drag state
		}
		if (resizeTimeout !== null) {
			clearTimeout(resizeTimeout);
		}

		// Update local drag width immediately for instant visual feedback
		const currentDragWidth = dragWidth ?? width;
		const newWidth = currentDragWidth + delta;
		const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
		dragWidth = clampedWidth;

		// Throttle updates to parent (global state) - update every 32ms (~30fps) instead of 60fps
		if (throttleTimeout === null) {
			throttleTimeout = setTimeout(() => {
				// Calculate actual delta from original width
				const actualDelta = clampedWidth - width;
				onResize(actualDelta);
				throttleTimeout = null;
			}, 32) as unknown as number;
		}

		// Reset resizing state after drag ends
		resizeTimeout = setTimeout(() => {
			// Final update to ensure we're in sync
			if (dragWidth !== null) {
				const finalDelta = dragWidth - width;
				onResize(finalDelta);
			}

			// Clear states
			isResizing = false;
			dragWidth = null;
			resizeTimeout = null;

			if (throttleTimeout !== null) {
				clearTimeout(throttleTimeout);
				throttleTimeout = null;
			}
		}, 100) as unknown as number;
	}

	// Cleanup timeouts on unmount
	$effect(() => {
		return () => {
			if (resizeTimeout !== null) {
				clearTimeout(resizeTimeout);
			}
			if (throttleTimeout !== null) {
				clearTimeout(throttleTimeout);
			}
		};
	});
</script>

<div
	role="complementary"
	aria-label="{position} sidebar"
	class="relative flex-shrink-0"
	class:transition-all={!isResizing}
	class:duration-300={!isResizing}
	style:width="{currentWidth}px"
>
	<!-- Main Container -->
	<div class="absolute inset-0 flex {position === 'left' ? 'flex-row-reverse' : 'flex-row'}">
		{#if !open}
			<!-- Toggle Button Strip (only when collapsed) -->
			<div class="flex-shrink-0 {position === 'left' ? 'border-l' : 'border-r'} border-border">
				<button
					onclick={onToggle}
					class="h-full {bgClass} hover:bg-muted transition-colors flex items-center justify-center group"
					style:width="{collapsedWidth}px"
					title="Expand sidebar"
					aria-label="Expand sidebar"
					aria-expanded={false}
				>
					<ToggleIcon class="h-4 w-4 transition-transform group-hover:scale-110" />
				</button>
			</div>
		{:else}
			<!-- Sidebar Content (when expanded) -->
			<div class="flex-1 {bgClass} flex flex-col overflow-hidden">
				<!-- Header Section -->
				{#if headerContent}
					<div class="flex-shrink-0 border-b border-border p-4">
						{@render headerContent()}
					</div>
				{/if}

				<!-- Main Content Section -->
				<div class="flex min-h-0 flex-1 flex-col p-4">
					{#if isEmpty && emptyState}
						<!-- Empty State -->
						<div class="flex h-full items-center justify-center">
							{@render emptyState()}
						</div>
					{:else if sidebarContent}
						<!-- Normal Content -->
						{@render sidebarContent()}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- ResizeHandle (positioned at root level, outside flex container) -->
	{#if open}
		<ResizeHandle {position} onResize={handleResize} onCollapse={onToggle} />
	{/if}
</div>
