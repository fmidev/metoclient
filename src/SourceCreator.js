import TileWMS from 'ol/source/TileWMS';
import { getBaseUrl } from './util';
import TileGrid from 'ol/tilegrid/TileGrid';
import * as constants from './constants';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import Url from 'domurl';

export default class SourceCreator {

  static wms (layer, options) {
    const source = options.sources[layer.source];
    if (source == null) {
      return null;
    }
    // Todo: handle also non-zero indexes
    const url = source.tiles[0];
    const queryUrl = new Url(url);
    let params = Object.keys(queryUrl.query).reduce((upperCased, key) => {
      upperCased[typeof key === 'string' ? key.toUpperCase() : key] = queryUrl.query[key];
      return upperCased;
    }, {});
    Object.keys(layer.url).forEach(key => {
      params[key.toUpperCase()] = layer.url[key].toString();
    });
    const timeDefined = (layer.time != null) && (layer.time.data.includes(options.time));
    if (timeDefined) {
      params.TIME = (new Date(options.time)).toISOString();
    }
    let olSource = new TileWMS({
      url: getBaseUrl(url),
      params: params,
      tileGrid: new TileGrid({
        extent: (source.bounds != null) ? source.bounds : get(options.projection).getExtent(),
        resolutions: options.resolutions,
        tileSize: (source.tileSize != null) ? source.tileSize : constants.DEFAULT_TILESIZE
      }),
      transition: 0
    });
    if (timeDefined) {
      olSource.set('metoclient:time', options.time);
    }
    return olSource;
  }

  static wmts (layer, options, capabilities) {
    const source = options.sources[layer.source];
    if ((source == null) || (capabilities.type !== 'wmts')) {
      return null;
    }
    let sourceOptions = optionsFromCapabilities(capabilities.data, {
      // Todo: support all config options
      layer: layer.url.layer,
      matrixSet: layer.url.tilematrixset
    });
    if (sourceOptions == null) {
      return null;
    }
    const timeDefined = (layer.time != null) && (layer.time.data.includes(options.time));
    if (timeDefined) {
      sourceOptions.tileLoadFunction = function (imageTile, src) {
        imageTile.getImage().src = src + '&Time=' + (new Date(options.time)).toISOString();
      };
    }
    sourceOptions.transition = 0;
    let olSource = new WMTS(sourceOptions);
    if (timeDefined != null) {
      olSource.set('metoclient:time', options.time);
    }
    return olSource;
  }
}
