/**
 * Unit tests for SourceUpdater.js module.
 */

import SourceUpdater from '../../src/SourceUpdater';
import { MockSource } from '../helpers/mockOpenLayers';
import * as constants from '../../src/constants';

describe('SourceUpdater', () => {
  describe('TileWMS', () => {
    let mockSource: any;

    beforeEach(() => {
      mockSource = MockSource.createMock();
    });

    it('should update source with formatted time', () => {
      const time = new Date('2024-01-01T12:00:00Z').getTime();
      SourceUpdater.TileWMS(mockSource, time);

      expect(mockSource.set).toHaveBeenCalledWith('metoclient:time', time);
      expect(mockSource.updateParams).toHaveBeenCalledWith({
        TIME: '2024-01-01T12:00:00.000Z',
      });
      expect(mockSource.refresh).toHaveBeenCalled();
    });

    it('should format time as ISO string', () => {
      const time = new Date('2024-06-15T18:30:00Z').getTime();
      SourceUpdater.TileWMS(mockSource, time);

      expect(mockSource.updateParams).toHaveBeenCalledWith({
        TIME: '2024-06-15T18:30:00.000Z',
      });
    });

    it('should not update source when time is null', () => {
      SourceUpdater.TileWMS(mockSource, null);

      expect(mockSource.updateParams).not.toHaveBeenCalled();
      expect(mockSource.refresh).not.toHaveBeenCalled();
    });

    it('should not update source when time is undefined', () => {
      SourceUpdater.TileWMS(mockSource, undefined);

      expect(mockSource.updateParams).not.toHaveBeenCalled();
      expect(mockSource.refresh).not.toHaveBeenCalled();
    });

    it('should call refresh after updating params', () => {
      const time = Date.now();
      const callOrder: string[] = [];

      mockSource.updateParams = jest.fn(() => callOrder.push('updateParams'));
      mockSource.refresh = jest.fn(() => callOrder.push('refresh'));

      SourceUpdater.TileWMS(mockSource, time);

      expect(callOrder).toEqual(['updateParams', 'refresh']);
    });
  });

  describe('ImageWMS', () => {
    let mockSource: any;

    beforeEach(() => {
      mockSource = MockSource.createMock();
    });

    it('should delegate to TileWMS', () => {
      const time = new Date('2024-01-01T00:00:00Z').getTime();
      SourceUpdater.ImageWMS(mockSource, time);

      // Should behave the same as TileWMS
      expect(mockSource.set).toHaveBeenCalledWith('metoclient:time', time);
      expect(mockSource.updateParams).toHaveBeenCalledWith({
        TIME: '2024-01-01T00:00:00.000Z',
      });
      expect(mockSource.refresh).toHaveBeenCalled();
    });

    it('should not update when time is null', () => {
      SourceUpdater.ImageWMS(mockSource, null);

      expect(mockSource.updateParams).not.toHaveBeenCalled();
    });
  });

  describe('WMTS', () => {
    let mockSource: any;

    beforeEach(() => {
      mockSource = MockSource.createMock();
    });

    it('should set time on source', () => {
      const time = new Date('2024-01-01T00:00:00Z').getTime();
      SourceUpdater.WMTS(mockSource, time);

      expect(mockSource.set).toHaveBeenCalledWith(constants.TIME, time);
    });

    it('should set tile load function', () => {
      const time = new Date('2024-01-01T00:00:00Z').getTime();
      SourceUpdater.WMTS(mockSource, time);

      expect(mockSource.setTileLoadFunction).toHaveBeenCalled();
      expect(typeof mockSource.setTileLoadFunction.mock.calls[0][0]).toBe(
        'function'
      );
    });

    it('should not update when time is null', () => {
      SourceUpdater.WMTS(mockSource, null);

      expect(mockSource.setTileLoadFunction).not.toHaveBeenCalled();
    });

    it('should not update when time is undefined', () => {
      SourceUpdater.WMTS(mockSource, undefined);

      expect(mockSource.setTileLoadFunction).not.toHaveBeenCalled();
    });
  });

  describe('static methods', () => {
    it('should have TileWMS as a static method', () => {
      expect(typeof SourceUpdater.TileWMS).toBe('function');
    });

    it('should have ImageWMS as a static method', () => {
      expect(typeof SourceUpdater.ImageWMS).toBe('function');
    });

    it('should have WMTS as a static method', () => {
      expect(typeof SourceUpdater.WMTS).toBe('function');
    });
  });
});
