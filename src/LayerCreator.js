import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import ImageWMS from 'ol/source/ImageWMS';
import { OSM } from 'ol/source';
import SourceCreator from './SourceCreator';
import { getBaseUrl } from './util';

export default class LayerCreator {

  static tiled (layer, options, capabilities) {
    const source = options.sources[layer.source];
    if (source == null) {
      return null;
    }
    if (source.type === 'OSM') {
      return new TileLayer({
        source: new OSM(),
        type: (layer.metadata) && (layer.metadata.type) ? layer.metadata.type : '',
        title: (layer.metadata) && (layer.metadata.title) ? layer.metadata.title : '',
        id: layer.id
      });
    }
    const service = layer.url.service.toLowerCase();
    if (typeof SourceCreator[service] === 'function') {
      let source = SourceCreator[service](layer, options, capabilities);
      return (source != null) ? new TileLayer({
        source: source,
        preload: 0,
        opacity: 0,
        type: (layer.metadata) && (layer.metadata.type) ? layer.metadata.type : '',
        title: (layer.metadata) && (layer.metadata.title) ? layer.metadata.title : '',
        previous: (layer.previous != null) ? layer.previous : options.layers.find(layer => layer['next'] === layer.id),
        next: (layer.next != null) ? layer.next : options.layers.find(layer => layer['previous'] === layer.id),
        id: layer.id
      }) : null;
    }
  }

  static image (layer, options, capabilities) {
    const source = options.sources[layer.source];
    if ((source == null) || (source.tiles[0] == null) || (source.tiles[0].length === 0)) {
      return null;
    }
    // Todo: handle also non-zero indexes
    // Todo: add more options
    const url = getBaseUrl(source.tiles[0]);
    const timeDefined = (layer.time != null) && (layer.time.data.includes(options.time));
    if (timeDefined) {
      let timeFormatted = (new Date(options.time)).toISOString();
      layer.url.TIME = timeFormatted;
    }
    let olSource = new ImageWMS({
      url: url,
      params: layer.url
    });
    if (olSource == null) {
      return null;
    }
    if (timeDefined) {
      olSource.set('metoclient:time', options.time);
    }

    return new ImageLayer({
      source: olSource,
      // Todo: use same code with tiled and image layer options
      preload: 0,
      opacity: 0,
      type: (layer.metadata) && (layer.metadata.type) ? layer.metadata.type : '',
      title: (layer.metadata) && (layer.metadata.title) ? layer.metadata.title : '',
      previous: (layer.previous != null) ? layer.previous : options.layers.find(layer => layer['next'] === layer.id),
      next: (layer.next != null) ? layer.next : options.layers.find(layer => layer['previous'] === layer.id),
      id: layer.id
    });
  }
}
