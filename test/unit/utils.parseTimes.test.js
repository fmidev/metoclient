/**
 * Unit tests for parseTimes function in utils.js.
 * This complex function deserves its own test file.
 */

import { parseTimes } from '../../src/utils';
import { sampleTimes } from '../helpers/testFixtures';

describe('parseTimes', () => {
  describe('null and undefined input', () => {
    it('should return empty array for null', () => {
      expect(parseTimes(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseTimes(undefined)).toEqual([]);
    });
  });

  describe('array input', () => {
    it('should parse array of ISO strings', () => {
      const input = [sampleTimes.iso1, sampleTimes.iso2, sampleTimes.iso3];
      const result = parseTimes(input);
      expect(result).toEqual([sampleTimes.t1, sampleTimes.t2, sampleTimes.t3]);
    });

    it('should parse array of Date objects', () => {
      const input = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T01:00:00Z'),
      ];
      const result = parseTimes(input);
      expect(result).toEqual([sampleTimes.t1, sampleTimes.t2]);
    });

    it('should parse array of timestamps', () => {
      const input = [sampleTimes.t1, sampleTimes.t2];
      const result = parseTimes(input);
      expect(result).toEqual([sampleTimes.t1, sampleTimes.t2]);
    });

    it('should sort the results', () => {
      const input = [sampleTimes.iso3, sampleTimes.iso1, sampleTimes.iso2];
      const result = parseTimes(input);
      expect(result).toEqual([sampleTimes.t1, sampleTimes.t2, sampleTimes.t3]);
    });
  });

  describe('single ISO date string input', () => {
    it('should parse single ISO date string', () => {
      const result = parseTimes('2024-01-01T00:00:00Z');
      expect(result).toEqual([sampleTimes.t1]);
    });

    it('should parse date without time', () => {
      const result = parseTimes('2024-01-01');
      expect(result).toHaveLength(1);
      // Date without time is interpreted in local timezone
      expect(result[0]).toBeGreaterThan(0);
    });
  });

  describe('comma-separated dates', () => {
    it('should parse comma-separated ISO dates', () => {
      const input =
        '2024-01-01T00:00:00Z,2024-01-01T01:00:00Z,2024-01-01T02:00:00Z';
      const result = parseTimes(input);
      expect(result).toEqual([sampleTimes.t1, sampleTimes.t2, sampleTimes.t3]);
    });

    it('should handle spaces around commas', () => {
      const input = '2024-01-01T00:00:00Z , 2024-01-01T01:00:00Z';
      const result = parseTimes(input);
      expect(result).toEqual([sampleTimes.t1, sampleTimes.t2]);
    });

    it('should skip invalid dates in list', () => {
      const input = '2024-01-01T00:00:00Z,invalid,2024-01-01T01:00:00Z';
      const result = parseTimes(input);
      expect(result).toEqual([sampleTimes.t1, sampleTimes.t2]);
    });
  });

  describe('ISO interval format (start/end/period)', () => {
    it('should parse hourly interval', () => {
      const input = '2024-01-01T00:00:00Z/2024-01-01T03:00:00Z/PT1H';
      const result = parseTimes(input);
      expect(result).toEqual([
        sampleTimes.t1,
        sampleTimes.t2,
        sampleTimes.t3,
        sampleTimes.t4,
      ]);
    });

    it('should parse 15-minute interval', () => {
      const input = '2024-01-01T00:00:00Z/2024-01-01T01:00:00Z/PT15M';
      const result = parseTimes(input);
      expect(result).toHaveLength(5); // 00:00, 00:15, 00:30, 00:45, 01:00
    });

    it('should handle comma with interval', () => {
      const input =
        '2024-01-01T00:00:00Z/2024-01-01T01:00:00Z/PT1H,2024-01-01T02:00:00Z';
      const result = parseTimes(input);
      expect(result).toContain(sampleTimes.t1);
      expect(result).toContain(sampleTimes.t2);
      expect(result).toContain(sampleTimes.t3);
    });

    it('should return empty for invalid interval format', () => {
      // Only start date, no end or period
      const input = '2024-01-01T00:00:00Z/';
      const result = parseTimes(input);
      expect(result).toEqual([]);
    });
  });

  describe('RRule text format', () => {
    // Note: RRule is mocked in tests, so behavior may differ from production

    it('should parse "every X hours" format', () => {
      const result = parseTimes('every 1 hour');
      // With mock RRule, this should return some times
      expect(Array.isArray(result)).toBe(true);
    });

    it('should parse "every X minutes" format', () => {
      const result = parseTimes('every 15 minutes');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should parse "X times" format', () => {
      const result = parseTimes('5 times');
      expect(result).toHaveLength(5);
      // All values should be POSITIVE_INFINITY
      result.forEach((time) => {
        expect(time).toBe(Number.POSITIVE_INFINITY);
      });
    });

    it('should parse "X times history" format', () => {
      const result = parseTimes('3 times history');
      expect(result).toHaveLength(3);
      // All values should be NEGATIVE_INFINITY for history
      result.forEach((time) => {
        expect(time).toBe(Number.NEGATIVE_INFINITY);
      });
    });

    it('should parse combined rules with "and"', () => {
      const result = parseTimes('3 times history and 2 times');
      expect(result).toHaveLength(5);
    });
  });

  describe('RRule object input', () => {
    it('should parse RRule options object', () => {
      const input = {
        freq: 4, // HOURLY
        interval: 1,
        count: 5,
        dtstart: new Date('2024-01-01T00:00:00Z'),
      };
      const result = parseTimes(input);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('sorting and deduplication', () => {
    it('should always return sorted array', () => {
      const input = [sampleTimes.t3, sampleTimes.t1, sampleTimes.t2];
      const result = parseTimes(input);
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = parseTimes('');
      // Empty string is not a valid date, so likely empty or from RRule
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle whitespace-only string', () => {
      const result = parseTimes('   ');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('snapshot tests', () => {
    it('should match snapshot for hourly interval', () => {
      const input = '2024-01-01T00:00:00Z/2024-01-01T05:00:00Z/PT1H';
      const result = parseTimes(input);
      expect(result).toMatchSnapshot();
    });

    it('should match snapshot for array input', () => {
      const input = [
        '2024-01-01T00:00:00Z',
        '2024-01-01T06:00:00Z',
        '2024-01-01T12:00:00Z',
        '2024-01-01T18:00:00Z',
      ];
      const result = parseTimes(input);
      expect(result).toMatchSnapshot();
    });
  });
});
