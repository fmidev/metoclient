import TileWMS from 'ol/source/TileWMS';
import TileGrid from 'ol/tilegrid/TileGrid';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import Url from 'domurl';
import Projection from 'ol/proj/Projection';
import { OSM } from 'ol/source';
import * as constants from './constants';
import { getBaseUrl } from './utils';

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
  static wms(options, layer) {
    const source = options.sources[layer.source];
    if (source == null) {
      return null;
    }
    // Todo: handle also non-zero indexes
    const url = source.tiles[0];
    const queryUrl = new Url(url);
    const params = Object.keys(queryUrl.query).reduce((upperCased, key) => {
      upperCased[typeof key === 'string' ? key.toUpperCase() : key] =
        queryUrl.query[key];
      return upperCased;
    }, {});
    Object.keys(layer.url).forEach(key => {
      params[key.toUpperCase()] = layer.url[key].toString();
    });
    const timeDefined =
      layer.time != null && layer.time.data.includes(options.time);
    if (timeDefined) {
      params.TIME = new Date(options.time).toISOString();
    }
    let extent = source.bounds;
    if (extent == null && options.projection != null) {
      extent = new Projection({
        code: options.projection
      }).getExtent();
    }
    const olSource = new TileWMS({
      url: getBaseUrl(url),
      params,
      tileGrid: new TileGrid({
        extent,
        resolutions: options.resolutions,
        tileSize:
          source.tileSize != null ? source.tileSize : constants.DEFAULT_TILESIZE
      }),
      transition: 0
    });
    if (timeDefined) {
      olSource.set('metoclient:time', options.time);
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
  static wmts(options, layer, capabilities) {
    const source = options.sources[layer.source];
    if (source == null || capabilities.type !== 'wmts') {
      return null;
    }
    const sourceOptions = optionsFromCapabilities(capabilities.data, {
      // Todo: support all config options
      layer: layer.url.layer,
      matrixSet: layer.url.tilematrixset
    });
    if (sourceOptions == null) {
      return null;
    }
    const timeDefined =
      layer.time != null && layer.time.data.includes(options.time);
    if (timeDefined) {
      sourceOptions.tileLoadFunction = (imageTile, src) => {
        imageTile.getImage().src = `${src}&Time=${new Date(
          options.time
        ).toISOString()}`;
      };
    }
    sourceOptions.transition = 0;
    const olSource = new WMTS(sourceOptions);
    if (timeDefined != null) {
      olSource.set('metoclient:time', options.time);
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
