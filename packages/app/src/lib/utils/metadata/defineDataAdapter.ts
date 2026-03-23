/**
 * Define-XML Data Adapter
 *
 * Extracts Define-XML metadata from global dataState for use in metadata components.
 * Replaces the context provider pattern used in the prototype.
 *
 * Usage:
 *   const defineData = extractDefineDataForMetadata();
 *   // Returns { adamData, sdtmData, combined }
 */

import * as dataState from '$lib/core/state/dataState.svelte';
import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

export interface DefineDataSource {
	defineData: ParsedDefineXML;
	graphData: any; // MockGraphData type from prototype
	fileName: string;
}

export interface DefineMetadataBundle {
	adamData: DefineDataSource | null;
	sdtmData: DefineDataSource | null;
	combined: CombinedDefineData;
	usingRealData: boolean;
	noDataLoaded: boolean;
}

export interface CombinedDefineData {
	ItemDefs: any[];
	ItemGroups: any[];
	CodeLists: any[];
	Methods: any[];
	Comments: any[];
	ValueListDefs: any[];
	WhereClauseDefs: any[];
	Standards: any[];
	Dictionaries: any[];
	Documents: any[];
	AnalysisResults: any[];
}

/**
 * Generate basic graph data from Define-XML for tree navigation
 */
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

/**
 * Combine metadata arrays from multiple Define-XMLs
 */
function combineDefineData(
	adamData: DefineDataSource | null,
	sdtmData: DefineDataSource | null
): CombinedDefineData {
	const combined: CombinedDefineData = {
		ItemDefs: [],
		ItemGroups: [],
		CodeLists: [],
		Methods: [],
		Comments: [],
		ValueListDefs: [],
		WhereClauseDefs: [],
		Standards: [],
		Dictionaries: [],
		Documents: [],
		AnalysisResults: []
	};

	if (adamData) {
		const adam = adamData.defineData;
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

	if (sdtmData) {
		const sdtm = sdtmData.defineData;
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
}

/**
 * Extract Define-XML metadata from global dataState
 *
 * Returns both individual ADaM/SDTM data and combined metadata.
 * This replaces the context provider pattern from the prototype.
 */
export function extractDefineDataForMetadata(): DefineMetadataBundle {
	const datasets = dataState.getDatasets();

	// Find ADaM Define-XML
	const adamDataset = Object.values(datasets).find((ds: any) => {
		return ds.fileName?.endsWith('.xml') && ds.ADaM === true;
	});

	// Find SDTM Define-XML
	const sdtmDataset = Object.values(datasets).find((ds: any) => {
		return ds.fileName?.endsWith('.xml') && ds.SDTM === true;
	});

	let adamData: DefineDataSource | null = null;
	let sdtmData: DefineDataSource | null = null;
	let usingRealData = false;

	// Load ADaM if available
	if (adamDataset?.data && !Array.isArray(adamDataset.data)) {
		const defineData = adamDataset.data as ParsedDefineXML;
		const graphData = adamDataset.graphData || generateGraphDataFromDefine(defineData);

		adamData = {
			defineData,
			graphData,
			fileName: adamDataset.fileName || 'ADaM Define-XML'
		};
		usingRealData = true;
	}

	// Load SDTM if available
	if (sdtmDataset?.data && !Array.isArray(sdtmDataset.data)) {
		const defineData = sdtmDataset.data as ParsedDefineXML;
		const graphData = sdtmDataset.graphData || generateGraphDataFromDefine(defineData);

		sdtmData = {
			defineData,
			graphData,
			fileName: sdtmDataset.fileName || 'SDTM Define-XML'
		};
		usingRealData = true;
	}

	const noDataLoaded = !usingRealData;

	// Combine data for backward compatibility with detail pages
	const combined = combineDefineData(adamData, sdtmData);

	return {
		adamData,
		sdtmData,
		combined,
		usingRealData,
		noDataLoaded
	};
}

/**
 * Get study name from Define-XML data
 */
export function getStudyName(bundle: DefineMetadataBundle): string {
	if (bundle.adamData?.defineData.Study?.Name) {
		return bundle.adamData.defineData.Study.Name;
	}
	if (bundle.sdtmData?.defineData.Study?.Name) {
		return bundle.sdtmData.defineData.Study.Name;
	}
	return 'Define-XML Metadata Browser';
}

/**
 * Get study description from Define-XML data
 */
export function getStudyDescription(bundle: DefineMetadataBundle): string {
	if (bundle.adamData?.defineData.Study?.Description) {
		return bundle.adamData.defineData.Study.Description;
	}
	if (bundle.sdtmData?.defineData.Study?.Description) {
		return bundle.sdtmData.defineData.Study.Description;
	}
	return 'Browse and explore Define-XML metadata structure';
}
