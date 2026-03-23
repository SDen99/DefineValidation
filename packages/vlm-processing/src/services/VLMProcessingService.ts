/**
 * VLM Processing Service
 * Main service for VLM processing with caching and dependency injection
 * Migrated from vlmProcessingState.svelte.ts
 */

import type { ValueLevelMetadata } from '@sden99/data-processing';
import type { VLMTableData, GlobalStateProvider, EnhancedVLMTableData, VLMViewMode } from '../types';
import { detectVLMStratificationHierarchy, extractParamcdMapping } from '../stratification/hierarchyDetection';
import { generateEnhancedTransposedVLMTable } from '../algorithms/vlmTableGenerator';
import { normalizeDatasetId } from '@sden99/dataset-domain';

/**
 * VLM Processing Service with caching and state management
 */
export class VLMProcessingService {
	private vlmProcessingCache = new Map<string, EnhancedVLMTableData>();
	private lastVLMCacheKey = '';
	private maxCacheSize = 3;

	constructor(private stateProvider: GlobalStateProvider) {}

	/**
	 * Gets VLM scoped variables from the current dataset
	 */
	getVLMScopedVariables(): ValueLevelMetadata[] {
		const name = this.stateProvider.getSelectedDomain() || this.stateProvider.getSelectedDatasetId();
		if (!name) return [];

		const normalizedName = normalizeDatasetId(name);
		const { SDTM, ADaM, sdtmId, adamId } = this.stateProvider.getDefineXmlInfo();

		let defineFileId: string | null = null;

		if (ADaM?.ItemGroups.some((g: any) => normalizeDatasetId(g.SASDatasetName || g.Name) === normalizedName)) {
			defineFileId = adamId;
		} else if (
			SDTM?.ItemGroups.some((g: any) => normalizeDatasetId(g.SASDatasetName || g.Name) === normalizedName)
		) {
			defineFileId = sdtmId;
		}

		if (!defineFileId) return [];

		const defineDataset = this.stateProvider.getDatasets()[defineFileId];
		if (!defineDataset?.enhancedDefineXML) return [];

		const enhancedItemGroups = defineDataset.enhancedDefineXML.enhancedItemGroups;
		if (!enhancedItemGroups) return [];

		for (const [, ig] of enhancedItemGroups) {
			if (normalizeDatasetId(ig.sasDatasetName || ig.name) === normalizedName) {
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
	getAllVariables(): ValueLevelMetadata[] {
		const selectedId = this.stateProvider.getSelectedDatasetId();
		const domain = this.stateProvider.getSelectedDomain();

		if (!selectedId || !domain) return [];

		const normalizedName = normalizeDatasetId(domain);
		const defineInfo = this.stateProvider.getDefineXmlInfo();

		let defineFileId: string | null = null;

		// Try ADaM first, then SDTM
		const { adamId, sdtmId, ADaM, SDTM } = defineInfo;

		if (
			adamId &&
			ADaM?.ItemGroups.some((g: any) => normalizeDatasetId(g.SASDatasetName || g.Name) === normalizedName)
		) {
			defineFileId = adamId;
		} else if (
			sdtmId &&
			SDTM?.ItemGroups.some((g: any) => normalizeDatasetId(g.SASDatasetName || g.Name) === normalizedName)
		) {
			defineFileId = sdtmId;
		}

		if (!defineFileId) return [];

		const defineDataset = this.stateProvider.getDatasets()[defineFileId];
		if (!defineDataset?.enhancedDefineXML?.raw) return [];

		const rawDefine = defineDataset.enhancedDefineXML.raw;
		const lookups = defineDataset.enhancedDefineXML.lookups;

		if (!rawDefine.ItemGroups || !lookups) return [];

		// Find the matching raw ItemGroup and process only its top-level ItemRefs
		for (const itemGroup of rawDefine.ItemGroups) {
			if (normalizeDatasetId(itemGroup.SASDatasetName || itemGroup.Name) === normalizedName) {
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
						const enhancedVlm = this.enhanceVLMWithMethod(vlm);
						parentVariables.push(enhancedVlm);
					}
				});

				return parentVariables;
			}
		}

		return [];
	}

