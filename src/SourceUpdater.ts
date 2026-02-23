import { defaultLoadFunction } from './utils';
import * as constants from './constants';

/**
 *
 */
export default class SourceUpdater {
  /**
   *
   * @param source
   * @param time
   * @class
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
   *
   * @param source
   * @param time
   * @class
   */
  static ImageWMS(source: any, time: number | null): void {
    this.TileWMS(source, time);
  }

  /**
   *
   * @param source
   * @param time
   * @class
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
