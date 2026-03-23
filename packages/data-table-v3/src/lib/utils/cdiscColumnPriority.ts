/**
 * CDISC Column Priority Utilities
 *
 * Provides utilities for handling CDISC clinical trial standard columns with
 * intelligent prioritization, formatting, and default sizing.
 */

import type { ColumnConfig } from '../types/columns';

/**
 * CDISC key identifier columns (should appear first)
 * Order matters - columns will be sorted in this order
 */
export const CDISC_KEY_COLUMNS = [
  'STUDYID',   // Study Identifier
  'DOMAIN',    // Domain Abbreviation
  'USUBJID',   // Unique Subject Identifier
  'SUBJID',    // Subject Identifier for the Study
  'SITEID',    // Study Site Identifier
  'INVID',     // Investigator Identifier
  'INVNAM',    // Investigator Name
] as const;

/**
 * CDISC timing columns (should appear early)
 */
export const CDISC_TIMING_COLUMNS = [
  'VISIT',     // Visit Name
  'VISITNUM',  // Visit Number
  'VISITDY',   // Planned Study Day of Visit
  'EPOCH',     // Epoch
] as const;

/**
 * CDISC treatment columns
 */
export const CDISC_TREATMENT_COLUMNS = [
  'ARM',       // Description of Planned Arm
  'ARMCD',     // Planned Arm Code
  'ACTARM',    // Description of Actual Arm
  'ACTARMCD',  // Actual Arm Code
  'TRT',       // Treatment
  'TRTSEQN',   // Treatment Sequence Number
] as const;

/**
 * CDISC date/time columns (recognizable patterns)
 */
export const CDISC_DATE_SUFFIXES = ['DTC', 'DTM', 'DT', 'TM'] as const;

/**
 * CDISC flag columns (boolean indicators)
 */
export const CDISC_FLAG_SUFFIXES = ['FL'] as const;

/**
 * CDISC sequence number columns
 */
export const CDISC_SEQ_SUFFIXES = ['SEQ', 'SEQN'] as const;

/**
 * Common CDISC column name mappings for better display
 */
export const CDISC_COLUMN_LABELS: Record<string, string> = {
  // Identifiers
  'STUDYID': 'Study ID',
  'DOMAIN': 'Domain',
  'USUBJID': 'Unique Subject ID',
  'SUBJID': 'Subject ID',
  'SITEID': 'Site ID',
  'INVID': 'Investigator ID',
  'INVNAM': 'Investigator Name',

  // Timing
  'VISIT': 'Visit',
  'VISITNUM': 'Visit Number',
  'VISITDY': 'Visit Day',
  'EPOCH': 'Epoch',

  // Treatment
  'ARM': 'Planned Arm',
  'ARMCD': 'Planned Arm Code',
  'ACTARM': 'Actual Arm',
  'ACTARMCD': 'Actual Arm Code',

  // Demographics
  'AGE': 'Age',
  'AGEU': 'Age Units',
  'SEX': 'Sex',
  'RACE': 'Race',
  'ETHNIC': 'Ethnicity',
  'COUNTRY': 'Country',

  // Reference dates
  'RFSTDTC': 'Reference Start Date',
  'RFENDTC': 'Reference End Date',
  'RFXSTDTC': 'First Study Treatment Date',
  'RFXENDTC': 'Last Study Treatment Date',
  'RFICDTC': 'Informed Consent Date',
  'RFPENDTC': 'End of Participation Date',

  // Flags
  'SAFFL': 'Safety Population Flag',
  'ITTFL': 'Intent-to-Treat Population Flag',
  'PPROTFL': 'Per-Protocol Population Flag',
  'COMPLFL': 'Completed Flag',
  'DTHFL': 'Death Flag',
};

/**
 * Format a CDISC column name for display
 */
export function formatClinicalColumnName(columnId: string): string {
  // Check for exact match in labels
  if (CDISC_COLUMN_LABELS[columnId]) {
    return CDISC_COLUMN_LABELS[columnId];
  }

  // Handle date/time columns (ending in DTC, DTM, etc.)
  for (const suffix of CDISC_DATE_SUFFIXES) {
    if (columnId.endsWith(suffix)) {
      const prefix = columnId.slice(0, -suffix.length);
      return `${formatPrefix(prefix)} ${suffix === 'DTC' ? 'Date' : suffix === 'DTM' ? 'DateTime' : suffix}`;
    }
  }

  // Handle flag columns
  for (const suffix of CDISC_FLAG_SUFFIXES) {
    if (columnId.endsWith(suffix)) {
      const prefix = columnId.slice(0, -suffix.length);
      return `${formatPrefix(prefix)} Flag`;
    }
  }

  // Handle sequence columns
  for (const suffix of CDISC_SEQ_SUFFIXES) {
    if (columnId.endsWith(suffix)) {
      const prefix = columnId.slice(0, -(suffix.length));
      return `${formatPrefix(prefix)} Seq`;
    }
  }

  // Default: insert spaces before capitals and capitalize first letter
  return columnId
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase());
}

/**
 * Format a column prefix for display
 */
