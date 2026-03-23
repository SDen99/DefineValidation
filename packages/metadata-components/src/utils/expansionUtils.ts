// packages/metadata-components/src/utils/expansionUtils.ts
// Expansion utilities for metadata components using Direct Values Pattern

import * as metadataState from '../state/metadataReactiveState.svelte';
import type { ValueLevelMetadata } from '@sden99/data-processing';

export const EXPANSION_TYPE = {
	METHOD: 'method',
	CODELIST: 'codelist',
	COMMENTS: 'comments'
} as const;

type ExpansionType = (typeof EXPANSION_TYPE)[keyof typeof EXPANSION_TYPE];

// ============================================
// CODELIST UTILITIES (simplified for package)
// ============================================

export function hasCodelist(variable: ValueLevelMetadata): boolean {
	return !!variable.codeList;
}

// ============================================
// KEY GENERATION
// ============================================

function getUniqueKey(variable: ValueLevelMetadata): string {
	// Use variable OID + whereClause OID if present for uniqueness
	return variable.variable.oid + (variable.whereClause?.oid || '');
}

export function getExpansionKey(uniqueVariableKey: string, expansionType: ExpansionType): string {
	return `${uniqueVariableKey}-${expansionType}`;
}

// ============================================
// EXPANSION STATE CHECKING (simplified with Direct Values)
// ============================================

export function isExpanded(
	variable: ValueLevelMetadata,
	datasetName: string,
	expansionType: ExpansionType
): boolean {
	const uniqueKey = getUniqueKey(variable);
	return metadataState.isExpanded(datasetName, getExpansionKey(uniqueKey, expansionType));
}

export function isMethodExpanded(variable: ValueLevelMetadata, datasetName: string): boolean {
	return isExpanded(variable, datasetName, EXPANSION_TYPE.METHOD);
}

export function isCodelistExpanded(variable: ValueLevelMetadata, datasetName: string): boolean {
	return isExpanded(variable, datasetName, EXPANSION_TYPE.CODELIST);
}

export function isCommentsExpanded(variable: ValueLevelMetadata, datasetName: string): boolean {
	return isExpanded(variable, datasetName, EXPANSION_TYPE.COMMENTS);
}

// Check if at least one section for this variable is expanded
export function isAtLeastOneSectionExpanded(
	variable: ValueLevelMetadata,
	datasetName: string
): boolean {
	const methodExpanded = variable.method
		? isExpanded(variable, datasetName, EXPANSION_TYPE.METHOD)
		: false;
	const codelistExpanded = hasCodelist(variable)
		? isExpanded(variable, datasetName, EXPANSION_TYPE.CODELIST)
		: false;
	const commentsExpanded = variable.comments?.length
		? isExpanded(variable, datasetName, EXPANSION_TYPE.COMMENTS)
		: false;
	return methodExpanded || codelistExpanded || commentsExpanded;
}

// Check if ALL available sections for this variable are expanded
export function areAllSectionsExpanded(variable: ValueLevelMetadata, datasetName: string): boolean {
	const methodShouldBeExpanded = !!variable.method;
	const codelistShouldBeExpanded = hasCodelist(variable);
	const commentsShouldBeExpanded = !!variable.comments?.length;

	const methodIsExpanded = methodShouldBeExpanded
		? isExpanded(variable, datasetName, EXPANSION_TYPE.METHOD)
		: true; // Consider expanded if no method to expand

	const codelistIsExpanded = codelistShouldBeExpanded
		? isExpanded(variable, datasetName, EXPANSION_TYPE.CODELIST)
		: true; // Consider expanded if no codelist to expand

	const commentsIsExpanded = commentsShouldBeExpanded
		? isExpanded(variable, datasetName, EXPANSION_TYPE.COMMENTS)
		: true; // Consider expanded if no comments to expand

	return methodIsExpanded && codelistIsExpanded && commentsIsExpanded;
}

// ============================================
// EXPANSION ACTIONS (simplified with Direct Values)
// ============================================

export function toggleExpansion(
	variable: ValueLevelMetadata,
	datasetName: string,
	expansionType: ExpansionType
): void {
	const uniqueKey = getUniqueKey(variable);
	metadataState.toggleExpansionByKey(datasetName, getExpansionKey(uniqueKey, expansionType));
}

export function handleExpandToggle(variable: ValueLevelMetadata, datasetName: string): void {
	// Toggle method, codelist, and comments if they exist
	if (variable.method) {
		toggleExpansion(variable, datasetName, EXPANSION_TYPE.METHOD);
	}
	if (hasCodelist(variable)) {
		toggleExpansion(variable, datasetName, EXPANSION_TYPE.CODELIST);
	}
	if (variable.comments?.length) {
		toggleExpansion(variable, datasetName, EXPANSION_TYPE.COMMENTS);
	}
}

// ============================================
// BATCH OPERATIONS
// ============================================

export function getAllExpansionKeys(
	variables: ValueLevelMetadata[]
): string[] {
	const keys: string[] = [];
	variables.forEach((variable) => {
		const uniqueKey = getUniqueKey(variable);
		if (variable.method) {
			keys.push(getExpansionKey(uniqueKey, EXPANSION_TYPE.METHOD));
		}
		if (hasCodelist(variable)) {
			keys.push(getExpansionKey(uniqueKey, EXPANSION_TYPE.CODELIST));
		}
		if (variable.comments?.length) {
			keys.push(getExpansionKey(uniqueKey, EXPANSION_TYPE.COMMENTS));
		}
	});
	return keys;
}

// Helper to generate pre-computed expansion state for "dumb" components
export function getExpansionStates(
	variables: ValueLevelMetadata[],
	datasetName: string
): {
	expandedVariableIds: Set<string>;
	methodExpansions: Set<string>;
	codelistExpansions: Set<string>;
	commentsExpansions: Set<string>;
} {
	const expandedVariableIds = new Set<string>();
	const methodExpansions = new Set<string>();
	const codelistExpansions = new Set<string>();
	const commentsExpansions = new Set<string>();

	variables.forEach((variable) => {
		const uniqueKey = getUniqueKey(variable);

		if (variable.method && isMethodExpanded(variable, datasetName)) {
			methodExpansions.add(uniqueKey);
			expandedVariableIds.add(uniqueKey);
		}

		if (hasCodelist(variable) && isCodelistExpanded(variable, datasetName)) {
			codelistExpansions.add(uniqueKey);
			expandedVariableIds.add(uniqueKey);
		}

		if (variable.comments?.length && isCommentsExpanded(variable, datasetName)) {
			commentsExpansions.add(uniqueKey);
			expandedVariableIds.add(uniqueKey);
		}
	});

	return { expandedVariableIds, methodExpansions, codelistExpansions, commentsExpansions };
}