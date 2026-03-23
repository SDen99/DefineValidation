import type {
	ItemRef,
	ItemDef,
	ItemGroup,
	Method,
	CodeList,
	WhereClauseDef,
	ValueListDef,
	Comment,
	ParsedDefineXML,
	RangeCheck
} from '@sden99/cdisc-types/define-xml';

// Import from local types
import type { GraphData, EnhancedDefineXMLData } from './types/processing';
import type {
	ValueLevelMetadata,
	EnhancedItemGroup,
	SearchCriteria,
	ValidationResult
} from './types/shared';


export class graphXML {
	static enhance(rawData: ParsedDefineXML): EnhancedDefineXMLData {
		try {
			const lookups = this.createLookupMaps(rawData);
			const { enhancedItemGroups, allVariables } = this.enhanceItemGroups(rawData, lookups);
			const graphData = this.generateGraphData(rawData, lookups);
			return { raw: rawData, lookups, enhancedItemGroups, allVariables, graphData };
		} catch (error) {
			console.error('[graphXML] Enhancement failed:', error);
			throw error;
		}
	}

	static wrap(data: EnhancedDefineXMLData): EnhancedDefineXML {
		return {
			...data,
			// ADD THE MISSING METHODS
			getValueLevelMetadata: (datasetOID: string) => [],
			getItemGroupMetadata: (datasetOID: string) => null,
			getVariableDetails: (itemOID: string) => null,
			searchVariables: (criteria: any) => [],
			getGraphData: () => ({ nodes: [], links: [], clusters: {}, statistics: { totalNodes: 0, totalLinks: 0, nodeTypes: {}, linkTypes: {} } }),
			getSubGraph: (nodeIds: string[]) => ({ nodes: [], links: [], clusters: {}, statistics: { totalNodes: 0, totalLinks: 0, nodeTypes: {}, linkTypes: {} } }),
			getVariableNetwork: (variableOID: string, depth?: number) => ({ nodes: [], links: [], clusters: {}, statistics: { totalNodes: 0, totalLinks: 0, nodeTypes: {}, linkTypes: {} } }),
			getDatasetDependencies: (datasetOID: string) => [],
			getVariableDependencies: (variableOID: string) => [],
			validateIntegrity: () => [],
		};
	}


	private static createLookupMaps(rawData: ParsedDefineXML) {
		return {
			itemGroupsByOID: new Map<string, ItemGroup>(
				(rawData.ItemGroups || [])
					.filter((ig): ig is ItemGroup => ig.OID !== null)
					.map((ig) => [ig.OID!, ig])
			),
			itemDefsByOID: new Map<string, ItemDef>(
				(rawData.ItemDefs || [])
					.filter((id): id is ItemDef => id.OID !== null)
					.map((id) => [id.OID!, id])
			),
			methodsByOID: new Map<string, Method>(
				(rawData.Methods || [])
					.filter((m): m is Method => m.OID !== null)
					.map((m) => [m.OID!, m])
			),
			codeListsByOID: new Map<string, CodeList>(
				(rawData.CodeLists || [])
					.filter((cl): cl is CodeList => cl.OID !== null)
					.map((cl) => [cl.OID!, cl])
			),
			whereClausesByOID: new Map<string, WhereClauseDef>(
				(rawData.WhereClauseDefs || [])
					.filter((wc): wc is WhereClauseDef => wc.OID !== null)
					.map((wc) => [wc.OID!, wc])
			),
			valueListsByOID: new Map<string, ValueListDef>(
				(rawData.ValueListDefs || [])
					.filter((vl): vl is ValueListDef => vl.OID !== null)
					.map((vl) => [vl.OID!, vl])
			),
			commentsByOID: new Map<string, Comment>(
				(rawData.Comments || [])
					.filter((c): c is Comment => c.OID !== null)
					.map((c) => [c.OID!, c])
			)
		};
	}

