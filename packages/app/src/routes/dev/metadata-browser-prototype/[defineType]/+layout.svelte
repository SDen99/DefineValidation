<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { setContext } from 'svelte';
	import MetadataTree from '$lib/components/metadata/tree/MetadataTree.svelte';
	import ResizeHandle from '$lib/components/layout/ResizeHandle.svelte';
	import EditHistorySidebarNew from '$lib/components/metadata/edit/EditHistorySidebarNew.svelte';
	import type { LayoutData } from './$types';
	import * as dataState from '$lib/core/state/dataState.svelte.ts';
	import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';
	import { metadataEditState as editState } from '$lib/core/state/metadata/editState.svelte';
	import { getBasePath } from '$lib/utils/metadata/navigationHelpers';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Sidebar width state
	let sidebarWidth = $state(320);

	// Get the define type from the route parameter
	const defineType = $derived(data.defineType);

	// Helper function to generate basic graph data from Define-XML
	function generateGraphDataFromDefine(defineData: ParsedDefineXML): any {
		const nodes: any[] = [];
		const links: any[] = [];

		// Add dataset nodes
		(defineData.ItemGroups || []).forEach((ig) => {
			if (ig.OID) {
				nodes.push({ id: ig.OID, group: 1, label: ig.Name || ig.OID, type: 'dataset' });
			}
		});

		// Add variable nodes
		(defineData.ItemDefs || []).forEach((item) => {
			if (item.OID) {
				nodes.push({ id: item.OID, group: 2, label: item.Name || item.OID, type: 'variable' });
			}
		});

		// Add codelist nodes
		(defineData.CodeLists || []).forEach((cl) => {
			if (cl.OID) {
				nodes.push({ id: cl.OID, group: 3, label: cl.Name || cl.OID, type: 'codelist' });
			}
		});

		// Add method nodes
		(defineData.Methods || []).forEach((m) => {
			if (m.OID) {
				nodes.push({ id: m.OID, group: 4, label: m.Name || m.OID, type: 'method' });
			}
		});

		// Add comment nodes
		(defineData.Comments || []).forEach((c) => {
			if (c.OID) {
				nodes.push({ id: c.OID, group: 5, label: c.OID, type: 'comment' });
			}
		});

		// Add valuelist nodes
		(defineData.ValueListDefs || []).forEach((vl) => {
			if (vl.OID) {
				nodes.push({ id: vl.OID, group: 6, label: vl.OID, type: 'valuelist' });
			}
		});

		// Create links
		(defineData.ItemGroups || []).forEach((ig) => {
			(ig.ItemRefs || []).forEach((ref) => {
				if (ig.OID && ref.OID) {
					links.push({ source: ig.OID, target: ref.OID, relationship: 'contains' });
				}
			});
		});

		(defineData.ItemDefs || []).forEach((item) => {
			if (item.OID && item.CodeListOID) {
				links.push({ source: item.OID, target: item.CodeListOID, relationship: 'uses_codelist' });
			}
		});

		(defineData.ItemGroups || []).forEach((ig) => {
			(ig.ItemRefs || []).forEach((ref) => {
				if (ref.OID && ref.MethodOID) {
					links.push({ source: ref.OID, target: ref.MethodOID, relationship: 'uses_method' });
				}
			});
		});

		(defineData.ItemDefs || []).forEach((item) => {
			if (item.OID && item.CommentOID) {
				links.push({ source: item.OID, target: item.CommentOID, relationship: 'has_comment' });
			}
		});

		(defineData.ItemDefs || []).forEach((item) => {
			if (item.OID && item.ValueListOID) {
				links.push({ source: item.OID, target: item.ValueListOID, relationship: 'has_valuelist' });
			}
		});

		(defineData.ValueListDefs || []).forEach((vl) => {
			(vl.ItemRefs || []).forEach((ref) => {
				if (vl.OID && ref.OID) {
					links.push({ source: vl.OID, target: ref.OID, relationship: 'contains' });
				}
			});
		});

		return { nodes, links };
	}

	// Reactively check for real data (both ADaM and SDTM)
	const activeData = $derived.by(() => {
		const datasets = dataState.getDatasets();

		console.log('[Prototype Layout] Checking for real data. Available datasets:', Object.keys(datasets));

		// Find ADaM Define-XML
		const adamDataset = Object.values(datasets).find((ds: any) => {
			return ds.fileName?.endsWith('.xml') && ds.ADaM === true;
		});

		// Find SDTM Define-XML
		const sdtmDataset = Object.values(datasets).find((ds: any) => {
			return ds.fileName?.endsWith('.xml') && ds.SDTM === true;
		});

		console.log('[Prototype Layout] Found ADaM:', adamDataset?.fileName || 'none');
		console.log('[Prototype Layout] Found SDTM:', sdtmDataset?.fileName || 'none');

		const result: any = {
			adamData: null,
			sdtmData: null,
			studyName: 'Unknown Study',
			studyDescription: 'No description available',
			usingRealData: false,
			noDataLoaded: false
		};

		// Load ADaM if available
		if (adamDataset?.data && !Array.isArray(adamDataset.data)) {
			const defineData = adamDataset.data as ParsedDefineXML;
			const graphData = adamDataset.graphData || generateGraphDataFromDefine(defineData);

			result.adamData = {
				defineData,
				graphData
			};
			result.studyName = defineData.Study?.Name || result.studyName;
			result.studyDescription = defineData.Study?.Description || result.studyDescription;
			result.usingRealData = true;
			console.log('[Prototype Layout] ✓ Using real ADaM Define-XML data');
		}

		// Load SDTM if available
		if (sdtmDataset?.data && !Array.isArray(sdtmDataset.data)) {
			const defineData = sdtmDataset.data as ParsedDefineXML;
			const graphData = sdtmDataset.graphData || generateGraphDataFromDefine(defineData);

			result.sdtmData = {
				defineData,
				graphData
			};
			// Use ADaM study name if available, otherwise SDTM
			if (!result.adamData) {
				result.studyName = defineData.Study?.Name || result.studyName;
				result.studyDescription = defineData.Study?.Description || result.studyDescription;
			}
			result.usingRealData = true;
			console.log('[Prototype Layout] ✓ Using real SDTM Define-XML data');
		}

		// Check if we have no real data loaded
		if (!result.usingRealData) {
			console.log('[Prototype Layout] ✗ No data loaded yet - waiting for datasets to load');
			result.noDataLoaded = true;
		}

		return result;
	});

	// Create a combined view for backward compatibility with detail pages
	const combinedData = $derived.by(() => {
		// Combine all metadata arrays from both ADaM and SDTM
		const combined = {
			ItemDefs: [] as any[],
			ItemGroups: [] as any[],
			CodeLists: [] as any[],
			Methods: [] as any[],
			Comments: [] as any[],
			ValueListDefs: [] as any[],
			WhereClauseDefs: [] as any[],
			Standards: [] as any[],
			Dictionaries: [] as any[],
			Documents: [] as any[],
			AnalysisResults: [] as any[]
		};

		if (activeData.adamData) {
			const adam = activeData.adamData.defineData;
			combined.ItemDefs.push(...(adam.ItemDefs || []));
			combined.ItemGroups.push(...(adam.ItemGroups || []));
			combined.CodeLists.push(...(adam.CodeLists || []));
			combined.Methods.push(...(adam.Methods || []));
			combined.Comments.push(...(adam.Comments || []));
			combined.ValueListDefs.push(...(adam.ValueListDefs || []));
			combined.WhereClauseDefs.push(...(adam.WhereClauseDefs || []));
			combined.Standards.push(...(adam.Standards || []));
			combined.Dictionaries.push(...(adam.Dictionaries || []));
			combined.Documents.push(...(adam.Documents || []));
			combined.AnalysisResults.push(...(adam.AnalysisResults || []));
		}

		if (activeData.sdtmData) {
			const sdtm = activeData.sdtmData.defineData;
			combined.ItemDefs.push(...(sdtm.ItemDefs || []));
			combined.ItemGroups.push(...(sdtm.ItemGroups || []));
			combined.CodeLists.push(...(sdtm.CodeLists || []));
			combined.Methods.push(...(sdtm.Methods || []));
			combined.Comments.push(...(sdtm.Comments || []));
			combined.ValueListDefs.push(...(sdtm.ValueListDefs || []));
			combined.WhereClauseDefs.push(...(sdtm.WhereClauseDefs || []));
			combined.Standards.push(...(sdtm.Standards || []));
			combined.Dictionaries.push(...(sdtm.Dictionaries || []));
			combined.Documents.push(...(sdtm.Documents || []));
			combined.AnalysisResults.push(...(sdtm.AnalysisResults || []));
		}

		return combined;
	});

	// Set context with combined data for backward compatibility
	setContext('defineData', () => ({ defineData: combinedData }));

	// Track expansion state per section
	let expandedSections = $state<Set<string>>(new Set());

	// Track which sections were auto-expanded (so we can collapse them when leaving detail view)
	let autoExpandedSections = $state<Set<string>>(new Set());

	// Track filter mode
	let filterActive = $state(false);
	let selectedNodeId = $state<string | null>(null);

	function toggleSection(sectionId: string) {
		if (expandedSections.has(sectionId)) {
			// Collapsing: Check if we're viewing a detail page in this section
			const path = $page.url.pathname;
			const match = path.match(/\/(adam|sdtm)\/metadata\/([^/]+)\/([^/]+)/);

			if (match) {
				const [, defineType, itemType] = match;
				const expectedSection = `${defineType}-${itemType}`;

				// If collapsing the section that contains the current item, navigate to overview
				if (sectionId === expectedSection) {
					const basePath = getBasePath(path);
					goto(basePath);
					console.log('[Layout] Collapsed section with active leaf - navigating to overview');
				}
			}

			expandedSections.delete(sectionId);
			// If user manually collapses an auto-expanded section, remove it from auto-expanded tracking
			autoExpandedSections.delete(sectionId);
		} else {
			expandedSections.add(sectionId);
			// Manual expansions are NOT added to autoExpandedSections
		}
		expandedSections = new Set(expandedSections); // Trigger reactivity
	}

	function setFilter(nodeId: string | null) {
		console.log('[Layout] setFilter called with nodeId:', nodeId);
		selectedNodeId = nodeId;
		// Don't automatically activate filter - let user toggle it manually
		if (nodeId === null) {
			filterActive = false; // Clear filter when clearing selection
		}
		console.log('[Layout] filterActive:', filterActive, 'selectedNodeId:', selectedNodeId);
	}

	function toggleFilter() {
		filterActive = !filterActive;
		console.log('[Layout] toggleFilter - filterActive:', filterActive);
	}

	// Auto-expand sections when navigating to detail pages
	$effect(() => {
		const path = $page.url.pathname;

		// Parse URL: /dev/metadata-browser-prototype/{defineType}/metadata/{type}/{oid}
		const match = path.match(/\/(adam|sdtm)\/metadata\/([^/]+)\/([^/]+)/);

		if (match) {
			const [, defineType, itemType] = match;

			// Determine which sections need to be expanded
			const sectionsToExpand = [
				defineType,                    // 'adam' or 'sdtm'
				`${defineType}-${itemType}`    // e.g., 'adam-codelists'
			];

			// Build new Sets to avoid reading current state
			const newExpanded = new Set(expandedSections);
			const newAutoExpanded = new Set(autoExpandedSections);

			let changed = false;
			sectionsToExpand.forEach(section => {
				if (!newExpanded.has(section)) {
					newExpanded.add(section);
					newAutoExpanded.add(section);
					changed = true;
				}
			});

			// Only update if something changed
			if (changed) {
				expandedSections = newExpanded;
				autoExpandedSections = newAutoExpanded;
				console.log('[Layout] Auto-expanded sections for detail view:', sectionsToExpand);
			}
		} else {
			// Not on a detail page - collapse auto-expanded sections
			if (autoExpandedSections.size > 0) {
				const newExpanded = new Set(expandedSections);

				autoExpandedSections.forEach(section => {
					newExpanded.delete(section);
				});

				expandedSections = newExpanded;
				autoExpandedSections = new Set();

				console.log('[Layout] Collapsed auto-expanded sections');
			}
		}
	});

	function handleSidebarResize(delta: number) {
		const newWidth = sidebarWidth + delta;
		// Constrain width between 200px and 600px
		sidebarWidth = Math.max(200, Math.min(600, newWidth));
	}
