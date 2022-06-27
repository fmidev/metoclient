/**
 * @module LayerCreator
 */
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import SourceCreator from './SourceCreator';
import {
  getBaseUrl,
  getQueryParams,
  getAdjacentLayer,
  getLegendUrl,
} from './utils';
import * as constants from './constants';

/**
 * Class abstracting layer creators for different layer types.
 */
export default class LayerCreator {
  /**
   * Create a tiled layer based on given configurations.
   *
   * @param {object} layer Layer configuration.
   * @param {object} options General options.
   * @param {object} capabilities Capabilities data.
   * @returns {null | object} Layer.
   */
  static tiled(layer, options, capabilities) {
    if (layer == null) {
      return null;
    }
    const sourceOptions = options.sources[layer.source];
    if (sourceOptions == null) {
      return null;
    }
    let service;
    let serviceAvailable = false;
    if (sourceOptions.type != null) {
      service = sourceOptions.type.toLowerCase();
      serviceAvailable = typeof SourceCreator[service] === 'function';
    }
    if (!serviceAvailable && layer.url != null && layer.url.service) {
      service = layer.url.service.toLowerCase();
      serviceAvailable = typeof SourceCreator[service] === 'function';
    }
    if (!serviceAvailable) {
      return null;
    }
    const source = SourceCreator[service](layer, options, capabilities);
    if (source == null) {
      return null;
    }
    let legendUrl = layer.legendUrl != null ? layer.legendUrl : null;
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
    });
  }

  /**
   * Create an image layer based on given configurations.
   *
   * @param {object} layer Layer configuration.
   * @param {object} options General options.
   * @param capabilities
   * @returns {null | object} Layer.
   */
  static image(layer, options, capabilities) {
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
    const url = source.tiles[0];
    const params = getQueryParams(layer, url, options.time);
    const olSource = new ImageWMS({
      url: getBaseUrl(url),
      params,
      ratio: 1,
    });
    olSource.set('metoclient:olClassName', 'ImageWMS');
    if (params.TIME != null) {
      olSource.set('metoclient:time', options.time);
    }
    let legendUrl = layer.legendUrl != null ? layer.legendUrl : null;
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
    });
  }
}