	private static enhanceItemGroups(rawData: ParsedDefineXML, lookups: any) {
		const enhancedItemGroups = new Map<string, EnhancedItemGroup>();
		const allVariables = new Map<string, ValueLevelMetadata>();

		(rawData.ItemGroups || []).forEach((itemGroup) => {
			if (!itemGroup.OID) return;

			const valueLevelMetadata: ValueLevelMetadata[] = [];
			(itemGroup.ItemRefs || []).forEach((topLevelItemRef) => {
				const parentItemDef = lookups.itemDefsByOID.get(topLevelItemRef.OID);
				if (!parentItemDef) return;

				const valueList = lookups.valueListsByOID.get(parentItemDef.ValueListOID);

				if (valueList && valueList.ItemRefs) {
					valueList.ItemRefs.forEach((vlmItemRef: ItemRef) => {
						const specificItemDef = lookups.itemDefsByOID.get(vlmItemRef.OID);
						if (specificItemDef) {
							const vlm = this.createValueLevelMetadata(
								vlmItemRef,
								specificItemDef,
								parentItemDef,
								lookups
							);
							const uniqueOid = `${parentItemDef.OID}|${vlmItemRef.WhereClauseOID || vlmItemRef.OID}`;
							valueLevelMetadata.push(vlm);
							allVariables.set(uniqueOid, vlm);
						}
					});
				} else {
					const vlm = this.createValueLevelMetadata(
						topLevelItemRef,
						parentItemDef,
						parentItemDef,
						lookups
					);
					valueLevelMetadata.push(vlm);
					allVariables.set(vlm.variable.oid, vlm);
				}
			});

			const enhancedIG: EnhancedItemGroup = {
				oid: itemGroup.OID,
				name: itemGroup.Name || '',
				sasDatasetName: itemGroup.SASDatasetName || '',
				description: itemGroup.Description|| undefined,
				variables: new Map(valueLevelMetadata.map((v) => [v.variable.oid, v])),
				valueLevelMetadata,
				// The rest can be simplified for now
				graphContext: { nodeId: itemGroup.OID, variableNodes: [], cluster: '' },
				statistics: {
					totalVariables: valueLevelMetadata.length,
					derivedVariables: 0,
					variablesWithCodeLists: 0,
					variablesWithMethods: 0
				}
			};
			enhancedItemGroups.set(itemGroup.OID, enhancedIG);
		});

		return { enhancedItemGroups, allVariables };
	}

	private static createValueLevelMetadata(
		ref: ItemRef,
		def: ItemDef,
		parentDef: ItemDef,
		lookups: any
	): ValueLevelMetadata {
		const vlm: Partial<ValueLevelMetadata> = {
			variable: {
				oid: parentDef.OID!,
				name: parentDef.Name || '',
				dataType: def.DataType || parentDef.DataType || '',
				length: def.Length || parentDef.Length || null,
				description: def.Description || parentDef.Description || null,
				orderNumber: ref.OrderNumber || parentDef.orderNumber || null,
				origin: {
					type: def.OriginType || parentDef.OriginType || null,
					source: def.OriginSource || parentDef.OriginSource || null,
					description: def.Origin || parentDef.Origin || null
				},
				mandatory: ref.Mandatory === 'Yes',
				keySequence: ref.KeySequence ? parseInt(ref.KeySequence, 10) : undefined,
				role: ref.Role || undefined
			},
			graphContext: {
				nodeId: def.OID!,
				connectedNodes: [],
				cluster: ''
			}
		};

		vlm.whereClauseOID = ref.WhereClauseOID || undefined;
		vlm.methodOID = ref.MethodOID || undefined;
		vlm.commentOID = def.CommentOID || parentDef.CommentOID || undefined;

		if (ref.WhereClauseOID) {
			const whereClause = lookups.whereClausesByOID.get(ref.WhereClauseOID);
			if (whereClause) {
				vlm.whereClause = {
					oid: whereClause.OID!,
					conditions: (whereClause.RangeChecks || []).map((rc: RangeCheck) => ({
						comparator: rc.Comparator,
						itemOID: rc.ItemOID, // CRITICAL: Include itemOID for lookup
						variable: lookups.itemDefsByOID.get(rc.ItemOID)?.Name || '', // Resolved variable name
						checkValues: rc.CheckValues || [],
						description: '' // Optional description
					}))
				};
			}
		}

		const codeListOID = def.CodeListOID || parentDef.CodeListOID;
		if (codeListOID) {
			const codeList = lookups.codeListsByOID.get(codeListOID);
			if (codeList) {
				vlm.codeList = {
					oid: codeList.OID!,
					name: codeList.Name || '',
					items: (codeList.CodeListItems || []).map((item: any) => ({
						codedValue: item.CodedValue || '',
						decode: item.Decode?.TranslatedText || item.CodedValue || ''
					}))
				};
			}
		}

		if (ref.MethodOID) {
			const method = lookups.methodsByOID.get(ref.MethodOID);
			if (method) {
				vlm.method = {
					OID: method.OID!,
					Name: method.Name || '',
					Description: method.Description || '',
					Type: method.Type || undefined
				};
			}
		}

		const commentOID = def.CommentOID || parentDef.CommentOID;
		if (commentOID) {
			const comment = lookups.commentsByOID.get(commentOID);
			if (comment) {
				vlm.comments = [{ oid: comment.OID!, description: comment.Description || '' }];
			}
		}

		return vlm as ValueLevelMetadata;
	}

