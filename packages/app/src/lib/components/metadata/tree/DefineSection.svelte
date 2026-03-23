<script lang="ts">
	import { goto } from '$app/navigation';
	import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';
	import MetadataNode from './MetadataNode.svelte';
	import MetadataCategory from './MetadataCategory.svelte';
	import { isVisible, isItemSelected } from '../utils/filtering';
	import { getBasePath } from '$lib/utils/metadata/navigationHelpers';
	import * as dataState from '$lib/core/state/dataState.svelte';

	let {
		defineType,
		label,
		defineData,
		isExpanded,
		expandedSections,
		toggleSection,
		currentPath,
		filterActive,
		connectedNodes,
		matchingOids,
		searchText,
		handleNodeClick,
		groupWhereClauses,
		getVisibleCount,
		showDatasets = true
	}: {
		defineType: 'adam' | 'sdtm';
		label: string;
		defineData: ParsedDefineXML;
		isExpanded: boolean;
		expandedSections: Set<string>;
		toggleSection: (id: string) => void;
		currentPath: string;
		filterActive: boolean;
		connectedNodes: Set<string>;
		matchingOids: Set<string> | null;
		searchText: string;
		handleNodeClick: (type: string, oid: string) => void;
		groupWhereClauses: (whereClauses: any[], datasets: any[]) => any[];
		getVisibleCount: (items: any[], getOid: (item: any) => string | null) => number;
		showDatasets?: boolean;
	} = $props();

	// Helper to check if a section is expanded
	function isSectionExpanded(section: string): boolean {
		return expandedSections.has(`${defineType}-${section}`);
	}

	// Derived expanded states for all sections
	const datasetsExpanded = $derived(isSectionExpanded('datasets'));
	const variablesExpanded = $derived(isSectionExpanded('variables'));
	const codelistsExpanded = $derived(isSectionExpanded('codelists'));
	const methodsExpanded = $derived(isSectionExpanded('methods'));
	const commentsExpanded = $derived(isSectionExpanded('comments'));
	const valuelistsExpanded = $derived(isSectionExpanded('valuelists'));
	const whereclausesExpanded = $derived(isSectionExpanded('whereclauses'));
	const standardsExpanded = $derived(isSectionExpanded('standards'));
	const dictionariesExpanded = $derived(isSectionExpanded('dictionaries'));
	const documentsExpanded = $derived(isSectionExpanded('documents'));
	const analysisresultsExpanded = $derived(isSectionExpanded('analysisresults'));

	// Derived visible counts
	const visibleDatasets = $derived(getVisibleCount(defineData.ItemGroups || [], (ig) => ig.OID));
	const visibleVariables = $derived(getVisibleCount(defineData.ItemDefs || [], (item) => item.OID));
	const visibleCodelists = $derived(getVisibleCount(defineData.CodeLists || [], (cl) => cl.OID));
	const visibleMethods = $derived(getVisibleCount(defineData.Methods || [], (m) => m.OID));
	const visibleComments = $derived(getVisibleCount(defineData.Comments || [], (c) => c.OID));
	const visibleValuelists = $derived(getVisibleCount(defineData.ValueListDefs || [], (vl) => vl.OID));
	const visibleWhereclauses = $derived(getVisibleCount(defineData.WhereClauseDefs || [], (wc) => wc.OID));
	const visibleStandards = $derived(getVisibleCount(defineData.Standards || [], (std) => std.OID));
	const visibleDictionaries = $derived(getVisibleCount(defineData.Dictionaries || [], (dict) => dict.OID));
	const visibleDocuments = $derived(getVisibleCount(defineData.Documents || [], (doc) => doc.ID));
	const visibleAnalysisresults = $derived(getVisibleCount(defineData.AnalysisResults || [], (ar) => ar.ID));

	// Common filter state and utilities
	const filterState = $derived({ filterActive, connectedNodes, matchingOids });
	const utils = { isVisible, isItemSelected };
	const isFiltered = $derived(filterActive || !!searchText.trim());

	// Merge Define-XML datasets with loaded datasets that don't have metadata
	const mergedDatasets = $derived.by(() => {
		const defineDatasets = defineData.ItemGroups || [];
		const loadedDatasets = dataState.getDatasets();

		// Create a set of dataset names that exist in Define-XML
		const defineDatasetNames = new Set(
			defineDatasets.map(ig => (ig.SASDatasetName || ig.Name || '').toLowerCase())
		);

		// Find loaded datasets that aren't in Define-XML
		const additionalDatasets = Object.keys(loadedDatasets)
			.filter(key => {
				const dataset = loadedDatasets[key];
				const datasetName = (dataset?.fileName || key).toLowerCase().replace('.sas7bdat', '');
				return !defineDatasetNames.has(datasetName) && dataset?.data && Array.isArray(dataset.data);
			})
			.map(key => {
				const dataset = loadedDatasets[key];
				const datasetName = (dataset?.fileName || key).replace('.sas7bdat', '');
				// Create a mock ItemGroup for display
				return {
					OID: `LOADED.${datasetName.toUpperCase()}`,
					Name: datasetName.toUpperCase(),
					SASDatasetName: datasetName,
					ItemRefs: [],
					_isLoadedOnly: true  // Flag to identify this is data-only
				};
			});

		return [...defineDatasets, ...additionalDatasets];
	});

	// Recompute visible datasets count with merged list
	const visibleDatasetsCount = $derived(getVisibleCount(mergedDatasets, (ig) => ig.OID));
