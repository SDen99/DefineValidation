import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

/**
 * Parse WhereClause OID to extract dataset and variable information
 * Pattern: WC.{Dataset}.{Variable}.{ConditionType}.{Sequence}
 */
export function parseWhereClauseOID(oid: string): {
	dataset: string;
	variable: string;
	isValid: boolean;
} {
	const parts = oid.split('.');
	if (parts.length >= 3 && parts[0] === 'WC') {
		return {
			dataset: parts[1],
			variable: parts[2],
			isValid: true
		};
	}
	return {
		dataset: '',
		variable: oid,
		isValid: false
	};
}

/**
 * Group WhereClauses by dataset and variable
 */
export function groupWhereClausesByKey(whereClauses: any[]) {
	const groups = new Map<string, { variable: string; dataset: string; items: any[] }>();

	for (const wc of whereClauses) {
		if (!wc.OID) continue;

		const { dataset, variable, isValid } = parseWhereClauseOID(wc.OID);
		const groupKey = isValid ? `${dataset}.${variable}` : wc.OID;

		if (!groups.has(groupKey)) {
			groups.set(groupKey, { variable, dataset, items: [] });
		}
		groups.get(groupKey)!.items.push(wc);
	}

	return groups;
}

/**
 * Find dataset index for sorting
 */
export function findDatasetIndex(datasets: any[], dataset: string): number {
	return datasets.findIndex((ds) => ds.OID === `IG.${dataset}`);
}

/**
 * Compare two whereclause groups for sorting
 */
export function compareGroups(a: any, b: any): number {
	if (a.datasetIndex === b.datasetIndex) {
		return a.variable.localeCompare(b.variable);
	}
	if (a.datasetIndex === -1) return 1;
	if (b.datasetIndex === -1) return -1;
	return a.datasetIndex - b.datasetIndex;
}

/**
 * Sort whereclause groups by dataset order and variable name
 */
export function sortWhereClauseGroups(
	groups: Map<string, any>,
	datasets: any[]
): Array<{ variable: string; dataset: string; items: any[]; groupKey: string }> {
	return Array.from(groups.entries())
		.map(([groupKey, group]) => ({
			...group,
			groupKey,
			datasetIndex: findDatasetIndex(datasets, group.dataset)
		}))
		.sort(compareGroups);
}

/**
 * Group WhereClauses by variable name and sort by dataset order
 * Pattern: WC.{Dataset}.{Variable}.{ConditionType}.{Sequence}
 */
export function groupWhereClauses(
	whereClauses: any[],
	datasets: any[]
): Array<{ variable: string; dataset: string; items: any[]; groupKey: string }> {
	const groups = groupWhereClausesByKey(whereClauses);
	return sortWhereClauseGroups(groups, datasets);
}

/**
 * Get visible count for a section based on filtering
 */
export function getVisibleCount(
	items: any[],
	getOid: (item: any) => string | null,
	filterActive: boolean,
	connectedNodes: Set<string>,
	matchingOids: Set<string> | null,
	searchText: string
): number {
	if (!filterActive && !searchText.trim()) return items.length;

	return items.filter((item) => {
		const oid = getOid(item);
		if (!oid) return false;

		// Apply text search filter
		if (searchText.trim() && matchingOids) {
			if (!matchingOids.has(oid)) return false;
		}

		// Apply graph filter
		if (filterActive) {
			if (!connectedNodes.has(oid)) return false;
		}

		return true;
	}).length;
}

/**
 * Get visible counts for all categories in a Define dataset
 */
export function getDefineVisibleCounts(
	defineData: ParsedDefineXML,
	filterActive: boolean,
	connectedNodes: Set<string>,
	matchingOids: Set<string> | null,
	searchText: string
) {
	const visibleCount = (items: any[], getOid: (item: any) => string | null) =>
		getVisibleCount(items, getOid, filterActive, connectedNodes, matchingOids, searchText);

	return {
		datasets: visibleCount(defineData.ItemGroups || [], (ig) => ig.OID),
		variables: visibleCount(defineData.ItemDefs || [], (item) => item.OID),
		codelists: visibleCount(defineData.CodeLists || [], (cl) => cl.OID),
		methods: visibleCount(defineData.Methods || [], (m) => m.OID),
		comments: visibleCount(defineData.Comments || [], (c) => c.OID),
		valuelists: visibleCount(defineData.ValueListDefs || [], (vl) => vl.OID),
		whereclauses: visibleCount(defineData.WhereClauseDefs || [], (wc) => wc.OID),
		standards: visibleCount(defineData.Standards || [], (std) => std.OID),
		dictionaries: visibleCount(defineData.Dictionaries || [], (dict) => dict.OID),
		documents: visibleCount(defineData.Documents || [], (doc) => doc.ID),
		analysisresults: visibleCount(defineData.AnalysisResults || [], (ar) => ar.ID)
	};
}
