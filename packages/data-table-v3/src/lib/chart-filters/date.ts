/**
 * Date distribution calculation for chart filters
 */

import type { DateDistribution, DateBin, DateGranularity, DateOptions } from './types';

/**
 * Auto-detect appropriate granularity based on date range
 * Ensures we get a reasonable number of bins (at least 3-5)
 */
export function detectDateGranularity(
	minDate: Date,
	maxDate: Date,
	targetMinBins: number = 5
): DateGranularity {
	const diffMs = maxDate.getTime() - minDate.getTime();
	const diffDays = diffMs / (1000 * 60 * 60 * 24);

	// Calculate how many bins each granularity would produce
	const diffWeeks = diffDays / 7;
	const diffMonths =
		(maxDate.getFullYear() - minDate.getFullYear()) * 12 +
		(maxDate.getMonth() - minDate.getMonth());
	const diffQuarters = Math.ceil(diffMonths / 3);
	const diffYears = maxDate.getFullYear() - minDate.getFullYear() + 1;

	// Choose the finest granularity that doesn't produce too many bins
	// but ensures at least targetMinBins bins
	if (diffDays >= targetMinBins && diffDays <= 60) return 'day';
	if (diffWeeks >= targetMinBins && diffWeeks <= 52) return 'week';
	if (diffMonths >= targetMinBins && diffMonths <= 36) return 'month';
	if (diffQuarters >= targetMinBins && diffQuarters <= 20) return 'quarter';
	if (diffYears >= targetMinBins) return 'year';

	// If we can't get enough bins with any granularity, use the finest that makes sense
	if (diffDays >= 1) return 'day';
	if (diffWeeks >= 1) return 'week';
	if (diffMonths >= 1) return 'month';
	if (diffQuarters >= 1) return 'quarter';
	return 'year';
}

/**
 * Truncate date to granularity
 */
export function truncateDate(date: Date, granularity: DateGranularity): Date {
	const d = new Date(date);

	switch (granularity) {
		case 'day':
			d.setHours(0, 0, 0, 0);
			break;
		case 'week':
			d.setHours(0, 0, 0, 0);
			d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
			break;
		case 'month':
			d.setHours(0, 0, 0, 0);
			d.setDate(1);
			break;
		case 'quarter':
			d.setHours(0, 0, 0, 0);
			d.setDate(1);
			d.setMonth(Math.floor(d.getMonth() / 3) * 3);
			break;
		case 'year':
			d.setHours(0, 0, 0, 0);
			d.setDate(1);
			d.setMonth(0);
			break;
	}

	return d;
}

/**
 * Format date bin label
 */
export function formatDateLabel(date: Date, granularity: DateGranularity): string {
	switch (granularity) {
		case 'day':
			return date.toLocaleDateString();
		case 'week':
			return `Week of ${date.toLocaleDateString()}`;
		case 'month':
			return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
		case 'quarter':
			const q = Math.floor(date.getMonth() / 3) + 1;
			return `Q${q} ${date.getFullYear()}`;
		case 'year':
			return String(date.getFullYear());
	}
}

/**
 * Parse a value as a Date, handling various formats
 */
export function parseAsDate(value: unknown): Date | null {
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === 'number') {
		// Could be a timestamp (milliseconds since epoch) or SAS date (days since 1960)
		// If the number looks like a reasonable timestamp (after year 1970 and before 2100)
		const asMs = new Date(value);
		if (!isNaN(asMs.getTime()) && asMs.getFullYear() >= 1970 && asMs.getFullYear() <= 2100) {
			return asMs;
		}
		// Try as SAS date (days since 1960-01-01)
		const sasEpoch = new Date(1960, 0, 1);
		const asSasDate = new Date(sasEpoch.getTime() + value * 24 * 60 * 60 * 1000);
		if (
			!isNaN(asSasDate.getTime()) &&
			asSasDate.getFullYear() >= 1960 &&
			asSasDate.getFullYear() <= 2100
		) {
			return asSasDate;
		}
		return null;
	}

	if (typeof value === 'string') {
		const date = new Date(value);
		return isNaN(date.getTime()) ? null : date;
	}

	return null;
}

/**
 * Calculate date distribution for a column
 */
export function calculateDateDistribution(
	data: Record<string, unknown>[],
	columnId: string,
	options: DateOptions = {}
): DateDistribution {
	// Extract date values
	const dates: Date[] = [];
	let nullCount = 0;

	for (const row of data) {
		const value = row[columnId];

		if (value === null || value === undefined || value === '') {
			nullCount++;
		} else {
			const date = parseAsDate(value);
			if (date) {
				dates.push(date);
			} else {
				nullCount++;
			}
		}
	}

	// Handle empty data
	if (dates.length === 0) {
		return {
			type: 'date',
			columnId,
			bins: [],
			granularity: 'day',
			nullCount
		};
	}

	// Sort dates
	dates.sort((a, b) => a.getTime() - b.getTime());
	const minDate = dates[0];
	const maxDate = dates[dates.length - 1];

	// Determine granularity
	const granularity = options.granularity || detectDateGranularity(minDate, maxDate);

	let bins: DateBin[];

	if (options.fixedDateBins && options.fixedDateBins.length > 0) {
		// Use fixed date bins (for ghost overlay alignment)
		const fixedBins = options.fixedDateBins.map((date) => ({
			date,
			label: formatDateLabel(date, granularity),
			count: 0,
			percentage: 0
		}));

		// Count dates into fixed bins
		for (const date of dates) {
			const truncated = truncateDate(date, granularity);
			const truncatedKey = truncated.toISOString();

			// Find matching bin
			const bin = fixedBins.find((b) => b.date.toISOString() === truncatedKey);
			if (bin) {
				bin.count++;
			}
		}

		// Calculate percentages
		for (const bin of fixedBins) {
			bin.percentage = dates.length > 0 ? (bin.count / dates.length) * 100 : 0;
		}

		bins = fixedBins;
	} else {
		// Count by truncated date
		const counts = new Map<string, { date: Date; count: number }>();

		for (const date of dates) {
			const truncated = truncateDate(date, granularity);
			const key = truncated.toISOString();

			if (!counts.has(key)) {
				counts.set(key, { date: truncated, count: 0 });
			}
			counts.get(key)!.count++;
		}

		// Build bins array
		bins = Array.from(counts.values())
			.sort((a, b) => a.date.getTime() - b.date.getTime())
			.map(({ date, count }) => ({
				date,
				label: formatDateLabel(date, granularity),
				count,
				percentage: dates.length > 0 ? (count / dates.length) * 100 : 0
			}));
	}

	return {
		type: 'date',
		columnId,
		bins,
		granularity,
		nullCount
	};
}
