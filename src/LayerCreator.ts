/**
 * @module LayerCreator
 */
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import TileSource from 'ol/source/Tile';
import ImageSource from 'ol/source/Image';
import SourceCreator from './SourceCreator';
import {
  getBaseUrl,
  getQueryParams,
  getAdjacentLayer,
  getLegendUrl,
  defaultLoadFunction,
} from './utils';
import * as constants from './constants';

/**
 * Class abstracting layer creators for different layer types.
 */
export default class LayerCreator {
  /**
   * Create a tiled layer based on given configurations.
   * @param {object} layer Layer configuration.
   * @param {object} options General options.
   * @param {object} capabilities Capabilities data.
   * @returns {null | object} Created layer or null.
   */
  static tiled(
    layer: any,
    options: any,
    capabilities: any
  ): TileLayer<TileSource> | null {
    if (layer == null) {
      return null;
    }
    const sourceOptions = options.sources[layer.source];
    if (sourceOptions == null) {
      return null;
    }
    let service: string | undefined;
    let serviceAvailable = false;
    if (sourceOptions.type != null) {
      service = sourceOptions.type.toLowerCase();
      serviceAvailable =
        typeof (SourceCreator as any)[service as string] === 'function';
    }
    if (!serviceAvailable && layer.url != null && layer.url.service) {
      service = layer.url.service.toLowerCase();
      serviceAvailable =
        typeof (SourceCreator as any)[service as string] === 'function';
    }
    if (!serviceAvailable) {
      return null;
    }
    const source = (SourceCreator as any)[service as string](
      layer,
      options,
      capabilities
    );
    if (source == null) {
      return null;
    }
    let legendUrl: string | null =
      layer.legendUrl != null ? layer.legendUrl : null;
    if (legendUrl == null && layer.url != null) {
      legendUrl = getLegendUrl(
        layer.url.layers,
        layer.url.styles,
        capabilities
      );
    }
    return new TileLayer({
      source,
      extent: source.bounds,
      preload: 0,
      visible: layer.visibility !== constants.NOT_VISIBLE,
      opacity: 0,
      type: layer.metadata && layer.metadata.type ? layer.metadata.type : '',
      title: layer.metadata && layer.metadata.title ? layer.metadata.title : '',
      previous: getAdjacentLayer('previous', layer, options.layers),
      next: getAdjacentLayer('next', layer, options.layers),
      legendTitle: layer.legendTitle,
      layerSwitcherTitle: layer.metadata.title,
      id: layer.id,
      legendUrl,
    } as any);
  }

  /**
   * Create an image layer based on given configurations.
   * @param {object} layer Layer configuration.
   * @param {object} options General options.
   * @param {object} capabilities Capabilities data.
   * @returns {null | object} Created layer or null.
   */
  static image(
    layer: any,
    options: any,
    capabilities: any
  ): ImageLayer<ImageSource> | null {
    const source = options.sources[layer.source];
    if (
      source == null ||
      source.tiles[0] == null ||
      source.tiles[0].length === 0
    ) {
      return null;
    }
    // Todo: handle also non-zero indexes
    // Todo: add more options
    const url: string = source.tiles[0];
    const params: Record<string, string> = getQueryParams(
      layer,
      url,
      options.time
    );
    const olSource = new ImageWMS({
      url: getBaseUrl(url),
      params,
      ratio: 1,
    });
    olSource.set(constants.OL_CLASS_NAME, 'ImageWMS');
    if (params.TIME != null) {
      olSource.set(constants.TIME, options.time);
      olSource.set(constants.TIMEOUT, layer.timeout);
      olSource.setImageLoadFunction((image: any, imageUrl: string) => {
        const timeout: number = olSource.get(constants.TIMEOUT);
        defaultLoadFunction(image, imageUrl, olSource, null, timeout);
      });
    }
    let legendUrl: string | null =
      layer.legendUrl != null ? layer.legendUrl : null;
    if (legendUrl == null && layer.url != null) {
      legendUrl = getLegendUrl(
        layer.url.layers,
        layer.url.styles,
        capabilities
      );
    }
    return new ImageLayer({
      source: olSource,
      extent: source.bounds,
      // Todo: use same code with tiled and image layer options
      preload: 0,
      visible: layer.visibility !== constants.NOT_VISIBLE,
      opacity: 0,
      type: layer.metadata && layer.metadata.type ? layer.metadata.type : '',
      title: layer.metadata && layer.metadata.title ? layer.metadata.title : '',
      previous: getAdjacentLayer('previous', layer, options.layers),
      next: getAdjacentLayer('next', layer, options.layers),
      legendTitle: layer.legendTitle,
      layerSwitcherTitle: layer.metadata.title,
      id: layer.id,
      legendUrl,
    } as any);
  }
}
