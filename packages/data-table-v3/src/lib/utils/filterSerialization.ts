/**
 * Filter serialization utilities
 *
 * Provides functions to convert filters to/from JSON-safe format for localStorage persistence.
 * Main concern: Date objects must be converted to ISO strings.
 */

import type {
  Filter,
  TextFilter,
  NumericFilter,
  DateFilter,
  SetFilter,
  BooleanFilter,
  GlobalFilter,
  SerializedFilter,
  SerializedTextFilter,
  SerializedNumericFilter,
  SerializedDateFilter,
  SerializedSetFilter,
  SerializedBooleanFilter,
  SerializedGlobalFilter
} from '../types/filters';

/**
 * Serialize a filter to JSON-safe format
 */
export function serializeFilter(filter: Filter): SerializedFilter {
  switch (filter.type) {
    case 'text':
      return serializeTextFilter(filter);
    case 'numeric':
      return serializeNumericFilter(filter);
    case 'date':
      return serializeDateFilter(filter);
    case 'set':
      return serializeSetFilter(filter);
    case 'boolean':
      return serializeBooleanFilter(filter);
    case 'global':
      return serializeGlobalFilter(filter);
    default:
      // Type guard - should never happen
      const exhaustive: never = filter;
      throw new Error(`Unknown filter type: ${(exhaustive as Filter).type}`);
  }
}

/**
 * Deserialize a filter from JSON-safe format
 */
export function deserializeFilter(serialized: SerializedFilter): Filter {
  switch (serialized.type) {
    case 'text':
      return deserializeTextFilter(serialized);
    case 'numeric':
      return deserializeNumericFilter(serialized);
    case 'date':
      return deserializeDateFilter(serialized);
    case 'set':
      return deserializeSetFilter(serialized);
    case 'boolean':
      return deserializeBooleanFilter(serialized);
    case 'global':
      return deserializeGlobalFilter(serialized);
    default:
      // Type guard - should never happen
      const exhaustive: never = serialized;
      throw new Error(`Unknown filter type: ${(exhaustive as SerializedFilter).type}`);
  }
}

/**
 * Serialize an array of filters
 */
export function serializeFilters(filters: Filter[]): SerializedFilter[] {
  return filters.map(serializeFilter);
}

/**
 * Deserialize an array of filters
 */
export function deserializeFilters(serialized: SerializedFilter[]): Filter[] {
  return serialized.map(deserializeFilter);
}

// ============================================================================
// Individual filter type serializers
// ============================================================================

function serializeTextFilter(filter: TextFilter): SerializedTextFilter {
  return {
    type: 'text',
    columnId: filter.columnId,
    operator: filter.operator,
    value: filter.value,
    caseSensitive: filter.caseSensitive,
    wholeWord: filter.wholeWord,
    enabled: filter.enabled
  };
}

function serializeNumericFilter(filter: NumericFilter): SerializedNumericFilter {
  return {
    type: 'numeric',
    columnId: filter.columnId,
    operator: filter.operator,
    value: filter.value,
    value2: filter.value2,
    enabled: filter.enabled
  };
}

function serializeDateFilter(filter: DateFilter): SerializedDateFilter {
  return {
    type: 'date',
    columnId: filter.columnId,
    operator: filter.operator,
    value: convertDateToString(filter.value),
    value2: filter.value2 ? convertDateToString(filter.value2) : undefined,
    enabled: filter.enabled
  };
}

function serializeSetFilter(filter: SetFilter): SerializedSetFilter {
  return {
    type: 'set',
    columnId: filter.columnId,
    operator: filter.operator,
    values: filter.values,
    enabled: filter.enabled
  };
}

function serializeBooleanFilter(filter: BooleanFilter): SerializedBooleanFilter {
  return {
    type: 'boolean',
    columnId: filter.columnId,
    operator: filter.operator,
    value: filter.value,
    enabled: filter.enabled
  };
}

function serializeGlobalFilter(filter: GlobalFilter): SerializedGlobalFilter {
  return {
    type: 'global',
    value: filter.value,
    caseSensitive: filter.caseSensitive,
    searchableColumns: filter.searchableColumns,
    enabled: filter.enabled
  };
}

// ============================================================================
// Individual filter type deserializers
// ============================================================================

function deserializeTextFilter(serialized: SerializedTextFilter): TextFilter {
  return {
    type: 'text',
    columnId: serialized.columnId,
    operator: serialized.operator,
    value: serialized.value,
    caseSensitive: serialized.caseSensitive,
    wholeWord: serialized.wholeWord,
    enabled: serialized.enabled
  };
}

function deserializeNumericFilter(serialized: SerializedNumericFilter): NumericFilter {
  return {
    type: 'numeric',
    columnId: serialized.columnId,
    operator: serialized.operator,
    value: serialized.value,
    value2: serialized.value2,
    enabled: serialized.enabled
  };
}

function deserializeDateFilter(serialized: SerializedDateFilter): DateFilter {
  return {
    type: 'date',
    columnId: serialized.columnId,
    operator: serialized.operator,
    value: convertStringToDate(serialized.value),
    value2: serialized.value2 ? convertStringToDate(serialized.value2) : undefined,
    enabled: serialized.enabled
  };
}

function deserializeSetFilter(serialized: SerializedSetFilter): SetFilter {
  return {
    type: 'set',
    columnId: serialized.columnId,
    operator: serialized.operator,
    values: serialized.values,
    enabled: serialized.enabled
  };
}

function deserializeBooleanFilter(serialized: SerializedBooleanFilter): BooleanFilter {
  return {
    type: 'boolean',
    columnId: serialized.columnId,
    operator: serialized.operator,
    value: serialized.value,
    enabled: serialized.enabled
  };
}

function deserializeGlobalFilter(serialized: SerializedGlobalFilter): GlobalFilter {
  return {
    type: 'global',
    value: serialized.value,
    caseSensitive: serialized.caseSensitive,
    searchableColumns: serialized.searchableColumns,
    enabled: serialized.enabled
  };
}

// ============================================================================
// Date conversion helpers
// ============================================================================

function convertDateToString(value: Date | string): string {
  if (typeof value === 'string') {
    return value;
  }
  return value.toISOString();
}

function convertStringToDate(value: string): Date {
  return new Date(value);
}
