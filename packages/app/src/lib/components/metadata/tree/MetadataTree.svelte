<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';
	import { getBasePath } from '$lib/utils/metadata/navigationHelpers';
	import MetadataNode from './MetadataNode.svelte';
	import MetadataCategory from './MetadataCategory.svelte';
	import DefineSection from './DefineSection.svelte';
	import { isVisible, isItemSelected, getItemDefName } from '../utils/filtering';
	import { groupWhereClauses } from '../lib/metadataTreeHelpers';
	import * as dataState from '$lib/core/state/dataState.svelte';

	// Graph data type (from prototype)
	interface MockGraphData {
		nodes: Array<{ id: string; label: string; type: string; group: number }>;
		links: Array<{ source: string; target: string; relationship: string }>;
	}

	// Helper for connected nodes
	function getConnectedNodes(nodeId: string, graphData: MockGraphData, depth: number): Set<string> {
		const connected = new Set<string>([nodeId]);

		if (depth === 0) return connected;

		const queue = [{ id: nodeId, currentDepth: 0 }];
		const visited = new Set<string>([nodeId]);

		while (queue.length > 0) {
			const { id, currentDepth } = queue.shift()!;

			if (currentDepth >= depth) continue;

			// Find all links involving this node
			graphData.links.forEach(link => {
				let nextNode: string | null = null;

				if (link.source === id) {
					nextNode = link.target;
				} else if (link.target === id) {
					nextNode = link.source;
				}

				if (nextNode && !visited.has(nextNode)) {
					connected.add(nextNode);
					visited.add(nextNode);
					queue.push({ id: nextNode, currentDepth: currentDepth + 1 });
				}
			});
		}

		return connected;
	}

	let {
		adamData,
		sdtmData,
		expandedSections,
		toggleSection,
		currentPath,
		filterActive,
		selectedNodeId,
		setFilter,
		toggleFilter,
		onNavigate = null,
		onDatasetClick = null,
		showDatasets = true
	}: {
		adamData: { defineData: ParsedDefineXML; graphData: MockGraphData } | null;
		sdtmData: { defineData: ParsedDefineXML; graphData: MockGraphData } | null;
		expandedSections: Set<string>;
		toggleSection: (id: string) => void;
		currentPath: string;
		filterActive: boolean;
		selectedNodeId: string | null;
		setFilter: (nodeId: string | null) => void;
		toggleFilter: () => void;
		onNavigate?: ((type: string, oid: string) => void) | null;
		onDatasetClick?: ((datasetInfo: { name: string; oid: string }) => void) | null;
		showDatasets?: boolean;
	} = $props();

	// Text search filter
	let searchText = $state('');

	// Combine graph data from both ADaM and SDTM
	const combinedGraphData = $derived.by(() => {
		const allNodes: any[] = [];
		const allLinks: any[] = [];

		if (adamData) {
			allNodes.push(...adamData.graphData.nodes);
			allLinks.push(...adamData.graphData.links);
		}
		if (sdtmData) {
			allNodes.push(...sdtmData.graphData.nodes);
			allLinks.push(...sdtmData.graphData.links);
		}

		return { nodes: allNodes, links: allLinks };
	});

	// Compute connected nodes when filter is active
	let connectedNodes = $derived(
		filterActive && selectedNodeId
			? getConnectedNodes(selectedNodeId, combinedGraphData, 1)
			: new Set<string>()
	);

	// Pre-compute matching items for text search using graph nodes
	let matchingOids = $derived.by(() => {
		if (!searchText.trim()) return null;

		const search = searchText.toLowerCase();
		const matches = new Set<string>();

		// Search through combined graph nodes (single pass!)
		combinedGraphData.nodes.forEach((node) => {
			const label = (node.label || '').toLowerCase();
			const id = (node.id || '').toLowerCase();

			if (label.includes(search) || id.includes(search)) {
				matches.add(node.id);
			}
		});

		return matches;
	});



	// Get visible count for a section
	function getVisibleCount(items: any[], getOid: (item: any) => string | null): number {
		if (!filterActive && !searchText.trim()) return items.length;
		return items.filter((item) =>
			isVisible(getOid(item), filterActive, connectedNodes, matchingOids)
		).length;
	}

	// Helper to check if a prefixed section is expanded
	function isSectionExpanded(prefix: string, section: string): boolean {
		return expandedSections.has(`${prefix}-${section}`);
	}

	// Section visibility for ADaM
	const adamSectionExpanded = $derived(expandedSections.has('adam'));
	const adamDatasetsExpanded = $derived(isSectionExpanded('adam', 'datasets'));
	const adamVariablesExpanded = $derived(isSectionExpanded('adam', 'variables'));
	const adamCodelistsExpanded = $derived(isSectionExpanded('adam', 'codelists'));
	const adamMethodsExpanded = $derived(isSectionExpanded('adam', 'methods'));
	const adamCommentsExpanded = $derived(isSectionExpanded('adam', 'comments'));
	const adamValuelistsExpanded = $derived(isSectionExpanded('adam', 'valuelists'));
	const adamWhereclausesExpanded = $derived(isSectionExpanded('adam', 'whereclauses'));
	const adamStandardsExpanded = $derived(isSectionExpanded('adam', 'standards'));
	const adamDictionariesExpanded = $derived(isSectionExpanded('adam', 'dictionaries'));
	const adamDocumentsExpanded = $derived(isSectionExpanded('adam', 'documents'));
	const adamAnalysisresultsExpanded = $derived(isSectionExpanded('adam', 'analysisresults'));

	// Section visibility for SDTM
	const sdtmSectionExpanded = $derived(expandedSections.has('sdtm'));
	const sdtmDatasetsExpanded = $derived(isSectionExpanded('sdtm', 'datasets'));
	const sdtmVariablesExpanded = $derived(isSectionExpanded('sdtm', 'variables'));
	const sdtmCodelistsExpanded = $derived(isSectionExpanded('sdtm', 'codelists'));
	const sdtmMethodsExpanded = $derived(isSectionExpanded('sdtm', 'methods'));
	const sdtmCommentsExpanded = $derived(isSectionExpanded('sdtm', 'comments'));
	const sdtmValuelistsExpanded = $derived(isSectionExpanded('sdtm', 'valuelists'));
	const sdtmWhereclausesExpanded = $derived(isSectionExpanded('sdtm', 'whereclauses'));
	const sdtmStandardsExpanded = $derived(isSectionExpanded('sdtm', 'standards'));
	const sdtmDictionariesExpanded = $derived(isSectionExpanded('sdtm', 'dictionaries'));
	const sdtmDocumentsExpanded = $derived(isSectionExpanded('sdtm', 'documents'));
	const sdtmAnalysisresultsExpanded = $derived(isSectionExpanded('sdtm', 'analysisresults'));


	function handleNodeClick(type: string, oid: string) {
		// Activate filter for this node
		setFilter(oid);

		// Special handling for datasets: select instead of navigate
		if (type === 'datasets') {
			if (onDatasetClick) {
				// Find the dataset to get its Name (not OID)
				let datasetName = oid; // Fallback to OID

				// Search in ADaM datasets
				if (adamData?.defineData?.ItemGroups) {
					const dataset = adamData.defineData.ItemGroups.find((ig: any) => ig.OID === oid);
					if (dataset) {
						datasetName = dataset.SASDatasetName || dataset.Name || oid;
					}
				}

				// Search in SDTM datasets if not found
				if (datasetName === oid && sdtmData?.defineData?.ItemGroups) {
					const dataset = sdtmData.defineData.ItemGroups.find((ig: any) => ig.OID === oid);
					if (dataset) {
						datasetName = dataset.SASDatasetName || dataset.Name || oid;
					}
				}

				onDatasetClick({ name: datasetName, oid });
			}
			return;
		}

		// For all other metadata types: navigate to detail page
		if (onNavigate) {
			onNavigate(type, oid);
		} else {
			// Default behavior: navigate to detail page
			const currentPathValue = $page.url.pathname;
			const basePath = getBasePath(currentPathValue);
			const targetPath = `${basePath}/metadata/${type}/${oid}`;
			goto(targetPath);
		}
	}

	function clearFilter() {
		setFilter(null);
	}

	// Keyboard navigation
	let treeContainer: HTMLDivElement | undefined = $state();
	let focusedLeafIndex = $state(-1);

	// Build a flat list of all visible leaf items
	const visibleLeaves = $derived.by(() => {
		const leaves: Array<{ type: string; id: string }> = [];

		// Helper to add leaves from a data source
		function addLeaves(
			items: any[],
			type: string,
			getId: (item: any) => string | null,
			isExpanded: boolean
		) {
			if (!isExpanded) return;
			items.forEach((item) => {
				const id = getId(item);
				if (id && isVisible(id, filterActive, connectedNodes, matchingOids)) {
					leaves.push({ type, id });
				}
			});
		}

		// ADaM leaves
		if (adamData && adamSectionExpanded) {
			const defineData = adamData.defineData;

			addLeaves(defineData.ItemGroups || [], 'datasets', (ds) => ds.OID, adamDatasetsExpanded);
			addLeaves(defineData.ItemDefs || [], 'variables', (item) => item.OID, adamVariablesExpanded);
			addLeaves(defineData.CodeLists || [], 'codelists', (cl) => cl.OID, adamCodelistsExpanded);
			addLeaves(defineData.Methods || [], 'methods', (m) => m.OID, adamMethodsExpanded);
			addLeaves(defineData.Comments || [], 'comments', (c) => c.OID, adamCommentsExpanded);
			addLeaves(defineData.ValueListDefs || [], 'valuelists', (vl) => vl.OID, adamValuelistsExpanded);
			addLeaves(defineData.WhereClauseDefs || [], 'whereclauses', (wc) => wc.OID, adamWhereclausesExpanded);
			addLeaves(defineData.Standards || [], 'standards', (std) => std.OID, adamStandardsExpanded);
			addLeaves(defineData.Dictionaries || [], 'dictionaries', (dict) => dict.OID, adamDictionariesExpanded);
			addLeaves(defineData.Documents || [], 'documents', (doc) => doc.ID, adamDocumentsExpanded);
			addLeaves(defineData.AnalysisResults || [], 'analysisresults', (ar) => ar.ID, adamAnalysisresultsExpanded);
		}

		// SDTM leaves
		if (sdtmData && sdtmSectionExpanded) {
			const defineData = sdtmData.defineData;

			addLeaves(defineData.ItemGroups || [], 'datasets', (ds) => ds.OID, sdtmDatasetsExpanded);
			addLeaves(defineData.ItemDefs || [], 'variables', (item) => item.OID, sdtmVariablesExpanded);
			addLeaves(defineData.CodeLists || [], 'codelists', (cl) => cl.OID, sdtmCodelistsExpanded);
			addLeaves(defineData.Methods || [], 'methods', (m) => m.OID, sdtmMethodsExpanded);
			addLeaves(defineData.Comments || [], 'comments', (c) => c.OID, sdtmCommentsExpanded);
			addLeaves(defineData.ValueListDefs || [], 'valuelists', (vl) => vl.OID, sdtmValuelistsExpanded);
			addLeaves(defineData.WhereClauseDefs || [], 'whereclauses', (wc) => wc.OID, sdtmWhereclausesExpanded);
			addLeaves(defineData.Standards || [], 'standards', (std) => std.OID, sdtmStandardsExpanded);
			addLeaves(defineData.Dictionaries || [], 'dictionaries', (dict) => dict.OID, sdtmDictionariesExpanded);
			addLeaves(defineData.Documents || [], 'documents', (doc) => doc.ID, sdtmDocumentsExpanded);
			addLeaves(defineData.AnalysisResults || [], 'analysisresults', (ar) => ar.ID, sdtmAnalysisresultsExpanded);
		}

		return leaves;
	});

	// Reset focus when search changes or filter changes
	$effect(() => {
		// Watch searchText and filterActive
		const _ = searchText;
		const __ = filterActive;
		focusedLeafIndex = -1;
	});

	// Global keyboard handler - attached to document
	$effect(() => {
		function globalKeyHandler(e: KeyboardEvent) {
			// Only handle arrow keys and Enter
			if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
				return;
			}

			const target = e.target as HTMLElement;

			// Don't handle if user is typing in an input/textarea/select or contenteditable
			const isTypingElement =
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.tagName === 'SELECT' ||
				target.isContentEditable;

			if (isTypingElement) {
				console.log('[Global] Ignoring - user is typing in:', target.tagName);
				return;
			}

			// Handle arrow keys for tree navigation
			console.log('[Global] Handling', e.key, 'for tree navigation');
			handleKeyDown(e);
		}

		document.addEventListener('keydown', globalKeyHandler);

		return () => {
			document.removeEventListener('keydown', globalKeyHandler);
		};
	});

	// Auto-scroll to selected item when navigating to detail pages
	$effect(() => {
		const path = currentPath;

		// Parse URL: /dev/metadata-browser-prototype/{defineType}/metadata/{type}/{oid}
		const match = path.match(/\/metadata\/([^/]+)\/([^/]+)/);

		if (!match || !treeContainer) return;

		const [, itemType, oid] = match;
		const decodedOid = decodeURIComponent(oid);

		console.log('[MetadataTree] Auto-scrolling to selected item:', { itemType, decodedOid });

		// Wait for DOM to update after sections are auto-expanded
		tick().then(() => {
			// Small additional delay to ensure tree has fully rendered
			setTimeout(() => {
				const element = treeContainer.querySelector(`[data-leaf-id="${decodedOid}"]`);
				if (element) {
					console.log('[MetadataTree] Found element, scrolling into view');
					element.scrollIntoView({ block: 'center', behavior: 'smooth' });
				} else {
					console.log('[MetadataTree] Element not found with data-leaf-id:', decodedOid);
				}
			}, 150);
		});
	});

	function handleKeyDown(e: KeyboardEvent) {
		console.log('[Keyboard] Key pressed:', e.key, 'focusedLeafIndex:', focusedLeafIndex, 'visibleLeaves:', visibleLeaves.length);

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (focusedLeafIndex < visibleLeaves.length - 1) {
				focusedLeafIndex++;
				console.log('[Keyboard] Moving down to index:', focusedLeafIndex);
				scrollToFocusedLeaf();
			} else if (visibleLeaves.length > 0 && focusedLeafIndex === -1) {
				// Start from beginning if not focused yet
				focusedLeafIndex = 0;
				console.log('[Keyboard] Starting at index 0');
				scrollToFocusedLeaf();
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (focusedLeafIndex > 0) {
				focusedLeafIndex--;
				console.log('[Keyboard] Moving up to index:', focusedLeafIndex);
				scrollToFocusedLeaf();
			} else if (visibleLeaves.length > 0 && focusedLeafIndex === -1) {
				// Start from end if not focused yet
				focusedLeafIndex = visibleLeaves.length - 1;
				console.log('[Keyboard] Starting at end, index:', focusedLeafIndex);
				scrollToFocusedLeaf();
			}
		} else if (e.key === 'Enter' && focusedLeafIndex >= 0) {
			e.preventDefault();
			const leaf = visibleLeaves[focusedLeafIndex];
			console.log('[Keyboard] Enter pressed, navigating to:', leaf);
			if (leaf) {
				handleNodeClick(leaf.type, leaf.id);
			}
		}
	}

	function scrollToFocusedLeaf() {
		console.log('[Scroll] scrollToFocusedLeaf called, index:', focusedLeafIndex);

		if (!treeContainer || focusedLeafIndex < 0) {
			console.log('[Scroll] No container or invalid index');
			return;
		}

		// Remove focus styling from all leaves
		const allLeaves = treeContainer.querySelectorAll('[data-leaf-id]');
		console.log('[Scroll] Found', allLeaves.length, 'leaf elements');
		allLeaves.forEach((el) => {
			el.classList.remove('keyboard-focused');
		});

		const leaf = visibleLeaves[focusedLeafIndex];
		console.log('[Scroll] Looking for leaf:', leaf);
		if (!leaf) {
			console.log('[Scroll] No leaf at index');
			return;
		}

		// Find the button element for this leaf
		const selector = `[data-leaf-id="${leaf.id}"]`;
		console.log('[Scroll] Searching for:', selector);
		const button = treeContainer.querySelector(selector);
		console.log('[Scroll] Found button:', button);

		if (button) {
			button.classList.add('keyboard-focused');
			console.log('[Scroll] Added keyboard-focused class');
			button.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		} else {
			console.log('[Scroll] ERROR: Button not found for ID:', leaf.id);
		}
	}
