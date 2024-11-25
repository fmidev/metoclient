import TileWMS from 'ol/source/TileWMS';
import TileGrid from 'ol/tilegrid/TileGrid';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import { OSM } from 'ol/source';
import * as constants from './constants';
import { getBaseUrl, getQueryParams, defaultLoadFunction } from './utils';

/**
 *
 */
export default class SourceCreator {
  /**
   *
   * @param options
   * @param layer
   * @returns {TileWMS|null}
   */
  static wms(layer, options) {
    const source = options.sources[layer.source];
    if (
      source == null ||
      source.tiles[0] == null ||
      source.tiles[0].length === 0
    ) {
      return null;
    }
    const url = source.tiles[0];
    // Todo: handle also non-zero indexes
    const params = getQueryParams(layer, url, options.time);
    const olSource = new TileWMS({
      url: getBaseUrl(url),
      params,
      tileGrid: new TileGrid({
        extent:
          source.bounds != null
            ? source.bounds
            : get(options.projection).getExtent(),
        resolutions: options.resolutions,
        tileSize:
          source.tileSize != null
            ? source.tileSize
            : constants.DEFAULT_TILESIZE,
      }),
      transition: 0,
    });
    olSource.set(constants.OL_CLASS_NAME, 'TileWMS');
    if (params.TIME != null) {
      olSource.set(constants.TIME, options.time);
      olSource.set(constants.TIMEOUT, layer.timeout);
      olSource.setTileLoadFunction((imageTile, url) => {
        const timeout = olSource.get(constants.TIMEOUT);
        defaultLoadFunction(imageTile, url, olSource, null, timeout);
      });
    }
    return olSource;
  }

  /**
   *
   * @param options
   * @param layer
   * @param capabilities
   * @returns {null|WMTS}
   */
  static wmts(layer, options, capabilities) {
    const source = options.sources[layer.source];
    if (source == null || capabilities.type !== 'wmts') {
      return null;
    }
    const sourceOptions = optionsFromCapabilities(capabilities.data, {
      // Todo: support all config options
      layer: layer.url.layer,
      matrixSet: layer.url.tilematrixset,
    });
    if (sourceOptions == null) {
      return null;
    }

    sourceOptions.transition = 0;
    const olSource = new WMTS(sourceOptions);
    olSource.set(constants.OL_CLASS_NAME, 'WMTS');
    const timeDefined =
      layer.time != null && layer.time.data.includes(options.time);
    if (timeDefined) {
      olSource.set(constants.TIME, options.time);
      olSource.set(constants.TIMEOUT, layer.timeout);
      olSource.setTileLoadFunction((imageTile, url) => {
        const time = new Date(options.time).toISOString()
        const timeout = olSource.get(constants.TIMEOUT);
        defaultLoadFunction(imageTile, url, olSource, time, timeout);
      });
    }
    return olSource;
  }

  /**
   *
   * @param options
   * @returns {OSM}
   */
  static osm(options) {
    return new OSM(options);
  }
}
