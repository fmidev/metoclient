/**
 * @module ol/metoclient/MetOClient
 */
import { assign } from 'ol/obj';
import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4/dist/proj4.js'; // Todo: do not use built version
import {transform} from 'ol/proj';
import { parseTimes, updateSourceTime } from './util.js';
import { interval, timeout } from 'd3-timer';
import BaseObject from 'ol/Object';
import TimeSlider from './TimeSlider';
import LayerCreator from './LayerCreator';
import SourceUpdater from './SourceUpdater';
import CapabilitiesReader from './CapabilitiesReader';
import { unByKey } from 'ol/Observable';
import * as constants from './constants';
import { Duration } from 'luxon';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Collection from 'ol/Collection';
import Url from 'domurl';
import LayerSwitcher from 'ol-layerswitcher';
import Zoom from 'ol/control/Zoom';
import DragRotate from 'ol/interaction/DragRotate';
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom';
import DragPan from 'ol/interaction/DragPan';
import PinchZoom from 'ol/interaction/PinchZoom';
import DragZoom from 'ol/interaction/DragZoom';
import PinchRotate from 'ol/interaction/PinchRotate';
import KeyboardPan from 'ol/interaction/KeyboardPan';
import KeyboardZoom from 'ol/interaction/KeyboardZoom';

/**
 * @classdesc
 * @api
 */
export class MetOClient extends BaseObject {

