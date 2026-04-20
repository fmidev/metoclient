import { defaultLoadFunction } from './utils';
import * as constants from './constants';

/**
 * Class abstracting source updaters for different source types.
 */
export default class SourceUpdater {
  /**
   * Update time for a TileWMS source.
   * @param {object} source OpenLayers TileWMS source.
   * @param {number | null} time New time value.
   */
  static TileWMS(source: any, time: number | null): void {
    if (time == null) {
      return;
    }
    const timeFormatted: string = new Date(time).toISOString();
    source.set('metoclient:time', time);
    source.updateParams({
      TIME: timeFormatted,
    });
    source.refresh();
  }

  /**
   * Update time for an ImageWMS source.
   * @param {object} source OpenLayers ImageWMS source.
   * @param {number | null} time New time value.
   */
  static ImageWMS(source: any, time: number | null): void {
    this.TileWMS(source, time);
  }

  /**
   * Update time for a WMTS source.
   * @param {object} source OpenLayers WMTS source.
   * @param {number | null} time New time value.
   */
  static WMTS(source: any, time: number | null): void {
    // Use same time formatter in TileWMS and WMTS
    if (time == null) {
      return;
    }
    const timeFormatted: string = new Date(time).toISOString();
    source.set(constants.TIME, time);
    source.setTileLoadFunction((imageTile: any, url: string) => {
      const timeout: number = source.get(constants.TIMEOUT);
      defaultLoadFunction(imageTile, url, source, timeFormatted, timeout);
    });
  }
}