	private static generateGraphData(rawData: ParsedDefineXML, lookups: any): GraphData {
		const nodes: Array<{ id: string; group: number; label: string }> = [];
		const links: Array<{ source: string; target: string; value: number; relationship: string }> = [];
		const nodeSet = new Set<string>();

		// Helper function to add nodes
		function addNodeIfNotExist(id: string, label: string, group: number) {
			if (!nodeSet.has(id)) {
				nodes.push({ id, group, label });
				nodeSet.add(id);
			}
		}

		// Helper function to add links
		function addLink(source: string, target: string, relationship: string) {
			if (source && target) {
				links.push({ source, target, value: 1, relationship });
			}
		}

		// Add ItemGroup (Dataset) nodes
		(rawData.ItemGroups || []).forEach((ig) => {
			if (ig.OID) {
				addNodeIfNotExist(ig.OID, ig.Name || ig.OID, 1);
			}
		});

		// Add ItemDef (Variable) nodes
		(rawData.ItemDefs || []).forEach((item) => {
			if (item.OID) {
				addNodeIfNotExist(item.OID, item.Name || item.OID, 2);
			}
		});

		// Add CodeList nodes
		(rawData.CodeLists || []).forEach((cl) => {
			if (cl.OID) {
				addNodeIfNotExist(cl.OID, cl.Name || cl.OID, 3);
			}
		});

		// Add Method nodes
		(rawData.Methods || []).forEach((m) => {
			if (m.OID) {
				addNodeIfNotExist(m.OID, m.Name || m.OID, 4);
			}
		});

		// Add Comment nodes
		(rawData.Comments || []).forEach((c) => {
			if (c.OID) {
				addNodeIfNotExist(c.OID, c.OID, 5);
			}
		});

		// Add ValueListDef nodes
		(rawData.ValueListDefs || []).forEach((vl) => {
			if (vl.OID) {
				addNodeIfNotExist(vl.OID, vl.OID, 6);
			}
		});

		// Add WhereClauseDef nodes
		(rawData.WhereClauseDefs || []).forEach((wc) => {
			if (wc.OID) {
				addNodeIfNotExist(wc.OID, wc.OID, 7);
			}
		});

		// Create links: ItemGroup -> ItemDef (Dataset contains Variable)
		(rawData.ItemGroups || []).forEach((ig) => {
			(ig.ItemRefs || []).forEach((ref) => {
				if (ig.OID && ref.OID) {
					addLink(ig.OID, ref.OID, 'contains');
				}
			});
		});

		// Create links: ItemDef -> CodeList (Variable uses CodeList)
		(rawData.ItemDefs || []).forEach((item) => {
			if (item.OID && item.CodeListOID) {
				addLink(item.OID, item.CodeListOID, 'uses_codelist');
			}
			if (item.OID && item.CommentOID) {
				addLink(item.OID, item.CommentOID, 'has_comment');
			}
		});

		// Create links: ItemRef -> Method (Variable uses Method)
		(rawData.ItemGroups || []).forEach((ig) => {
			(ig.ItemRefs || []).forEach((ref) => {
				if (ref.OID && ref.MethodOID) {
					addLink(ref.OID, ref.MethodOID, 'uses_method');
				}
			});
		});

		// Create links: ValueListDef -> ItemDef
		(rawData.ValueListDefs || []).forEach((vl) => {
			(vl.ItemRefs || []).forEach((ref) => {
				if (vl.OID && ref.OID) {
					addLink(vl.OID, ref.OID, 'defines_value');
				}
				if (ref.OID && ref.MethodOID) {
					addLink(ref.OID, ref.MethodOID, 'uses_method');
				}
			});
		});

		// Create links: WhereClauseDef relationships
		(rawData.WhereClauseDefs || []).forEach((wc) => {
			(wc.RangeChecks || []).forEach((rc) => {
				if (wc.OID && rc.ItemOID) {
					addLink(wc.OID, rc.ItemOID, 'checks_item');
				}
			});
		});

		// Create links: Standards -> Comments
		(rawData.Standards || []).forEach((std) => {
			if (std.OID && std.CommentOID) {
				addLink(std.OID, std.CommentOID, 'has_comment');
			}
		});

		// Create links: ItemGroup -> Comment
		(rawData.ItemGroups || []).forEach((ig) => {
			if (ig.OID && ig.CommentOID) {
				addLink(ig.OID, ig.CommentOID, 'has_comment');
			}
		});

		console.log(`[graphXML] Generated graph with ${nodes.length} nodes and ${links.length} links`);
		return { nodes, links };
	}
}


/**
 * The is the "live" object with attached methods for use in the application.
 * This is created in-memory and is NOT stored.
 */
export interface EnhancedDefineXML extends EnhancedDefineXMLData {
	// Business logic methods
	getValueLevelMetadata(datasetOID: string): ValueLevelMetadata[];
	getItemGroupMetadata(datasetOID: string): EnhancedItemGroup | null;
	getVariableDetails(itemOID: string): ValueLevelMetadata | null;
	searchVariables(criteria: SearchCriteria): ValueLevelMetadata[];

	// Graph methods
	getGraphData(): GraphData;
	getSubGraph(nodeIds: string[]): GraphData;
	getVariableNetwork(variableOID: string, depth?: number): GraphData;

	// Analysis methods
	getDatasetDependencies(datasetOID: string): string[];
	getVariableDependencies(variableOID: string): string[];
	validateIntegrity(): ValidationResult[];
}