</script>

<!-- Sticky header: Search and Filter -->
<div class="sticky top-0 z-10 bg-card px-2 pt-2 pb-2">
		<!-- Text search filter -->
		<div class="mb-2">
			<input
				type="text"
				bind:value={searchText}
				placeholder="Search variables, datasets..."
				class="w-full rounded border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
			/>
		</div>

		{#if selectedNodeId}
			<div class="mb-2 rounded border-2 border-primary bg-primary/10 p-2">
				<div class="mb-1 flex items-center justify-between">
					<label class="flex items-center gap-1.5 text-xs font-semibold text-primary cursor-pointer">
						<input
							type="checkbox"
							checked={filterActive}
							onchange={toggleFilter}
							class="rounded border-primary"
						/>
						🔍 Filter Active
					</label>
					<button
						onclick={clearFilter}
						class="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
					>
						Clear
					</button>
				</div>
				<p class="text-xs text-muted-foreground">
					{filterActive ? 'Showing connected items only' : 'Filter paused - showing all items'}
				</p>
			</div>
		{/if}
</div>

<!-- Tree content with horizontal overflow prevention -->
<div bind:this={treeContainer} class="overflow-x-hidden px-2">
	<!-- ADaM Section -->
	{#if adamData}
		<DefineSection
			defineType="adam"
			label="ADaM"
			defineData={adamData.defineData}
			isExpanded={adamSectionExpanded}
			{expandedSections}
			{toggleSection}
			{currentPath}
			{filterActive}
			{connectedNodes}
			{matchingOids}
			{searchText}
			{handleNodeClick}
			{groupWhereClauses}
			{getVisibleCount}
			{showDatasets}
		/>
	{/if}

	<!-- SDTM Section -->
	{#if sdtmData}
		<DefineSection
			defineType="sdtm"
			label="SDTM"
			defineData={sdtmData.defineData}
			isExpanded={sdtmSectionExpanded}
			{expandedSections}
			{toggleSection}
			{currentPath}
			{filterActive}
			{connectedNodes}
			{matchingOids}
			{searchText}
			{handleNodeClick}
			{groupWhereClauses}
			{getVisibleCount}
			{showDatasets}
		/>
	{/if}
</div>

<style>
	:global(.keyboard-focused) {
		background-color: hsl(var(--primary) / 0.2) !important;
		border-left: 4px solid hsl(var(--primary)) !important;
		padding-left: calc(0.5rem - 4px) !important;
	}
</style>
