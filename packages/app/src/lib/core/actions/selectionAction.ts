import * as dataState from '$lib/core/state/dataState.svelte.ts';
import * as appState from '$lib/core/state/appState.svelte.ts';
import { normalizeDatasetId as normalize } from '@sden99/dataset-domain';
import { startMetric, endMetric, startSession, endSession } from '$lib/utils/performanceMetrics.svelte';

/**
 * Finds the source file and domain for a given normalized name.
 * This is the new, performant lookup function.
 */
function findSource(normalizedName: string): { fileId: string; domain: string } | null {
	// First, check for a direct file match (e.g., a .sas7bdat file)
	const originalFilename = dataState.getOriginalFilename(normalizedName);
	const allDatasets = dataState.getDatasets();

	if (originalFilename && allDatasets[originalFilename]) {
		return { fileId: originalFilename, domain: normalizedName };
	}

	// Also check if the normalized name itself exists as a dataset key
	if (allDatasets[normalizedName]) {
		return { fileId: normalizedName, domain: normalizedName };
	}

	// If not a direct file, it must be a domain from a Define.xml file.
	const { SDTM, ADaM, sdtmId, adamId } = dataState.getDefineXmlInfo();

	// Check ADaM first - find original case name
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

	// Check SDTM next - find original case name
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

	// Not found anywhere
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
	let source = findSource(datasetName);
	if (!source) {
		const normalized = normalize(datasetName);
		if (normalized !== datasetName) {
			source = findSource(normalized);
		}
	}
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
