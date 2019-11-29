export default class SourceUpdater {
  static TileWMS (source, time) {
    if (time == null) {
      return;
    }
    let timeFormatted = (new Date(time)).toISOString();
    source.set('metoclient:time', time);
    source.updateParams({
      'TIME': timeFormatted
    });
    source.refresh();
  }
  static WMTS (source, time) {
    // Use same time formatter in TileWMS and WMTS
    if (time == null) {
      return;
    }
    let timeFormatted = (new Date(time)).toISOString();
    source.set('metoclient:time', time);
    source.setTileLoadFunction(function (imageTile, src) {
      imageTile.getImage().src = src + '&Time=' + timeFormatted;
    });
  }
}
