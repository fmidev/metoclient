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
  static TileWMS(source, time) {
    if (time == null) {
      return;
    }
    const timeFormatted = new Date(time).toISOString();
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
  static ImageWMS(source, time) {
    this.TileWMS(source, time);
  }

  /**
   *
   * @param source
   * @param time
   * @class
   */
  static WMTS(source, time) {
    // Use same time formatter in TileWMS and WMTS
    if (time == null) {
      return;
    }
    const timeFormatted = new Date(time).toISOString();
    source.set('metoclient:time', time);
    source.setTileLoadFunction((imageTile, src) => {
      imageTile.getImage().src = `${src}&Time=${timeFormatted}`;
    });
  }
}
