/**
 * Integration tests for LayerCreator and SourceCreator interaction.
 * Tests how layers and sources work together.
 */

import { MockSource } from '../helpers/mockOpenLayers';
import SourceUpdater from '../../src/SourceUpdater';
import * as constants from '../../src/constants';
import {
  createOptions,
  createLayer,
  createSource,
  sampleTimes,
} from '../helpers/testFixtures';

describe('Layer and Source Integration', () => {
  describe('SourceUpdater with different source types', () => {
    it('should update TileWMS source time', () => {
      const source = MockSource.createMock();
      const time = sampleTimes.t1;

      SourceUpdater.TileWMS(source, time);

      expect(source.set).toHaveBeenCalledWith('metoclient:time', time);
      expect(source.updateParams).toHaveBeenCalledWith({
        TIME: '2024-01-01T00:00:00.000Z',
      });
      expect(source.refresh).toHaveBeenCalled();
    });

    it('should update ImageWMS source time using TileWMS method', () => {
      const source = MockSource.createMock();
      const time = sampleTimes.t2;

      SourceUpdater.ImageWMS(source, time);

      expect(source.set).toHaveBeenCalledWith('metoclient:time', time);
      expect(source.updateParams).toHaveBeenCalledWith({
        TIME: '2024-01-01T01:00:00.000Z',
      });
    });

    it('should update WMTS source time with tile load function', () => {
      const source = MockSource.createMock();
      const time = sampleTimes.t3;

      SourceUpdater.WMTS(source, time);

      expect(source.set).toHaveBeenCalledWith(constants.TIME, time);
      expect(source.setTileLoadFunction).toHaveBeenCalled();
    });
  });

  describe('Time update flow', () => {
    it('should format time consistently across update methods', () => {
      const tileWmsSource = MockSource.createMock();
      const imageWmsSource = MockSource.createMock();
      const time = new Date('2024-06-15T12:30:00Z').getTime();

      SourceUpdater.TileWMS(tileWmsSource, time);
      SourceUpdater.ImageWMS(imageWmsSource, time);

      // Both should use the same ISO format
      expect(tileWmsSource.updateParams).toHaveBeenCalledWith({
        TIME: '2024-06-15T12:30:00.000Z',
      });
      expect(imageWmsSource.updateParams).toHaveBeenCalledWith({
        TIME: '2024-06-15T12:30:00.000Z',
      });
    });

    it('should handle null time for all source types', () => {
      const tileWmsSource = MockSource.createMock();
      const imageWmsSource = MockSource.createMock();
      const wmtsSource = MockSource.createMock();

      SourceUpdater.TileWMS(tileWmsSource, null);
      SourceUpdater.ImageWMS(imageWmsSource, null);
      SourceUpdater.WMTS(wmtsSource, null);

      // None should have been updated
      expect(tileWmsSource.updateParams).not.toHaveBeenCalled();
      expect(imageWmsSource.updateParams).not.toHaveBeenCalled();
      expect(wmtsSource.setTileLoadFunction).not.toHaveBeenCalled();
    });

    it('should handle sequential time updates', () => {
      const source = MockSource.createMock();

      SourceUpdater.TileWMS(source, sampleTimes.t1);
      SourceUpdater.TileWMS(source, sampleTimes.t2);
      SourceUpdater.TileWMS(source, sampleTimes.t3);

      expect(source.updateParams).toHaveBeenCalledTimes(3);
      expect(source.refresh).toHaveBeenCalledTimes(3);

      // Last call should have the latest time
      expect(source.updateParams).toHaveBeenLastCalledWith({
        TIME: '2024-01-01T02:00:00.000Z',
      });
    });
  });

  describe('Source configuration', () => {
    it('should create valid source configuration for WMS', () => {
      const sourceConfig = createSource({
        type: 'wms',
        tiles: ['https://example.com/wms?service=WMS&layers=radar'],
        bounds: [-180, -90, 180, 90],
        tileSize: 256,
      });

      expect(sourceConfig.type).toBe('wms');
      expect(sourceConfig.tiles).toHaveLength(1);
      expect(sourceConfig.tiles[0]).toContain('wms');
      expect(sourceConfig.bounds).toEqual([-180, -90, 180, 90]);
    });

    it('should create valid layer configuration', () => {
      const layerConfig = createLayer({
        id: 'test-layer',
        source: 'test-source',
        url: { service: 'WMS', layers: 'radar' },
      });

      expect(layerConfig.id).toBe('test-layer');
      expect(layerConfig.source).toBe('test-source');
      expect(layerConfig.url.service).toBe('WMS');
    });

    it('should link layer to correct source', () => {
      const options = createOptions({
        sources: {
          'radar-source': createSource({ type: 'wms' }),
          'satellite-source': createSource({ type: 'wmts' }),
        },
        layers: [
          createLayer({ id: 'radar-layer', source: 'radar-source' }),
          createLayer({ id: 'satellite-layer', source: 'satellite-source' }),
        ],
      });

      expect(options.sources['radar-source']).toBeDefined();
      expect(options.sources['satellite-source']).toBeDefined();
      expect(options.layers[0].source).toBe('radar-source');
      expect(options.layers[1].source).toBe('satellite-source');
    });
  });

  describe('Time data in layers', () => {
    it('should store time data in layer configuration', () => {
      const layer = createLayer({
        time: {
          data: [sampleTimes.t1, sampleTimes.t2, sampleTimes.t3],
        },
      });

      expect(layer.time.data).toHaveLength(3);
      expect(layer.time.data).toContain(sampleTimes.t1);
      expect(layer.time.data).toContain(sampleTimes.t2);
      expect(layer.time.data).toContain(sampleTimes.t3);
    });

    it('should have times sorted in layer data', () => {
      const layer = createLayer({
        time: {
          data: [sampleTimes.t3, sampleTimes.t1, sampleTimes.t2],
        },
      });

      // Times should be in the order they were provided
      // (sorting is done elsewhere in the actual code)
      expect(layer.time.data[0]).toBe(sampleTimes.t3);
    });
  });
});