</script>

<MetadataNode
	{label}
	level={0}
	{isExpanded}
	onToggle={() => toggleSection(defineType)}
	isSelected={false}
/>

{#if isExpanded}
	<!-- ItemGroupDef (Datasets) - Only shown when showDatasets is true -->
	{#if showDatasets}
		<MetadataCategory
			{defineType}
			categoryName="datasets"
			categoryLabel="ItemGroupDef (Datasets)"
			items={mergedDatasets}
			getSublabel={(item) => item._isLoadedOnly ? 'Data only' : `${item.ItemRefs?.length || 0} variables`}
			isExpanded={datasetsExpanded}
			visibleCount={visibleDatasetsCount}
			totalCount={mergedDatasets.length}
			{isFiltered}
			{currentPath}
			{filterState}
			onToggleSection={() => toggleSection(`${defineType}-datasets`)}
			onNavigate={handleNodeClick}
			{utils}
		/>
	{/if}

	<!-- ItemDef (Variables) -->
	<MetadataCategory
		{defineType}
		categoryName="variables"
		categoryLabel="ItemDef (Variables)"
		items={defineData.ItemDefs || []}
		getSublabel={(item) => `${item.DataType}(${item.Length})`}
		isExpanded={variablesExpanded}
		visibleCount={visibleVariables}
		totalCount={defineData.ItemDefs?.length || 0}
		{isFiltered}
		{currentPath}
		{filterState}
		onToggleSection={() => toggleSection(`${defineType}-variables`)}
		onNavigate={handleNodeClick}
		{utils}
	/>

	<!-- CodeList -->
	<MetadataCategory
		{defineType}
		categoryName="codelists"
		categoryLabel="CodeList"
		items={defineData.CodeLists || []}
		getSublabel={(item) => `${(item.CodeListItems?.length || 0) + (item.EnumeratedItems?.length || 0)} items`}
		isExpanded={codelistsExpanded}
		visibleCount={visibleCodelists}
		totalCount={defineData.CodeLists?.length || 0}
		{isFiltered}
		{currentPath}
		{filterState}
		onToggleSection={() => toggleSection(`${defineType}-codelists`)}
		onNavigate={handleNodeClick}
		{utils}
	/>

	<!-- Methods -->
	{#if defineData.Methods && defineData.Methods.length > 0}
		<MetadataCategory
			{defineType}
			categoryName="methods"
			categoryLabel="Methods"
			items={defineData.Methods}
			getSublabel={(item) => item.Type || ''}
			isExpanded={methodsExpanded}
			visibleCount={visibleMethods}
			totalCount={defineData.Methods.length}
			{isFiltered}
			{currentPath}
			{filterState}
			onToggleSection={() => toggleSection(`${defineType}-methods`)}
			onNavigate={handleNodeClick}
			{utils}
		/>
	{/if}

	<!-- Comments -->
	{#if defineData.Comments && defineData.Comments.length > 0}
		<MetadataCategory
			{defineType}
			categoryName="comments"
			categoryLabel="Comments"
			items={defineData.Comments}
			getSublabel={(item) => item.Description?.substring(0, 50) || ''}
			isExpanded={commentsExpanded}
			visibleCount={visibleComments}
			totalCount={defineData.Comments.length}
			{isFiltered}
			{currentPath}
			{filterState}
			onToggleSection={() => toggleSection(`${defineType}-comments`)}
			onNavigate={handleNodeClick}
			{utils}
		/>
	{/if}

	<!-- ValueLists -->
	{#if defineData.ValueListDefs && defineData.ValueListDefs.length > 0}
		<MetadataCategory
			{defineType}
			categoryName="valuelists"
			categoryLabel="ValueLists"
			items={defineData.ValueListDefs}
			getSublabel={(item) => `${item.ItemRefs?.length || 0} items`}
			isExpanded={valuelistsExpanded}
			visibleCount={visibleValuelists}
			totalCount={defineData.ValueListDefs.length}
			{isFiltered}
			{currentPath}
			{filterState}
			onToggleSection={() => toggleSection(`${defineType}-valuelists`)}
			onNavigate={handleNodeClick}
			{utils}
		/>
	{/if}

	<!-- WhereClauses -->
	{#if defineData.WhereClauseDefs && defineData.WhereClauseDefs.length > 0}
		<MetadataNode
			label="WhereClauses"
			level={1}
			isExpanded={whereclausesExpanded}
			onToggle={() => toggleSection(`${defineType}-whereclauses`)}
			count={visibleWhereclauses}
			totalCount={defineData.WhereClauseDefs?.length || 0}
			{isFiltered}
			isSelected={false}
		/>

		{#if whereclausesExpanded}
			{@const whereClauseGroups = groupWhereClauses(defineData.WhereClauseDefs || [], defineData.ItemGroups || [])}
			{#each whereClauseGroups as group}
				{@const hasVisibleItems = group.items.some((wc) => isVisible(wc.OID, filterActive, connectedNodes, matchingOids))}
				{#if hasVisibleItems}
					{@const visibleItemCount = group.items.filter((wc) => isVisible(wc.OID, filterActive, connectedNodes, matchingOids)).length}
					{@const isGroupSelected = currentPath.includes(`/whereclauses/group/${encodeURIComponent(group.groupKey)}`)}

					<!-- Group header - navigate to grouped view -->
					{#if group.items.length > 1}
						<!-- Multiple items - show as group with navigation -->
						<MetadataNode
							label={group.variable}
							sublabel={group.dataset ? `${group.dataset} dataset` : ''}
							level={2}
							count={visibleItemCount}
							totalCount={group.items.length}
							{isFiltered}
							isSelected={isGroupSelected}
							onClick={() => {
								const basePath = getBasePath(currentPath);
								goto(`${basePath}/metadata/whereclauses/group/${encodeURIComponent(group.groupKey)}`);
							}}
							leafId={`group-${group.groupKey}`}
						/>
					{:else}
						<!-- Single item - show it directly -->
						{@const whereclause = group.items[0]}
						{@const visible = isVisible(whereclause.OID, filterActive, connectedNodes, matchingOids)}
						{#if visible}
							<MetadataNode
								label={whereclause.OID || 'Unknown'}
								sublabel={`${whereclause.RangeChecks?.length || 0} checks`}
								level={2}
								isSelected={whereclause.OID ? isItemSelected('whereclauses', whereclause.OID, currentPath) : false}
								onClick={() => whereclause.OID && handleNodeClick('whereclauses', whereclause.OID)}
								leafId={whereclause.OID}
							/>
						{/if}
					{/if}
				{/if}
			{/each}
		{/if}
	{/if}

	<!-- Standards -->
	{#if defineData.Standards && defineData.Standards.length > 0}
		<MetadataCategory
			{defineType}
			categoryName="standards"
			categoryLabel="Standards"
			items={defineData.Standards}
			getSublabel={(item) => item.Version || ''}
			isExpanded={standardsExpanded}
			visibleCount={visibleStandards}
			totalCount={defineData.Standards.length}
			{isFiltered}
			{currentPath}
			{filterState}
			onToggleSection={() => toggleSection(`${defineType}-standards`)}
			onNavigate={handleNodeClick}
			{utils}
		/>
	{/if}

	<!-- Dictionaries -->
	{#if defineData.Dictionaries && defineData.Dictionaries.length > 0}
		<MetadataCategory
			{defineType}
			categoryName="dictionaries"
			categoryLabel="Dictionaries"
			items={defineData.Dictionaries}
			getSublabel={(item) => item.Version || ''}
			isExpanded={dictionariesExpanded}
			visibleCount={visibleDictionaries}
			totalCount={defineData.Dictionaries.length}
			{isFiltered}
			{currentPath}
			{filterState}
			onToggleSection={() => toggleSection(`${defineType}-dictionaries`)}
			onNavigate={handleNodeClick}
			{utils}
		/>
	{/if}

	<!-- Documents -->
	{#if defineData.Documents && defineData.Documents.length > 0}
		<MetadataCategory
			{defineType}
			categoryName="documents"
			categoryLabel="Documents"
			items={defineData.Documents}
			idField="ID"
			isExpanded={documentsExpanded}
			visibleCount={visibleDocuments}
			totalCount={defineData.Documents.length}
			{isFiltered}
			{currentPath}
			{filterState}
			onToggleSection={() => toggleSection(`${defineType}-documents`)}
			onNavigate={handleNodeClick}
			{utils}
		/>
	{/if}

	<!-- AnalysisResults -->
	{#if defineData.AnalysisResults && defineData.AnalysisResults.length > 0}
		<MetadataCategory
			{defineType}
			categoryName="analysisresults"
			categoryLabel="AnalysisResults"
			items={defineData.AnalysisResults}
			idField="ID"
			getSublabel={(item) => item.Purpose || ''}
			isExpanded={analysisresultsExpanded}
			visibleCount={visibleAnalysisresults}
			totalCount={defineData.AnalysisResults.length}
			{isFiltered}
			{currentPath}
			{filterState}
			onToggleSection={() => toggleSection(`${defineType}-analysisresults`)}
			onNavigate={handleNodeClick}
			{utils}
		/>
	{/if}
{/if}