function formatPrefix(prefix: string): string {
  if (!prefix) return '';

  // Known abbreviations
  const abbreviations: Record<string, string> = {
    'RF': 'Reference',
    'AE': 'Adverse Event',
    'CM': 'Concomitant Med',
    'DM': 'Demographics',
    'EX': 'Exposure',
    'LB': 'Laboratory',
    'VS': 'Vital Signs',
    'MH': 'Medical History',
    'SV': 'Subject Visits',
  };

  if (abbreviations[prefix]) {
    return abbreviations[prefix];
  }

  // Default formatting
  return prefix
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase());
}

/**
 * Determine if a column should be visible by default
 * Hides less important columns to reduce clutter
 */
export function shouldColumnBeVisibleByDefault(columnId: string): boolean {
  // Always show key identifier columns
  if (CDISC_KEY_COLUMNS.includes(columnId as any)) {
    return true;
  }

  // Always show timing columns
  if (CDISC_TIMING_COLUMNS.includes(columnId as any)) {
    return true;
  }

  // Hide most flag columns by default (except safety population)
  if (columnId.endsWith('FL') && columnId !== 'SAFFL') {
    return false;
  }

  // Hide sequence numbers by default
  if (CDISC_SEQ_SUFFIXES.some(suffix => columnId.endsWith(suffix))) {
    return false;
  }

  // Hide internal/technical columns
  const hiddenPatterns = ['--SEQ', '--GRPID', '--REFID', '--LNKID', '--NAM'];
  if (hiddenPatterns.some(pattern => columnId.includes(pattern))) {
    return false;
  }

  // Show by default
  return true;
}

/**
 * Get default column width based on column name and type
 */
export function getDefaultColumnWidth(columnId: string, dataType?: string): number {
  // Extra wide for unique subject ID
  if (columnId === 'USUBJID') {
    return 200;
  }

  // Wide for subject/site IDs
  if (['SUBJID', 'SITEID', 'STUDYID'].includes(columnId)) {
    return 150;
  }

  // Date columns
  if (CDISC_DATE_SUFFIXES.some(suffix => columnId.endsWith(suffix))) {
    return 140;
  }

  // Flag columns (boolean)
  if (columnId.endsWith('FL') || dataType === 'boolean') {
    return 100;
  }

  // Numeric columns
  if (dataType === 'number' || CDISC_SEQ_SUFFIXES.some(suffix => columnId.endsWith(suffix))) {
    return 100;
  }

  // Short codes
  if (columnId.endsWith('CD')) {
    return 120;
  }

  // Age
  if (columnId === 'AGE') {
    return 80;
  }

  // Sex, Race
  if (['SEX', 'RACE', 'ETHNIC'].includes(columnId)) {
    return 120;
  }

  // Treatment arms
  if (CDISC_TREATMENT_COLUMNS.includes(columnId as any)) {
    return 180;
  }

  // Default medium width
  return 150;
}

/**
 * Apply CDISC column prioritization
 * Orders columns with key identifiers first, then timing, then treatment, then rest
 */
export function applyCdiscPriority(columns: ColumnConfig[]): ColumnConfig[] {
  const columnPriority = (col: ColumnConfig): number => {
    const id = col.id;

    // Level 1: Key identifier columns (highest priority)
    const keyIndex = CDISC_KEY_COLUMNS.indexOf(id as any);
    if (keyIndex !== -1) {
      return keyIndex; // 0-6
    }

    // Level 2: Timing columns
    const timingIndex = CDISC_TIMING_COLUMNS.indexOf(id as any);
    if (timingIndex !== -1) {
      return 100 + timingIndex; // 100-103
    }

    // Level 3: Treatment columns
    const treatmentIndex = CDISC_TREATMENT_COLUMNS.indexOf(id as any);
    if (treatmentIndex !== -1) {
      return 200 + treatmentIndex; // 200-205
    }

    // Level 4: Date columns
    if (CDISC_DATE_SUFFIXES.some(suffix => id.endsWith(suffix))) {
      return 300;
    }

    // Level 5: Everything else (alphabetical)
    return 1000;
  };

  // Sort columns by priority
  const sorted = [...columns].sort((a, b) => {
    const priorityA = columnPriority(a);
    const priorityB = columnPriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Same priority level - sort alphabetically
    return a.id.localeCompare(b.id);
  });

  // Update order property
  return sorted.map((col, idx) => ({
    ...col,
    order: idx
  }));
}

/**
 * Get emergency fallback columns (when schema is missing)
 * Returns the first N most important columns
 */
export function getEmergencyColumns(columns: ColumnConfig[], maxColumns: number = 5): ColumnConfig[] {
  const prioritized = applyCdiscPriority(columns);
  return prioritized.slice(0, maxColumns);
}

/**
 * Detect if data appears to be CDISC-compliant
 * Returns true if dataset has multiple CDISC standard columns
 */
export function isCdiscData(columnIds: string[]): boolean {
  const cdiscColumnCount = columnIds.filter(id =>
    CDISC_KEY_COLUMNS.includes(id as any) ||
    CDISC_TIMING_COLUMNS.includes(id as any) ||
    CDISC_TREATMENT_COLUMNS.includes(id as any) ||
    CDISC_COLUMN_LABELS[id]
  ).length;

  // Consider it CDISC if it has 3+ standard columns
  return cdiscColumnCount >= 3;
}
