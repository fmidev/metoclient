/**
 * Unit tests for SourceCreator.js module.
 */

import SourceCreator from '../../src/SourceCreator';
import {
  createOptions,
  createLayer,
  createSource,
  sampleTimes,
} from '../helpers/testFixtures';

// Mock OpenLayers modules
jest.mock('ol/source/TileWMS', () => {
  return jest.fn().mockImplementation((options) => ({
    options,
    set: jest.fn(),
    get: jest.fn(),
    setTileLoadFunction: jest.fn(),
    getParams: jest.fn(() => ({})),
  }));
});

jest.mock('ol/source/WMTS', () => {
  const mockWMTS = jest.fn().mockImplementation((options) => ({
    options,
    set: jest.fn(),
    get: jest.fn(),
    setTileLoadFunction: jest.fn(),
  }));
  mockWMTS.optionsFromCapabilities = jest.fn(() => ({
    urls: ['https://example.com/wmts'],
    layer: 'radar',
  }));
  return mockWMTS;
});

jest.mock('ol/source', () => ({
  OSM: jest.fn().mockImplementation((options) => ({
    type: 'OSM',
    options,
  })),
}));

jest.mock('ol/tilegrid/TileGrid', () => {
  return jest.fn().mockImplementation((options) => ({
    options,
  }));
});

jest.mock('ol/proj', () => ({
  get: jest.fn(() => ({
    getExtent: jest.fn(() => [-180, -90, 180, 90]),
  })),
}));

describe('SourceCreator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('wms', () => {
    it('should create WMS source with valid configuration', () => {
      const layer = createLayer({ source: 'radar-source' });
      const options = createOptions({
        sources: {
          'radar-source': createSource({
            type: 'wms',
            tiles: ['https://example.com/wms?service=WMS'],
          }),
        },
        time: sampleTimes.t1,
      });

      const result = SourceCreator.wms(layer, options);
      expect(result).not.toBeNull();
    });

    it('should return null when source is missing', () => {
      const layer = createLayer({ source: 'nonexistent' });
      const options = createOptions({ sources: {} });

      const result = SourceCreator.wms(layer, options);
      expect(result).toBeNull();
    });

    it('should return null when tiles array is empty', () => {
      const layer = createLayer({ source: 'radar-source' });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ tiles: [] }),
        },
      });

      const result = SourceCreator.wms(layer, options);
      expect(result).toBeNull();
    });

    it('should return null when tiles[0] is empty string', () => {
      const layer = createLayer({ source: 'radar-source' });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ tiles: [''] }),
        },
      });

      const result = SourceCreator.wms(layer, options);
      expect(result).toBeNull();
    });

    it('should set OL_CLASS_NAME on source', () => {
      const layer = createLayer({ source: 'radar-source' });
      const options = createOptions({
        sources: {
          'radar-source': createSource({
            tiles: ['https://example.com/wms?service=WMS'],
          }),
        },
      });

      const result = SourceCreator.wms(layer, options);
      expect(result.set).toHaveBeenCalledWith(
        'metoclient:olClassName',
        'TileWMS'
      );
    });
  });

  describe('wmts', () => {
    const wmtsCapabilities = {
      type: 'wmts',
      data: {
        Contents: {
          Layer: [{ Identifier: 'radar' }],
          TileMatrixSet: [{ Identifier: 'EPSG:3067' }],
        },
      },
    };

    it('should return null when source is missing', () => {
      const layer = createLayer({ source: 'nonexistent' });
      const options = createOptions({ sources: {} });

      const result = SourceCreator.wmts(layer, options, wmtsCapabilities);
      expect(result).toBeNull();
    });

    it('should return null when capabilities type is not wmts', () => {
      const layer = createLayer({ source: 'radar-source' });
      const options = createOptions({
        sources: {
          'radar-source': createSource(),
        },
      });
      const wmsCapabilities = { type: 'wms', data: {} };

      const result = SourceCreator.wmts(layer, options, wmsCapabilities);
      expect(result).toBeNull();
    });
  });

  describe('osm', () => {
    it('should create OSM source', () => {
      const result = SourceCreator.osm({});
      expect(result).not.toBeNull();
      expect(result.type).toBe('OSM');
    });

    it('should pass options to OSM constructor', () => {
      const options = { crossOrigin: 'anonymous' };
      const result = SourceCreator.osm(options);
      expect(result.options).toEqual(options);
    });
  });

  describe('static methods', () => {
    it('should have wms as a static method', () => {
      expect(typeof SourceCreator.wms).toBe('function');
    });

    it('should have wmts as a static method', () => {
      expect(typeof SourceCreator.wmts).toBe('function');
    });

    it('should have osm as a static method', () => {
      expect(typeof SourceCreator.osm).toBe('function');
    });
  });
});
