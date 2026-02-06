/**
 * Unit tests for LayerCreator.js module.
 */

import LayerCreator from '../../src/LayerCreator';
import {
  createOptions,
  createLayer,
  createSource,
  sampleTimes,
} from '../helpers/testFixtures';
import { wmsCapabilities } from '../helpers/mockCapabilities';
import * as constants from '../../src/constants';

// Mock OpenLayers modules
jest.mock('ol/layer/Tile', () => {
  return jest.fn().mockImplementation((options) => ({
    type: 'TileLayer',
    options,
    get: jest.fn((key) => options[key]),
    set: jest.fn(),
    getSource: jest.fn(() => options.source),
    setSource: jest.fn(),
    getOpacity: jest.fn(() => options.opacity),
    setOpacity: jest.fn(),
    getVisible: jest.fn(() => options.visible),
    setVisible: jest.fn(),
  }));
});

jest.mock('ol/layer/Image', () => {
  return jest.fn().mockImplementation((options) => ({
    type: 'ImageLayer',
    options,
    get: jest.fn((key) => options[key]),
    set: jest.fn(),
    getSource: jest.fn(() => options.source),
    setSource: jest.fn(),
    getOpacity: jest.fn(() => options.opacity),
    setOpacity: jest.fn(),
    getVisible: jest.fn(() => options.visible),
    setVisible: jest.fn(),
  }));
});

jest.mock('ol/source/ImageWMS', () => {
  return jest.fn().mockImplementation((options) => ({
    type: 'ImageWMS',
    options,
    set: jest.fn(),
    get: jest.fn(),
    setImageLoadFunction: jest.fn(),
  }));
});

// Mock SourceCreator methods to return mock sources
const mockWmsSource = {
  type: 'TileWMS',
  bounds: [-180, -90, 180, 90],
  set: jest.fn(),
  get: jest.fn(),
};

const mockWmtsSource = {
  type: 'WMTS',
  bounds: [-180, -90, 180, 90],
  set: jest.fn(),
  get: jest.fn(),
};

jest.mock('../../src/SourceCreator', () => {
  return {
    __esModule: true,
    default: {
      wms: jest.fn(() => mockWmsSource),
      wmts: jest.fn(() => mockWmtsSource),
      osm: jest.fn(() => ({ type: 'OSM' })),
    },
  };
});

