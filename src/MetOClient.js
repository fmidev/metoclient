/**
 * @module ol/metoclient/MetOClient
 */
import { assign } from 'ol/obj';
import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4/dist/proj4.js';
import { transform } from 'ol/proj';
import { parseTimes, updateSourceTime, getSourceCapabilitiesUrl } from './util.js';
import BaseObject from 'ol/Object';
import TimeSlider from './TimeSlider';
import LayerCreator from './LayerCreator';
import SourceUpdater from './SourceUpdater';
import CapabilitiesReader from './CapabilitiesReader';
import { unByKey } from 'ol/Observable';
import * as constants from './constants';
import { DateTime, Duration } from 'luxon';
import ajax from 'can-ajax';
import Map from 'ol/Map';
import View from 'ol/View';
import Collection from 'ol/Collection';
import Url from 'domurl';
import LayerSwitcher from 'ol-layerswitcher';
import Zoom from 'ol/control/Zoom';
import FullScreen from 'ol/control/FullScreen';
import DoubleClickZoom from 'ol/interaction/DoubleClickZoom';
import DragPan from 'ol/interaction/DragPan';
import PinchZoom from 'ol/interaction/PinchZoom';
import KeyboardPan from 'ol/interaction/KeyboardPan';
import KeyboardZoom from 'ol/interaction/KeyboardZoom';
import MouseWheelZoom from 'ol/interaction/MouseWheelZoom';
import Style from 'ol/style/Style';
import ElementVisibilityWatcher from 'element-visibility-watcher';
import olms from 'ol-mapbox-style';

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
    this.config_ = assign({}, constants.DEFAULT_OPTIONS, options);
    if ((options.target == null) && (options.container != null)) {
      this.config_.target = options.container;
    }
    this.set('options', options, true);
    this.set('map', null);
    this.set('timeSlider', null);
    this.vectorConfig_ = null;
    this.status_ = {};
    this.delay_ = ((options.refreshInterval != null) && (options.refreshInterval <= Number.MAX_SAFE_INTEGER) && (options.refreshInterval >= 0)) ? options.refreshInterval : constants.DEFAULT_DELAY;
    this.periodDelay_ = 2 * constants.DEFAULT_DELAY;
    this.times_ = [];
    this.playingListener_ = null;
    this.nextListener_ = null;
    this.previousListener_ = null;
    this.timeListener_ = null;
    this.renderComplete_ = false;
    this.updateNeeded_ = false;
    this.waitingRender_ = 0;
    this.refreshInterval_ = options.refreshInterval ? Math.min(Duration.fromISO(options.refreshInterval).valueOf(), constants.MAX_REFRESH_INTERVAL) : constants.DEFAULT_REFRESH_INTERVAL;
    this.capabilities_ = {};
    this.legends_ = {};
    this.selectedLegend_ = constants.DEFAULT_LEGEND;
    this.layerSwitcherWatcher = null;
    this.delayLoop_ = this.config_.metadata.tags.includes(constants.TAG_DELAY_LOOP);
    this.refreshTimer_ = null;
    this.animationTimeout_ = null;
    this.layerListeners_ = [];
    this.sourceListeners_ = [];
    this.optionsListener_ = this.on('change:options', (event) => {
      this.config_ = assign({}, constants.DEFAULT_OPTIONS, this.get('options'));
      this.refresh_();
    });
  }

  getVectorConfig_ () {
    return this.vectorConfig_ = this.config_.layers.reduce((vectorConfig, layer) => {
      const source = this.config_.sources[layer.source];
      if ((source != null) && (layer.url == null) && (['geojson', 'vector', 'raster'].includes(source.type))) {
        vectorConfig.layers.push(layer);
        if (vectorConfig.sources[layer.source] == null) {
          vectorConfig.sources[layer.source] = source;
        }
      }
      return vectorConfig;
    }, {
      version: 8,
      sources: {},
      layers: []
    });
  }

  /**
   *
   * @returns {Promise<void>}
   */
  render () {
    return this.updateCapabilities_().then(() => {
      this.clear_();
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
      if (this.config_.time == null) {
        this.config_.time = Date.now();
      }
      Object.keys(this.config_.sources).forEach(source => {
        if ((this.config_.sources[source].times != null) && (this.config_.sources[source].times.length > 0)) {
          this.config_.sources[source].tiles = updateSourceTime(this.config_.sources[source].tiles, this.config_.sources[source].times.includes(defaultTime) ? defaultTime : this.config_.sources[source].times[0]);
        }
      });
      this.vectorConfig_ = this.getVectorConfig_();
      return this.updateMap_();
    }).catch(error => {
      console.log(error);
    });
  }

  /**
   *
   */
  refresh_ () {
    const map = this.get('map');
    if (map != null) {
      let layers = map.getLayers().getArray();
      layers.forEach((layer) => {
        let source = layer.getSource();
        let time = source.get(constants.SOURCE_TIME);
        if (time != null) {
          source.set(constants.SOURCE_TIME, null);
        }
        const id = layer.get('id');
        if ((id != null) && (!id.startsWith('metoclient:'))) {
          const config = this.config_.layers.find(layerConfig => layerConfig.id === layer.get('metoclient:id'));
          if (config != null) {
            config.visibility = (layer.getVisible() ? constants.VISIBLE : constants.NOT_VISIBLE);
          }
        }
      });
      const view = map.getView();
      if (view != null) {
        this.config_.center = view.getCenter();
        this.config_.zoom = view.getZoom();
        this.config_.rotation = view.getRotation();
      }
    }
    this.render();
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async updateCapabilities_ () {
    const updateTime = Date.now();
    const responses = await Promise.all(Object.entries(this.config_.layers.reduce((capabilities, layer) => {
      if (layer.source == null) {
        return capabilities;
      }
      const sourceIds = [layer.source];
      let timeData;
      if (layer.time != null) {
        if ((layer.time.source != null) && (!sourceIds.includes(layer.time.source))) {
          sourceIds.push(layer.time.source);
        }
        if (layer.time.range != null) {
          timeData = parseTimes(layer.time.range);
        }
      }
      sourceIds.forEach(sourceId => {
        const source = this.config_.sources[sourceId];
        if (source == null) {
          return;
        }
        const url = getSourceCapabilitiesUrl(source);
        if (url.length === 0) {
          return;
        }
        const index = url.lastIndexOf('/');
        let type = '';
        if ((url.toLowerCase().startsWith('http')) && (index >= 0)) {
          type = url.substring(index + 1).toLowerCase();
        } else {
          type = layer.url.service.toLowerCase();
        }
        if (capabilities[url] == null) {
          capabilities[url] = {
            updated: updateTime,
            type,
            server: source.server != null ? source.server.toLowerCase() : null,
            data: null,
            startTime: Number.POSITIVE_INFINITY,
            endTime: Number.NEGATIVE_INFINITY,
          };
        }
        if ((timeData != null) && (timeData.length > 0)) {
          if (timeData[0] < capabilities[url].startTime) {
            capabilities[url].startTime = timeData[0];
          }
          const maxTimeIndex = timeData.length - 1;
          if (timeData[maxTimeIndex] > capabilities[url].endTime) {
            capabilities[url].endTime = timeData[maxTimeIndex];
          }
        }
      });
      return capabilities;
    }, {})).map(capabKeyValue => {
      this.capabilities_[capabKeyValue[0]] = capabKeyValue[1];
      const type = capabKeyValue[1].type;
      const url = ['startTime', 'endTime'].reduce((accQuery, timeParam) => {
        if ((type === 'wms') && (capabKeyValue[1].server === constants.SMARTMET_SERVER)) {
          const timeISO = DateTime.fromMillis(capabKeyValue[1][timeParam]).toUTC().toISO({
            suppressMilliseconds: true,
            includeOffset: true
          });
          if (timeISO != null) {
            accQuery += '&' + timeParam.toLowerCase() + '=' + timeISO;
          }
        }
        return accQuery;
      }, `${capabKeyValue[0]}?service=${type}`) + `&${constants.GET_CAPABILITIES_QUERY}`;
      return ajax({
        url,
        crossDomain: true,
        contentType: 'text/plain',
        beforeSend: function (jqxhr) {
          jqxhr.requestURL = url;
        }
      });
    }));
    await Promise.all(responses.map(response => {
      if ((response.responseText != null) && (response.requestURL.endsWith(constants.GET_CAPABILITIES_QUERY))) {
        let capabKey = response.requestURL.split('?')[0];
        const capabKeyParts = capabKey.split('/');
        let localCapabKey = '';
        if (capabKeyParts.length > 0) {
          localCapabKey = capabKeyParts[capabKeyParts.length - 1];
        }
        if ((localCapabKey.length > 0) && (this.capabilities_[localCapabKey] != null)) {
          capabKey = localCapabKey;
        }
        if (typeof CapabilitiesReader[this.capabilities_[capabKey].type] === 'function') {
          this.capabilities_[capabKey].data = CapabilitiesReader[this.capabilities_[capabKey].type](response.responseText);
        }
      }
    }));
    Object.keys(this.capabilities_).forEach(capabilitiesKey => {
      if ((this.capabilities_[capabilitiesKey] != null) && (this.capabilities_[capabilitiesKey].updated < updateTime)) {
        delete this.capabilities_[capabilitiesKey];
      }
    });
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
    if (source.type === 'OSM') {
      return true;
    }
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

  isAnimationLayer_ (layer) {
    return (layer.get('times') != null) && (!layer.get('id').startsWith('metoclient:'));
  }

  getLayerType_(layer) {
    if (this.isTiledLayer_(layer)) {
      return 'tiled';
    }
    if ((layer.type != null) && (layer.type !== 'raster')) {
      return layer.type;
    }
    return 'image';
  }

  createLayer_ (layerConfig, time = this.config_.time, postfix = '') {
    const layerType = this.getLayerType_(layerConfig);
    if (LayerCreator[layerType] == null) {
      return null;
    }
    const source = this.config_.sources[layerConfig.source];
    const timeDefined = (layerConfig.time != null) && (layerConfig.time.data != null);
    const postfixDefined = (postfix.length > 0);
    if (postfixDefined && !timeDefined) {
      return null;
    }
    let options = { ...this.config_ };
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
    const tiles = source.tiles != null ? source.tiles[0] : null;
    const url = ((source.capabilities != null) && (source.capabilities.length > 0)) ? source.capabilities : tiles;
    const layer = LayerCreator[layerType](layerConfig, options, url != null ? this.capabilities_[url] : null);
    if (layer != null) {
      this.layerListeners_.push(layer.on('change:visible', event => {
        const visible = layer.getVisible();
        ['previous', 'next'].forEach(relative => {
          this.setRelativesVisible_(layer, relative, visible);
          const previousLayer = layer.get('metoclient:previous');
          if (previousLayer != null) {
            previousLayer.setVisible(visible);
          }
          const nextLayer = layer.get('metoclient:next');
          if (nextLayer != null) {
            nextLayer.setVisible(visible);
          }
        });
        if (this.isAnimationLayer_(layer)) {
          if (!this.isVisibleTime_(this.config_.time)) {
            const nextTime = this.getNextTime_();
            const prevTime = this.getPrevTime_();
            const newTime = (Math.abs(nextTime - this.config_.time) < Math.abs(this.config_.time - prevTime)) ? nextTime : prevTime;
            if (newTime != null) {
              this.get('map').set('time', newTime);
            }
          }
          this.updateTimeSlider_();
        }
      }));
      if (timeDefined) {
        layer.set('times', layerConfig.time.data);
      }
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
    const nextLayerId = (layerConfig.next != null) ? layerConfig.next : [this.config_.layers.find(layer => layer.previous === layerConfig.id)].map(l => l == null ? null : l.id)[0];
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
    const baseMapConfigs = this.config_.layers.filter(layerConfig => (layerConfig != null) && (layerConfig.metadata != null) && (layerConfig.metadata.type != null) && (layerConfig.metadata.type.toLowerCase() === constants.BASE_MAP));
    const lastVisibleBaseMapIndex = baseMapConfigs.reduce((prevVisibleBaseMapIndex, baseMapConfig, index) => ((baseMapConfig.visible === constants.VISIBLE) ? index : prevVisibleBaseMapIndex), baseMapConfigs.length - 1);
    baseMapConfigs.forEach((baseMapConfig, index) => {
      baseMapConfig.visible = (index === lastVisibleBaseMapIndex) ? constants.VISIBLE : constants.NOT_VISIBLE;
    });
    let layers = new Collection(this.config_.layers.map(layerConfig => {
      if ((layerConfig.time != null) && (layerConfig.metadata != null) && (layerConfig.metadata.title != null)) {
        layerConfig.legendTitle = layerConfig.metadata.title;
      }
      return layerConfig;
    }).reduce((olLayers, layerConfig) => {
      if ((layerConfig.time != null) && ((layerConfig.previous == null) || (layerConfig.previous.length === 0)) && (layerConfig.metadata != null) && (layerConfig.metadata.title != null)) {
        layerConfig.metadata.title = this.createLayerSwitcherTitle_(layerConfig);
      }
      if (layerConfig.url != null) {
        layerConfig.url = Object.keys(layerConfig.url).reduce((lowerCased, key) => {
          lowerCased[key.toLowerCase()] = layerConfig.url[key];
          return lowerCased;
        }, {});
      }
      if ((layerConfig.source == null) || ((layerConfig.url != null) && ((typeof layerConfig.url.service !== 'string') || (layerConfig.url.service.length === 0)))) {
        return olLayers;
      }
      if ((baseMapConfigs.length === 1) && (layerConfig.metadata != null) && (layerConfig.metadata.type != null) && (layerConfig.metadata.type.toLowerCase() === constants.BASE_MAP)) {
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

  /**
   *
   * @param time
   * @returns {boolean}
   * @private
   */
  isVisibleTime_ (time) {
    return this.get('map').getLayers().getArray().some(layer => ((layer.getVisible()) && (layer.get('times') != null) && (layer.get('times').includes(time))));
  }

  /**
   *
   * @private
   */
  updateTimeSlider_ () {
    this.get('timeSlider').updateTimeLoaderVis(this.times_.map(time => ({
      endTime: time,
      status: this.status_[time],
      active: this.isVisibleTime_(time)
    })));
  }

  currentTimeRendered_ (event) {
    let map = this.get('map');
    if (map == null) {
      return;
    }
    let layers = map.getLayers().getArray().filter(layer => layer.get('mapbox-source') == null);
    layers.forEach(layer => {
      const times = layer.get('times');
      let visible = ((times == null) || (!Array.isArray(times)) || (times.length === 0));
      if (!visible) {
        let source = layer.getSource();
        const visibleTime = this.getVisibleTime_(layer);
        if (source.get('metoclient:time') === visibleTime) {
          visible = true;
          const prevLayerId = layer.get('previous');
          const prevLayer = ((prevLayerId != null) && (prevLayerId.length > 0)) ? layers.find(l => l.get('id') === prevLayerId) : null;
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
    this.updateTimeSlider_();
    if (this.updateNeeded_) {
      this.updateNeeded_ = false;
      this.renderComplete_ = true;
      this.timeUpdated_();
    } else if (this.config_.time != null) {
      const prevTime = this.getPrevTime_();
      const nextTime = this.getNextTime_();
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
          clearTimeout(this.animationTimeout_);
          this.animationTimeout_ = setTimeout(this.animate_.bind(this), Math.max(this.delay_ - (Date.now() - this.waitingRender_), 0));
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
   * @param layer
   * @returns {any}
   * @private
   */
  getVisibleTime_ (layer) {
    let visibleTime = null;
    const layerTimes = layer.get('times');
    if ((layerTimes != null) && (Array.isArray(layerTimes)) && (layerTimes.length > 0) && (this.config_.time >= layerTimes[0])) {
      layerTimes.some(time => {
        const notHistory = (time >= this.config_.time);
        if (notHistory) {
          visibleTime = time;
        }
        return notHistory;
      });
    }
    return visibleTime;
  }

  getFeatureLayerTime_ (featureLayer) {
    let mapTime = this.get('map').get('time');
    const layerTimes = featureLayer.get('times');
    const hideAll = (mapTime < layerTimes[0]) || (mapTime > layerTimes[layerTimes.length - 1]);
    const layerTime = hideAll ? null : [...layerTimes].reverse().find((time) => time <= mapTime);
    return layerTime;
  }


  /**
   *
   * @private
   */
  timeUpdated_ () {
    const map = this.get('map');
    let mapTime = map.get('time');
    const layers = map.getLayers().getArray();
    layers.filter((layer) => layer.get('mapbox-source') != null && layer.get('times') != null).forEach((featureLayer) => {
      const layerTime = this.getFeatureLayerTime_(featureLayer);
      featureLayer.getSource().getFeatures().forEach((feature) => {
        if ((layerTime == null) || (feature.get('metoclient:time') !== layerTime)) {
          feature.setStyle(new Style({}));
        } else {
          feature.setStyle(null);
        }
      });
    });
    if (!this.renderComplete_) {
      if (this.status_[mapTime] !== constants.STATUS_SUCCESS) {
        this.status_[mapTime] = constants.STATUS_WORKING;
        this.updateTimeSlider_();
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
    this.updateTimeSlider_();
    layers.filter(layer => layer.get('mapbox-source') == null).filter(layer => {
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
      let visibleTime = this.getVisibleTime_(layer);
      if (source.get('metoclient:time') === visibleTime) {
        let prevLayer = layer.get('metoclient:previous');
        if (prevLayer != null) {
          this.hideLayer_(prevLayer);
        } else {
          this.status_[this.config_.time] = constants.STATUS_SUCCESS;
          this.updateTimeSlider_();
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
          if ((prevSource != null) && (prevSource.get('metoclient:time') === visibleTime)) {
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
            if (nextSource.get('metoclient:time') === visibleTime) {
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
            SourceUpdater[nextSource.constructor.name](nextSource, visibleTime);
            return;
          }
        }
        SourceUpdater[source.constructor.name](source, this.config_.time);
      }
    });
    this.renderComplete_ = false;
    if (map.getLayers().getLength() > 0) {
      map.renderSync();
    }
  }

  /**
   *
   * @private
   */
  createTimeListener_ () {
    this.timeListener_ = this.get('map').on('change:time', this.timeUpdated_.bind(this));
  }

  getLayerSwitcherPanel_ () {
    return document.querySelector('div#' + constants.LAYER_SWITCHER_CONTAINER_ID + ' div.panel');
  }

  isLayerSwitcherVisible_ () {
    const layerSwitcher = this.getLayerSwitcher_()
    if (layerSwitcher == null) {
      return null
    }
    return document.getElementById(constants.LAYER_SWITCHER_CONTAINER_ID).classList.contains(layerSwitcher.shownClassName);
  }

  /**
   *
   * @private
   */
  createLegendChooser_() {
    const layerSwitcherPanel = this.getLayerSwitcherPanel_();
    if (layerSwitcherPanel == null) {
      return;
    }
    let legendChooserContainer = document.getElementById(constants.LEGEND_CHOOSER_CONTAINER_ID);
    if (legendChooserContainer != null) {
      return;
    }
    legendChooserContainer = document.createElement('div');
    legendChooserContainer.setAttribute('id', constants.LEGEND_CHOOSER_CONTAINER_ID);

    const legendSelectLabel = document.createElement('label');
    legendSelectLabel.setAttribute('id', constants.LEGEND_CHOOSER_LABEL_ID);
    legendSelectLabel.setAttribute('for', constants.LEGEND_CHOOSER_SELECT_ID);
    legendSelectLabel.innerHTML = this.config_.texts['Legend'];
    legendChooserContainer.appendChild(legendSelectLabel);

    const legendSelect = document.createElement('select');
    legendSelect.setAttribute('id', constants.LEGEND_CHOOSER_SELECT_ID);
    Object.keys(this.legends_).forEach((key) => {
      const legendOption = document.createElement('option');
      legendOption.value = key;
      legendOption.text = this.legends_[key].title;
      legendSelect.appendChild(legendOption);
    });
    legendSelect.value = this.selectedLegend_;
    legendSelect.addEventListener('change', (event) => {
      const selectedOption = legendSelect.options[legendSelect.selectedIndex];
      this.selectedLegend_ = selectedOption.value;
      const legendContainer = document.getElementById(constants.LEGEND_CONTAINER_ID);
      if (legendContainer != null) {
        while (legendContainer.firstChild) {
          legendContainer.removeChild(legendContainer.firstChild);
        }
        const url = this.legends_[selectedOption.value].url;
        if ((url != null) && (url.length > 0)) {
          const legendFigure = document.createElement('figure');
          const legendCaption = document.createElement('figcaption');
          legendCaption.innerHTML = selectedOption.text;
          legendFigure.appendChild(legendCaption);
          const legendImage = document.createElement('img');
          legendImage.setAttribute('src', url);
          legendFigure.appendChild(legendImage);
          legendContainer.appendChild(legendFigure);
        }
      }
    });
    legendChooserContainer.appendChild(legendSelect);
    layerSwitcherPanel.appendChild(legendChooserContainer);
    const layerList = layerSwitcherPanel.querySelector('ul');
    if (layerList != null) {
      layerList.addEventListener('change', (event) => {
        this.createLegendChooser_();
      });
    }
  }

  /**
   *
   * @private
   */
  createLayerSwitcherWatcher_() {
    if (this.layerSwitcherWatcher != null) {
      return;
    }
    const layerSwitcherPanel = this.getLayerSwitcherPanel_();
      // A workaround for https://github.com/walkermatt/ol-layerswitcher/issues/209
    if (layerSwitcherPanel != null) {
      this.layerSwitcherWatcher = new ElementVisibilityWatcher();
      this.layerSwitcherWatcher.watch(layerSwitcherPanel, (visible) => {
        if (visible) {
          this.createLegendChooser_();
        }
      });
    }
  }

  /**
   *
   * @private
   */
  createLegendContainer_ () {
    let mapContainer = document.getElementById(this.config_.target);
    if (mapContainer != null) {
      let legendContainer = document.createElement('div');
      legendContainer.setAttribute('id', constants.LEGEND_CONTAINER_ID);
      mapContainer.appendChild(legendContainer);
    }
  }

  /**
   *
   */
  createLegends_() {
    const map = this.get('map');
    if (map == null) {
      return;
    }
    const view = map.getView();
    if (view == null) {
      return;
    }
    // Todo: support resolutions
    // const resolution = view.getResolution();
    const layers = map.getLayers();
    this.legends_ = layers
      .getArray()
      .filter(layer => this.isAnimationLayer_(layer))
      .reduce((legendArray, layer) => {
        const source = layer.getSource();
        if (source != null) {
          let legendUrl = layer.get('legendUrl');
          if ((legendUrl != null) && (legendUrl.length > 0)) {
            legendArray[layer.get('id')] = {
              'title': layer.get('legendTitle'),
              'url': legendUrl
            }
          }
        }
        return legendArray;
    }, {
      [constants.DEFAULT_LEGEND]: {
        title: '',
        url: null
      }
    });
    if (Object.entries(this.legends_).length > 1) {
      this.createLegendContainer_();
      this.createLayerSwitcherWatcher_();
    }
  }

  initMap_ (map) {
    this.set('map', map);
    map.addControl(new LayerSwitcher({
      tipLabel: this.config_.texts['Layer Switcher']
    }));
    const layerSwitcherContainer = document.querySelector('div#' + this.config_.target + ' div.layer-switcher');
    if (layerSwitcherContainer != null) {
      layerSwitcherContainer.setAttribute('id', constants.LAYER_SWITCHER_CONTAINER_ID);
      // https://github.com/walkermatt/ol-layerswitcher/issues/39
      const layerSwitcherButton = layerSwitcherContainer.querySelector('button');
      if (layerSwitcherButton != null) {
        layerSwitcherButton.onmouseover = () => {};
        layerSwitcherButton.onclick = () => {
          const layerSwitcher = this.getLayerSwitcher_()
          if (this.isLayerSwitcherVisible_()) {
            layerSwitcher.hidePanel()
          } else {
            layerSwitcher.showPanel()
          }
        };
      }
      const layerSwitcherPanel = this.getLayerSwitcherPanel_();
      if (layerSwitcherPanel != null) {
        layerSwitcherPanel.onmouseout = () => {};
      }
    }
    this.createLegends_();
    this.renderComplete_ = true;
    this.get('timeSlider').createTimeSlider(this.times_);
    this.playingListener_ = this.get('map').on('change:playing', evt => {
      if (this.get('map').get('playing')) {
        this.animate_();
      }
    });
    this.createTimeListener_();
    this.nextListener_ = this.get('map').on('next', evt => {
      this.next();
    });
    this.previousListener_ = this.get('map').on('previous', evt => {
      this.previous();
    });
    map.set('time', this.config_.time);
    this.refreshTimer_ = setInterval(this.refresh_.bind(this), this.refreshInterval_);
    return map;
  }

  addTimes_ (times) {
    if ((times != null) && (Array.isArray(times)) && times.length > 0) {
      this.times_ = [...new Set([...this.times_, ...times])].sort();
    }
  }

  createVectorLayers_ (map, vectorConfig) {
    return olms(map, vectorConfig).then((updatedMap) => {
      if (vectorConfig.layers != null) {
        updatedMap.getLayers().getArray().filter(layer => layer.get('mapbox-source') != null).forEach((layer) => {
          let layerConfig;
          let layerTimes = [];
          let timeProperty;
          const mapboxLayers = layer.get('mapbox-layers');
          if (mapboxLayers != null) {
            layer.set('id', mapboxLayers.join('-'));
            let title = mapboxLayers.reduce((layerTitle, layerId) => {
              layerConfig = vectorConfig.layers.find(layer => layer.id === layerId);
              if ((layerConfig.metadata != null) && (layerConfig.metadata.title != null) && (layerConfig.metadata.title.length > 0)) {
                if (layerTitle.length > 0) {
                  layerTitle += ' / ';
                }
                layerTitle += layerConfig.metadata.title;
                timeProperty = layerConfig.metadata.timeProperty;
              }
              return layerTitle;
            }, '');
            if ((title != null) && (title.length > 0)) {
              layer.set('title', title);
            }
          }
          const source = layer.getSource();
          const updateTimes = () => {
            if (layerConfig != null) {
              if (layerConfig.time == null) {
                layerConfig.time = {};
              }
              layerConfig.time.data = layerTimes;
              layer.set('times', layerConfig.time.data);
            }
            this.addTimes_(layerTimes);
          }
          const initFeature = (feature) => {
            if ((timeProperty != null) && (timeProperty.length > 0)) {
              const time = feature.get(timeProperty);
              if ((time != null) && (time.length > 0)) {
                const parsedTime = DateTime.fromISO(time).valueOf();
                if ((typeof parsedTime === 'number') && (!Number.isNaN(parsedTime))) {
                  feature.set('metoclient:time', parsedTime);
                  const numLayerTimes = layerTimes.length;
                  for (let i = 0; i <= numLayerTimes; i += 1) {
                    if (i === numLayerTimes) {
                      layerTimes.push(parsedTime);
                      updateTimes();
                    } else if (layerTimes[i] === parsedTime) {
                      break;
                    } else if (layerTimes[i] > parsedTime) {
                      layerTimes.splice(i, 0, parsedTime);
                      updateTimes();
                      break;
                    }
                  }
                  const layerTime = this.getFeatureLayerTime_(layer);
                  if ((layerTime == null) || (parsedTime !== layerTime)) {
                    feature.setStyle(new Style({}));
                  } else {
                    feature.setStyle(null);
                  }
                }
              }
            }
          };
          this.sourceListeners_.push(source.on('addfeature', event => {
            initFeature(event.feature);
          }));
          if (((timeProperty != null) && (timeProperty.length > 0))) {
            source.getFeatures().forEach((feature) => {
              initFeature(feature);
            });
          }
        });
        if ((this.config_.time == null) && (this.times_.length > 0)) {
          this.config_.time = this.times_[0];
        }
      }
      return updatedMap;
    });
  }

  /**
   *
   */
  createInteractions_ () {
    if (this.config_.metadata.tags.includes(constants.TAG_NO_INTERACTIONS)) {
      return [];
    } else if (this.config_.metadata.tags.includes(constants.TAG_MOUSE_WHEEL_INTERACTIONS)) {
      return [
        new DoubleClickZoom(),
        new DragPan(),
        new PinchZoom(),
        new KeyboardPan(),
        new KeyboardZoom(),
        new MouseWheelZoom()
      ];
    } else {
      return [
        new DoubleClickZoom(),
        new DragPan(),
        new PinchZoom(),
        new KeyboardPan(),
        new KeyboardZoom()
      ];
    }
  }

  /**
   *
   * @private
   */
  createMap_ () {
    const interactions = this.createInteractions_();
    this.set('timeSlider', new TimeSlider({
      locale: 'fi-FI',
      showTimeSlider: true,
      timeZone: this.config_.timeZone,
      timeZoneLabel: this.config_.timeZoneLabel,
      enableMouseWheel: this.config_.metadata.tags.includes(constants.TAG_MOUSE_WHEEL_INTERACTIONS),
      meteorologicalMode: !this.config_.metadata.tags.includes(constants.TAG_INSTANT_TIMESLIDER)
    }));
    let controls = [
      new Zoom({
        zoomInTipLabel: this.config_.texts['Zoom In'],
        zoomOutTipLabel: this.config_.texts['Zoom Out'],
      }),
      this.get('timeSlider'),
    ];
    if (this.config_.metadata.tags.includes(constants.TAG_FULL_SCREEN_CONTROL)) {
      controls.push(new FullScreen({
        label: this.config_.texts['Fullscreen Label'],
        labelActive: this.config_.texts['Fullscreen Label Active'],
        tipLabel: this.config_.texts['Fullscreen Tip Label'],
      }));
    }
    let newMap = new Map({
      target: this.config_.target,
      layers: this.createLayers_(),
      view: this.createView_(),
      controls,
      interactions
    });
    if (this.vectorConfig_.layers.length > 0) {
      return this.createVectorLayers_(newMap, this.vectorConfig_).then((map) => this.initMap_(map));
    }
    return new Promise((resolve) => {
      resolve(this.initMap_(newMap));
    });
  }

  /**
   *
   * @private
   */
  updateMap_ () {
    let map = this.get('map');
    if (map == null) {
      return this.createMap_();
    }
    map.setTarget(this.config_.target);
    map.getLayerGroup().setLayers(this.createLayers_().extend(map
      .getLayers()
      .getArray()
      .filter((layer) => layer.get('metoclient:id') == null)));
    map.setView(this.createView_());
    map.set('time', this.config_.time);
    this.createTimeListener_();
    if (this.vectorConfig_.layers.length > 0) {
      return this.createVectorLayers_(map, this.vectorConfig_).then((updatedMap) => {
        this.timeUpdated_();
        return updatedMap;
      });
    }
    return new Promise((resolve) => {
      this.timeUpdated_();
      resolve(map);
    });
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
        const source = (layer.time.source != null) ? this.config_.sources[layer.time.source] : this.config_.sources[layer.source];
        const capabilities = this.capabilities_[source.tiles[0]]; // Generalize
        if ((capabilities == null) || (capabilities.data == null) || (capabilities.data.Capability == null) || (capabilities.data.Capability.Layer == null) || (capabilities.data.Capability.Layer.Layer == null)) {
          return;
        }
        const layerElement = capabilities.data.Capability.Layer.Layer.find(element => [layer.url.layer, layer.url.layers].includes(element.Name));
        const data = (layerElement != null) ? layerElement.Dimension.find(element => element.name.toLowerCase() === 'time').values : [];
        const parsedData = parseTimes(data);
        const times = parseTimes(layer.time.range, layer.time.offset, parsedData);
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
        this.addTimes_(layer.time.data);
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
        clearTimeout(this.animationTimeout_);
        this.waitingRender_ = 0;
        this.next();
        this.animationTimeout_ = setTimeout(this.animate_.bind(this), this.delay_);
      } else {
        this.waitingRender_ = Date.now();
      }
    }
  }

  /**
   *
   * @returns {*}
   * @private
   */
  getNextTime_ () {
    const time = this.config_.time;
    const numTimes = this.times_.length;
    let timeIndex;
    for (let i = 0; i < numTimes; i++) {
      if (this.isVisibleTime_(this.times_[i])) {
        if (this.times_[i] > time) {
          timeIndex = i;
          break;
        }
        if (timeIndex == null) {
          timeIndex = i;
        }
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
    const map = this.get('map');
    const currentTime = map.get('time');
    const nextTime = this.getNextTime_();
    if ((!this.delayLoop_) || (currentTime == null) || (currentTime < nextTime)) {
      map.set('time', nextTime);
      this.delayLoop_ = this.config_.metadata.tags.includes(constants.TAG_DELAY_LOOP);
    } else {
      this.delayLoop_ = false;
    }
  }

  /**
   *
   * @returns {*}
   * @private
   */
  getPrevTime_ () {
    const time = this.config_.time;
    const lastTimeIndex = this.times_.length - 1;
    let timeIndex;
    for (let i = lastTimeIndex; i >= 0; i--) {
      if (this.isVisibleTime_(this.times_[i])) {
        if (this.times_[i] < time) {
          timeIndex = i;
          break;
        }
        if (timeIndex == null) {
          timeIndex = i;
        }
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
    this.get('map').set('time', this.getPrevTime_());
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
  pause () {
    this.get('map').set('playing', false);
  }


  stop () {
    this.pause();
  }

  clear_ () {
    unByKey(this.playingListener_);
    unByKey(this.nextListener_);
    unByKey(this.previousListener_);
    unByKey(this.timeListener_);
    unByKey(this.layerListeners_);
    unByKey(this.sourceListeners_);
  }

  /**
   *
   * @api
   */
  destroy () {
    this.clear();
    unByKey(this.optionsListener_);
    clearInterval(this.refreshTimer_);
    clearTimeout(this.animationTimeout_);
    this.get('timeSlider').destroy();
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