  /**
   * @param {Object} options Map options.
   */
  constructor (options = {}) {
    super();
    proj4.defs('EPSG:3067', '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
    register(proj4);
    this.config_ = assign(constants.DEFAULT_OPTIONS, options);
    this.set('options', options, true);
    this.set('map', null);
    this.timeSlider_ = null;
    this.status_ = {};
    this.delay_ = ((options.refreshInterval != null) && (options.refreshInterval <= Number.MAX_SAFE_INTEGER) && (options.refreshInterval >= 0)) ? options.refreshInterval : constants.DEFAULT_DELAY;
    this.periodDelay_ = 2 * constants.DEFAULT_DELAY;
    this.times_ = [];
    this.playingListener_ = null;
    this.nextListener_ = null;
    this.previousListener_ = null;
    this.renderComplete_ = false;
    this.updateNeeded_ = false;
    this.waitingRender_ = 0;
    this.refreshInterval_ = options.refreshInterval ? Math.min(Duration.fromISO(options.refreshInterval).valueOf(), constants.MAX_REFRESH_INTERVAL) : constants.DEFAULT_REFRESH_INTERVAL;
    this.capabilities_ = {};
    this.on('change:options', () => {
      this.config_ = assign(constants.DEFAULT_OPTIONS, this.get('options'));
      this.refresh();
    });
  }

  /**
   *
   * @returns {Promise<void>}
   */
  render () {
    return this.updateCapabilities_().then(() => {
      this.updateTimes_();
      let defaultTime = this.times_[0];
      const realWorldTime = Date.now();
      this.times_.some(time => {
        const future = (time > realWorldTime);
        if (!future) {
          defaultTime = time;
        }
        return future;
      });
      if (this.config_.time == null) {
        this.config_.time = defaultTime;
      }
      // Limit bounds after refresh
      if (this.config_.time < this.times_[0]) {
        this.config_.time = this.times_[0];
      }
      let lastTimeIndex = this.times_.length - 1;
      if (this.config_.time > this.times_[lastTimeIndex]) {
        this.config_.time = this.times_[lastTimeIndex];
      }
      Object.keys(this.config_.sources).forEach(source => {
        if ((this.config_.sources[source].times != null) && (this.config_.sources[source].times.length > 0)) {
          this.config_.sources[source].tiles = updateSourceTime(this.config_.sources[source].tiles, this.config_.sources[source].times.includes(defaultTime) ? defaultTime : this.config_.sources[source].times[0]);
        }
      });
      this.updateMap_();
    });
  }

  /**
   *
   */
  refresh () {
    let map = this.get('map');
    if (map != null) {
      let layers = map.getLayers().getArray();
      layers.forEach((layer, index) => {
        let source = layer.getSource();
        let time = source.get('metoclient:time');
        if (time != null) {
          source.set('metoclient:time', null);
        }
      });
    }
    this.render();
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async updateCapabilities_ () {
    let updateTime = Date.now();
    let responses = await Promise.all(this.config_.layers.reduce((urls, layer) => {
      if (layer.source == null) {
        return urls;
      }
      let sourceIds = [layer.source];
      if ((layer.time != null) && (layer.time.source != null) && (!sourceIds.includes(layer.time.source))) {
        sourceIds.push(layer.time.source);
      }
      sourceIds.forEach(sourceId => {
        let source = this.config_.sources[sourceId];
        if (source == null) {
          return;
        }
        let url = '';
        if ((source.capabilities != null) && (source.capabilities.length > 0)) {
          url = source.capabilities;
        } else {
          if ((source.tiles == null) || (source.tiles.length === 0)) {
            return;
          }
          url = source.tiles[0]; // Todo: Handle other indexes
        }
        if (url.endsWith('/')) {
          url = url.substring(0, url.length - 1);
        }
        const index = url.lastIndexOf('/');
        let type = '';
        if ((url.toLowerCase().startsWith('http')) && (index >= 0)) {
          type = url.substring(index + 1).toLowerCase();
        } else {
          type = layer.url.service.toLowerCase();
        }
        if (this.capabilities_[url] == null) {
          this.capabilities_[url] = {
            updated: null,
            type: type,
            data: null
          };
        }
        if (this.capabilities_[url].updated !== updateTime) {
          urls.push(url + `?service=${type}&${constants.GET_CAPABILITIES_QUERY}`);
          this.capabilities_[url].updated = updateTime;
        }
      });
      return urls;
    }, []).map(url => fetch(url)));
    await Promise.all(responses.map(response => response.text().then(text => {
      if ((text != null) && (response.url.endsWith(constants.GET_CAPABILITIES_QUERY))) {
        let capabKey = response.url.split('?')[0];
        const capabKeyParts = capabKey.split('/');
        let localCapabKey = '';
        if (capabKeyParts.length > 0) {
          localCapabKey = capabKeyParts[capabKeyParts.length - 1];
        }
        if ((localCapabKey.length > 0) && (this.capabilities_[localCapabKey] != null)) {
          capabKey = localCapabKey;
        }
        if (typeof CapabilitiesReader[this.capabilities_[capabKey].type] === 'function') {
          this.capabilities_[capabKey].data = CapabilitiesReader[this.capabilities_[capabKey].type](text);
        }
      }
    }).catch(error => {
      console.log(error);
    })));
  }

  /**
   *
   * @param layer
   * @returns {boolean}
   * @private
   */
  isTiledLayer_ (layer) {
    if ((layer == null) || (layer.source == null)) {
      return false;
    }
    if ((layer.url != null) && (typeof layer.url.service === 'string') && (layer.url.service.toLowerCase() === 'wmts')) {
      return true;
    }
    const source = this.config_.sources[layer.source];
    if ((source == null) || (source.tiles == null)) {
      return false;
    }
    let tiled = Array.isArray(source.tileSize) ? source.tileSize.map(tileSize => Number(tileSize) > 0) : new Array(2).fill(Number(source.tileSize) > 0);
    if (Array.isArray(source.tiles)) {
      // Todo: Handle also other indexes
      const url = new Url(source.tiles[0].toLowerCase());
      tiled = ['width', 'height'].map((measure, index) => ((url.query != null) && (url.query[measure] !== undefined) && (Number(url.query[measure]) > 0)) || tiled[index]);
    }
    if (layer.url != null) {
      ['width', 'height'].forEach((measure, index) => {
        if (layer.url[measure] !== undefined) {
          tiled[index] = (Number(layer.url[measure]) > 0);
        }
      });
    }
    return tiled.every(Boolean);
  }

  createLayer_ (layerConfig, time = this.config_.time, postfix = '') {
    const layerType = (this.isTiledLayer_(layerConfig)) ? 'tiled' : 'image';
    const source = this.config_.sources[layerConfig.source];
    const timeDefined = (layerConfig.time != null) && (layerConfig.time.data != null);
    const postfixDefined = (postfix.length > 0);
    if (postfixDefined && !timeDefined) {
      return null;
    }
    let options = {...this.config_};
    if (timeDefined) {
      options.time = time;
      if (!layerConfig.time.data.includes(options.time)) {
        options.time = layerConfig.time.data.reduce((prevTime, time) => {
          if ((time < this.config_.time) && (time > prevTime)) {
            prevTime = time;
          }
          return prevTime;
        }, layerConfig.time.data[0]);
      }
    }
    const url = ((source.capabilities != null) && (source.capabilities.length > 0)) ? source.capabilities : source.tiles[0];
    const layer = LayerCreator[layerType](layerConfig, options, this.capabilities_[url]);
    if (layer != null) {
      layer.on('change:visible', event => {
        const visible = layer.getVisible();
        ['previous', 'next'].forEach(relative => {
          this.setRelativesVisible_(layer, relative, visible);
          let previousLayer = layer.get('metoclient:previous');
          if (previousLayer != null) {
            previousLayer.setVisible(visible);
          }
          let nextLayer = layer.get('metoclient:next');
          if (nextLayer != null) {
            nextLayer.setVisible(visible);
          }
        });
      });
      if (timeDefined) {
        layer.set('times', layerConfig.time.data);
      }
      layer.set('displayInLayerSwitcher', !postfixDefined);
      layer.set('metoclient:opacity', layerConfig.opacity != null ? layerConfig.opacity : 1);
      const id = layer.get('id');
      layer.set('metoclient:id', id);
      if (postfixDefined) {
        layer.set('id', 'metoclient:' + id + postfix);
        layer.set('title', '');
        this.hideLayer_(layer);
      } else {
        const prevLayerId = layer.get('previous');
        const prevLayer = ((prevLayerId != null) && (prevLayerId.length > 0)) ? this.config_.layers.find(configLayer => configLayer.id === prevLayerId) : null;
        const prevTimes = ((prevLayer != null) && (prevLayer.time != null)) ? prevLayer.time.data : [];
        if (prevTimes.includes(this.config_.time)) {
          this.hideLayer_(layer);
        }
      }
    }
    return layer;
  }

  createLayerSwitcherTitle_ (layerConfig) {
    let title = layerConfig.metadata.title;
    let layersConfig = this.config_.layers;
    const nextLayerId = layerConfig.next;
    const nextLayerConfig = ((nextLayerId != null) && (nextLayerId.length > 0)) ? layersConfig.find(layer => layer.id === nextLayerId) : null;
    let nextTitle = (nextLayerConfig != null) ? this.createLayerSwitcherTitle_(nextLayerConfig) : '';
    if ((nextTitle != null) && (nextTitle.length > 0) && (title !== nextTitle)) {
      title += ' / ' + nextTitle;
    }
    layerConfig.metadata.title = '';
    return title;
  }

  /**
 *
 *
 * @param {*} layer
 * @param {*} relative
 * @param {*} visible
 * @memberof MetOClient
 */
  setRelativesVisible_ (layer, relative, visible) {
    let relativeLayerId = layer.get(relative);
    let layers = this.get('map').getLayers().getArray();
    const relativeLayer = ((relativeLayerId != null) && (relativeLayerId.length > 0)) ? layers.find(layer => layer.get('id') === relativeLayerId) : null;
    if (relativeLayer != null) {
      relativeLayer.setVisible(visible);
      this.setRelativesVisible_(relativeLayer, relative, visible);
      let previousLayer = relativeLayer.get('metoclient:previous');
      if (previousLayer != null) {
        previousLayer.setVisible(visible);
      }
      let nextLayer = relativeLayer.get('metoclient:next');
      if (nextLayer != null) {
        nextLayer.setVisible(visible);
      }
    }
  }

  /**
   *
   * @returns {Collection}
   * @private
   */
  createLayers_ () {
    const numBaseMaps = this.config_.layers.reduce((baseMapCount, layerConfig) => baseMapCount + ((layerConfig.metadata != null) && (layerConfig.metadata.type != null) && (layerConfig.metadata.type.toLowerCase() === 'base')), 0);
    let layers = new Collection(this.config_.layers.reduce((olLayers, layerConfig) => {
      if ((layerConfig.time != null) && ((layerConfig.previous == null) || (layerConfig.previous.length === 0)) && (layerConfig.metadata != null) && (layerConfig.metadata.title != null)) {
        layerConfig.metadata.title = this.createLayerSwitcherTitle_(layerConfig);
      }
      if (layerConfig.url != null) {
        layerConfig.url = Object.keys(layerConfig.url).reduce((lowerCased, key) => {
          lowerCased[key.toLowerCase()] = layerConfig.url[key];
          return lowerCased;
        }, {});
      }
      if ((layerConfig.source == null) || ((layerConfig.url != null) && (typeof layerConfig.url.service !== 'string') || (layerConfig.url.service.length === 0))) {
        return olLayers;
      }
      if ((numBaseMaps === 1) && (layerConfig.metadata != null) && (layerConfig.metadata.type != null) && (layerConfig.metadata.type.toLowerCase() === 'base')) {
        layerConfig.metadata.title = '';
      }
      const olLayer = this.createLayer_(layerConfig);
      if (olLayer != null) {
        olLayers.push(olLayer);
      }
      return olLayers;
    }, []));
    layers.getArray().forEach((layer, index, layersArray) => {
      const opacity = layer.get('metoclient:opacity');
      if (layer.get('times') == null) {
        layers.item(index).setOpacity(opacity);
      } else {
        let source = layer.getSource();
        let time = source.get('metoclient:time');
        if (time === this.config_.time) {
          const previousId = layer.get('previous');
          if ((previousId != null) && (previousId.length > 0)) {
            let previous = layersArray.find(l => l.get('id') === previousId);
            const previousTimes = previous.get('times');
            if (!previousTimes.includes(this.config_.time)) {
              layers.item(index).setOpacity(opacity);
            }
          }
        }
      }
    });
    return layers;
  }

  setVisible_ (layer, visible) {
    visible ? this.showLayer_(layer) : this.hideLayer_(layer);
  }

  showLayer_ (layer) {
    let opacity = layer.get('metoclient:opacity');
    if (opacity == null) {
      opacity = 1;
    }
    layer.setOpacity(opacity);
  }

  hideLayer_ (layer) {
    layer.setOpacity(0);
  }

  /**
   *
   * @returns {View}
   * @private
   */
  createView_ () {
    let viewOptions = {...this.config_};
    delete viewOptions.sources;
    delete viewOptions.layers;
    return new View(viewOptions);
  }

  currentTimeRendered_ (event) {
    let map = this.get('map');
    if (map == null) {
      return;
    }
    let layers = map.getLayers().getArray();
    layers.forEach(layer => {
      const times = layer.get('times');
      let visible = ((times == null) || (!Array.isArray(times)) || (times.length === 0));
      if (!visible) {
        let source = layer.getSource();
        if (source.get('metoclient:time') === this.config_.time) {
          visible = true;
          const prevLayerId = layer.get('previous');
          const prevLayer = ((prevLayerId != null) && (prevLayerId.length > 0)) ? layers.find(layer => layer.get('id') === prevLayerId) : null;
          if (prevLayer != null) {
            const prevTimes = prevLayer.get('times');
            if (prevTimes[prevTimes.length - 1] >= this.config_.time) {
              visible = false;
            }
          }
        }
      }
      this.setVisible_(layer, visible);
    });
    this.status_[this.config_.time] = constants.STATUS_SUCCESS;
    this.timeSlider_.updateTimeLoaderVis(this.times_.map(time => ({
      endTime: time,
      status: this.status_[time]
    })));
    if (this.updateNeeded_) {
      this.updateNeeded_ = false;
      this.renderComplete_ = true;
      this.timeUpdated_();
    } else {
      const prevTime = this.getPrevTime();
      const nextTime = this.getNextTime();
      layers.filter(layer => {
        const times = layer.get('times');
        if ((times == null) || (!Array.isArray(times)) || (times.length === 0)) {
          return false;
        }
        return (!layer.get('id').startsWith('metoclient:'));
      }).forEach(layer => {
        let layerId = layer.get('id');
        let layerConfig = this.config_.layers.find(layerConfig => layerConfig.id === layerId);
        let skipPrevious = false;
        let skipNext = false;
        const times = layer.get('times');
        let layerPrevTime;
        let layerNextTime;
        const previous = layer.get('previous');
        const next = layer.get('next');
        if ((map.get('playing')) || ((prevTime < times[0]) && (previous != null) && (previous.length > 0))) {
          skipPrevious = true;
        } else {
          layerPrevTime = times.includes(prevTime) ? prevTime : times.reduce((closestPrevTime, time) => (((time < prevTime) && (prevTime - time < closestPrevTime)) ? time : closestPrevTime), Number.POSITIVE_INFINITY);
          if (layerPrevTime > prevTime) {
            layerPrevTime = Math.max(...times);
          }
        }
        if ((nextTime > times[times.length - 1]) && (next != null) && (next.length > 0)) {
          skipNext = true;
        } else {
          layerNextTime = times.includes(nextTime) ? nextTime : times.reduce((closestNextTime, time) => (((time > nextTime) && (nextTime - time > closestNextTime)) ? time : closestNextTime), Number.NEGATIVE_INFINITY);
          if (layerNextTime < nextTime) {
            layerNextTime = Math.min(...times);
          }
        }
        let layers = map.getLayers();
        let prevLayer = layer.get('metoclient:previous');
        if ((prevLayer == null) && (layerConfig != null) && (layerPrevTime != null)) {
          prevLayer = this.createLayer_(layerConfig, layerPrevTime, '-previous');
          prevLayer.setVisible(layer.getVisible());
          let index = layers.getArray().findIndex(l => l.get('metoclient:id') === layer.get('metoclient:id'));
          layers.insertAt(index, prevLayer);
          layer.set('metoclient:previous', prevLayer);
        }
        if ((!skipPrevious) && (prevLayer != null)) {
          const prevSource = prevLayer.getSource();
          if (prevSource.get('metoclient:time') !== layerPrevTime) {
            this.hideLayer_(prevLayer);
            SourceUpdater[prevSource.constructor.name](prevSource, layerPrevTime);
          }
        }
        let nextLayer = layer.get('metoclient:next');
        if ((nextLayer == null) && (layerConfig != null) && (layerNextTime != null)) {
          nextLayer = this.createLayer_(layerConfig, layerNextTime, '-next');
          nextLayer.setVisible(layer.getVisible());
          let index = layers.getArray().findIndex(l => l.get('metoclient:id') === layer.get('metoclient:id'));
          layers.insertAt(index, nextLayer);
          layer.set('metoclient:next', nextLayer);
        }
        if ((!skipNext) && (nextLayer != null)) {
          const nextSource = nextLayer.getSource();
          if (nextSource.get('metoclient:time') !== layerNextTime) {
            this.hideLayer_(nextLayer);
            SourceUpdater[nextSource.constructor.name](nextSource, layerNextTime);
          }
        }
      });
      map.renderSync();
      map.once('rendercomplete', event => {
        this.renderComplete_ = true;
        if (this.updateNeeded_) {
          this.updateNeeded_ = false;
          this.timeUpdated_();
        } else if (this.waitingRender_ > 0) {
          timeout(this.animate_.bind(this), Math.max(this.delay_ - (Date.now() - this.waitingRender_), 0));
        }
      });
    }
  }

  getLayerSwitcher_ () {
    const map = this.get('map');
    if (map == null) {
      return null;
    }
    const controls = map.getControls();
    if (controls == null) {
      return null;
    }
    return controls.getArray().find(control => (control.constructor != null) && (control.constructor.name === 'LayerSwitcher'));
  }

  /**
   *
   * @private
   */
  timeUpdated_ () {
    if (!this.renderComplete_) {
      let mapTime = this.get('map').get('time');
      if (this.status_[mapTime] !== constants.STATUS_SUCCESS) {
        this.status_[mapTime] = constants.STATUS_WORKING;
        this.timeSlider_.updateTimeLoaderVis(this.times_.map(time => ({
          endTime: time,
          status: this.status_[time]
        })));
      }
      this.updateNeeded_ = true;
      return;
    }
    this.get('map').once('rendercomplete', this.currentTimeRendered_.bind(this));
    this.status_[this.config_.time] = constants.STATUS_SUCCESS;
    this.config_.time = this.get('map').get('time');
    this.status_[this.config_.time] = constants.STATUS_WORKING;
    Object.keys(this.status_).forEach(time => {
      if ((Number(time) !== this.config_.time) && (this.status_[time] === constants.STATUS_WORKING)) {
        this.status_[time] = '';
      }
    });
    this.timeSlider_.updateTimeLoaderVis(this.times_.map(time => ({
      endTime: time,
      status: this.status_[time]
    })));
    const layers = this.get('map').getLayers().getArray();
    layers.filter(layer => {
      const times = layer.get('times');
      if ((times == null) || (!Array.isArray(times)) || (times.length === 0)) {
        return false;
      }
      if ((this.config_.time < times[0]) || (this.config_.time > times[times.length - 1])) {
        this.hideLayer_(layer);
        return false;
      }
      const prevLayerId = layer.get('previous');
      const prevLayer = ((prevLayerId != null) && (prevLayerId.length > 0)) ? layers.find(layer => layer.get('id') === prevLayerId) : null;
      const prevTimes = (prevLayer != null) ? prevLayer.get('times') : [];
      if (prevTimes.includes(this.config_.time)) {
        this.hideLayer_(layer);
        return false;
      }
      return (!layer.get('id').startsWith('metoclient:'));
    }).forEach(layer => {
      const source = layer.getSource();
      if (source.get('metoclient:time') === this.config_.time) {
        let prevLayer = layer.get('metoclient:previous');
        if (prevLayer != null) {
          this.hideLayer_(prevLayer);
        } else {
          this.status_[this.config_.time] = constants.STATUS_SUCCESS;
          this.timeSlider_.updateTimeLoaderVis(this.times_.map(time => ({
            endTime: time,
            status: this.status_[time]
          })));
        }
        let nextLayer = layer.get('metoclient:next');
        if (nextLayer != null) {
          this.hideLayer_(nextLayer);
        }
        this.showLayer_(layer);
      } else {
        let prevLayer = layer.get('metoclient:previous');
        let nextLayer = layer.get('metoclient:next');
        if (prevLayer != null) {
          let prevSource = prevLayer.getSource();
          if ((prevSource != null) && (prevSource.get('metoclient:time') === this.config_.time)) {
            this.hideLayer_(layer);
            this.showLayer_(prevLayer);
            const baseId = layer.get('metoclient:id');
            layer.set('id', 'metoclient:' + baseId + '-next');
            prevLayer.set('id', baseId);
            if (nextLayer != null) {
              nextLayer.set('id', 'metoclient:' + baseId + '-previous');
            }
            prevLayer.set('metoclient:previous', nextLayer);
            prevLayer.set('metoclient:next', layer);
            prevLayer.set('title', layer.get('title'));
            layer.set('metoclient:next', prevLayer);
            layer.set('title', '');
            return;
          }
        }
        if (nextLayer != null) {
          let nextSource = nextLayer.getSource();
          if (nextSource != null) {
            if (nextSource.get('metoclient:time') === this.config_.time) {
              this.hideLayer_(layer);
              this.showLayer_(nextLayer);
              const baseId = layer.get('metoclient:id');
              layer.set('id', 'metoclient:' + baseId + '-previous');
              nextLayer.set('id', baseId);
              if (prevLayer != null) {
                prevLayer.set('id', 'metoclient:' + baseId + '-next');
              }
              nextLayer.set('metoclient:previous', layer);
              nextLayer.set('metoclient:next', prevLayer);
              nextLayer.set('title', layer.get('title'));
              layer.set('metoclient:previous', nextLayer);
              layer.set('title', '');
              return;
            }
            const baseId = layer.get('metoclient:id');
            layer.set('id', 'metoclient:' + baseId + '-previous');
            nextLayer.set('id', baseId);
            if (prevLayer != null) {
              prevLayer.set('id', 'metoclient:' + baseId + '-next');
            }
            nextLayer.set('metoclient:previous', layer);
            nextLayer.set('metoclient:next', prevLayer);
            nextLayer.set('title', layer.get('title'));
            layer.set('metoclient:previous', nextLayer);
            layer.set('title', '');
            SourceUpdater[nextSource.constructor.name](nextSource, this.config_.time);
            return;
          }
        }
        SourceUpdater[source.constructor.name](source, this.config_.time);
      }
    });
    this.renderComplete_ = false;
    this.get('map').renderSync();
  }

  /**
   *
   * @private
   */
  updateTimeListener_ () {
    this.timeListener = this.get('map').on('change:time', this.timeUpdated_.bind(this));
  }

  /**
   *
   * @private
   */
  createMap_ () {
    this.timeSlider_ = new TimeSlider({
      locale: 'fi-FI',
      showTimeSlider: true,
      timeZone: this.config_.timeZone,
      timeZoneLabel: this.config_.timeZoneLabel,
      mouseWheelTimeStep: this.config_.mouseWheelTimeStep
    });
    let map = new Map({
      target: this.config_.container,
      layers: this.createLayers_(),
      view: this.createView_(),
      controls: [
        new Zoom({
          'zoomInTipLabel': this.config_.texts['Zoom In'],
          'zoomOutTipLabel': this.config_.texts['Zoom Out'],
        }),
        new LayerSwitcher(),
        this.timeSlider_
      ],
      interactions: [
        new DragRotate(),
        new DoubleClickZoom(),
        new DragPan(),
        new PinchRotate(),
        new PinchZoom(),
        new KeyboardPan(),
        new KeyboardZoom(),
        new DragZoom()
      ]
    });
    this.set('map', map);
    this.renderComplete_ = true;
    this.timeSlider_.createTimeSlider(this.times_);
    this.playingListener_ = this.get('map').on('change:playing', evt => {
      if (this.get('map').get('playing')) {
        this.animate_();
      }
    });
    this.updateTimeListener_();
    this.nextListener_ = this.get('map').on('next', evt => {
      this.next();
    });
    this.previousListener_ = this.get('map').on('previous', evt => {
      this.previous();
    });
    map.set('time', this.config_.time);

    this.refreshTimer = interval(this.refresh.bind(this), this.refreshInterval_);
  }

  /**
   *
   * @private
   */
  updateMap_ () {
    let map = this.get('map');
    if (map == null) {
      this.createMap_();
    } else {
      map.setTarget(this.config_.container);
      map.getLayerGroup().setLayers(this.createLayers_());
      map.setView(this.createView_());
      map.set('time', this.config_.time);
      this.updateTimeListener_();
      this.timeUpdated_();
    }
  }

  /**
   *
   * @private
   */
  updateTimes_ () {
    this.times_ = [];
    this.status_ = {};
    this.config_.layers.forEach(layer => {
      if ((layer.time != null) && (layer.time.range != null)) {
        const times = parseTimes(layer.time.range, layer.time.offset);
        const source = (layer.time.source != null) ? this.config_.sources[layer.time.source] : this.config_.sources[layer.source];
        const capabilities = this.capabilities_[source.tiles[0]]; // Generalize
        if ((capabilities == null) || (capabilities.data == null) || (capabilities.data.Capability == null) || (capabilities.data.Capability.Layer == null) || (capabilities.data.Capability.Layer.Layer == null)) {
          return;
        }
        const layerElement = capabilities.data.Capability.Layer.Layer.find(element => [layer.url.layer, layer.url.layers].includes(element.Name));
        const data = (layerElement != null) ? layerElement.Dimension.find(element => element.name.toLowerCase() === 'time').values : [];
        const parsedData = parseTimes(data);
        const currentTime = Date.now();
        let historyData;
        let historyIndex = 0;
        let futureData;
        let futureIndex = 0;
        times.forEach((time, index) => {
          if (!isNaN(time) && !isFinite(time)) {
            if (time < 0) {
              if (historyData == null) {
                historyData = parsedData.filter(time => time < currentTime).sort().reverse();
              }
              times[index] = historyData[historyIndex];
              historyIndex++;
            } else {
              if (futureData == null) {
                futureData = parsedData.filter(time => time >= currentTime).sort();
              }
              times[index] = futureData[futureIndex];
              futureIndex++;
            }
          }
        });
        times.sort();
        layer.time.data = times.filter(time => parsedData.includes(time));
        this.times_ = [...new Set([...this.times_, ...layer.time.data])].sort();
      }
    });
    this.times_.forEach(time => {
      this.status_[time] = '';
    });
  }

  /**
   *
   * @api
   */
  play (options) {
    this.delay_ = (Math.sign(options.delay) > 0) ? options.delay : constants.DEFAULT_DELAY;
    this.periodDelay_ = (Math.sign(options.periodDelay) > 0) ? options.periodDelay : 2 * constants.DEFAULT_DELAY;
    this.get('map').set('playing', true);
  }

  /**
   *
   * @private
   */
  animate_ () {
    if (this.get('map').get('playing')) {
      if (this.renderComplete_) {
        this.waitingRender_ = 0;
        this.next();
        timeout(this.animate_.bind(this), this.delay_);
      } else {
        this.waitingRender_ = Date.now();
      }
    }
  }

  getNextTime () {
    const time = this.config_.time;
    const numTimes = this.times_.length;
    let timeIndex = 0;
    for (let i = 0; i < numTimes; i++) {
      if (this.times_[i] > time) {
        timeIndex = i;
        break;
      }
    }
    return this.times_[timeIndex];
  }

  /**
   *
   */
  next () {
    if (!this.isReady_()) {
      return;
    }
    this.get('map').set('time', this.getNextTime());
  }

  getPrevTime () {
    const time = this.config_.time;
    const numTimes = this.times_.length;
    let timeIndex = numTimes - 1;
    for (let i = 0; i < numTimes; i++) {
      if (this.times_[i] < time) {
        timeIndex = i;
      } else {
        break;
      }
    }
    return this.times_[timeIndex];
  }

  /**
   *
   */
  previous () {
    if (!this.isReady_()) {
      return;
    }
    this.get('map').set('time', this.getPrevTime());
  }

  /**
   *
   * @returns {boolean}
   * @private
   */
  isReady_ () {
    return (this.get('map') != null) && (this.times_.length > 0);
  }

  /**
   *
   * @api
   */
  stop () {
    this.get('map').set('playing', false);
  }

  /**
   *
   * @api
   */
  destroy () {
    unByKey(this.playingListener_);
    unByKey(this.nextListener_);
    unByKey(this.previousListener_);
    unByKey(this.timeListener);
    this.timeSlider_.destroy();
  }

  /**
   *
   * @param coordinate
   * @param source
   * @param destination
   * @returns {import("./coordinate.js").Coordinate}
   */
  static transform (coordinate, source, destination) {
    proj4.defs('EPSG:3067', '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
    register(proj4);
    return transform(coordinate, source, destination);
  }
}

export default MetOClient;