describe('LayerCreator', () => {
  const capabilities = {
    type: 'wms',
    data: wmsCapabilities,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tiled', () => {
    it('should return null for null layer', () => {
      const options = createOptions();
      const result = LayerCreator.tiled(null, options, capabilities);
      expect(result).toBeNull();
    });

    it('should return null when source is not found', () => {
      const layer = createLayer({ source: 'nonexistent' });
      const options = createOptions({ sources: {} });
      const result = LayerCreator.tiled(layer, options, capabilities);
      expect(result).toBeNull();
    });

    it('should return null when source type is not available', () => {
      const layer = createLayer({
        source: 'radar-source',
        url: { service: 'UNKNOWN' },
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ type: null }),
        },
      });
      const result = LayerCreator.tiled(layer, options, capabilities);
      expect(result).toBeNull();
    });

    it('should create TileLayer for WMS source using service from url', () => {
      // Need to specify service in layer.url to make it work
      const layer = createLayer({
        source: 'radar-source',
        url: { service: 'wms', layers: 'radar' },
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ type: null }), // type must be null to use url.service
        },
      });

      const result = LayerCreator.tiled(layer, options, capabilities);
      expect(result).not.toBeNull();
      expect(result.type).toBe('TileLayer');
    });

    it('should create TileLayer for WMS source using source type', () => {
      const layer = createLayer({
        source: 'radar-source',
        url: { layers: 'radar' },
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ type: 'wms' }),
        },
      });

      const result = LayerCreator.tiled(layer, options, capabilities);
      expect(result).not.toBeNull();
      expect(result.type).toBe('TileLayer');
    });

    it('should set layer properties correctly', () => {
      const layer = createLayer({
        id: 'test-layer',
        source: 'radar-source',
        url: { service: 'wms', layers: 'radar' },
        metadata: { title: 'Test Layer', type: 'overlay' },
        legendTitle: 'Test Legend',
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ type: null }),
        },
        layers: [layer],
      });

      const result = LayerCreator.tiled(layer, options, capabilities);
      expect(result).not.toBeNull();
      expect(result.options.id).toBe('test-layer');
      expect(result.options.title).toBe('Test Layer');
      expect(result.options.legendTitle).toBe('Test Legend');
    });

    it('should set opacity to 0', () => {
      const layer = createLayer({
        source: 'radar-source',
        url: { service: 'wms' },
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ type: null }),
        },
      });

      const result = LayerCreator.tiled(layer, options, capabilities);
      expect(result).not.toBeNull();
      expect(result.options.opacity).toBe(0);
    });

    it('should set visible based on visibility setting', () => {
      const visibleLayer = createLayer({
        source: 'radar-source',
        url: { service: 'wms' },
        visibility: 'visible',
      });
      const hiddenLayer = createLayer({
        source: 'radar-source',
        url: { service: 'wms' },
        visibility: constants.NOT_VISIBLE,
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ type: null }),
        },
      });

      const visibleResult = LayerCreator.tiled(
        visibleLayer,
        options,
        capabilities
      );
      const hiddenResult = LayerCreator.tiled(
        hiddenLayer,
        options,
        capabilities
      );

      expect(visibleResult).not.toBeNull();
      expect(hiddenResult).not.toBeNull();
      expect(visibleResult.options.visible).toBe(true);
      expect(hiddenResult.options.visible).toBe(false);
    });

    it('should use custom legendUrl if provided', () => {
      const layer = createLayer({
        source: 'radar-source',
        url: { service: 'wms' },
        legendUrl: 'https://custom.legend.url/legend.png',
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ type: null }),
        },
      });

      const result = LayerCreator.tiled(layer, options, capabilities);
      expect(result).not.toBeNull();
      expect(result.options.legendUrl).toBe(
        'https://custom.legend.url/legend.png'
      );
    });
  });

  describe('image', () => {
    it('should return null when source is not found', () => {
      const layer = createLayer({ source: 'nonexistent' });
      const options = createOptions({ sources: {} });
      const result = LayerCreator.image(layer, options, capabilities);
      expect(result).toBeNull();
    });

    it('should return null when tiles are empty', () => {
      const layer = createLayer({ source: 'radar-source' });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ tiles: [] }),
        },
      });
      const result = LayerCreator.image(layer, options, capabilities);
      expect(result).toBeNull();
    });

    it('should return null when tiles[0] is empty', () => {
      const layer = createLayer({ source: 'radar-source' });
      const options = createOptions({
        sources: {
          'radar-source': createSource({ tiles: [''] }),
        },
      });
      const result = LayerCreator.image(layer, options, capabilities);
      expect(result).toBeNull();
    });

    it('should create ImageLayer for valid source', () => {
      const layer = createLayer({
        source: 'radar-source',
        url: { service: 'WMS', layers: 'radar' },
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({
            tiles: ['https://example.com/wms?service=WMS'],
          }),
        },
      });

      const result = LayerCreator.image(layer, options, capabilities);
      expect(result).not.toBeNull();
      expect(result.type).toBe('ImageLayer');
    });

    it('should set layer properties correctly', () => {
      const layer = createLayer({
        id: 'image-layer',
        source: 'radar-source',
        url: { service: 'WMS', layers: 'radar' },
        metadata: { title: 'Image Layer', type: 'overlay' },
      });
      const options = createOptions({
        sources: {
          'radar-source': createSource({
            tiles: ['https://example.com/wms?service=WMS'],
          }),
        },
        layers: [layer],
      });

      const result = LayerCreator.image(layer, options, capabilities);
      expect(result.options.id).toBe('image-layer');
      expect(result.options.title).toBe('Image Layer');
    });
  });

  describe('static methods', () => {
    it('should have tiled as a static method', () => {
      expect(typeof LayerCreator.tiled).toBe('function');
    });

    it('should have image as a static method', () => {
      expect(typeof LayerCreator.image).toBe('function');
    });
  });
});
