import * as dataState from '$lib/core/state/dataState.svelte.ts';
import * as appState from '$lib/core/state/appState.svelte.ts';
import { normalizeDatasetId as normalize } from '@sden99/dataset-domain';
import { logWarning } from '$lib/core/state/errorState.svelte';

/**
 * Finds the source file and domain for a given name.
 * Always normalizes the input first so data files are found before
 * falling through to Define-XML lookup (which returns the XML file, not data).
 */
function findSource(name: string): { fileId: string; domain: string } | null {
	const normalizedName = normalize(name);
	const allDatasets = dataState.getDatasets();
	const datasetKeys = Object.keys(allDatasets);

	// First, check for a direct data file match via the originalFilenames map
	const originalFilename = dataState.getOriginalFilename(normalizedName);
	if (originalFilename && allDatasets[originalFilename]) {
		return { fileId: originalFilename, domain: normalizedName };
	}

	// Also check if the raw name or normalized name exists as a dataset key
	if (allDatasets[name]) {
		return { fileId: name, domain: normalizedName };
	}
	if (allDatasets[normalizedName]) {
		return { fileId: normalizedName, domain: normalizedName };
	}

	// Fallback: scan all dataset keys and match by normalized form
	const matchingKey = datasetKeys.find(
		(key) => normalize(key) === normalizedName && key !== 'define.xml'
	);
	if (matchingKey) {
		return { fileId: matchingKey, domain: normalizedName };
	}

	// No data file found — check Define-XML for metadata-only domains
	const { SDTM, ADaM, sdtmId, adamId } = dataState.getDefineXmlInfo();

	const adamGroup = ADaM?.ItemGroups.find(
		(g) => normalize(g.SASDatasetName || g.Name) === normalizedName
	);
	if (adamGroup) {
		if (!adamId) return null;
		const originalName = adamGroup.SASDatasetName || adamGroup.Name || normalizedName;
		return { fileId: adamId, domain: originalName };
	}

	const sdtmGroup = SDTM?.ItemGroups.find(
		(g) => normalize(g.SASDatasetName || g.Name) === normalizedName
	);
	if (sdtmGroup) {
		if (!sdtmId) return null;
		const originalName = sdtmGroup.SASDatasetName || sdtmGroup.Name || normalizedName;
		return { fileId: sdtmId, domain: originalName };
	}

	return null;
}

/**
 * The single, authoritative function for handling a dataset selection.
 */
export function selectDataset(datasetName: string | null) {
	console.warn(`[SelectionAction] selectDataset: '${datasetName}'`);

	if (datasetName === null) {
		dataState.selectDatasetWithWorker(null, null);
		return;
	}

	const source = findSource(datasetName);

	if (source) {
		dataState.selectDatasetWithWorker(source.fileId, source.domain);

		// Preserve current view if it's still available, otherwise fallback
		const availableViews = dataState.getAvailableViews();
		const currentViewMode = appState.viewMode.value;

		if (!availableViews[currentViewMode]) {
			if (availableViews.data) {
				appState.setViewMode('data');
			} else if (availableViews.metadata) {
				appState.setViewMode('metadata');
			}
		}
	} else {
		console.warn(`[SelectionAction] Could not resolve a file for '${datasetName}'.`);
		logWarning(`Dataset '${datasetName}' could not be found.`);
	}
}