</script>

<div class="flex h-screen flex-col">
	<!-- Header -->
	<header class="border-b bg-card px-6 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold">
					{defineType.toUpperCase()} Define-XML Browser
				</h1>
				<p class="text-sm text-muted-foreground">
					{activeData.studyName}
				</p>
			</div>

			<div class="flex items-center gap-4">
				{#if activeData.usingRealData}
					<div class="rounded-lg bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400">
						Using Real Data
					</div>
				{:else if !activeData.noDataLoaded}
					<div class="rounded-lg bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-600 dark:text-amber-400">
						Using Mock Data
					</div>
				{/if}

				{#if selectedNodeId}
					<div class="rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
						{filterActive ? 'Filter Active' : 'Filter Paused'}
					</div>
				{/if}

				{#if editState.editMode}
					<div class="rounded-lg bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
						Edit Mode
						{#if editState.getTotalChanges() > 0}
							<span class="ml-1">({editState.getTotalChanges()} changes)</span>
						{/if}
					</div>
				{/if}

				<!-- Edit Mode Toggle Button -->
				<button
					onclick={() => editState.toggleEditMode()}
					class="rounded-lg px-3 py-1 text-sm font-medium transition-colors
					       {editState.editMode
						? 'bg-warning text-warning-foreground hover:bg-warning/90'
						: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
				>
					{editState.editMode ? '✓ Editing' : 'Enable Edit Mode'}
				</button>

				<!-- Undo/Redo buttons (when edit mode is active) -->
				{#if editState.editMode}
					<div class="flex gap-1">
						<button
							onclick={() => editState.undo()}
							disabled={editState.undoStack.length === 0}
							class="rounded px-2 py-1 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed
							       hover:bg-muted"
							title="Undo (Ctrl+Z)"
						>
							↶
						</button>
						<button
							onclick={() => editState.redo()}
							disabled={editState.redoStack.length === 0}
							class="rounded px-2 py-1 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed
							       hover:bg-muted"
							title="Redo (Ctrl+Y)"
						>
							↷
						</button>
					</div>
				{/if}

				<a
					href="/dev/metadata-browser-prototype"
					class="text-sm text-muted-foreground hover:text-foreground"
				>
					← Back to prototype home
				</a>
			</div>
		</div>
	</header>

	<!-- Main content -->
	{#if activeData.noDataLoaded}
		<div class="flex flex-1 items-center justify-center bg-background p-6">
			<div class="max-w-md text-center">
				<h2 class="mb-4 text-2xl font-bold">No {defineType.toUpperCase()} Define-XML Data Loaded</h2>
				<p class="mb-6 text-muted-foreground">
					Please load a {defineType.toUpperCase()} Define-XML file from the main application to view
					its metadata structure here. Data will appear here automatically after it's loaded.
				</p>
				<a
					href="/"
					class="inline-block rounded-lg bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
				>
					Go to Main Application
				</a>
			</div>
		</div>
	{:else}
		<div class="grid flex-1 overflow-hidden" style="grid-template-columns: {sidebarWidth}px 1fr;">
			<!-- Left sidebar - Tree navigation -->
			<aside class="relative overflow-x-hidden overflow-y-auto border-r bg-card">
				<MetadataTree
					adamData={activeData.adamData}
					sdtmData={activeData.sdtmData}
					{expandedSections}
					{toggleSection}
					currentPath={$page.url.pathname}
					{filterActive}
					{selectedNodeId}
					{setFilter}
					{toggleFilter}
				/>
				<ResizeHandle position="left" onResize={handleSidebarResize} />
			</aside>

			<!-- Main content area -->
			<main class="overflow-y-auto overflow-x-hidden bg-background p-6">
				{@render children()}
			</main>
		</div>
	{/if}

	<!-- Edit History Sidebar (only show when edit mode is active) -->
	{#if editState.editMode}
		<EditHistorySidebarNew />
	{/if}
</div>
