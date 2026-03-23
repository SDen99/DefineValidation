import type { ParsedDefineXML } from '@sden99/cdisc-types/define-xml';

/**
 * Mock Define-XML data for prototype testing
 * Includes realistic ADaM and SDTM structures with connections
 */

interface MockDefineData {
	adam: ParsedDefineXML;
	sdtm: ParsedDefineXML;
}

export const mockDefineData: MockDefineData = {
	adam: {
		Study: {
			OID: 'STUDY.ADAM.001',
			Name: 'Example ADaM Study',
			Description: 'Prototype ADaM Define-XML for metadata browser testing',
			ProtocolName: 'PROTO-001'
		},
		MetaData: {
			OID: 'METADATA.ADAM.001',
			Name: 'ADaM Metadata',
			Description: 'Analysis Data Model metadata',
			DefineVersion: '2.1'
		},
		Standards: [
			{
				OID: 'STD.ADAM.2.1',
				Name: 'ADaMIG',
				Type: 'IG',
				Version: '1.3',
				PublishingSet: 'ADaM',
				Status: 'Final',
				CommentOID: null
			}
		],
		ItemGroups: [
			{
				OID: 'IG.ADSL',
				Name: 'ADSL',
				SASDatasetName: 'ADSL',
				Description: 'Subject Level Analysis Dataset',
				Repeating: 'No',
				IsReferenceData: 'No',
				Purpose: 'Analysis',
				Class: 'SUBJECT LEVEL',
				CommentOID: null,
				Structure: null,
				ArchiveLocationID: null,
				StandardOID: null,
				IsNonStandard: null,
				HasNoData: null,
				ItemRefs: [
					{ OID: 'IT.ADSL.USUBJID', Mandatory: 'Yes', OrderNumber: '1', KeySequence: '1', MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.ADSL.AGE', Mandatory: 'No', OrderNumber: '2', KeySequence: null, MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.ADSL.SEX', Mandatory: 'No', OrderNumber: '3', KeySequence: null, MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.ADSL.TRT01P', Mandatory: 'No', OrderNumber: '4', KeySequence: null, MethodOID: 'MT.TRT', WhereClauseOID: null, Role: null, RoleCodeListOID: null }
				]
			},
			{
				OID: 'IG.ADAE',
				Name: 'ADAE',
				SASDatasetName: 'ADAE',
				Description: 'Adverse Events Analysis Dataset',
				Repeating: 'Yes',
				IsReferenceData: 'No',
				Purpose: 'Analysis',
				Class: 'ADVERSE EVENTS',
				CommentOID: null,
				Structure: null,
				ArchiveLocationID: null,
				StandardOID: null,
				IsNonStandard: null,
				HasNoData: null,
				ItemRefs: [
					{ OID: 'IT.ADAE.USUBJID', Mandatory: 'Yes', OrderNumber: '1', KeySequence: '1', MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.ADAE.AETERM', Mandatory: 'Yes', OrderNumber: '2', KeySequence: null, MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.ADAE.AESEV', Mandatory: 'No', OrderNumber: '3', KeySequence: null, MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null }
				]
			},
			{
				OID: 'IG.ADLB',
				Name: 'ADLB',
				SASDatasetName: 'ADLB',
				Description: 'Laboratory Analysis Dataset',
				Repeating: 'Yes',
				IsReferenceData: 'No',
				Purpose: 'Analysis',
				Class: 'LAB',
				CommentOID: null,
				Structure: null,
				ArchiveLocationID: null,
				StandardOID: null,
				IsNonStandard: null,
				HasNoData: null,
				ItemRefs: [
					{ OID: 'IT.ADLB.USUBJID', Mandatory: 'Yes', OrderNumber: '1', KeySequence: '1', MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.ADLB.PARAMCD', Mandatory: 'Yes', OrderNumber: '2', KeySequence: '2', MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.ADLB.AVAL', Mandatory: 'No', OrderNumber: '3', KeySequence: null, MethodOID: 'MT.AVAL', WhereClauseOID: null, Role: null, RoleCodeListOID: null }
				]
			}
		],
		ItemDefs: [
			{
				OID: 'IT.ADSL.USUBJID',
				Name: 'USUBJID',
				DataType: 'text',
				Length: '40',
				Description: 'Unique Subject Identifier',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'Derived',
				OriginType: 'Derived',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'USUBJID',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADSL.AGE',
				Name: 'AGE',
				DataType: 'integer',
				Length: '3',
				Description: 'Age',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: 'COM.AGE',
				Origin: 'CRF',
				OriginType: 'Collected',
				OriginSource: 'Demographics CRF',
				SignificantDigits: null,
				SASFieldName: 'AGE',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADSL.SEX',
				Name: 'SEX',
				DataType: 'text',
				Length: '1',
				Description: 'Sex',
				CodeListOID: 'CL.SEX',
				ValueListOID: null,
				CommentOID: null,
				Origin: 'CRF',
				OriginType: 'Collected',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'SEX',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADSL.TRT01P',
				Name: 'TRT01P',
				DataType: 'text',
				Length: '40',
				Description: 'Planned Treatment for Period 01',
				CodeListOID: 'CL.TRT',
				ValueListOID: null,
				CommentOID: null,
				Origin: 'Derived',
				OriginType: 'Assigned',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'TRT01P',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADAE.USUBJID',
				Name: 'USUBJID',
				DataType: 'text',
				Length: '40',
				Description: 'Unique Subject Identifier',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'Derived',
				OriginType: 'Derived',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'USUBJID',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADAE.AETERM',
				Name: 'AETERM',
				DataType: 'text',
				Length: '200',
				Description: 'Reported Term for the Adverse Event',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'CRF',
				OriginType: 'Collected',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'AETERM',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADAE.AESEV',
				Name: 'AESEV',
				DataType: 'text',
				Length: '20',
				Description: 'Severity/Intensity',
				CodeListOID: 'CL.SEVERITY',
				ValueListOID: null,
				CommentOID: null,
				Origin: 'CRF',
				OriginType: 'Collected',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'AESEV',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADLB.USUBJID',
				Name: 'USUBJID',
				DataType: 'text',
				Length: '40',
				Description: 'Unique Subject Identifier',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'Derived',
				OriginType: 'Derived',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'USUBJID',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADLB.PARAMCD',
				Name: 'PARAMCD',
				DataType: 'text',
				Length: '8',
				Description: 'Parameter Code',
				CodeListOID: 'CL.PARAMCD',
				ValueListOID: null,
				CommentOID: null,
				Origin: 'Derived',
				OriginType: 'Derived',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'PARAMCD',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.ADLB.AVAL',
				Name: 'AVAL',
				DataType: 'float',
				Length: '8',
				Description: 'Analysis Value',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'Derived',
				OriginType: 'Derived',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'AVAL',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			}
		],
		ItemRefs: [],
		CodeLists: [
			{
				OID: 'CL.SEX',
				Name: 'Sex',
				DataType: 'text',
				SASFormatName: '$SEX',
				StandardOID: null,
				IsNonStandard: null,
				ExtendedValue: false,
				CodeListItems: [
					{
						CodedValue: 'M',
						OrderNumber: '1',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Male', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'F',
						OrderNumber: '2',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Female', Lang: 'en' },
						Aliases: []
					}
				],
				EnumeratedItems: [],
				Aliases: []
			},
			{
				OID: 'CL.TRT',
				Name: 'Treatment',
				DataType: 'text',
				SASFormatName: '$TRT',
				StandardOID: null,
				IsNonStandard: null,
				ExtendedValue: false,
				CodeListItems: [
					{
						CodedValue: 'PLACEBO',
						OrderNumber: '1',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Placebo', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'DRUG_10MG',
						OrderNumber: '2',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Drug 10mg', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'DRUG_20MG',
						OrderNumber: '3',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Drug 20mg', Lang: 'en' },
						Aliases: []
					}
				],
				EnumeratedItems: [],
				Aliases: []
			},
			{
				OID: 'CL.SEVERITY',
				Name: 'Severity',
				DataType: 'text',
				SASFormatName: '$AESEV',
				StandardOID: null,
				IsNonStandard: null,
				ExtendedValue: false,
				CodeListItems: [
					{
						CodedValue: 'MILD',
						OrderNumber: '1',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Mild', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'MODERATE',
						OrderNumber: '2',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Moderate', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'SEVERE',
						OrderNumber: '3',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Severe', Lang: 'en' },
						Aliases: []
					}
				],
				EnumeratedItems: [],
				Aliases: []
			},
			{
				OID: 'CL.PARAMCD',
				Name: 'Parameter Code',
				DataType: 'text',
				SASFormatName: '$PARAM',
				StandardOID: null,
				IsNonStandard: null,
				ExtendedValue: false,
				CodeListItems: [
					{
						CodedValue: 'ALT',
						OrderNumber: '1',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Alanine Aminotransferase', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'AST',
						OrderNumber: '2',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Aspartate Aminotransferase', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'BILI',
						OrderNumber: '3',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Bilirubin', Lang: 'en' },
						Aliases: []
					}
				],
				EnumeratedItems: [],
				Aliases: []
			}
		],
		Methods: [
			{
				OID: 'MT.TRT',
				Name: 'Derivation of TRT01P',
				Type: 'Computation',
				Description: 'Planned treatment derived from randomization data',
				Document: null,
				Pages: null,
				TranslatedText: null
			},
			{
				OID: 'MT.AVAL',
				Name: 'Analysis Value Derivation',
				Type: 'Computation',
				Description: 'AVAL = LBSTRESN when LBSTRESU matches standard unit',
				Document: null,
				Pages: null,
				TranslatedText: null
			}
		],
		Comments: [
			{
				OID: 'COM.AGE',
				Description: 'Age at informed consent in years'
			}
		],
		WhereClauseDefs: [],
		ValueListDefs: [],
		Dictionaries: [],
		Documents: [],
		AnalysisResults: []
	},

	sdtm: {
		Study: {
			OID: 'STUDY.SDTM.001',
			Name: 'Example SDTM Study',
			Description: 'Prototype SDTM Define-XML for metadata browser testing',
			ProtocolName: 'PROTO-001'
		},
		MetaData: {
			OID: 'METADATA.SDTM.001',
			Name: 'SDTM Metadata',
			Description: 'Study Data Tabulation Model metadata',
			DefineVersion: '2.1'
		},
		Standards: [
			{
				OID: 'STD.SDTM.1.7',
				Name: 'SDTMIG',
				Type: 'IG',
				Version: '3.4',
				PublishingSet: 'SDTM',
				Status: 'Final',
				CommentOID: null
			}
		],
		ItemGroups: [
			{
				OID: 'IG.DM',
				Name: 'DM',
				SASDatasetName: 'DM',
				Description: 'Demographics',
				Repeating: 'No',
				IsReferenceData: 'No',
				Purpose: 'Tabulation',
				Class: 'SPECIAL PURPOSE',
				CommentOID: null,
				Structure: null,
				ArchiveLocationID: null,
				StandardOID: null,
				IsNonStandard: null,
				HasNoData: null,
				ItemRefs: [
					{ OID: 'IT.DM.USUBJID', Mandatory: 'Yes', OrderNumber: '1', KeySequence: '1', MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.DM.AGE', Mandatory: 'No', OrderNumber: '2', KeySequence: null, MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.DM.SEX', Mandatory: 'No', OrderNumber: '3', KeySequence: null, MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null }
				]
			},
			{
				OID: 'IG.AE',
				Name: 'AE',
				SASDatasetName: 'AE',
				Description: 'Adverse Events',
				Repeating: 'Yes',
				IsReferenceData: 'No',
				Purpose: 'Tabulation',
				Class: 'EVENTS',
				CommentOID: null,
				Structure: null,
				ArchiveLocationID: null,
				StandardOID: null,
				IsNonStandard: null,
				HasNoData: null,
				ItemRefs: [
					{ OID: 'IT.AE.USUBJID', Mandatory: 'Yes', OrderNumber: '1', KeySequence: '1', MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null },
					{ OID: 'IT.AE.AETERM', Mandatory: 'Yes', OrderNumber: '2', KeySequence: null, MethodOID: null, WhereClauseOID: null, Role: null, RoleCodeListOID: null }
				]
			}
		],
		ItemDefs: [
			{
				OID: 'IT.DM.USUBJID',
				Name: 'USUBJID',
				DataType: 'text',
				Length: '40',
				Description: 'Unique Subject Identifier',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'Assigned',
				OriginType: 'Assigned',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'USUBJID',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.DM.AGE',
				Name: 'AGE',
				DataType: 'integer',
				Length: '3',
				Description: 'Age',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'CRF',
				OriginType: 'Collected',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'AGE',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.DM.SEX',
				Name: 'SEX',
				DataType: 'text',
				Length: '1',
				Description: 'Sex',
				CodeListOID: 'CL.SEX.SDTM',
				ValueListOID: null,
				CommentOID: null,
				Origin: 'CRF',
				OriginType: 'Collected',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'SEX',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.AE.USUBJID',
				Name: 'USUBJID',
				DataType: 'text',
				Length: '40',
				Description: 'Unique Subject Identifier',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'Assigned',
				OriginType: 'Assigned',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'USUBJID',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			},
			{
				OID: 'IT.AE.AETERM',
				Name: 'AETERM',
				DataType: 'text',
				Length: '200',
				Description: 'Reported Term for the Adverse Event',
				CodeListOID: null,
				ValueListOID: null,
				CommentOID: null,
				Origin: 'CRF',
				OriginType: 'Collected',
				OriginSource: null,
				SignificantDigits: null,
				SASFieldName: 'AETERM',
				DisplayFormat: null,
				HasNoData: null,
				Dataset: null,
				AssignedValue: null,
				Common: null,
				Pages: null,
				DeveloperNotes: null
			}
		],
		ItemRefs: [],
		CodeLists: [
			{
				OID: 'CL.SEX.SDTM',
				Name: 'Sex',
				DataType: 'text',
				SASFormatName: '$SEX',
				StandardOID: null,
				IsNonStandard: null,
				ExtendedValue: false,
				CodeListItems: [
					{
						CodedValue: 'M',
						OrderNumber: '1',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Male', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'F',
						OrderNumber: '2',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Female', Lang: 'en' },
						Aliases: []
					},
					{
						CodedValue: 'U',
						OrderNumber: '3',
						Rank: null,
						ExtendedValue: false,
						Decode: { TranslatedText: 'Unknown', Lang: 'en' },
						Aliases: []
					}
				],
				EnumeratedItems: [],
				Aliases: []
			}
		],
		Methods: [],
		Comments: [],
		WhereClauseDefs: [],
		ValueListDefs: [],
		Dictionaries: [],
		Documents: [],
		AnalysisResults: []
	}
};

/**
 * Get Define-XML data by type
 */
export function getDefineData(defineType: 'adam' | 'sdtm'): ParsedDefineXML {
	return mockDefineData[defineType];
}

/**
 * Mock graph data with connections
 * This will be replaced when real graph generation is implemented
 */
export interface MockGraphData {
	nodes: Array<{
		id: string;
		group: number;
		label: string;
		type: 'dataset' | 'variable' | 'codelist' | 'method' | 'comment';
	}>;
	links: Array<{
		source: string;
		target: string;
		relationship: string;
	}>;
}

export function getMockGraphData(defineType: 'adam' | 'sdtm'): MockGraphData {
	const data = getDefineData(defineType);
	const nodes: MockGraphData['nodes'] = [];
	const links: MockGraphData['links'] = [];

	// Add dataset nodes
	data.ItemGroups.forEach((ig) => {
		if (ig.OID) {
			nodes.push({
				id: ig.OID,
				group: 1,
				label: ig.Name || ig.OID,
				type: 'dataset'
			});
		}
	});

	// Add variable nodes
	data.ItemDefs.forEach((item) => {
		if (item.OID) {
			nodes.push({
				id: item.OID,
				group: 2,
				label: item.Name || item.OID,
				type: 'variable'
			});
		}
	});

	// Add codelist nodes
	data.CodeLists.forEach((cl) => {
		if (cl.OID) {
			nodes.push({
				id: cl.OID,
				group: 3,
				label: cl.Name || cl.OID,
				type: 'codelist'
			});
		}
	});

	// Add method nodes
	data.Methods.forEach((m) => {
		if (m.OID) {
			nodes.push({
				id: m.OID,
				group: 4,
				label: m.Name || m.OID,
				type: 'method'
			});
		}
	});

	// Add comment nodes
	data.Comments.forEach((c) => {
		if (c.OID) {
			nodes.push({
				id: c.OID,
				group: 5,
				label: c.OID,
				type: 'comment'
			});
		}
	});

	// Create links: Dataset -> Variable
	data.ItemGroups.forEach((ig) => {
		ig.ItemRefs?.forEach((ref) => {
			if (ig.OID && ref.OID) {
				links.push({
					source: ig.OID,
					target: ref.OID,
					relationship: 'contains'
				});
			}
		});
	});

	// Create links: Variable -> CodeList
	data.ItemDefs.forEach((item) => {
		if (item.OID && item.CodeListOID) {
			links.push({
				source: item.OID,
				target: item.CodeListOID,
				relationship: 'uses_codelist'
			});
		}
	});

	// Create links: Variable -> Method (via ItemRef)
	data.ItemGroups.forEach((ig) => {
		ig.ItemRefs?.forEach((ref) => {
			if (ref.OID && ref.MethodOID) {
				links.push({
					source: ref.OID,
					target: ref.MethodOID,
					relationship: 'uses_method'
				});
			}
		});
	});

	// Create links: Variable -> Comment
	data.ItemDefs.forEach((item) => {
		if (item.OID && item.CommentOID) {
			links.push({
				source: item.OID,
				target: item.CommentOID,
				relationship: 'has_comment'
			});
		}
	});

	return { nodes, links };
}

/**
 * Get connected nodes for a given node (for filtering)
 */
export function getConnectedNodes(
	nodeId: string,
	graphData: MockGraphData | any,
	depth: number = 1
): Set<string> {
	const connected = new Set<string>();
	const visited = new Set<string>();

	console.log('[getConnectedNodes] Starting with nodeId:', nodeId);
	console.log('[getConnectedNodes] Graph has', graphData.nodes?.length || 0, 'nodes and', graphData.links?.length || 0, 'links');

	// Check if the node exists in the graph
	const nodeExists = graphData.nodes?.some((n: any) => n.id === nodeId);
	console.log('[getConnectedNodes] Node exists in graph:', nodeExists);

	function traverse(currentId: string, currentDepth: number) {
		if (currentDepth > depth || visited.has(currentId)) return;
		visited.add(currentId);
		connected.add(currentId);

		// Find all links involving this node
		graphData.links.forEach((link: any) => {
			if (link.source === currentId && !visited.has(link.target)) {
				traverse(link.target, currentDepth + 1);
			}
			if (link.target === currentId && !visited.has(link.source)) {
				traverse(link.source, currentDepth + 1);
			}
		});
	}

	traverse(nodeId, 0);
	console.log('[getConnectedNodes] Found', connected.size, 'connected nodes:', Array.from(connected).slice(0, 10));
	return connected;
}
