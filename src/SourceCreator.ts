import TileWMS from 'ol/source/TileWMS';
import TileGrid from 'ol/tilegrid/TileGrid';
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS';
import { OSM } from 'ol/source';
import { get } from 'ol/proj';
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
  static wms(layer: any, options: any): TileWMS | null {
    const source = options.sources[layer.source];
    if (
      source == null ||
      source.tiles[0] == null ||
      source.tiles[0].length === 0
    ) {
      return null;
    }
    const url: string = source.tiles[0];
    // Todo: handle also non-zero indexes
    const params: Record<string, string> = getQueryParams(
      layer,
      url,
      options.time
    );
    const projection = get(options.projection);
    const olSource = new TileWMS({
      url: getBaseUrl(url),
      params,
      tileGrid: new TileGrid({
        extent:
          source.bounds != null
            ? source.bounds
            : projection != null
            ? projection.getExtent()
            : undefined,
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
      olSource.setTileLoadFunction((imageTile: any, url: string) => {
        const timeout: number = olSource.get(constants.TIMEOUT);
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
  static wmts(layer: any, options: any, capabilities: any): WMTS | null {
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

    (sourceOptions as any).transition = 0;
    const olSource = new WMTS(sourceOptions);
    olSource.set(constants.OL_CLASS_NAME, 'WMTS');
    const timeDefined: boolean =
      layer.time != null && layer.time.data.includes(options.time);
    if (timeDefined) {
      olSource.set(constants.TIME, options.time);
      olSource.set(constants.TIMEOUT, layer.timeout);
      olSource.setTileLoadFunction((imageTile: any, url: string) => {
        const time: string = new Date(options.time).toISOString();
        const timeout: number = olSource.get(constants.TIMEOUT);
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
  static osm(options: any): OSM {
    return new OSM(options);
  }
}
