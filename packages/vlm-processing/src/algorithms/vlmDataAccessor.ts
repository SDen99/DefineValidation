/**
 * VLM Data Access Functions
 * Extracted from vlmProcessingState.svelte.ts for reusability
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { GlobalStateProvider } from '../types';

/**
 * Gets VLM-scoped variables from the current dataset
 * These are variables that have value-level metadata definitions
 */
export function getVLMScopedVariables(stateProvider: GlobalStateProvider): ValueLevelMetadata[] {
	const name = stateProvider.getSelectedDomain() || stateProvider.getSelectedDatasetId();
	if (!name) return [];

	// Use the normalize function from dataset-domain package
	const { normalizeDatasetId: normalize } = require('@sden99/dataset-domain');
	const normalizedName = normalize(name);
	const { SDTM, ADaM, sdtmId, adamId } = stateProvider.getDefineXmlInfo();

	let defineFileId: string | null = null;

	if (ADaM?.ItemGroups.some((g: any) => normalize(g.SASDatasetName || g.Name) === normalizedName)) {
		defineFileId = adamId;
	} else if (
		SDTM?.ItemGroups.some((g: any) => normalize(g.SASDatasetName || g.Name) === normalizedName)
	) {
		defineFileId = sdtmId;
	}

	if (!defineFileId) return [];

	const defineDataset = stateProvider.getDatasets()[defineFileId];
	if (!defineDataset?.enhancedDefineXML) return [];

	const enhancedItemGroups = defineDataset.enhancedDefineXML.enhancedItemGroups;
	if (!enhancedItemGroups) return [];

	for (const [, ig] of enhancedItemGroups) {
		if (normalize(ig.sasDatasetName || ig.name) === normalizedName) {
			const vlmVariables = ig.valueLevelMetadata || [];

			const datasetValueLists =
				defineDataset.enhancedDefineXML.raw.ValueListDefs?.filter((vld: any) => {
					const targetPrefix = `VL.${ig.sasDatasetName}.`;
					return (vld.OID || '').startsWith(targetPrefix);
				}) || [];

			const vlmItemRefOIDs = new Set<string>();
			datasetValueLists.forEach((vld: any) => {
				vld.ItemRefs?.forEach((ref: any) => {
					if (ref.OID) vlmItemRefOIDs.add(ref.OID);
				});
			});

			return vlmVariables.filter((variable: any) => {
				const variableOid = variable.variable.oid;
				if (!variableOid) return false;
				for (const vlmOid of vlmItemRefOIDs) {
					if (vlmOid.startsWith(variableOid)) {
						return true;
					}
				}
				return false;
			});
		}
	}

	return [];
}

/**
 * Gets all variables from ItemGroup (parent variables, not VLM details)
 */
export function getAllVariables(stateProvider: GlobalStateProvider): ValueLevelMetadata[] {
	const selectedId = stateProvider.getSelectedDatasetId();
	const domain = stateProvider.getSelectedDomain();

	if (!selectedId || !domain) return [];

	// Use the normalize function from dataset-domain package
	const { normalizeDatasetId: normalize } = require('@sden99/dataset-domain');
	const normalizedName = normalize(domain);
	const defineInfo = stateProvider.getDefineXmlInfo();

	let defineFileId: string | null = null;

	// Try ADaM first, then SDTM
	const { adamId, sdtmId, ADaM, SDTM } = defineInfo;

	if (
		adamId &&
		ADaM?.ItemGroups.some((g: any) => normalize(g.SASDatasetName || g.Name) === normalizedName)
	) {
		defineFileId = adamId;
	} else if (
		sdtmId &&
		SDTM?.ItemGroups.some((g: any) => normalize(g.SASDatasetName || g.Name) === normalizedName)
	) {
		defineFileId = sdtmId;
	}

	if (!defineFileId) return [];

	const defineDataset = stateProvider.getDatasets()[defineFileId];
	if (!defineDataset?.enhancedDefineXML?.raw) return [];

	const rawDefine = defineDataset.enhancedDefineXML.raw;
	const lookups = defineDataset.enhancedDefineXML.lookups;

	if (!rawDefine.ItemGroups || !lookups) return [];

	// Find the matching raw ItemGroup and process only its top-level ItemRefs
	for (const itemGroup of rawDefine.ItemGroups) {
		if (normalize(itemGroup.SASDatasetName || itemGroup.Name) === normalizedName) {
			const parentVariables: ValueLevelMetadata[] = [];

			(itemGroup.ItemRefs || []).forEach((itemRef: any) => {
				const itemDef = lookups.itemDefsByOID.get(itemRef.OID);
				if (itemDef) {
					// Create metadata for the parent variable only (not VLM details)
					const vlm: ValueLevelMetadata = {
						variable: {
							oid: itemDef.OID!,
							name: itemDef.Name || '',
							dataType: itemDef.DataType || '',
							length: itemDef.Length || null,
							description: itemDef.Description || null,
							orderNumber: itemRef.OrderNumber || null,
							origin: {
								type: itemDef.OriginType || null,
								source: itemDef.OriginSource || null,
								description: itemDef.Origin || null
							},
							mandatory: itemRef.Mandatory === 'Yes',
							keySequence: itemRef.KeySequence ? parseInt(itemRef.KeySequence, 10) : undefined,
							role: itemRef.Role || undefined
						},
						graphContext: {
							nodeId: itemDef.OID!,
							connectedNodes: [],
							cluster: ''
						}
					};

					// Add basic metadata if available
					if (itemRef.WhereClauseOID) {
						vlm.whereClauseOID = itemRef.WhereClauseOID;
					}
					if (itemRef.MethodOID) {
						vlm.methodOID = itemRef.MethodOID;
					}
					if (itemDef.CommentOID) {
						vlm.commentOID = itemDef.CommentOID;
					}

					// Enhance the variable to resolve method, comment, and codelist OIDs
					const { enhanceVLMWithMethod } = require('./vlmTableGenerator');
					const enhancedVlm = enhanceVLMWithMethod(vlm, stateProvider);
					parentVariables.push(enhancedVlm);
				}
			});

			return parentVariables;
		}
	}

	return [];
}