/**
 * Phase 2 Operators Tests
 *
 * Run with: pnpm --filter @sden99/validation-engine test
 */

import { describe, it, expect } from 'vitest';
import {
  // Null/Empty
  empty,
  non_empty,

  // Comparison
  equal_to,
  not_equal_to,
  greater_than,
  less_than,
  greater_than_or_equal_to,
  less_than_or_equal_to,

  // String
  contains,
  does_not_contain,
  starts_with,
  ends_with,
  matches_regex,
  not_matches_regex,

  // Length
  longer_than,
  shorter_than,
  has_equal_length,
  has_not_equal_length,
  length_in_range
} from '../src';

describe('Null/Empty Operators', () => {
  describe('empty', () => {
    it('should return true for null', () => {
      expect(empty(null, undefined)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(empty(undefined, undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(empty('', undefined)).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(empty('   ', undefined)).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(empty('hello', undefined)).toBe(false);
    });

    it('should return false for number 0', () => {
      expect(empty(0, undefined)).toBe(false);
    });
  });

  describe('non_empty', () => {
    it('should return false for null', () => {
      expect(non_empty(null, undefined)).toBe(false);
    });

    it('should return true for non-empty string', () => {
      expect(non_empty('hello', undefined)).toBe(true);
    });
  });
});

describe('Comparison Operators', () => {
  describe('equal_to', () => {
    it('should return true for equal strings', () => {
      expect(equal_to('hello', 'hello')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(equal_to('hello', 'world')).toBe(false);
    });

    it('should return true for equal numbers', () => {
      expect(equal_to(42, 42)).toBe(true);
    });

    it('should handle null comparisons', () => {
      expect(equal_to(null, null)).toBe(true);
      expect(equal_to(null, 'hello')).toBe(false);
    });
  });

  describe('not_equal_to', () => {
    it('should return false for equal values', () => {
      expect(not_equal_to('hello', 'hello')).toBe(false);
    });

    it('should return true for different values', () => {
      expect(not_equal_to('hello', 'world')).toBe(true);
    });
  });

  describe('greater_than', () => {
    it('should return true when value > threshold', () => {
      expect(greater_than(10, 5)).toBe(true);
    });

    it('should return false when value <= threshold', () => {
      expect(greater_than(5, 10)).toBe(false);
      expect(greater_than(5, 5)).toBe(false);
    });

    it('should handle string numbers', () => {
      expect(greater_than('10', '5')).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(greater_than(null, 5)).toBe(false);
      expect(greater_than(undefined, 5)).toBe(false);
    });
  });

  describe('less_than', () => {
    it('should return true when value < threshold', () => {
      expect(less_than(5, 10)).toBe(true);
    });

    it('should return false when value >= threshold', () => {
      expect(less_than(10, 5)).toBe(false);
      expect(less_than(5, 5)).toBe(false);
    });
  });

  describe('greater_than_or_equal_to', () => {
    it('should return true when value >= threshold', () => {
      expect(greater_than_or_equal_to(10, 5)).toBe(true);
      expect(greater_than_or_equal_to(5, 5)).toBe(true);
    });

    it('should return false when value < threshold', () => {
      expect(greater_than_or_equal_to(4, 5)).toBe(false);
    });
  });

  describe('less_than_or_equal_to', () => {
    it('should return true when value <= threshold', () => {
      expect(less_than_or_equal_to(5, 10)).toBe(true);
      expect(less_than_or_equal_to(5, 5)).toBe(true);
    });

    it('should return false when value > threshold', () => {
      expect(less_than_or_equal_to(6, 5)).toBe(false);
    });
  });
});

describe('String Operators', () => {
  describe('contains', () => {
    it('should return true when value contains substring', () => {
      expect(contains('hello world', 'world')).toBe(true);
    });

    it('should return false when value does not contain substring', () => {
      expect(contains('hello world', 'foo')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(contains(null, 'foo')).toBe(false);
    });
  });

  describe('does_not_contain', () => {
    it('should return true when value does not contain substring', () => {
      expect(does_not_contain('hello', 'world')).toBe(true);
    });

    it('should return false when value contains substring', () => {
      expect(does_not_contain('hello world', 'world')).toBe(false);
    });
  });

  describe('starts_with', () => {
    it('should return true when value starts with prefix', () => {
      expect(starts_with('hello world', 'hello')).toBe(true);
    });

    it('should return false when value does not start with prefix', () => {
      expect(starts_with('hello world', 'world')).toBe(false);
    });
  });

  describe('ends_with', () => {
    it('should return true when value ends with suffix', () => {
      expect(ends_with('hello world', 'world')).toBe(true);
    });

    it('should return false when value does not end with suffix', () => {
      expect(ends_with('hello world', 'hello')).toBe(false);
    });
  });

  describe('matches_regex', () => {
    it('should return true when value matches pattern', () => {
      expect(matches_regex('test123', '^test\\d+$')).toBe(true);
    });

    it('should return false when value does not match pattern', () => {
      expect(matches_regex('hello', '^test\\d+$')).toBe(false);
    });

    it('should handle RegExp objects', () => {
      expect(matches_regex('test123', /^test\d+$/)).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(matches_regex(null, '^test$')).toBe(false);
    });
  });

  describe('not_matches_regex', () => {
    it('should return true when value does not match pattern', () => {
      expect(not_matches_regex('hello', '^test\\d+$')).toBe(true);
    });

    it('should return false when value matches pattern', () => {
      expect(not_matches_regex('test123', '^test\\d+$')).toBe(false);
    });
  });
});

describe('Length Operators', () => {
  describe('longer_than', () => {
    it('should return true when length > maxLength', () => {
      expect(longer_than('hello', 3)).toBe(true);
    });

    it('should return false when length <= maxLength', () => {
      expect(longer_than('hi', 3)).toBe(false);
      expect(longer_than('hey', 3)).toBe(false);
    });

    it('should return false for null/undefined/empty', () => {
      expect(longer_than(null, 3)).toBe(false);
      expect(longer_than('', 3)).toBe(false);
    });
  });

  describe('shorter_than', () => {
    it('should return true when length < minLength', () => {
      expect(shorter_than('hi', 5)).toBe(true);
    });

    it('should return false when length >= minLength', () => {
      expect(shorter_than('hello', 5)).toBe(false);
      expect(shorter_than('hello world', 5)).toBe(false);
    });
  });

  describe('has_equal_length', () => {
    it('should return true when length equals expected', () => {
      expect(has_equal_length('hello', 5)).toBe(true);
    });

    it('should return false when length does not equal expected', () => {
      expect(has_equal_length('hi', 5)).toBe(false);
    });

    it('should handle null as length 0', () => {
      expect(has_equal_length(null, 0)).toBe(true);
      expect(has_equal_length(null, 5)).toBe(false);
    });
  });

  describe('has_not_equal_length', () => {
    it('should return true when length does not equal expected', () => {
      expect(has_not_equal_length('hi', 5)).toBe(true);
    });

    it('should return false when length equals expected', () => {
      expect(has_not_equal_length('hello', 5)).toBe(false);
    });
  });

  describe('length_in_range', () => {
    it('should return true when length is within range', () => {
      expect(length_in_range('hello', [3, 10])).toBe(true);
      expect(length_in_range('hey', [3, 10])).toBe(true);
    });

    it('should return false when length is outside range', () => {
      expect(length_in_range('hi', [3, 10])).toBe(false);
      expect(length_in_range('hello world!', [3, 10])).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(length_in_range(null, [3, 10])).toBe(false);
    });

    it('should return false for invalid range format', () => {
      expect(length_in_range('hello', 'invalid')).toBe(false);
      expect(length_in_range('hello', [1])).toBe(false);
    });
  });
});