	/**
	 * Gets active VLM table data with caching
	 * @param viewMode - 'compact' for PARAMCD-only rows, 'expanded' for full Cartesian expansion
	 */
	getActiveVLMTableData(viewMode: VLMViewMode = 'compact'): VLMTableData | null {
		const vlmVariables = this.getVLMScopedVariables();

		if (!vlmVariables || vlmVariables.length === 0) {
			return null;
		}

		// Create cache key including view mode
		const cacheKey = `${this.stateProvider.getSelectedDatasetId()}-${this.stateProvider.getSelectedDomain()}-${vlmVariables.length}-${viewMode}`;

		// Return cached result if available and key hasn't changed
		if (this.vlmProcessingCache.has(cacheKey) && this.lastVLMCacheKey === cacheKey) {
			return this.vlmProcessingCache.get(cacheKey)!;
		}

		try {
			const hierarchy = detectVLMStratificationHierarchy(vlmVariables);
			const paramcdMapping = extractParamcdMapping(vlmVariables);
			const tableData = generateEnhancedTransposedVLMTable(
				vlmVariables,
				paramcdMapping,
				hierarchy,
				this.stateProvider,
				viewMode
			);

			const result = {
				...tableData,
				hierarchy
			} as EnhancedVLMTableData;

			// Cache the result and clean old entries (keep only last 3)
			this.vlmProcessingCache.set(cacheKey, result);
			if (this.vlmProcessingCache.size > this.maxCacheSize) {
				const firstKey = this.vlmProcessingCache.keys().next().value;
				if (firstKey !== undefined) {
					this.vlmProcessingCache.delete(firstKey);
				}
			}
			this.lastVLMCacheKey = cacheKey;

			return result;
		} catch (error) {
			console.error('Error processing VLM data:', error);
			return null;
		}
	}

	/**
	 * Enhances VLM with method information from define data
	 */
	private enhanceVLMWithMethod(vlm: ValueLevelMetadata): ValueLevelMetadata {
		const { SDTM, ADaM, sdtmId, adamId } = this.stateProvider.getDefineXmlInfo();
		const name = this.stateProvider.getSelectedDomain() || this.stateProvider.getSelectedDatasetId();
		if (!name) return vlm;

		const normalizedName = normalizeDatasetId(name);
		let defineFileId: string | null = null;

		if (ADaM?.ItemGroups.some((g: any) => normalizeDatasetId(g.SASDatasetName || g.Name) === normalizedName)) {
			defineFileId = adamId;
		} else if (
			SDTM?.ItemGroups.some((g: any) => normalizeDatasetId(g.SASDatasetName || g.Name) === normalizedName)
		) {
			defineFileId = sdtmId;
		}

		if (!defineFileId) return vlm;

		const defineDataset = this.stateProvider.getDatasets()[defineFileId];
		const enhancedDefine = defineDataset?.enhancedDefineXML;
		if (!enhancedDefine) return vlm;

		let enhanced = { ...vlm };

		if (vlm.methodOID && !vlm.method) {
			const methodDef = enhancedDefine.lookups.methodsByOID.get(vlm.methodOID);
			if (methodDef) {
				enhanced.method = {
					OID: methodDef.OID || '',
					Name: methodDef.Name || '',
					Description: methodDef.Description || '',
					Type: methodDef.Type,
					Document: methodDef.Document,
					Pages: methodDef.Pages,
					TranslatedText: methodDef.TranslatedText,
					hasSecondaryConditions: false,
					secondaryConditionsText: undefined
				} as any;
			}
		}

		if (vlm.commentOID && (!vlm.comments || vlm.comments.length === 0)) {
			const commentDef = enhancedDefine.lookups.commentsByOID.get(vlm.commentOID);
			if (commentDef) {
				enhanced.comments = [
					{ oid: commentDef.OID || '', description: commentDef.Description || '' }
				];
			}
		}

		return enhanced;
	}

	/**
	 * Clears the processing cache
	 */
	clearCache(): void {
		this.vlmProcessingCache.clear();
		this.lastVLMCacheKey = '';
	}

	/**
	 * Gets cache statistics
	 */
	getCacheStats(): { size: number; maxSize: number; lastKey: string } {
		return {
			size: this.vlmProcessingCache.size,
			maxSize: this.maxCacheSize,
			lastKey: this.lastVLMCacheKey
		};
	}
}