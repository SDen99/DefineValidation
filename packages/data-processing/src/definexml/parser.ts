import type {
	Study,
	MetaData,
	Standard,
	Document,
	Comment,
	Method,
	ItemGroup,
	ItemDef,
	ItemRef, // Keep ItemRef import
	CodeList
} from '@sden99/cdisc-types/define-xml';

import type {
	Dictionary,
	ValueListDef,
	AnalysisResult,
	WhereClauseDef,
	RangeCheck,
	ComparatorType
} from '@sden99/cdisc-types/define-xml';
import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

export const parseDefineXML = async (xmlString: string): Promise<ParsedDefineXML> => {
	// Input validation
	if (!xmlString || typeof xmlString !== 'string') {
		throw new Error('Invalid input: XML string required');
	}

	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

	// Enhanced error handling
	const parseErrors = xmlDoc.getElementsByTagName('parsererror');
	if (parseErrors.length > 0) {
		const errorMessage = parseErrors[0].textContent || 'Unknown parsing error';
		throw new Error(`XML parsing error: ${errorMessage}`);
	}

	// Helper function with stronger typing
	function getTextContent(element: Element | null, selector: string): string | null {
		if (!element) return null;
		const targetElement = element.querySelector(selector);
		return targetElement?.textContent ?? null;
	}

	// Helper function for safe attribute extraction
	function getAttribute(element: Element | null, attributeName: string): string | null {
		return element?.getAttribute(attributeName) ?? null;
	}

	function getDefContent(element: Element, path: string): string | null {
		const namespaceURI = element.ownerDocument?.documentElement.getAttributeNS(
			'http://www.w3.org/2000/xmlns/',
			'def'
		);
		if (!namespaceURI) return null;

		const defElement = element.getElementsByTagNameNS(namespaceURI, path)[0];
		return defElement?.textContent ?? null;
	}

	// Extract namespace with better error handling
	const namespaceURI = xmlDoc.documentElement.getAttributeNS(
		'http://www.w3.org/2000/xmlns/',
		'def'
	);
	if (!namespaceURI) {
		throw new Error("Required namespace 'def' not found in XML");
	}

	function isValidComparator(value: string): value is ComparatorType {
		return ['EQ', 'NE', 'LT', 'LE', 'GT', 'GE', 'IN', 'NOTIN'].includes(value);
	}

	///////////////////////////////////////////////////////////////////////
	// Start the meat of the parsing
	///////////////////////////////////////////////////////////////////////

	// Extract study details
	const studyElement = xmlDoc.querySelector('Study');
	const Study: Study = {
		OID: getAttribute(studyElement, 'OID'),
		Name: getTextContent(xmlDoc.documentElement, 'StudyName'),
		Description: getTextContent(xmlDoc.documentElement, 'StudyDescription'),
		ProtocolName: getTextContent(xmlDoc.documentElement, 'ProtocolName')
	};

	// MetaDataVersion extraction with validation
	const metaDataVersion = xmlDoc.querySelector('MetaDataVersion');
	if (!metaDataVersion) {
		throw new Error("Required element 'MetaDataVersion' not found");
	}

	const MetaData: MetaData = {
		OID: getAttribute(metaDataVersion, 'OID'),
		Name: getAttribute(metaDataVersion, 'Name'),
		Description: getAttribute(metaDataVersion, 'Description'),
		DefineVersion: getAttribute(metaDataVersion, 'def:DefineVersion')
	};

	// Extract standards
	const Standards: Standard[] = Array.from(
		metaDataVersion.getElementsByTagNameNS(namespaceURI, 'Standard')
	).map((standard) => ({
		OID: getAttribute(standard, 'OID'),
		Name: getAttribute(standard, 'Name'),
		Type: getAttribute(standard, 'Type'),
		Status: getAttribute(standard, 'Status'),
		Version: getAttribute(standard, 'Version'),
		PublishingSet: getAttribute(standard, 'PublishingSet'),
		CommentOID: getAttribute(standard, 'def:CommentOID')
	}));

	// --- CHANGED SECTION: ItemGroup parsing ---
	const ItemGroups: ItemGroup[] = Array.from(metaDataVersion.querySelectorAll('ItemGroupDef')).map(
		(group): ItemGroup => {
			// Explicitly type the return value

			// Parse ItemRefs specific to this ItemGroupDef
			const itemRefs: ItemRef[] = Array.from(group.querySelectorAll(':scope > ItemRef')).map(
				// Use :scope
				(item): ItemRef => ({
					// Explicitly type the return value
					OID: getAttribute(item, 'ItemOID') || null, // This OID points to the ItemDef
					Mandatory: getAttribute(item, 'Mandatory') || null,
					OrderNumber: getAttribute(item, 'OrderNumber') || null,
					MethodOID: getAttribute(item, 'MethodOID') || null,
					Role: getAttribute(item, 'Role') || null,
					WhereClauseOID:
						item
							.getElementsByTagNameNS(namespaceURI, 'WhereClauseRef')[0]
							?.getAttribute('WhereClauseOID') || null,
					KeySequence: getAttribute(item, 'KeySequence') || null,
					RoleCodeListOID: getAttribute(item, 'RoleCodeListOID') || null
				})
			);

			// Return the ItemGroup object including its ItemRefs
			return {
				OID: getAttribute(group, 'OID'),
				Name: getAttribute(group, 'Name'),
				SASDatasetName: getAttribute(group, 'SASDatasetName'),
				Repeating: getAttribute(group, 'Repeating'),
				Purpose: getAttribute(group, 'Purpose'),
				IsReferenceData: getAttribute(group, 'IsReferenceData'),
				StandardOID: getAttribute(group, 'def:StandardOID'),
				Structure: getAttribute(group, 'def:Structure'),
				ArchiveLocationID: getAttribute(group, 'def:ArchiveLocationID'),
				CommentOID: getAttribute(group, 'def:CommentOID'),
				Description: getTextContent(group, 'Description'),
				Class:
					group.getAttribute('def:Class') ||
					group.querySelector('Class')?.getAttribute('Name') ||
					null,
				ItemRefs: itemRefs // Assign the parsed ItemRefs here
			};
		}
	);
	// --- END OF CHANGED SECTION ---

	// Extract ItemDefs (Unchanged)
	const ItemDefs: ItemDef[] = Array.from(metaDataVersion.querySelectorAll('ItemDef')).map(
		(item) => ({
			OID: getAttribute(item, 'OID') || null,
			Dataset: getAttribute(item, 'OID')?.split('.')[1] || null,
			Name: getAttribute(item, 'Name') || null,
			SASFieldName: getAttribute(item, 'SASFieldName') || null,
			DataType: getAttribute(item, 'DataType') || null,
			Length: getAttribute(item, 'Length') || null,
			Description: item.querySelector('Description TranslatedText')?.textContent || null,
			OriginType: item.querySelector('Origin')?.getAttribute('Type') || null,
			Origin: item.querySelector('Origin Description TranslatedText')?.textContent || null,
			OriginSource: item.querySelector('Origin')?.getAttribute('Source') || null,
			CodeListOID: item.querySelector('CodeListRef')?.getAttribute('CodeListOID') || null,
			ValueListOID:
				item
					.getElementsByTagNameNS(namespaceURI, 'ValueListRef')[0]
					?.getAttribute('ValueListOID') || null,
			SignificantDigits: getAttribute(item, 'SignificantDigits') || null,
			Format: getAttribute(item, 'def:DisplayFormat') || null,
			HasNoData: getAttribute(item, 'HasNoData') || null,
			AssignedValue: getAttribute(item, 'def:AssignedValue') || null,
			Common: getAttribute(item, 'def:Common') === 'Yes' || null,
			Pages: getAttribute(item, 'def:Pages') || null,
			DisplayFormat: getAttribute(item, 'def:DisplayFormat') || null,
			CommentOID: getAttribute(item, 'def:CommentOID') || null,
			DeveloperNotes: getDefContent(item, 'DeveloperNotes') || null
		})
	);

	// Extract Methods (Unchanged)
	const Methods: Method[] = Array.from(metaDataVersion.querySelectorAll('MethodDef')).map(
		(method) => ({
			OID: getAttribute(method, 'OID') || null,
			Name: getAttribute(method, 'Name') || null,
			Type: getAttribute(method, 'Type') || null,
			Description: method.querySelector('Description TranslatedText')?.textContent || null,
			Document: method.querySelector('def\\:DocumentRef')?.getAttribute('leafID') || null,
			Pages:
				method.querySelector('def\\:DocumentRef def\\:PDFPageRef')?.getAttribute('PageRefs') || null
		})
	);

	// Extract Comments (Unchanged)
	const Comments: Comment[] = Array.from(metaDataVersion.querySelectorAll('CommentDef')).map(
		(method) => ({
			OID: method.getAttribute('OID') || null,
			Description: method.querySelector('Description TranslatedText')?.textContent || null
		})
	);

	// --- REMOVED/COMMENTED SECTION: Flat ItemRefs parsing ---
	/*
	const ItemRefs: ItemRef[] = Array.from(
		metaDataVersion.querySelectorAll('ItemGroupDef > ItemRef')
	).map((item) => ({
		OID: getAttribute(item, 'ItemOID') || null, // to remove at some point ... ..
		Mandatory: getAttribute(item, 'Mandatory') || null,
		OrderNumber: getAttribute(item, 'OrderNumber') || null,
		MethodOID: getAttribute(item, 'MethodOID') || null,
		Role: getAttribute(item, 'Role') || null,
		WhereClauseOID:
			item
				.getElementsByTagNameNS(namespaceURI, 'WhereClauseRef')[0]
				?.getAttribute('WhereClauseOID') || null,
		KeySequence: getAttribute(item, 'KeySequence') || null,
		RoleCodeListOID: getAttribute(item, 'RoleCodeListOID') || null
	}));
    */
	// --- END OF REMOVED/COMMENTED SECTION ---

	// Extract CodeLists (Unchanged)
	const CodeLists: CodeList[] = Array.from(metaDataVersion.querySelectorAll('CodeList'))
		.filter((codeList) => !codeList.querySelector('ExternalCodeList'))
		.map((codeList) => ({
			OID: getAttribute(codeList, 'OID') || null,
			Name: getAttribute(codeList, 'Name') || null,
			DataType: getAttribute(codeList, 'DataType') || null,
			SASFormatName: getAttribute(codeList, 'SASFormatName') || null,
			StandardOID: getAttribute(codeList, 'def:StandardOID') || null,
			IsNonStandard: getAttribute(codeList, 'def:IsNonStandard') || null,
			ExtendedValue: getAttribute(codeList, 'def:ExtendedValue') === 'Yes' ? true : null,

			// Parse CodeListItems
			CodeListItems: Array.from(codeList.querySelectorAll('CodeListItem')).map((item) => ({
				CodedValue: getAttribute(item, 'CodedValue'),
				OrderNumber: getAttribute(item, 'OrderNumber'),
				Rank: getAttribute(item, 'Rank'),
				ExtendedValue: getAttribute(item, 'def:ExtendedValue') === 'Yes',
				Decode: item.querySelector('Decode')
					? {
							TranslatedText: item.querySelector('Decode TranslatedText')?.textContent || null,
							Lang: item.querySelector('Decode TranslatedText')?.getAttribute('xml:lang') || null
						}
					: null,
				Aliases: Array.from(item.querySelectorAll('Alias')).map((alias) => ({
					Name: getAttribute(alias, 'Name'),
					Context: getAttribute(alias, 'Context')
				}))
			})),

			// Parse EnumeratedItems
			EnumeratedItems: Array.from(codeList.querySelectorAll('EnumeratedItem')).map((item) => ({
				CodedValue: getAttribute(item, 'CodedValue'),
				OrderNumber: getAttribute(item, 'OrderNumber'),
				Aliases: Array.from(item.querySelectorAll('Alias')).map((alias) => ({
					Name: getAttribute(alias, 'Name'),
					Context: getAttribute(alias, 'Context')
				}))
			})),

			// Parse CodeList level Aliases
			Aliases: Array.from(codeList.querySelectorAll(':scope > Alias')).map((alias) => ({
				Name: getAttribute(alias, 'Name'),
				Context: getAttribute(alias, 'Context')
			}))
		}));

	// Extract Dictionaries (Unchanged)
	const Dictionaries: Dictionary[] = Array.from(metaDataVersion.querySelectorAll('CodeList'))
		.filter((codeList) => codeList.querySelector('ExternalCodeList'))
		.map((codeList) => {
			const externalCodeList = codeList.querySelector('ExternalCodeList');

			return {
				OID: codeList.getAttribute('OID') || null,
				Name: codeList.getAttribute('Name') || null,
				DataType: codeList.getAttribute('DataType') || null,
				Dictionary: externalCodeList?.getAttribute('Dictionary') || null,
				Version: externalCodeList?.getAttribute('Version') || null
			};
		});

	// Extract WhereClauseDefs (Unchanged, but review OID parsing logic if issues persist)
	const WhereClauseDefs: WhereClauseDef[] = Array.from(
		metaDataVersion.getElementsByTagNameNS(namespaceURI, 'WhereClauseDef')
	).map((wcd): WhereClauseDef => {
		// ... (Keep existing WhereClauseDef parsing logic)
		const OID = wcd.getAttribute('OID');
		if (!OID) {
			throw new Error('WhereClauseDef must have an OID');
		}
		const CommentOID = wcd.getAttribute('def:CommentOID') || null;
		const rangeChecks = Array.from(wcd.querySelectorAll('RangeCheck'));

		const RangeChecks = rangeChecks.map((rc): RangeCheck => {
			const originalComparator = rc.getAttribute('Comparator');
			const originalSoftHard = rc.getAttribute('SoftHard');
			const ItemOID = rc.getAttribute('def:ItemOID');

			// Get CheckValues with namespace awareness
			const checkValueElements = Array.from(
				rc.getElementsByTagNameNS(namespaceURI, 'CheckValue')
			).concat(Array.from(rc.querySelectorAll('CheckValue'))); // Try both namespace and non-namespace

			let CheckValues = checkValueElements
				.map((element) => element.textContent?.trim())
				.filter((value): value is string => value !== null && value !== undefined && value !== '');

			if (!originalComparator || !ItemOID) {
				console.warn(`Invalid RangeCheck in WhereClauseDef ${OID}: missing required attributes`);
				return {
					Comparator: 'EQ' as ComparatorType,
					SoftHard: 'Soft' as 'Soft' | 'Hard',
					ItemOID: ItemOID || '',
					CheckValues: []
				};
			}

			const validComparator = isValidComparator(originalComparator)
				? originalComparator
				: (console.warn(
						`Invalid Comparator "${originalComparator}" in WhereClauseDef ${OID}, using EQ`
					),
					'EQ' as ComparatorType);

			const validSoftHard =
				originalSoftHard && ['Soft', 'Hard'].includes(originalSoftHard)
					? (originalSoftHard as 'Soft' | 'Hard')
					: ('Soft' as 'Soft' | 'Hard');

			// Simplified CheckValue inference - may need refinement based on actual needs
			if (CheckValues.length === 0) {
				const oidParts = OID.split('.');
				const lastPart = oidParts[oidParts.length - 1];
				if (lastPart) {
					CheckValues = [lastPart];
					// console.log(`Inferred CheckValues for ${OID} from OID:`, CheckValues);
				} else {
					// console.warn(`Unable to infer CheckValues for WhereClauseDef ${OID}`);
				}
			}

			return {
				Comparator: validComparator,
				SoftHard: validSoftHard,
				ItemOID,
				CheckValues
			};
		});

		return {
			OID,
			CommentOID,
			RangeChecks
		};
	});

	// Extract ValueListDefs (Unchanged)
	const ValueListDefs: ValueListDef[] = Array.from(
		metaDataVersion.getElementsByTagNameNS(namespaceURI, 'ValueListDef')
	).map((vld) => {
		// Get the basic ValueListDef attributes
		const valueListDef = {
			OID: vld.getAttribute('OID') || null,
			// Map ItemRefs array properly handling namespaces
			ItemRefs: Array.from(vld.children)
				.filter((child) => child.localName === 'ItemRef')
				.map((ir) => ({
					OID: ir.getAttribute('ItemOID') || null, // This OID points to the ItemDef
					Mandatory: ir.getAttribute('Mandatory') || null,
					OrderNumber: ir.getAttribute('OrderNumber') || null,
					MethodOID: ir.getAttribute('MethodOID') || null,
					// Find WhereClauseRef using namespace
					WhereClauseOID:
						Array.from(ir.children)
							.find(
								(child) =>
									child.localName === 'WhereClauseRef' && child.namespaceURI === namespaceURI
							)
							?.getAttribute('WhereClauseOID') || null,
					KeySequence: getAttribute(ir, 'KeySequence') || null, // Added KeySequence
					Role: getAttribute(ir, 'Role') || null, // Added Role
					RoleCodeListOID: getAttribute(ir, 'RoleCodeListOID') || null // Added RoleCodeListOID
				}))
		};
		return valueListDef;
	});

	// Extract Documents (Unchanged)
	const Documents: Document[] = Array.from(metaDataVersion.children)
		.filter((child) => child.nodeName === 'def:leaf')
		.map((leaf) => ({
			ID: leaf.getAttribute('ID') || null,
			Title: leaf.getElementsByTagNameNS(namespaceURI, 'title')[0]?.textContent || null,
			Href: leaf.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || null
		}));

	// Extract AnalysisResults with comprehensive field extraction
	const armNamespace = 'http://www.cdisc.org/ns/arm/v1.0';
	const defNamespace = namespaceURI; // Already defined earlier as 'http://www.cdisc.org/ns/def/v2.1' or v2.0
	const AnalysisResults = Array.from(
		metaDataVersion.getElementsByTagNameNS(armNamespace, 'AnalysisResult')
	).map((analysis) => {
		const description =
			analysis.getElementsByTagName('Description')[0]?.getElementsByTagName('TranslatedText')[0]
				?.textContent || null;
		const variables = Array.from(
			analysis.getElementsByTagNameNS(armNamespace, 'AnalysisVariable')
		)
			.map((v) => v.getAttribute('ItemOID'))
			.filter((v) => v)
			.join(', ');
		const documentation =
			analysis
				.getElementsByTagNameNS(armNamespace, 'Documentation')[0]
				?.getElementsByTagName('TranslatedText')[0]?.textContent || null;
		const docRefs = Array.from(
			analysis.getElementsByTagNameNS(armNamespace, 'Documentation')[0]?.getElementsByTagNameNS(defNamespace, 'DocumentRef') ||
				[]
		)
			.map((ref) => ref.getAttribute('leafID'))
			.join(', ');
		const programmingSection = analysis.getElementsByTagNameNS(armNamespace, 'ProgrammingCode')[0];
		const programmingContext = programmingSection?.getAttribute('Context') || null;
		const programmingCode =
			programmingSection?.getElementsByTagNameNS(armNamespace, 'Code')[0]?.textContent?.trim() ||
			null;
		const programmingDoc =
			programmingSection?.getElementsByTagNameNS(defNamespace, 'DocumentRef')[0]?.getAttribute('leafID') || null;
		let currentNode = analysis.parentNode;
		let displayName = null;
		while (currentNode && currentNode.nodeType === Node.ELEMENT_NODE) {
			if ((currentNode as Element).localName === 'ResultDisplay') {
				displayName = (currentNode as Element).getAttribute('Name');
				break;
			}
			currentNode = currentNode.parentNode;
		}
		const pages =
			currentNode && currentNode.nodeType === Node.ELEMENT_NODE
				? Array.from((currentNode as Element).getElementsByTagName('PDFPageRef'))
						.map((page) => page.getAttribute('PageRefs'))
						.filter((p) => p)
						.join(', ')
				: null;

		// Extract AnalysisDatasets
		const analysisDatasets = Array.from(
			analysis.getElementsByTagNameNS(armNamespace, 'AnalysisDataset')
		).map((dataset) => {
			const itemGroupOID = dataset.getAttribute('ItemGroupOID') || '';
			const whereClauseOIDs = Array.from(dataset.getElementsByTagNameNS(defNamespace, 'WhereClauseRef'))
				.map((wc) => wc.getAttribute('WhereClauseOID'))
				.filter((oid): oid is string => oid !== null);
			const analysisVariables = Array.from(
				dataset.getElementsByTagNameNS(armNamespace, 'AnalysisVariable')
			).map((av) => ({
				ItemOID: av.getAttribute('ItemOID') || '',
				WhereClauseOIDs: Array.from(av.getElementsByTagNameNS(defNamespace, 'WhereClauseRef'))
					.map((wc) => wc.getAttribute('WhereClauseOID'))
					.filter((oid): oid is string => oid !== null)
			}));
			return {
				ItemGroupOID: itemGroupOID,
				WhereClauseOIDs: whereClauseOIDs,
				AnalysisVariables: analysisVariables
			};
		});

		// Extract all AnalysisVariables (at all levels)
		const allAnalysisVariables = Array.from(
			analysis.getElementsByTagNameNS(armNamespace, 'AnalysisVariable')
		).map((av) => ({
			ItemOID: av.getAttribute('ItemOID') || '',
			WhereClauseOIDs: Array.from(av.getElementsByTagNameNS(defNamespace, 'WhereClauseRef'))
				.map((wc) => wc.getAttribute('WhereClauseOID'))
				.filter((oid): oid is string => oid !== null)
		}));

		return {
			Display: displayName,
			ID: analysis.getAttribute('OID') || null,
			Description: description,
			ParameterOID: analysis.getAttribute('ParameterOID') || null,
			Variables: variables,
			Reason: analysis.getAttribute('AnalysisReason') || null,
			Purpose: analysis.getAttribute('AnalysisPurpose') || null,
			SelectionCriteria: Array.from(analysis.getElementsByTagNameNS(defNamespace, 'WhereClauseRef'))
				.map((where) => where.getAttribute('WhereClauseOID'))
				.filter((w) => w)
				.join(', '),
			JoinComment: null,
			Documentation: documentation,
			DocumentationRefs: docRefs,
			ProgrammingContext: programmingContext,
			ProgrammingCode: programmingCode,
			ProgrammingDocument: programmingDoc,
			Pages: pages,
			AnalysisDatasets: analysisDatasets,
			AnalysisVariables: allAnalysisVariables
		} as AnalysisResult;
	});

	// --- CHANGED SECTION: Final result object ---
	const result: ParsedDefineXML = {
		Study,
		MetaData,
		Standards,
		ItemGroups, // Now contains nested ItemRefs
		Methods,
		ItemDefs,
		ItemRefs: [], // Assign empty array, as ItemRefs are now nested in ItemGroups
		Comments,
		CodeLists,
		WhereClauseDefs,
		ValueListDefs,
		Dictionaries,
		Documents,
		AnalysisResults
	};
	// --- END OF CHANGED SECTION ---

	return result;
};
