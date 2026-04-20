/**
 * Integration tests for time parsing functionality.
 * Tests end-to-end time parsing with various formats.
 */

import { parseTimes, addNewTimes, floorTime } from '../../src/utils';
import * as constants from '../../src/constants';
import { sampleTimes } from '../helpers/testFixtures';

describe('Time Parsing Integration', () => {
  describe('ISO interval parsing', () => {
    it('should parse 1-hour interval for 24 hours', () => {
      const start = '2024-01-01T00:00:00Z';
      const end = '2024-01-02T00:00:00Z';
      const result = parseTimes(`${start}/${end}/PT1H`);

      expect(result).toHaveLength(25); // 00:00 to 24:00 inclusive
      expect(result[0]).toBe(new Date(start).getTime());
      expect(result[24]).toBe(new Date(end).getTime());
    });

    it('should parse 15-minute interval for 3 hours', () => {
      const result = parseTimes(
        '2024-01-01T00:00:00Z/2024-01-01T03:00:00Z/PT15M'
      );

      expect(result).toHaveLength(13); // 0, 15, 30, 45 * 3 hours + final
      expect(result[4]).toBe(new Date('2024-01-01T01:00:00Z').getTime());
      expect(result[8]).toBe(new Date('2024-01-01T02:00:00Z').getTime());
    });

    it('should parse 6-hour interval', () => {
      const result = parseTimes(
        '2024-01-01T00:00:00Z/2024-01-02T00:00:00Z/PT6H'
      );

      expect(result).toHaveLength(5); // 00:00, 06:00, 12:00, 18:00, 00:00
      expect(result[1]).toBe(new Date('2024-01-01T06:00:00Z').getTime());
      expect(result[2]).toBe(new Date('2024-01-01T12:00:00Z').getTime());
    });
  });

  describe('Multiple time sources', () => {
    it('should combine times from multiple sources', () => {
      const times1 = parseTimes([sampleTimes.iso1, sampleTimes.iso2]);
      const times2 = parseTimes([sampleTimes.iso2, sampleTimes.iso3]);

      const combined = addNewTimes(times1, times2);

      expect(combined).toHaveLength(3);
      expect(combined).toContain(sampleTimes.t1);
      expect(combined).toContain(sampleTimes.t2);
      expect(combined).toContain(sampleTimes.t3);
    });

    it('should not duplicate times when combining', () => {
      const times1 = [sampleTimes.t1, sampleTimes.t2];
      const times2 = [sampleTimes.t2, sampleTimes.t3];
      const times3 = [sampleTimes.t1, sampleTimes.t3];

      let combined = addNewTimes(times1, times2);
      combined = addNewTimes(combined, times3);

      expect(combined).toHaveLength(3);
    });
  });

  describe('Time flooring', () => {
    it('should floor to 5-minute intervals', () => {
      const resolution = 5 * constants.MINUTE;
      const time = new Date('2024-01-01T12:37:45Z').getTime();

      const floored = floorTime(time, resolution);
      const flooredDate = new Date(floored);

      expect(flooredDate.getUTCMinutes()).toBe(35);
      expect(flooredDate.getUTCSeconds()).toBe(0);
    });

    it('should floor to hourly intervals', () => {
      const resolution = constants.HOUR;
      const time = new Date('2024-01-01T12:37:45Z').getTime();

      const floored = floorTime(time, resolution);
      const flooredDate = new Date(floored);

      expect(flooredDate.getUTCHours()).toBe(12);
      expect(flooredDate.getUTCMinutes()).toBe(0);
    });

    it('should floor to daily intervals', () => {
      const resolution = constants.DAY;
      const time = new Date('2024-01-15T12:37:45Z').getTime();

      const floored = floorTime(time, resolution);
      const flooredDate = new Date(floored);

      expect(flooredDate.getUTCDate()).toBe(15);
      expect(flooredDate.getUTCHours()).toBe(0);
    });
  });

  describe('Discrete time steps', () => {
    it('should have all expected discrete steps', () => {
      const expectedSteps = [
        constants.MINUTE,
        2 * constants.MINUTE,
        5 * constants.MINUTE,
        10 * constants.MINUTE,
        15 * constants.MINUTE,
        20 * constants.MINUTE,
        30 * constants.MINUTE,
        constants.HOUR,
        2 * constants.HOUR,
        3 * constants.HOUR,
        4 * constants.HOUR,
        6 * constants.HOUR,
        8 * constants.HOUR,
        12 * constants.HOUR,
        constants.DAY,
      ];

      expect(constants.discreteSteps).toEqual(expectedSteps);
    });

    it('should floor to nearest discrete step', () => {
      // Find the appropriate discrete step for 17 minutes
      const time = 17 * constants.MINUTE;

      // 15 minutes is the largest step <= 17 minutes
      const appropriateStep = constants.discreteSteps
        .filter((step) => step <= time)
        .pop();

      expect(appropriateStep).toBe(15 * constants.MINUTE);
    });
  });

  describe('Weather forecast time patterns', () => {
    it('should handle typical radar update times (5-minute intervals)', () => {
      const result = parseTimes(
        '2024-01-01T00:00:00Z/2024-01-01T01:00:00Z/PT5M'
      );

      expect(result).toHaveLength(13); // 12 intervals + start
      expect(result[1] - result[0]).toBe(5 * constants.MINUTE);
    });

    it('should handle typical forecast times (3-hour intervals)', () => {
      const result = parseTimes(
        '2024-01-01T00:00:00Z/2024-01-04T00:00:00Z/PT3H'
      );

      expect(result).toHaveLength(25); // 24 * 3-hour intervals + start
      expect(result[1] - result[0]).toBe(3 * constants.HOUR);
    });

    it('should handle observation data times (1-hour intervals)', () => {
      const result = parseTimes(
        '2024-01-01T00:00:00Z/2024-01-01T12:00:00Z/PT1H'
      );

      expect(result).toHaveLength(13);
      expect(result[result.length - 1]).toBe(
        new Date('2024-01-01T12:00:00Z').getTime()
      );
    });
  });

  describe('RRule-based time generation', () => {
    it('should generate times using "X times" syntax', () => {
      const result = parseTimes('10 times');

      expect(result).toHaveLength(10);
      // All values should be POSITIVE_INFINITY (future placeholder)
      result.forEach((time) => {
        expect(time).toBe(Number.POSITIVE_INFINITY);
      });
    });

    it('should generate history times using "X times history" syntax', () => {
      const result = parseTimes('5 times history');

      expect(result).toHaveLength(5);
      // All values should be NEGATIVE_INFINITY (history placeholder)
      result.forEach((time) => {
        expect(time).toBe(Number.NEGATIVE_INFINITY);
      });
    });

    it('should combine future and history times', () => {
      const result = parseTimes('3 times history and 2 times');

      expect(result).toHaveLength(5);
      // Should contain both -Infinity and +Infinity
      const hasNegInf = result.some((t) => t === Number.NEGATIVE_INFINITY);
      const hasPosInf = result.some((t) => t === Number.POSITIVE_INFINITY);

      expect(hasNegInf).toBe(true);
      expect(hasPosInf).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle single timestamp', () => {
      const result = parseTimes('2024-01-01T00:00:00Z');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(sampleTimes.t1);
    });

    it('should handle midnight timestamps correctly', () => {
      const midnight = parseTimes('2024-01-01T00:00:00Z');
      const nextMidnight = parseTimes('2024-01-02T00:00:00Z');

      expect(nextMidnight[0] - midnight[0]).toBe(constants.DAY);
    });

    it('should handle year boundary', () => {
      const newYearsEve = parseTimes('2023-12-31T23:00:00Z');
      const newYear = parseTimes('2024-01-01T00:00:00Z');

      expect(newYear[0] - newYearsEve[0]).toBe(constants.HOUR);
    });
  });
});
