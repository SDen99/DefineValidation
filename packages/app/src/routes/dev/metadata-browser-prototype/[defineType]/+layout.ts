import type { LayoutLoad } from './$types';

// Disable SSR for this route - it's a local app and needs browser access to dataState
export const ssr = false;

export const load: LayoutLoad = async ({ params }) => {
	const defineType = params.defineType as 'adam' | 'sdtm';

	// Validate defineType
	if (defineType !== 'adam' && defineType !== 'sdtm') {
		return { defineType: 'adam' }; // Fallback to adam instead of throwing
	}

	// Don't try to load data here - it's not available during SSR load phase
	// The component will reactively load data from dataState after app initialization
	return {
		defineType
	};
};
