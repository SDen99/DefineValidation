import * as dataState from '$lib/core/state/dataState.svelte.ts';
import * as appState from '$lib/core/state/appState.svelte.ts';
import { normalizeDatasetId as normalize } from '@sden99/dataset-domain';
import { startMetric, endMetric, startSession, endSession } from '$lib/utils/performanceMetrics.svelte';

/**
 * Finds the source file and domain for a given name.
 * Always normalizes the input first so data files are found before
 * falling through to Define-XML lookup (which returns the XML file, not data).
 */
function findSource(name: string): { fileId: string; domain: string } | null {
	const normalizedName = normalize(name);
	const allDatasets = dataState.getDatasets();

	// First, check for a direct data file match via the originalFilenames map
	// (normalized key → original filename like "adpc.sas7bdat")
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

	// No data file found — check Define-XML for metadata-only domains
	const { SDTM, ADaM, sdtmId, adamId } = dataState.getDefineXmlInfo();

	const adamGroup = ADaM?.ItemGroups.find(
		(g) => normalize(g.SASDatasetName || g.Name) === normalizedName
	);
	if (adamGroup) {
		if (!adamId) {
			console.warn(`[SelectionAction] Found domain '${normalizedName}' in ADaM but adamId is null`);
			return null;
		}
		const originalName = adamGroup.SASDatasetName || adamGroup.Name || normalizedName;
		return { fileId: adamId, domain: originalName };
	}

	const sdtmGroup = SDTM?.ItemGroups.find(
		(g) => normalize(g.SASDatasetName || g.Name) === normalizedName
	);
	if (sdtmGroup) {
		if (!sdtmId) {
			console.warn(`[SelectionAction] Found domain '${normalizedName}' in SDTM but sdtmId is null`);
			return null;
		}
		const originalName = sdtmGroup.SASDatasetName || sdtmGroup.Name || normalizedName;
		return { fileId: sdtmId, domain: originalName };
	}

	return null;
}

/**
 * The single, authoritative function for handling a dataset selection.
 * This version correctly uses the state as you intended.
 * Now instrumented with performance metrics.
 */
export function selectDataset(datasetName: string | null) {
	// Start overall session tracking
	const sessionId = `dataset-switch-${datasetName || 'null'}-${Date.now()}`;
	startSession(sessionId);
	startMetric('total-selection', 'selection', { datasetName });

	console.log(`[SelectionAction] Started for: '${datasetName}'`);

	if (datasetName === null) {
		dataState.selectDatasetWithWorker(null, null);
		endMetric('total-selection', 'selection');
		endSession();
		return;
	}

	// Track dataset lookup time
	startMetric('find-source', 'selection', { datasetName });
	const source = findSource(datasetName);
	endMetric('find-source', 'selection', { found: !!source });

	if (source) {
		console.log(
			`[SelectionAction] Resolved source. Updating core state: file='${source.fileId}', domain='${source.domain}'`
		);

		// Track state update time
		startMetric('state-update', 'selection', { fileId: source.fileId, domain: source.domain });
		dataState.selectDatasetWithWorker(source.fileId, source.domain);
		endMetric('state-update', 'selection');

		// Track view resolution time
		startMetric('view-resolution', 'selection');
		const availableViews = dataState.getAvailableViews();
		const currentViewMode = appState.viewMode.value;

		console.log(`[SelectionAction] Available views:`, availableViews);
		console.log(`[SelectionAction] Current view mode:`, currentViewMode);

		// Preserve current view if it's still available, otherwise fallback
		if (availableViews[currentViewMode]) {
			console.log(`[SelectionAction] Keeping current view mode: ${currentViewMode}`);
		} else {
			if (availableViews.VLM) {
				console.log(`[SelectionAction] Switching to VLM view (current not available)`);
				appState.setViewMode('VLM');
			} else if (availableViews.data) {
				console.log(`[SelectionAction] Switching to data view (current not available)`);
				appState.setViewMode('data');
			} else if (availableViews.metadata) {
				console.log(`[SelectionAction] Switching to metadata view (current not available)`);
				appState.setViewMode('metadata');
			} else {
				console.log(
					`[SelectionAction] No views available, keeping current mode: ${currentViewMode}`
				);
			}
		}
		endMetric('view-resolution', 'selection', {
			currentViewMode,
			availableViews: Object.keys(availableViews).filter(k => availableViews[k as keyof typeof availableViews])
		});
	} else {
		console.warn(
			`[SelectionAction] Could not resolve a file for '${datasetName}'. Selection aborted.`
		);
	}

	endMetric('total-selection', 'selection');
	const session = endSession();

	// Log session summary
	if (session) {
		console.log(`[SelectionAction] ⏱️ Performance Summary:`, {
			totalTime: `${session.totalDuration?.toFixed(2)}ms`,
			steps: session.metrics.map(m => `${m.name}: ${m.duration?.toFixed(2)}ms`)
		});
	}
}
