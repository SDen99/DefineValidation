<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { DataRow } from '../types/core';
	import type { ColumnConfig } from '../types/columns';
	import type { VisibleWindow, ViewportConfig } from '../types/virtualization';
	import { VirtualizationEngine } from '../engines/VirtualizationEngine';
	import TableHeader from './TableHeader.svelte';
	import TableBody from './TableBody.svelte';

	interface Props {
		rows: DataRow[];
		columns: ColumnConfig[];
		height?: number;
		rowHeight?: number;
		overscan?: number;
	}

	let {
		rows,
		columns,
		height = 600,
		rowHeight = 40,
		overscan = 5
	}: Props = $props();

	// Virtualization engine (plain JS)
	let virtualizationEngine: VirtualizationEngine;

	// Svelte reactive state
	let visibleWindow = $state<VisibleWindow>({
		startIndex: 0,
		endIndex: 0,
		visibleCount: 0,
		offsetY: 0
	});

	// Visible rows (derived from window)
	const visibleRows = $derived.by(() => {
		return rows.slice(visibleWindow.startIndex, visibleWindow.endIndex);
	});

	// Total content height for scrolling
	const totalHeight = $derived(rows.length * rowHeight);

	// Container element ref
	let scrollContainerEl: HTMLDivElement;

	// Unsubscribe functions
	let unsubscribeFns: (() => void)[] = [];

	/**
	 * Initialize virtualization engine
	 */
	function initializeVirtualization() {
		// Create config
		const config: ViewportConfig = {
			height,
			rowHeight,
			overscan
		};

		// Create engine
		virtualizationEngine = new VirtualizationEngine(config);

		// Set total rows
		virtualizationEngine.setTotalRows(rows.length);

		// Get initial window
		visibleWindow = virtualizationEngine.getVisibleWindow();

		// Subscribe to window changes
		unsubscribeFns.push(
			virtualizationEngine.on('window-changed', ({ window: newWindow }) => {
				visibleWindow = newWindow;
			})
		);
	}

	/**
	 * Handle scroll events
	 */
	function handleScroll(event: Event) {
		if (!virtualizationEngine) return;
		const target = event.target as HTMLDivElement;
		virtualizationEngine.onScroll(target.scrollTop);
	}

	/**
	 * Update when rows change
	 */
	$effect(() => {
		if (virtualizationEngine) {
			virtualizationEngine.setTotalRows(rows.length);
		}
	});

	/**
	 * Update config when props change
	 */
	$effect(() => {
		if (virtualizationEngine) {
			virtualizationEngine.updateConfig({
				height,
				rowHeight,
				overscan
			});
		}
	});

	/**
	 * Cleanup
	 */
	function cleanup() {
		unsubscribeFns.forEach((unsubscribe) => unsubscribe());
		unsubscribeFns = [];
	}

	// Lifecycle
	onMount(() => {
		initializeVirtualization();
	});

	onDestroy(() => {
		cleanup();
	});

	/**
	 * Public API - Scroll to row
	 */
	export function scrollToRow(rowIndex: number, alignment: 'start' | 'center' | 'end' = 'start') {
		if (!virtualizationEngine || !scrollContainerEl) return;
		const scrollTop = virtualizationEngine.scrollToRow(rowIndex, alignment);
		scrollContainerEl.scrollTop = scrollTop;
	}

	/**
	 * Public API - Scroll to top
	 */
	export function scrollToTop() {
		scrollToRow(0, 'start');
	}

	/**
	 * Public API - Scroll to bottom
	 */
	export function scrollToBottom() {
		if (!rows.length) return;
		scrollToRow(rows.length - 1, 'end');
	}
</script>

<div class="virtual-scroll-container" style="height: {height}px">
	<div
		bind:this={scrollContainerEl}
		class="scroll-viewport"
		onscroll={handleScroll}
		style="height: {height}px; overflow-y: auto; position: relative;"
	>
		<!-- Spacer div to enable scrolling -->
		<div class="scroll-spacer" style="height: {totalHeight}px; pointer-events: none;"></div>

		<!-- Table positioned absolutely -->
		<div
			class="table-container"
			style="position: absolute; top: 0; left: 0; right: 0; transform: translateY({visibleWindow.offsetY}px); will-change: transform;"
		>
			<table class="min-w-full divide-y divide-gray-200">
				<TableHeader {columns} />
				<TableBody rows={visibleRows} {columns} />
			</table>
		</div>
	</div>
</div>

<style>
	.virtual-scroll-container {
		width: 100%;
		border: 1px solid hsl(var(--color-border));
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}

	.scroll-viewport {
		position: relative;
	}

	.scroll-viewport::-webkit-scrollbar {
		width: 12px;
	}

	.scroll-viewport::-webkit-scrollbar-track {
		background: hsl(var(--color-muted));
	}

	.scroll-viewport::-webkit-scrollbar-thumb {
		background: hsl(var(--color-muted-foreground));
		border-radius: 6px;
	}

	.scroll-viewport::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--color-foreground) / 0.6);
	}

	.table-container {
		width: 100%;
	}

	table {
		border-collapse: collapse;
		table-layout: auto;
	}
</style>
