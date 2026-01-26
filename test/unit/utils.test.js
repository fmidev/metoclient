/**
 * Unit tests for utils.js module.
 * Tests basic utility functions (excluding parseTimes which has its own test file).
 */

import {
  floorTime,
  isValidDate,
  isNumeric,
  addNewTimes,
  updateSourceTime,
  stringifyUrl,
  createInterval,
  getBaseUrl,
  getAdjacentLayer,
  getSourceCapabilitiesUrl,
  getLegendUrl,
  getQueryParams,
} from '../../src/utils';
import { wmsCapabilities } from '../helpers/mockCapabilities';
import {
  sampleLayer,
  sampleSource,
  sampleTimes,
  sampleUrls,
  createLayer,
} from '../helpers/testFixtures';

describe('utils.js', () => {
  describe('floorTime', () => {
    it('should floor time to given resolution', () => {
      const time = 1704067265000; // 2024-01-01T00:01:05Z
      const resolution = 60000; // 1 minute
      expect(floorTime(time, resolution)).toBe(1704067260000);
    });

    it('should return same time when already floored', () => {
      const time = 1704067200000; // 2024-01-01T00:00:00Z
      const resolution = 3600000; // 1 hour
      expect(floorTime(time, resolution)).toBe(time);
    });

    it('should handle large resolutions', () => {
      const time = 1704067200000;
      const resolution = 86400000; // 1 day
      expect(floorTime(time, resolution)).toBe(1704067200000);
    });

    it('should handle 15-minute resolution', () => {
      const time = 1704068123000; // 2024-01-01T00:15:23Z
      const resolution = 900000; // 15 minutes
      // Floor to 00:15:00 (1704068100000), not 00:00:00
      expect(floorTime(time, resolution)).toBe(1704068100000);
    });

    it('should return 0 for time less than resolution', () => {
      expect(floorTime(500, 1000)).toBe(0);
    });

    it('should handle zero time', () => {
      expect(floorTime(0, 60000)).toBe(0);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid Date object', () => {
      expect(isValidDate(new Date('2024-01-01'))).toBe(true);
    });

    it('should return true for Date.now()', () => {
      expect(isValidDate(new Date())).toBe(true);
    });

    it('should return false for Invalid Date', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidDate(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidDate(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isValidDate('2024-01-01')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isValidDate(1704067200000)).toBe(false);
    });

    it('should return false for object', () => {
      expect(isValidDate({})).toBe(false);
    });
  });

  describe('isNumeric', () => {
    it('should return true for numeric string', () => {
      expect(isNumeric('123')).toBe(true);
    });

    it('should return true for float string', () => {
      expect(isNumeric('123.45')).toBe(true);
    });

    it('should return true for negative numeric string', () => {
      expect(isNumeric('-123')).toBe(true);
    });

    it('should return true for zero string', () => {
      expect(isNumeric('0')).toBe(true);
    });

    it('should return false for non-string', () => {
      expect(isNumeric(123)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isNumeric('')).toBe(false);
    });

    it('should return false for non-numeric string', () => {
      expect(isNumeric('abc')).toBe(false);
    });

    it('should return true for string starting with number', () => {
      // parseFloat('123abc') returns 123, which is not NaN
      // This is the actual behavior of isNumeric
      expect(isNumeric('123abc')).toBe(true);
    });

    it('should return false for null', () => {
      expect(isNumeric(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNumeric(undefined)).toBe(false);
    });

    it('should return true for scientific notation', () => {
      expect(isNumeric('1e10')).toBe(true);
    });
  });

  describe('addNewTimes', () => {
    it('should add new times to array', () => {
      const times = [1000, 2000];
      const newTimes = [3000, 4000];
      const result = addNewTimes(times, newTimes);
      expect(result).toEqual([1000, 2000, 3000, 4000]);
    });

    it('should not add duplicate times', () => {
      const times = [1000, 2000];
      const newTimes = [2000, 3000];
      const result = addNewTimes(times, newTimes);
      expect(result).toEqual([1000, 2000, 3000]);
    });

    it('should handle empty original array', () => {
      const result = addNewTimes([], [1000, 2000]);
      expect(result).toEqual([1000, 2000]);
    });

    it('should handle empty new times array', () => {
      const times = [1000, 2000];
      const result = addNewTimes(times, []);
      expect(result).toEqual([1000, 2000]);
    });

    it('should handle both empty arrays', () => {
      const result = addNewTimes([], []);
      expect(result).toEqual([]);
    });

    it('should not modify original array', () => {
      const times = [1000, 2000];
      const newTimes = [3000];
      addNewTimes(times, newTimes);
      expect(times).toEqual([1000, 2000]);
    });
  });

  describe('updateSourceTime', () => {
    it('should update time parameter in URL', () => {
      const tiles = ['https://example.com/wms?time=2024-01-01T00:00:00Z'];
      const newTime = new Date('2024-01-02T00:00:00Z').getTime();
      const result = updateSourceTime(tiles, newTime);
      // URL encodes colons as %3A
      expect(result[0]).toContain('time=2024-01-02T00%3A00%3A00.000Z');
    });

    it('should handle TIME parameter (uppercase)', () => {
      const tiles = ['https://example.com/wms?TIME=2024-01-01T00:00:00Z'];
      const newTime = new Date('2024-01-02T00:00:00Z').getTime();
      const result = updateSourceTime(tiles, newTime);
      // Preserves original case and URL encodes
      expect(result[0]).toMatch(/TIME=2024-01-02T00%3A00%3A00.000Z/);
    });

    it('should add time parameter if not present', () => {
      const tiles = ['https://example.com/wms?layers=radar'];
      const newTime = new Date('2024-01-01T00:00:00Z').getTime();
      const result = updateSourceTime(tiles, newTime);
      // URL encodes colons
      expect(result[0]).toContain('time=2024-01-01T00%3A00%3A00.000Z');
    });

    it('should remove time parameter when newTime is null', () => {
      const tiles = ['https://example.com/wms?time=2024-01-01T00:00:00Z'];
      const result = updateSourceTime(tiles, null);
      expect(result[0]).not.toContain('time=');
    });

    it('should handle multiple tiles', () => {
      const tiles = [
        'https://example.com/wms1?time=old',
        'https://example.com/wms2?time=old',
      ];
      const newTime = new Date('2024-01-01T00:00:00Z').getTime();
      const result = updateSourceTime(tiles, newTime);
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('2024-01-01');
      expect(result[1]).toContain('2024-01-01');
    });

    it('should handle string time value', () => {
      const tiles = ['https://example.com/wms?time=old'];
      const result = updateSourceTime(tiles, '2024-01-01T00:00:00Z');
      // URL encodes colons
      expect(result[0]).toContain('time=2024-01-01T00%3A00%3A00Z');
    });
  });

  describe('stringifyUrl', () => {
    it('should create URL with parameters', () => {
      const result = stringifyUrl('https://example.com/wms', {
        service: 'WMS',
        request: 'GetMap',
      });
      expect(result).toBe('https://example.com/wms?service=WMS&request=GetMap');
    });

    it('should encode special characters', () => {
      const result = stringifyUrl('https://example.com/wms', {
        layers: 'layer with spaces',
      });
      expect(result).toContain('layers=layer%20with%20spaces');
    });

    it('should not encode template parameters', () => {
      const result = stringifyUrl('https://example.com/wms', {
        bbox: '{bbox-epsg-3857}',
      });
      expect(result).toContain('bbox={bbox-epsg-3857}');
    });

    it('should handle empty params', () => {
      const result = stringifyUrl('https://example.com/wms', {});
      expect(result).toBe('https://example.com/wms?');
    });

    it('should trim base URL', () => {
      const result = stringifyUrl('  https://example.com/wms  ', {
        service: 'WMS',
      });
      expect(result).toBe('https://example.com/wms?service=WMS');
    });
  });

  describe('createInterval', () => {
    it('should create ISO interval string', () => {
      const result = createInterval(
        '2024-01-01T00:00:00Z',
        '2024-01-01T03:00:00Z',
        'PT1H'
      );
      expect(result).toBe('2024-01-01T00:00:00Z/2024-01-01T03:00:00Z/PT1H');
    });
  });

  describe('getBaseUrl', () => {
    it('should remove query parameters', () => {
      expect(getBaseUrl('https://example.com/wms?service=WMS')).toBe(
        'https://example.com/wms'
      );
    });

    it('should remove hash', () => {
      expect(getBaseUrl('https://example.com/wms#section')).toBe(
        'https://example.com/wms'
      );
    });

    it('should remove both query and hash', () => {
      expect(getBaseUrl('https://example.com/wms?param=value#section')).toBe(
        'https://example.com/wms'
      );
    });

    it('should return URL unchanged if no query or hash', () => {
      expect(getBaseUrl('https://example.com/wms')).toBe(
        'https://example.com/wms'
      );
    });
  });

  describe('getAdjacentLayer', () => {
    const layers = [
      { id: 'layer1', next: 'layer2' },
      { id: 'layer2', previous: 'layer1', next: 'layer3' },
      { id: 'layer3', previous: 'layer2' },
    ];

    it('should return next layer from layer property', () => {
      const result = getAdjacentLayer('next', layers[0], layers);
      expect(result).toBe('layer2');
    });

    it('should return previous layer from layer property', () => {
      const result = getAdjacentLayer('previous', layers[1], layers);
      expect(result).toBe('layer1');
    });

    it('should find adjacent layer by searching layers array', () => {
      // layer3 doesn't have next, but layer2 has previous=layer3's perspective
      const layer = { id: 'layer3' };
      const result = getAdjacentLayer('previous', layer, layers);
      expect(result).toBe('layer2');
    });

    it('should return null for invalid direction', () => {
      const result = getAdjacentLayer('invalid', layers[0], layers);
      expect(result).toBeNull();
    });

    it('should return null when no adjacent layer found', () => {
      const layer = { id: 'isolated' };
      const result = getAdjacentLayer('next', layer, [layer]);
      expect(result).toBeNull();
    });
  });

  describe('getSourceCapabilitiesUrl', () => {
    it('should return capabilities URL if defined', () => {
      const source = {
        capabilities: 'https://example.com/wms?request=GetCapabilities',
        tiles: ['https://example.com/wms?request=GetMap'],
      };
      const result = getSourceCapabilitiesUrl(source);
      expect(result).toBe('https://example.com/wms?request=GetCapabilities');
    });

    it('should extract base URL from tiles if no capabilities', () => {
      const source = {
        tiles: ['https://example.com/wms?request=GetMap&layers=radar'],
      };
      const result = getSourceCapabilitiesUrl(source);
      expect(result).toBe('https://example.com/wms');
    });

    it('should return null if no tiles and no capabilities', () => {
      const source = {};
      const result = getSourceCapabilitiesUrl(source);
      expect(result).toBeNull();
    });

    it('should return null if tiles array is empty', () => {
      const source = { tiles: [] };
      const result = getSourceCapabilitiesUrl(source);
      expect(result).toBeNull();
    });

    it('should remove trailing slash from URL', () => {
      const source = {
        capabilities: 'https://example.com/wms/',
      };
      const result = getSourceCapabilitiesUrl(source);
      expect(result).toBe('https://example.com/wms');
    });
  });

  describe('getLegendUrl', () => {
    const capabilities = {
      data: wmsCapabilities,
      type: 'wms',
    };

    it('should return legend URL for layer', () => {
      const result = getLegendUrl('radar', null, capabilities);
      expect(result).toBe('https://example.com/legend/radar.png');
    });

    it('should return legend URL for specific style', () => {
      const result = getLegendUrl('radar', 'grayscale', capabilities);
      expect(result).toBe('https://example.com/legend/radar-gray.png');
    });

    it('should return null for null layer name', () => {
      const result = getLegendUrl(null, null, capabilities);
      expect(result).toBeNull();
    });

    it('should return null for empty layer name', () => {
      const result = getLegendUrl('', null, capabilities);
      expect(result).toBeNull();
    });

    it('should return null for null capabilities', () => {
      const result = getLegendUrl('radar', null, null);
      expect(result).toBeNull();
    });

    it('should return null for layer without legend', () => {
      const result = getLegendUrl('no-legend-layer', null, capabilities);
      expect(result).toBeNull();
    });

    it('should return null for non-existent layer', () => {
      const result = getLegendUrl('nonexistent', null, capabilities);
      expect(result).toBeNull();
    });
  });

  describe('getQueryParams', () => {
    it('should extract and uppercase query params from URL', () => {
      const layer = createLayer({
        url: { service: 'WMS', layers: 'radar' },
        time: { data: [sampleTimes.t1] },
      });
      const url = 'https://example.com/wms?version=1.3.0&request=GetMap';
      const result = getQueryParams(layer, url, sampleTimes.t1);

      expect(result.VERSION).toBe('1.3.0');
      expect(result.REQUEST).toBe('GetMap');
      expect(result.SERVICE).toBe('WMS');
      expect(result.LAYERS).toBe('radar');
    });

    it('should add TIME parameter when time is in layer data', () => {
      const layer = createLayer({
        time: { data: [sampleTimes.t1] },
      });
      const url = 'https://example.com/wms';
      const result = getQueryParams(layer, url, sampleTimes.t1);

      expect(result.TIME).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should not add TIME when time is not in layer data', () => {
      const layer = createLayer({
        time: { data: [sampleTimes.t1] },
      });
      const url = 'https://example.com/wms';
      const result = getQueryParams(layer, url, sampleTimes.t2); // Different time

      expect(result.TIME).toBeUndefined();
    });
  });
});
