/**
 * @module ol/metoclient/MetOClient
 */
import { assign } from 'ol/obj';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4/dist/proj4';
import olms from 'ol-mapbox-style';
import { transform, get as getProjection } from 'ol/proj';
import ElementVisibilityWatcher from 'element-visibility-watcher';
import BaseObject from 'ol/Object';
import { unByKey } from 'ol/Observable';
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
import { getWidth } from 'ol/extent';
import elementResizeDetectorMaker from 'element-resize-detector';
import {
  isNumeric,
  parseTimes,
  updateSourceTime,
  getSourceCapabilitiesUrl,
} from './utils';
import * as constants from './constants';
import CapabilitiesReader from './CapabilitiesReader';
import SourceUpdater from './SourceUpdater';
import LayerCreator from './LayerCreator';
import TimeSlider from './TimeSlider';

/**
 * @classdesc
 */
export class MetOClient extends BaseObject {
  /**
   * @param {object} options Map options.
   */
  constructor(options = {}) {
    super();
    proj4.defs(
      'EPSG:3067',
      '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    );
    proj4.defs(
      'EPSG:3035',
      '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs'
    );
    proj4.defs(
      'EPSG:3395',
      '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
    );
    register(proj4);
    this.set('options', options, true);
    this.postProcessOptions();
    this.set('map', null);
    this.set('timeSlider', null);
    this.vectorConfig_ = null;
    this.status_ = {};
    this.resolutionOnEnterFullScreen_ = null;
    this.delay_ =
      this.config_.transition != null &&
      this.config_.transition.delay != null &&
      this.config_.transition.delay <= Number.MAX_SAFE_INTEGER &&
      this.config_.transition.delay >= 0
        ? this.config_.transition.delay
        : constants.DEFAULT_DELAY;
    this.periodDelay_ = this.config_.periodDelay;
    this.times_ = [];
    this.playingListener_ = null;
    this.previousListener_ = null;
    this.timeListener_ = null;
    this.visibilityListener_ = null;
    this.renderComplete_ = false;
    this.updateNeeded_ = false;
    this.waitingRender_ = 0;
    this.refreshInterval_ = options.refreshInterval
      ? Math.min(
          Duration.fromISO(options.refreshInterval).valueOf(),
          constants.MAX_REFRESH_INTERVAL
        )
      : constants.DEFAULT_REFRESH_INTERVAL;
    this.extent_ = [null, null, null, null];
    this.resizeDetector_ = elementResizeDetectorMaker({
      strategy: 'scroll',
    });
    this.capabilities_ = {};
    this.legends_ = {};
    this.selectedLegend_ = constants.DEFAULT_LEGEND;
    this.layerSwitcherWatcher = null;
    this.delayLoop_ = this.config_.metadata.tags.includes(
      constants.TAG_DELAY_LOOP
    );
    this.refreshTimer_ = null;
    this.animationTimeout_ = null;
    this.layerListeners_ = [];
    this.sourceListeners_ = [];
    const mainContainer = document.getElementById(this.config_.target);
    if (mainContainer != null) {
      const customControlContainer = document.createElement('div');
      customControlContainer.id = constants.CUSTOM_CONTROL_CONTAINER_ID;
      mainContainer.append(customControlContainer);
    }
    this.optionsListener_ = this.on('change:options', (event) => {
      this.postProcessOptions();
      this.refresh_();
    });
    if (this.config_.metadata.tags.includes(constants.TAG_RENDER_IMMEDIATELY)) {
      this.render();
    }
  }

  /**
   *
   */
  postProcessOptions() {
    const options = this.get('options');
    this.config_ = assign({}, constants.DEFAULT_OPTIONS, options);
    if (this.config_.tags != null) {
      this.config_.metadata.tags = this.config_.tags;
    }
    this.config_.texts = assign(
      {},
      constants.DEFAULT_OPTIONS.texts,
      options?.texts?.[this.config_.locale] ?? options.texts
    );
    this.config_.transition = assign(
      {},
      constants.DEFAULT_OPTIONS.transition,
      options.transition
    );
    if (options.target == null && options.container != null) {
      this.config_.target = this.config_.container;
    }
    if (this.config_.resolutions == null) {
      if (constants.PROJECTION_RESOLUTIONS[this.config_.projection] != null) {
        this.config_.resolutions =
          constants.PROJECTION_RESOLUTIONS[this.config_.projection];
      } else {
        const projExtent = getProjection(this.config_.projection).getExtent();
        const startResolution = getWidth(projExtent) / 256;
        const numResolutions = this.config_.maxZoom - this.config_.minZoom + 1;
        const resolutions = new Array(numResolutions);
        for (let i = 0, ii = resolutions.length; i < ii; ++i) {
          resolutions[i] = startResolution / Math.pow(2, i);
        }
        this.config_.resolutions = resolutions;
      }
    }
    this.config_.layers.forEach((layer, index, layers) => {
      if (
        layer != null &&
        layer.url != null &&
        typeof layer.url.layers === 'string'
      ) {
        layers[index].url.layers = layer.url.layers.replace(/\s/g, '');
      }
    });
  }

  /**
   *
   * @param key
   * @param value
   * @param silent
   */
  set(key, value, silent) {
    const property = this.get(key);
    if (property != null && typeof property === 'object') {
      super.set(key, value, true);
      if (!silent) {
        this.dispatchEvent(`change:${key}`);
      }
    } else {
      super.set(key, value, silent);
    }
  }

  /**
   *
   * @returns {*}
   * @private
   */
  getVectorConfig_() {
    return (this.vectorConfig_ = this.config_.layers.reduce(
      (vectorConfig, layer) => {
        const source = this.config_.sources[layer.source];
        if (
          source != null &&
          layer.url == null &&
          ['geojson', 'vector', 'raster'].includes(source.type)
        ) {
          vectorConfig.layers.push(layer);
          if (vectorConfig.sources[layer.source] == null) {
            vectorConfig.sources[layer.source] = source;
          }
        }
        return vectorConfig;
      },
      {
        version: 8,
        sources: {},
        layers: [],
        sprite: this.config_.sprite,
      }
    ));
  }

  /**
   * Render the animation map based on current configuration.
   *
   * @returns {Promise<object>} Promise object representing rendered map.
   */
  render() {
    return this.updateCapabilities_()
      .then(() => {
        this.clear_();
        this.updateTimes_();
        let defaultTime = this.times_[0];
        const realWorldTime = Date.now();
        let anyFuture = false;
        this.times_.some((time) => {
          const future = time > realWorldTime;
          if (future) {
            anyFuture = true;
          } else {
            defaultTime = time;
          }
          return future;
        });
        if (!anyFuture) {
          [defaultTime] = this.times_;
        }
        if (this.config_.time == null) {
          this.config_.time = defaultTime;
        }
        Object.keys(this.config_.sources).forEach((source) => {
          if (
            this.config_.sources[source].times != null &&
            this.config_.sources[source].times.length > 0
          ) {
            this.config_.sources[source].tiles = updateSourceTime(
              this.config_.sources[source].tiles,
              this.config_.sources[source].times.includes(defaultTime)
                ? defaultTime
                : this.config_.sources[source].times[0]
            );
          }
        });
        this.vectorConfig_ = this.getVectorConfig_();
        return this.updateMap_()
          .then((map) => {
            // Limit bounds after refresh
            const visibleTimes = this.times_.reduce(
              (foundVisibleTimes, time) => {
                if (this.isVisibleTime_(time)) {
                  foundVisibleTimes.push(time);
                }
                return foundVisibleTimes;
              },
              []
            );
            if (this.config_.time < visibleTimes[0]) {
              this.config_.time = visibleTimes[0];
            }
            const lastTimeIndex = visibleTimes.length - 1;
            if (this.config_.time > visibleTimes[lastTimeIndex]) {
              this.config_.time = visibleTimes[lastTimeIndex];
            }
            map.set('time', this.config_.time);
            if (this.config_.metadata.tags.includes(constants.TAG_AUTOPLAY)) {
              this.config_.metadata.tags = this.config_.metadata.tags.filter(
                (tag) => tag !== constants.TAG_AUTOPLAY
              );
              this.play();
            }
            return map;
          })
          .catch((error) => {
            console.log(error);
          });
      })
      .catch((error) => {
        console.log(error);
      });
  }

  /**
   *
   */
  refresh_() {
    const map = this.get('map');
    if (map != null) {
      const layers = map.getLayers().getArray();
      layers.forEach((layer) => {
        const source = layer.getSource();
        const time = source.get(constants.TIME);
        if (time != null) {
          source.set(constants.TIME, null);
        }
        const id = layer.get('id');
        if (id != null && !id.startsWith('metoclient:')) {
          const config = this.config_.layers.find(
            (layerConfig) => layerConfig.id === layer.get('metoclient:id')
          );
          if (config != null) {
            config.visibility = layer.getVisible()
              ? constants.VISIBLE
              : constants.NOT_VISIBLE;
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
    const timeSlider = this.get('timeSlider');
    if (timeSlider != null) {
      if (this.config_.timeZone !== timeSlider.get('timeZone')) {
        timeSlider.set('timeZone', this.config_.timeZone);
      }
      if (this.config_.timeZoneLabel !== timeSlider.get('timeZoneLabel')) {
        timeSlider.set('timeZoneLabel', this.config_.timeZoneLabel);
      }
    }
    this.renderComplete_ = true;
    this.render().then(() => {
      map.renderSync();
    });
  }

  /**
   *
   * @returns {Promise<void>}
   * @private
   */
  async updateCapabilities_() {
    const updateTime = Date.now();
    const responses = await Promise.all(
      Object.entries(
        this.config_.layers.reduce((capabilities, layer) => {
          if (layer.source == null) {
            return capabilities;
          }
          const sourceIds = [layer.source];
          let timeData;
          if (layer.time != null) {
            if (
              layer.time.source != null &&
              !sourceIds.includes(layer.time.source)
            ) {
              sourceIds.push(layer.time.source);
            }
            if (layer.time.range != null) {
              timeData = parseTimes(layer.time.range);
            }
          }
          sourceIds.forEach((sourceId) => {
            const source = this.config_.sources[sourceId];
            if (source == null) {
              return;
            }
            const sourceCapabilitiesUrl = getSourceCapabilitiesUrl(source);
            if (sourceCapabilitiesUrl == null) {
              return;
            }
            let url;
            let query = {};
            if (sourceCapabilitiesUrl.toLowerCase().startsWith('http')) {
              const domUrl = new Url(sourceCapabilitiesUrl);
              url = `${domUrl.protocol}://${domUrl.host}`;
              if (domUrl.port != null && domUrl.port.length > 0) {
                url += `:${domUrl.port}`;
              }
              url += domUrl.path;
              query = domUrl.query;
            } else {
              url = sourceCapabilitiesUrl;
            }
            if (url.length === 0) {
              return;
            }
            const index = url.lastIndexOf('/');
            let type = '';
            if (url.toLowerCase().startsWith('http') && index >= 0) {
              type = url.substring(index + 1).toLowerCase();
            } else {
              type = layer.url.service.toLowerCase();
            }
            if (capabilities[url] == null) {
              capabilities[url] = {
                updated: updateTime,
                type,
                server:
                  source.server != null ? source.server.toLowerCase() : null,
                data: null,
                startTime: Number.POSITIVE_INFINITY,
                endTime: Number.NEGATIVE_INFINITY,
                query,
              };
            }
            if (timeData != null && timeData.length > 0) {
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
        }, {})
      ).map((capabKeyValue) => {
        this.capabilities_[capabKeyValue[0]] = capabKeyValue[1];
        const params = {};
        Object.keys(capabKeyValue[1].query).forEach((key) => {
          params[key.toLowerCase()] = capabKeyValue[1].query[key];
        });
        if (params.service == null) {
          params.service = capabKeyValue[1].type;
        }
        params.request = 'GetCapabilities';
        ['startTime', 'endTime'].forEach((timeParam) => {
          if (
            params.service === 'wms' &&
            capabKeyValue[1].server === constants.SMARTMET_SERVER
          ) {
            const timeISO = DateTime.fromMillis(capabKeyValue[1][timeParam])
              .toUTC()
              .toISO({
                suppressMilliseconds: true,
                includeOffset: true,
              });
            if (timeISO != null) {
              params[timeParam.toLowerCase()] = timeISO;
            }
          }
        });
        const url = `${capabKeyValue[0]}?${Object.keys(params)
          .map((key) => `${key}=${params[key]}`)
          .join('&')}`;
        return ajax({
          url,
          crossDomain: true,
          contentType: 'text/plain',
          beforeSend(jqxhr) {
            jqxhr.requestURL = url;
          },
        });
      })
    );
    await Promise.all(
      responses.map((response) => {
        if (
          response.responseText != null &&
          response.requestURL.includes(constants.GET_CAPABILITIES_QUERY)
        ) {
          let capabKey = response.requestURL.split('?')[0];
          const capabKeyParts = capabKey.split('/');
          let localCapabKey = '';
          if (capabKeyParts.length > 0) {
            localCapabKey = capabKeyParts[capabKeyParts.length - 1];
          }
          if (
            localCapabKey.length > 0 &&
            this.capabilities_[localCapabKey] != null
          ) {
            capabKey = localCapabKey;
          }
          if (
            typeof CapabilitiesReader[this.capabilities_[capabKey].type] ===
            'function'
          ) {
            this.capabilities_[capabKey].data = CapabilitiesReader[
              this.capabilities_[capabKey].type
            ](response.responseText);
          }
        }
      })
    );
    Object.keys(this.capabilities_).forEach((capabilitiesKey) => {
      if (
        this.capabilities_[capabilitiesKey] != null &&
        this.capabilities_[capabilitiesKey].updated < updateTime
      ) {
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
  isTiledLayer_(layer) {
    if (layer == null || layer.source == null) {
      return false;
    }
    if (
      layer.url != null &&
      typeof layer.url.service === 'string' &&
      layer.url.service.toLowerCase() === 'wmts'
    ) {
      return true;
    }
    const source = this.config_.sources[layer.source];
    if (source == null) {
      console.error(
        `Error in the MetOClient configuration: undefined source "${layer.source}" in the layer "${layer.id}".`
      );
    }
    if (source.type === 'OSM') {
      return true;
    }
    if (source == null || source.tiles == null) {
      return false;
    }
    let tiled = Array.isArray(source.tileSize)
      ? source.tileSize.map((tileSize) => Number(tileSize) > 0)
      : new Array(2).fill(Number(source.tileSize) > 0);
    if (Array.isArray(source.tiles)) {
      // Todo: Handle also other indexes
      const url = new Url(source.tiles[0].toLowerCase());
      tiled = ['width', 'height'].map(
        (measure, index) =>
          (url.query != null &&
            url.query[measure] !== undefined &&
            Number(url.query[measure]) > 0) ||
          tiled[index]
      );
    }
    if (layer.url != null) {
      ['width', 'height'].forEach((measure, index) => {
        if (layer.url[measure] !== undefined) {
          tiled[index] = Number(layer.url[measure]) > 0;
        }
      });
    }
    return tiled.every(Boolean);
  }

  isAnimationLayer_(layer) {
    return (
      layer.get('times') != null &&
      !layer.get('id').startsWith(constants.METOCLIENT_PREFIX)
    );
  }

  getLayerType_(layer) {
    if (this.isTiledLayer_(layer)) {
      return 'tiled';
    }
    if (layer.type != null && layer.type !== 'raster') {
      return layer.type;
    }
    return 'image';
  }

  createLayer_(layerConfig, time = this.config_.time, postfix = '') {
    const layerType = this.getLayerType_(layerConfig);
    if (LayerCreator[layerType] == null) {
      return null;
    }
    const source = this.config_.sources[layerConfig.source];
    const timeDefined =
      layerConfig.time != null && layerConfig.time.data != null;
    const postfixDefined = postfix.length > 0;
    if (postfixDefined && !timeDefined) {
      return null;
    }
    const options = { ...this.config_ };
    if (timeDefined) {
      options.time = time;
      if (!layerConfig.time.data.includes(options.time)) {
        options.time = layerConfig.time.data.reduce((prevT, t) => {
          let prevTime = prevT;
          if (t < this.config_.time && t > prevTime) {
            prevTime = t;
          }
          return prevTime;
        }, layerConfig.time.data[0]);
      }
    }
    const tiles = source.tiles != null ? source.tiles[0].split('?')[0] : null;
    const url =
      source.capabilities != null && source.capabilities.length > 0
        ? source.capabilities
        : tiles;
    const layer = LayerCreator[layerType](
      layerConfig,
      options,
      url != null ? this.capabilities_[url] : null
    );
    if (layer != null) {
      this.layerListeners_.push(
        layer.on('change:visible', (event) => {
          const visible = layer.getVisible();
          ['previous', 'next'].forEach((relative) => {
            this.setRelativesVisible_(layer, relative, visible);
            const previousLayer = layer.get(constants.PREVIOUS);
            if (previousLayer != null) {
              previousLayer.setVisible(visible);
            }
            const nextLayer = layer.get(constants.NEXT);
            if (nextLayer != null) {
              nextLayer.setVisible(visible);
            }
          });
          if (this.isAnimationLayer_(layer)) {
            if (!this.isVisibleTime_(this.config_.time)) {
              const nextTime = this.getNextTime_();
              const prevTime = this.getPrevTime_();
              const newTime =
                Math.abs(nextTime - this.config_.time) <
                Math.abs(this.config_.time - prevTime)
                  ? nextTime
                  : prevTime;
              if (newTime != null) {
                this.get('map').set('time', newTime);
              }
            }
            this.clearTimeStatuses_();
            this.updateTimeSlider_();
          }
        })
      );
      if (timeDefined) {
        layer.set('times', layerConfig.time.data);
      }
      layer.set(
        constants.OPACITY,
        layerConfig.opacity != null ? layerConfig.opacity : 1
      );
      const id = layer.get('id');
      layer.set(constants.ID, id);
      if (postfixDefined) {
        layer.set('id', `metoclient:${id}${postfix}`);
        layer.set('title', '');
        MetOClient.hideLayer_(layer);
      } else {
        const prevLayerId = layer.get('previous');
        const prevLayer =
          prevLayerId != null && prevLayerId.length > 0
            ? this.config_.layers.find(
                (configLayer) => configLayer.id === prevLayerId
              )
            : null;
        const prevTimes =
          prevLayer != null && prevLayer.time != null
            ? prevLayer.time.data
            : [];
        if (prevTimes.includes(this.config_.time)) {
          MetOClient.hideLayer_(layer);
        }
      }
    }
    return layer;
  }

  createLayerSwitcherTitle_(layerConfig) {
    let { title } = layerConfig.metadata;
    const layersConfig = this.config_.layers;
    const nextLayerId =
      layerConfig.next != null
        ? layerConfig.next
        : [
            this.config_.layers.find(
              (layer) => layer.previous === layerConfig.id
            ),
          ].map((l) => (l == null ? null : l.id))[0];
    const nextLayerConfig =
      nextLayerId != null && nextLayerId.length > 0
        ? layersConfig.find((layer) => layer.id === nextLayerId)
        : null;
    const nextTitle =
      nextLayerConfig != null
        ? this.createLayerSwitcherTitle_(nextLayerConfig)
        : '';
    if (nextTitle != null && nextTitle.length > 0 && title !== nextTitle) {
      title += ` / ${nextTitle}`;
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
  setRelativesVisible_(layer, relative, visible) {
    const relativeLayerId = layer.get(relative);
    const layers = this.get('map').getLayers().getArray();
    const relativeLayer =
      relativeLayerId != null && relativeLayerId.length > 0
        ? layers.find((layer) => layer.get('id') === relativeLayerId)
        : null;
    if (relativeLayer != null) {
      relativeLayer.setVisible(visible);
      this.setRelativesVisible_(relativeLayer, relative, visible);
      const previousLayer = relativeLayer.get(constants.PREVIOUS);
      if (previousLayer != null) {
        previousLayer.setVisible(visible);
      }
      const nextLayer = relativeLayer.get(constants.NEXT);
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
  createLayers_() {
    const baseMapConfigs = this.config_.layers.filter(
      (layerConfig) =>
        layerConfig != null &&
        layerConfig.metadata != null &&
        layerConfig.metadata.type != null &&
        layerConfig.metadata.type.toLowerCase() === constants.BASE_MAP
    );
    const lastVisibleBaseMapIndex = baseMapConfigs.reduce(
      (prevVisibleBaseMapIndex, baseMapConfig, index) =>
        baseMapConfig.visibility === constants.VISIBLE
          ? index
          : prevVisibleBaseMapIndex,
      baseMapConfigs.length - 1
    );
    baseMapConfigs.forEach((baseMapConfig, index) => {
      baseMapConfig.visibility =
        index === lastVisibleBaseMapIndex
          ? constants.VISIBLE
          : constants.NOT_VISIBLE;
    });
    const layers = new Collection(
      this.config_.layers
        .map((layerConfig) => {
          if (layerConfig.time != null && layerConfig.metadata != null) {
            if (layerConfig.metadata.title != null) {
              layerConfig.legendTitle = layerConfig.metadata.title;
            }
            if (layerConfig.metadata.legendUrl != null) {
              layerConfig.legendUrl = layerConfig.metadata.legendUrl;
            }
            if (layerConfig.metadata.legendVisible) {
              this.selectedLegend_ = layerConfig.id;
            }
          }
          return layerConfig;
        })
        .reduce((olLayers, layerConfig) => {
          if (
            layerConfig.time != null &&
            (layerConfig.previous == null ||
              layerConfig.previous.length === 0) &&
            layerConfig.metadata != null &&
            layerConfig.metadata.title != null
          ) {
            layerConfig.metadata.title =
              this.createLayerSwitcherTitle_(layerConfig);
          }
          if (layerConfig.url != null) {
            layerConfig.url = Object.keys(layerConfig.url).reduce(
              (lowerCased, key) => {
                lowerCased[key.toLowerCase()] = layerConfig.url[key];
                return lowerCased;
              },
              {}
            );
          }
          if (
            layerConfig.source == null ||
            (layerConfig.url != null &&
              (typeof layerConfig.url.service !== 'string' ||
                layerConfig.url.service.length === 0))
          ) {
            return olLayers;
          }
          if (
            baseMapConfigs.length === 1 &&
            layerConfig.metadata != null &&
            layerConfig.metadata.type != null &&
            layerConfig.metadata.type.toLowerCase() === constants.BASE_MAP
          ) {
            layerConfig.metadata.title = '';
          }
          const olLayer = this.createLayer_(layerConfig);
          if (olLayer != null) {
            olLayers.push(olLayer);
          }
          return olLayers;
        }, [])
    );
    layers.getArray().forEach((layer, index, layersArray) => {
      const opacity = layer.get(constants.OPACITY);
      if (layer.get('times') == null) {
        layers.item(index).setOpacity(opacity);
      } else {
        const source = layer.getSource();
        const time = source.get(constants.TIME);
        if (time === this.config_.time) {
          const previousId = layer.get('previous');
          if (previousId != null && previousId.length > 0) {
            const previous = layersArray.find(
              (l) => l.get('id') === previousId
            );
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

  setVisible_(layer, visible) {
    if (visible) {
      MetOClient.showLayer_(layer);
    } else {
      MetOClient.hideLayer_(layer);
    }
  }

  static showLayer_(layer) {
    let opacity = layer.get(constants.OPACITY);
    if (opacity == null) {
      opacity = 1;
    }
    layer.setOpacity(opacity);
  }

  static hideLayer_(layer) {
    layer.setOpacity(0);
  }

  /**
   *
   * @returns {View}
   * @private
   */
  createView_() {
    const viewOptions = { ...this.config_ };
    delete viewOptions.sources;
    delete viewOptions.layers;
    const view = new View(viewOptions);
    view.on('change:resolution', () => {
      if (
        !document.fullscreenElement &&
        !document.webkitCurrentFullScreenElement
      ) {
        this.resolutionOnEnterFullScreen_ = view.getResolution();
      }
    });
    this.resolutionOnEnterFullScreen_ = view.getResolution();
    return view;
  }

  /**
   *
   * @param time
   * @returns {boolean}
   * @private
   */
  isVisibleTime_(time) {
    const map = this.get('map');
    return (
      map != null &&
      map
        .getLayers()
        .getArray()
        .some(
          (layer) =>
            layer.getVisible() &&
            layer.get('times') != null &&
            layer.get('times').includes(time)
        )
    );
  }

  /**
   *
   * @private
   */
  clearTimeStatuses_() {
    Object.keys(this.status_)
      .filter((key) => Number(key) !== this.config_.time)
      .forEach((key) => (this.status_[key] = ''));
  }

  /**
   * @private
   * @param forceUpdate
   */
  updateTimeSlider_(forceUpdate = false) {
    this.get('timeSlider').updateTimeLoaderVis(
      this.times_.map((time) => ({
        endTime: time,
        status: this.status_[time],
        active: this.isVisibleTime_(time),
      })),
      forceUpdate
    );
  }

  currentTimeRendered_() {
    const map = this.get('map');
    if (map == null) {
      return;
    }
    const layers = map
      .getLayers()
      .getArray()
      .filter((layer) => layer.get('mapbox-source') == null);
    layers.forEach((layer) => {
      const times = layer.get('times');
      let visible = times == null || !Array.isArray(times);
      if (!visible) {
        const source = layer.getSource();
        const visibleTime = this.getVisibleTime_(layer);
        if (source.get(constants.TIME) === visibleTime) {
          visible = true;
          const prevLayerId = layer.get('previous');
          const prevLayer =
            prevLayerId != null && prevLayerId.length > 0
              ? layers.find((l) => l.get('id') === prevLayerId)
              : null;
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
      layers
        .filter((layer) => {
          const times = layer.get('times');
          if (times == null || !Array.isArray(times) || times.length === 0) {
            return false;
          }
          return !layer.get('id').startsWith('metoclient:');
        })
        .forEach((layer) => {
          const layerId = layer.get('id');
          const layerConfig = this.config_.layers.find(
            (layerConfig) => layerConfig.id === layerId
          );
          let skipPrevious = false;
          let skipNext = false;
          const times = layer.get('times');
          let layerPrevTime;
          let layerNextTime;
          const previous = layer.get('previous');
          const next = layer.get('next');
          if (
            map.get('playing') ||
            (prevTime < times[0] && previous != null && previous.length > 0)
          ) {
            skipPrevious = true;
          } else {
            layerPrevTime = times.includes(prevTime)
              ? prevTime
              : times.reduce(
                  (closestPrevTime, time) =>
                    time < prevTime && prevTime - time < closestPrevTime
                      ? time
                      : closestPrevTime,
                  Number.POSITIVE_INFINITY
                );
            if (layerPrevTime > prevTime) {
              layerPrevTime = Math.max(...times);
            }
          }
          if (
            nextTime > times[times.length - 1] &&
            next != null &&
            next.length > 0
          ) {
            skipNext = true;
          } else {
            layerNextTime = times.includes(nextTime)
              ? nextTime
              : times.reduce(
                  (closestNextTime, time) =>
                    time > nextTime && nextTime - time > closestNextTime
                      ? time
                      : closestNextTime,
                  Number.NEGATIVE_INFINITY
                );
            if (layerNextTime < nextTime) {
              layerNextTime = Math.min(...times);
            }
          }
          const layers = map.getLayers();
          let prevLayer = layer.get(constants.PREVIOUS);
          if (
            prevLayer == null &&
            layerConfig != null &&
            layerPrevTime != null
          ) {
            prevLayer = this.createLayer_(
              layerConfig,
              layerPrevTime,
              '-previous'
            );
            prevLayer.setVisible(layer.getVisible());
            const index = layers
              .getArray()
              .findIndex(
                (l) => l.get(constants.ID) === layer.get(constants.ID)
              );
            layers.insertAt(index, prevLayer);
            layer.set(constants.PREVIOUS, prevLayer);
          }
          if (!skipPrevious && prevLayer != null) {
            const prevSource = prevLayer.getSource();
            if (prevSource.get(constants.TIME) !== layerPrevTime) {
              MetOClient.hideLayer_(prevLayer);
              SourceUpdater[prevSource.get('metoclient:olClassName')](
                prevSource,
                layerPrevTime
              );
            }
          }
          let nextLayer = layer.get(constants.NEXT);
          if (
            nextLayer == null &&
            layerConfig != null &&
            layerNextTime != null
          ) {
            nextLayer = this.createLayer_(layerConfig, layerNextTime, '-next');
            nextLayer.setVisible(layer.getVisible());
            const index = layers
              .getArray()
              .findIndex(
                (l) => l.get(constants.ID) === layer.get(constants.ID)
              );
            layers.insertAt(index, nextLayer);
            layer.set(constants.NEXT, nextLayer);
          }
          if (!skipNext && nextLayer != null) {
            const nextSource = nextLayer.getSource();
            if (nextSource.get(constants.TIME) !== layerNextTime) {
              MetOClient.hideLayer_(nextLayer);
              SourceUpdater[nextSource.get('metoclient:olClassName')](
                nextSource,
                layerNextTime
              );
            }
          }
        });
      map.renderSync();
      map.once('rendercomplete', (event) => {
        this.renderComplete_ = true;
        if (this.updateNeeded_) {
          this.updateNeeded_ = false;
          this.timeUpdated_();
        } else if (this.waitingRender_ > 0) {
          clearTimeout(this.animationTimeout_);
          this.animationTimeout_ = setTimeout(
            this.animate_.bind(this),
            Math.max(this.delay_ - (Date.now() - this.waitingRender_), 0)
          );
        }
      });
    }
  }

  getLayerSwitcher_() {
    const map = this.get('map');
    if (map == null) {
      return null;
    }
    const controls = map.getControls();
    if (controls == null) {
      return null;
    }
    return controls
      .getArray()
      .find(
        (control) => control.get('metoclient:olClassName') === 'LayerSwitcher'
      );
  }

  /**
   *
   * @param layer
   * @returns {any}
   * @private
   */
  getVisibleTime_(layer) {
    let visibleTime = null;
    const layerTimes = layer.get('times');
    if (
      layerTimes != null &&
      Array.isArray(layerTimes) &&
      layerTimes.length > 0 &&
      this.config_.time >= layerTimes[0]
    ) {
      layerTimes.some((time) => {
        const notHistory = time >= this.config_.time;
        if (notHistory) {
          visibleTime = time;
        }
        return notHistory;
      });
    }
    return visibleTime;
  }

  getFeatureLayerTime_(featureLayer) {
    const map = this.get('map');
    if (map == null) {
      return null;
    }
    const mapTime = map.get('time');
    const layerTimes = featureLayer.get('times');
    const hideAll =
      mapTime < layerTimes[0] || mapTime > layerTimes[layerTimes.length - 1];
    return hideAll
      ? null
      : [...layerTimes].reverse().find((time) => time <= mapTime);
  }

  /**
   *
   * @param layer
   * @param prevLayer
   * @param nextLayer
   * @private
   */
  useNextLayer_(layer, prevLayer, nextLayer) {
    const baseId = layer.get('metoclient:id');
    layer.set('id', `metoclient:${baseId}-previous`);
    nextLayer.set('id', baseId);
    if (prevLayer != null) {
      prevLayer.set('id', `metoclient:${baseId}-next`);
    }
    nextLayer.set(constants.PREVIOUS, layer);
    nextLayer.set(constants.NEXT, prevLayer);
    nextLayer.set('title', layer.get('title'));
    layer.set(constants.PREVIOUS, nextLayer);
    layer.set('title', '');
  }

  /**
   *
   * @private
   */
  timeUpdated_() {
    const map = this.get('map');
    const layers = map.getLayers().getArray();
    layers
      .filter(
        (layer) =>
          layer.get('mapbox-source') != null && layer.get('times') != null
      )
      .forEach((featureLayer) => {
        const layerTime = this.getFeatureLayerTime_(featureLayer);
        featureLayer
          .getSource()
          .getFeatures()
          .forEach((feature) => {
            if (
              layerTime == null ||
              feature.get('metoclient:time') !== layerTime
            ) {
              feature.setStyle(new Style({}));
            } else {
              feature.setStyle(null);
            }
          });
      });
    if (!this.renderComplete_) {
      const mapTime = this.get('map').get('time');
      if (this.status_[mapTime] !== constants.STATUS_SUCCESS) {
        this.status_[mapTime] = constants.STATUS_WORKING;
        this.updateTimeSlider_();
      }
      this.updateNeeded_ = true;
      return;
    }
    this.get('map').once(
      'rendercomplete',
      this.currentTimeRendered_.bind(this)
    );
    this.status_[this.config_.time] = constants.STATUS_SUCCESS;
    this.config_.time = this.get('map').get('time');
    this.status_[this.config_.time] = constants.STATUS_WORKING;
    Object.keys(this.status_).forEach((time) => {
      if (
        Number(time) !== this.config_.time &&
        this.status_[time] === constants.STATUS_WORKING
      ) {
        this.status_[time] = '';
      }
    });
    this.updateTimeSlider_();
    layers
      .filter((layer) => layer.get('mapbox-source') == null)
      .filter((layer) => {
        const times = layer.get('times');
        if (times == null || !Array.isArray(times) || times.length === 0) {
          return false;
        }
        if (
          this.config_.time < times[0] ||
          this.config_.time > times[times.length - 1]
        ) {
          MetOClient.hideLayer_(layer);
          return false;
        }
        const prevLayerId = layer.get('previous');
        const prevLayer =
          prevLayerId != null && prevLayerId.length > 0
            ? layers.find((l) => l.get('id') === prevLayerId)
            : null;
        const prevTimes = prevLayer != null ? prevLayer.get('times') : [];
        if (prevTimes.includes(this.config_.time)) {
          MetOClient.hideLayer_(layer);
          return false;
        }
        return !layer.get('id').startsWith('metoclient:');
      })
      .forEach((layer) => {
        const source = layer.getSource();
        const visibleTime = this.getVisibleTime_(layer);
        if (source.get('metoclient:time') === visibleTime) {
          const prevLayer = layer.get('metoclient:previous');
          if (prevLayer != null) {
            MetOClient.hideLayer_(prevLayer);
          } else {
            this.status_[this.config_.time] = constants.STATUS_SUCCESS;
            this.updateTimeSlider_();
          }
          const nextLayer = layer.get('metoclient:next');
          if (nextLayer != null) {
            MetOClient.hideLayer_(nextLayer);
          }
          MetOClient.showLayer_(layer);
        } else {
          const prevLayer = layer.get('metoclient:previous');
          const nextLayer = layer.get('metoclient:next');
          if (prevLayer != null) {
            const prevSource = prevLayer.getSource();
            if (
              prevSource != null &&
              prevSource.get(constants.TIME) === visibleTime
            ) {
              MetOClient.hideLayer_(layer);
              MetOClient.showLayer_(prevLayer);
              const baseId = layer.get('metoclient:id');
              layer.set('id', `metoclient:${baseId}-next`);
              prevLayer.set('id', baseId);
              if (nextLayer != null) {
                nextLayer.set('id', `metoclient:${baseId}-previous`);
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
            const nextSource = nextLayer.getSource();
            if (nextSource != null) {
              if (nextSource.get(constants.TIME) === visibleTime) {
                MetOClient.hideLayer_(layer);
                MetOClient.showLayer_(nextLayer);
                this.useNextLayer_(layer, prevLayer, nextLayer);
                return;
              }
              this.useNextLayer_(layer, prevLayer, nextLayer);
              SourceUpdater[nextSource.get('metoclient:olClassName')](
                nextSource,
                visibleTime
              );
              return;
            }
          }
          SourceUpdater[source.get('metoclient:olClassName')](
            source,
            this.config_.time
          );
        }
      });
    this.renderComplete_ = false;
    if (map.getLayers().getLength() > 0) {
      map.renderSync();
    }
  }

  getLayerSwitcherPanel_() {
    return document.querySelector(
      `div#${constants.LAYER_SWITCHER_CONTAINER_ID} div.panel`
    );
  }

  isLayerSwitcherVisible_() {
    const layerSwitcher = this.getLayerSwitcher_();
    if (layerSwitcher == null) {
      return null;
    }
    return document
      .getElementById(constants.LAYER_SWITCHER_CONTAINER_ID)
      .classList.contains(layerSwitcher.shownClassName);
  }

  /**
   *
   * @api
   */
  updateLegend() {
    Array.from(
      document.getElementsByClassName(constants.LEGEND_CONTAINER_CLASS)
    ).forEach((legendContainer) => {
      if (legendContainer != null) {
        while (legendContainer.firstChild) {
          legendContainer.removeChild(legendContainer.firstChild);
        }
        const url = this.legends_?.[this.selectedLegend_]?.url;
        if (url != null && url.length > 0) {
          const legendFigure = document.createElement('figure');
          const legendCaption = document.createElement('figcaption');
          legendCaption.innerHTML = this.legends_[this.selectedLegend_].title;
          legendFigure.appendChild(legendCaption);
          const legendImage = document.createElement('img');
          legendImage.setAttribute('src', url);
          legendFigure.appendChild(legendImage);
          legendContainer.appendChild(legendFigure);
        }
      }
    });
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
    let legendChooserContainer = document.getElementById(
      constants.LEGEND_CHOOSER_CONTAINER_ID
    );
    if (legendChooserContainer != null) {
      return;
    }
    legendChooserContainer = document.createElement('div');
    legendChooserContainer.setAttribute(
      'id',
      constants.LEGEND_CHOOSER_CONTAINER_ID
    );

    const legendSelectLabel = document.createElement('label');
    legendSelectLabel.setAttribute('id', constants.LEGEND_CHOOSER_LABEL_ID);
    legendSelectLabel.setAttribute('for', constants.LEGEND_CHOOSER_SELECT_ID);
    legendSelectLabel.innerHTML = this.config_.texts.Legend;
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
    legendSelect.addEventListener('change', () => {
      const selectedOption = legendSelect.options[legendSelect.selectedIndex];
      this.selectedLegend_ = selectedOption.value;
      this.updateLegend();
    });
    legendChooserContainer.appendChild(legendSelect);
    layerSwitcherPanel.appendChild(legendChooserContainer);
    const layerList = layerSwitcherPanel.querySelector('ul');
    if (layerList != null) {
      layerList.addEventListener('change', (event) => {
        if (event.target.className !== constants.OPACITY_CONTROL_CLASS) {
          this.refineLayerSwitcher_();
        }
      });
    }
  }

  /**
   *
   * @param {*} e
   * @returns
   */
  updateOpacity_(e) {
    if (!isNumeric(e.target.value)) {
      e.target.value = 100;
    }
    let opacity = Number(e.target.value) / 100;
    if (opacity < 0.01) {
      e.target.value = 1;
      opacity = 0.01;
    } else if (opacity > 1) {
      e.target.value = 100;
      opacity = 1;
    }
    const label = e.target.previousSibling.innerText;
    this.get('map')
      .getLayers()
      .getArray()
      .filter((mapLayer) => mapLayer.get('layerSwitcherTitle') === label)
      .forEach((layer) => {
        layer.set(constants.OPACITY, opacity);
        const layerOpacity = layer.get('opacity');
        if (layerOpacity > 0) {
          layer.setOpacity(opacity);
        }
      });
    this.config_.layers.forEach((layer, index) => {
      if (layer.metadata.title === label) {
        this.config_.layers[index].opacity = opacity;
      }
    });
  }

  /**
   *
   * @returns
   */
  createOpacityControl_() {
    const layerSwitcherPanel = this.getLayerSwitcherPanel_();
    if (layerSwitcherPanel == null) {
      return;
    }
    const map = this.get('map');
    const mapLayers = map.getLayers().getArray();
    layerSwitcherPanel.className += ` ${constants.OPACITY_CONTAINER_CLASS}`;
    const layerList = layerSwitcherPanel.querySelector('ul');
    if (layerList != null) {
      const layers = layerList.getElementsByTagName('li');
      const numLayers = layers.length;
      for (let i = 0; i < numLayers; i++) {
        const { childNodes } = layers[i];
        const numChildnodes = childNodes.length;

        let label = '';
        for (let j = 0; j < numChildnodes; j++) {
          if (childNodes[j].tagName.toLowerCase() === 'label') {
            label = childNodes[j].innerText;
          }
        }
        if (label.length === 0) {
          continue;
        }
        let opacity = 1;
        const titleLayer = mapLayers.find(
          (mapLayer) => mapLayer.get('layerSwitcherTitle') === label
        );
        if (titleLayer != null) {
          const layerOpacity = titleLayer.get(constants.OPACITY);
          if (layerOpacity != null) {
            opacity = layerOpacity;
          }
        }
        const opacityField = document.createElement('input');
        opacityField.type = 'number';
        opacityField.min = '1';
        opacityField.max = '100';
        opacityField.step = '1';
        opacityField.value = (100 * opacity).toString();
        opacityField.className = constants.OPACITY_CONTROL_CLASS;
        opacityField.addEventListener('input', this.updateOpacity_.bind(this));
        layers[i].append(opacityField);
      }
    }
  }

  /**
   *
   */
  refineLayerSwitcher_() {
    if (Object.entries(this.legends_).length > 1) {
      this.createLegendChooser_();
    }
    if (this.config_.metadata.tags.includes(constants.TAG_OPACITY_CONTROL)) {
      this.createOpacityControl_();
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
          this.refineLayerSwitcher_();
        }
      });
    }
  }

  /**
   *
   * @private
   */
  createLegendContainer_() {
    const mapContainer = document.getElementById(this.config_.target);
    if (mapContainer != null) {
      const legendContainer = document.createElement('div');
      legendContainer.setAttribute('id', constants.LEGEND_CONTAINER_CLASS);
      legendContainer.setAttribute('class', constants.LEGEND_CONTAINER_CLASS);
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
      .filter((layer) => this.isAnimationLayer_(layer))
      .reduce(
        (legendArray, layer) => {
          let legendUrl;
          const customLegendUrl = layer.get('legendUrl');
          if (customLegendUrl != null && customLegendUrl.length > 0) {
            legendUrl = customLegendUrl;
          }
          if (legendUrl == null) {
            const source = layer.getSource();
            if (source != null && typeof source.getLegendUrl === 'function') {
              legendUrl = source.getLegendUrl();
            }
          }
          if (legendUrl != null && legendUrl.length > 0) {
            legendArray[layer.get('id')] = {
              title: layer.get('legendTitle'),
              url: legendUrl,
            };
          }
          return legendArray;
        },
        {
          [constants.DEFAULT_LEGEND]: {
            title: '',
            url: null,
          },
        }
      );
    if (Object.entries(this.legends_).length > 1) {
      this.createLegendContainer_();
    }
  }

  /**
   *
   * @returns
   */
  handleFullScreen_() {
    const map = this.get('map');
    if (map == null) {
      return;
    }
    const view = map.getView();
    if (view == null) {
      return;
    }
    // ol/control/FullScreen: enterfullscreen / leavefullscreen were not stable
    if (
      !document.fullscreenElement &&
      !document.webkitCurrentFullScreenElement
    ) {
      const resolution = view.getResolution();
      const newResolution = this.resolutionOnEnterFullScreen_ / resolution;
      view.adjustResolution(newResolution);
      map.once('moveend', () => {
        view.adjustResolution(newResolution);
      });
    }
  }

  createFullScreenListener_() {
    const element = document.getElementById(this.config_.target);
    element.onfullscreenchange = this.handleFullScreen_.bind(this);
    element.onwebkitfullscreenchange = this.handleFullScreen_.bind(this);
  }

  initMap_(map) {
    this.set('map', map);
    if (!this.config_.metadata.tags.includes(constants.TAG_NO_LAYER_SWITCHER)) {
      const layerSwitcher = new LayerSwitcher({
        tipLabel: this.config_.texts['Layer Switcher'],
        reverse: false,
      });
      layerSwitcher.set('metoclient:olClassName', 'LayerSwitcher');
      map.addControl(layerSwitcher);
      const layerSwitcherContainer = document.querySelector(
        `div#${this.config_.target} div.layer-switcher`
      );
      if (layerSwitcherContainer != null) {
        layerSwitcherContainer.setAttribute(
          'id',
          constants.LAYER_SWITCHER_CONTAINER_ID
        );
        // https://github.com/walkermatt/ol-layerswitcher/issues/39
        const layerSwitcherButton =
          layerSwitcherContainer.querySelector('button');
        if (layerSwitcherButton != null) {
          layerSwitcherButton.onmouseover = () => {};
          layerSwitcherButton.onclick = () => {
            const layerSwitcher = this.getLayerSwitcher_();
            if (this.isLayerSwitcherVisible_()) {
              layerSwitcher.hidePanel();
            } else {
              layerSwitcher.showPanel();
            }
          };
        }
        const layerSwitcherPanel = this.getLayerSwitcherPanel_();
        if (layerSwitcherPanel != null) {
          layerSwitcherPanel.onmouseout = () => {};
        }
      }
    }
    this.createLegends_();
    this.createLayerSwitcherWatcher_();
    this.createFullScreenListener_();
    this.renderComplete_ = true;
    this.get('timeSlider').createTimeSlider(this.times_);
    this.playingListener_ = this.get('map').on('change:playing', (evt) => {
      if (map.get('playing')) {
        this.animate_();
      }
    });
    this.timeListener_ = map.on('change:time', this.timeUpdated_.bind(this));
    this.nextListener_ = map.on('next', (evt) => {
      this.next(evt.force);
    });
    this.previousListener_ = map.on('previous', (evt) => {
      this.previous();
    });
    map.set('time', this.config_.time);
    this.refreshTimer_ = setInterval(
      this.refresh_.bind(this),
      this.refreshInterval_
    );
    this.updateLegend();
    if (
      typeof document.addEventListener !== 'undefined' ||
      hidden !== undefined
    ) {
      this.visibilityListener_ = this.handleVisibilityChange_.bind(this);
      document.addEventListener(
        'visibilitychange',
        this.visibilityListener_,
        false
      );
    }
    return map;
  }

  handleVisibilityChange_() {
    clearInterval(this.refreshTimer_);
    if (document.visibilityState === 'hidden') {
      return;
    }
    this.refreshTimer_ = setInterval(
      this.refresh_.bind(this),
      this.refreshInterval_
    );
    this.refresh_();
  }

  addTimes_(times) {
    if (times != null && Array.isArray(times) && times.length > 0) {
      this.times_ = [...new Set([...this.times_, ...times])].sort();
    }
    const map = this.get('map');
    if (map != null && map.get('time') == null && this.times_.length > 0) {
      const currentTime = Date.now();
      map.set(
        'time',
        this.times_[
          Math.max(this.times_.findIndex((time) => time > currentTime) - 1, 0)
        ]
      );
    }
  }

  updateVectorConfig_(vectorConfig) {
    return Promise.all(
      Object.entries(vectorConfig.sources).map((source) => {
        if (typeof source[1].data === 'string') {
          return ajax({
            url: source[1].data,
            crossDomain: true,
          }).then((response) => [
            source[0],
            {
              data: response,
              type: source[1].type,
            },
          ]);
        }
        return Promise.resolve(source);
      })
    ).then((sources) => {
      vectorConfig.sources = Object.fromEntries(sources);
      return vectorConfig;
    });
  }

  createVectorLayers_(map, vectorConfig) {
    return this.updateVectorConfig_(vectorConfig)
      .then((config) => olms(map, config))
      .then((updatedMap) => {
        if (vectorConfig.layers != null) {
          const mapProjection = updatedMap.getView().getProjection().getCode();
          updatedMap
            .getLayers()
            .getArray()
            .filter((layer) => layer.get('mapbox-source') != null)
            .forEach((layer) => {
              let layerConfig;
              const layerTimes = [];
              let timeProperty;
              const mapboxLayers = layer.get('mapbox-layers');
              if (mapboxLayers != null) {
                layer.set('id', mapboxLayers.join('-'));
                const title = mapboxLayers.reduce((layerTitle, layerId) => {
                  layerConfig = vectorConfig.layers.find(
                    (layer) => layer.id === layerId
                  );
                  if (
                    layerConfig.metadata != null &&
                    layerConfig.metadata.title != null &&
                    layerConfig.metadata.title.length > 0
                  ) {
                    if (layerTitle.length > 0) {
                      layerTitle += ' / ';
                    }
                    layerTitle += layerConfig.metadata.title;
                    timeProperty = layerConfig.metadata.timeProperty;
                  }
                  return layerTitle;
                }, '');
                if (title != null && title.length > 0) {
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
              };
              const initFeature = (feature) => {
                if (timeProperty != null && timeProperty.length > 0) {
                  const time = feature.get(timeProperty);
                  if (time != null && time.length > 0) {
                    const parsedTime = DateTime.fromISO(time).valueOf();
                    if (
                      typeof parsedTime === 'number' &&
                      !Number.isNaN(parsedTime)
                    ) {
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
                      if (layerTime == null || parsedTime !== layerTime) {
                        feature.setStyle(new Style({}));
                      } else {
                        feature.setStyle(null);
                      }
                    }
                  }
                }
              };
              this.sourceListeners_.push(
                source.on('addfeature', (event) => {
                  initFeature(event.feature);
                })
              );
              source.getFeatures().forEach((feature) => {
                initFeature(feature);
                if (mapProjection !== 'EPSG:3857') {
                  feature.getGeometry().transform('EPSG:3857', mapProjection);
                }
              });
            });
          if (this.config_.time == null && this.times_.length > 0) {
            this.config_.time = this.times_[0];
          }
        }
        return updatedMap;
      });
  }

  /**
   *
   */
  createInteractions_() {
    if (this.config_.metadata.tags.includes(constants.TAG_NO_INTERACTIONS)) {
      return [];
    }
    if (
      this.config_.metadata.tags.includes(
        constants.TAG_MOUSE_WHEEL_INTERACTIONS
      )
    ) {
      return [
        new DoubleClickZoom(),
        new DragPan(),
        new PinchZoom(),
        new KeyboardPan(),
        new KeyboardZoom(),
        new MouseWheelZoom(),
      ];
    }
    return [
      new DoubleClickZoom(),
      new DragPan(),
      new PinchZoom(),
      new KeyboardPan(),
      new KeyboardZoom(),
    ];
  }

  /**
   *
   * @private
   */
  createMap_() {
    const interactions = this.createInteractions_();
    this.set(
      'timeSlider',
      new TimeSlider({
        target: this.config_.timeSliderContainerId,
        locale: this.config_.locale,
        showTimeSlider: true,
        timeZone: this.config_.timeZone,
        timeZoneLabel: this.config_.timeZoneLabel,
        enableMouseWheel: this.config_.metadata.tags.includes(
          constants.TAG_MOUSE_WHEEL_INTERACTIONS
        ),
        meteorologicalMode: !this.config_.metadata.tags.includes(
          constants.TAG_INSTANT_TIMESLIDER
        ),
      })
    );
    const controls = [
      new Zoom({
        zoomInLabel: this.config_.texts['Zoom In Label'],
        zoomOutLabel: this.config_.texts['Zoom Out Label'],
        zoomInTipLabel: this.config_.texts['Zoom In'],
        zoomOutTipLabel: this.config_.texts['Zoom Out'],
      }),
      this.get('timeSlider'),
    ];
    if (
      this.config_.metadata.tags.includes(constants.TAG_FULL_SCREEN_CONTROL)
    ) {
      controls.push(
        new FullScreen({
          label: this.config_.texts['Fullscreen Label'],
          labelActive: this.config_.texts['Fullscreen Label Active'],
          tipLabel: this.config_.texts['Fullscreen Tip Label'],
        })
      );
    }
    const newMap = new Map({
      target: this.config_.target,
      layers: this.createLayers_(),
      view: this.createView_(),
      controls,
      interactions,
    });
    const view = newMap.getView();
    const minZoom = view.getMinZoom();
    let extent = view.calculateExtent();
    while (
      (extent[2] - extent[0] < this.config_.minExtent[0] ||
        extent[3] - extent[1] < this.config_.minExtent[1]) &&
      view.getZoom() > minZoom
    ) {
      this.config_.zoom = view.getZoom() - 1;
      view.setZoom(this.config_.zoom);
      extent = view.calculateExtent();
    }
    if (this.resizeDetector_ != null) {
      this.extent_ = this.config_.extent != null ? this.config_.extent : extent;
      this.resizeDetector_.listenTo(
        document.getElementById(this.config_.target),
        () => {
          const map = this.get('map');
          if (map == null) {
            return;
          }
          if (this.config_.metadata.tags.includes(constants.TAG_FIXED_EXTENT)) {
            view.fit(this.extent_, {
              size: map.getSize(),
            });
          } else {
            map.updateSize();
            map.renderSync();
          }
          this.updateTimeSlider_(true);
        }
      );
    }
    if (this.vectorConfig_.layers.length > 0) {
      return this.createVectorLayers_(newMap, this.vectorConfig_).then((map) =>
        this.initMap_(map)
      );
    }
    return new Promise((resolve) => {
      resolve(this.initMap_(newMap));
    });
  }

  /**
   *
   * @private
   */
  updateMap_() {
    const map = this.get('map');
    if (map == null) {
      return this.createMap_();
    }
    map.setTarget(this.config_.target);
    map.getLayerGroup().setLayers(
      this.createLayers_().extend(
        map
          .getLayers()
          .getArray()
          .filter(
            (layer) =>
              layer.get('metoclient:id') == null &&
              layer.get('mapbox-source') == null
          )
      )
    );
    map.setView(this.createView_());
    map.set('time', this.config_.time);
    if (this.vectorConfig_.layers.length > 0) {
      return this.createVectorLayers_(map, this.vectorConfig_).then(
        (updatedMap) => {
          this.timeUpdated_();
          return updatedMap;
        }
      );
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
  updateTimes_() {
    this.times_ = [];
    this.status_ = {};
    this.config_.layers.forEach((layer) => {
      if (layer.time != null && layer.time.range != null) {
        const source =
          layer.time.source != null
            ? this.config_.sources[layer.time.source]
            : this.config_.sources[layer.source];
        const capabilities =
          this.capabilities_[
            (source.capabilities != null && source.capabilities.length > 0
              ? source.capabilities
              : source.tiles[0]
            ).split('?')[0]
          ]; // Todo: Generalize
        if (
          capabilities == null ||
          capabilities.data == null ||
          capabilities.data.Capability == null ||
          capabilities.data.Capability.Layer == null ||
          capabilities.data.Capability.Layer.Layer == null
        ) {
          return;
        }
        let parsedData = [];
        capabilities.data.Capability.Layer.Layer.filter((element) =>
          layer.time.name != null
            ? layer.time.name === element.Name
            : [layer.url.layer, layer.url.layers].some((layerIds) =>
                // Todo: check namespace
                typeof layerIds === 'string'
                  ? layerIds
                      .split(',')
                      .some(
                        (layerId) =>
                          layerId.slice(-element.Name.length) === element.Name
                      )
                  : false
              )
        ).forEach((layerElement) => {
          const data =
            layerElement != null && layerElement.Dimension != null
              ? layerElement.Dimension.find(
                  (element) => element.name.toLowerCase() === 'time'
                ).values
              : [];
          parsedData = [...new Set(parsedData.concat(parseTimes(data)))];
        });
        const times = parseTimes(
          layer.time.range,
          layer.time.offset,
          parsedData
        );
        const currentTime = Date.now();
        let historyData;
        let historyIndex = 0;
        let futureData;
        let futureIndex = 0;
        times.forEach((time, index) => {
          if (!Number.isNaN(time) && !Number.isFinite(time)) {
            if (time < 0) {
              if (historyData == null) {
                historyData = parsedData
                  .filter((t) => t < currentTime)
                  .sort()
                  .reverse();
              }
              times[index] = historyData[historyIndex];
              historyIndex += 1;
            } else {
              if (futureData == null) {
                futureData = parsedData.filter((t) => t >= currentTime).sort();
              }
              times[index] = futureData[futureIndex];
              futureIndex += 1;
            }
          }
        });
        times.sort();
        layer.time.data = times.filter((time) => parsedData.includes(time));
        this.addTimes_(layer.time.data);
      }
    });
    this.times_.forEach((time) => {
      this.status_[time] = '';
    });
  }

  /**
   * @param options
   */
  play(options) {
    if (options != null && Math.sign(options.delay)) {
      this.delay_ = options.delay;
    }
    if (options != null && Math.sign(options.periodDelay)) {
      this.periodDelay_ = options.periodDelay;
    }
    this.get('map').set('playing', true);
  }

  /**
   *
   * @private
   */
  animate_() {
    if (this.get('map').get('playing')) {
      if (this.renderComplete_) {
        clearTimeout(this.animationTimeout_);
        this.waitingRender_ = 0;
        this.next();
        this.animationTimeout_ = setTimeout(
          this.animate_.bind(this),
          this.delay_
        );
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
  getNextTime_() {
    const { time } = this.config_;
    const numTimes = this.times_.length;
    let timeIndex;
    for (let i = 0; i < numTimes; i += 1) {
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
   * @param force
   */
  next(force) {
    if (!this.isReady_()) {
      return;
    }
    const map = this.get('map');
    const currentTime = map.get('time');
    const nextTime = this.getNextTime_();
    if (
      !this.delayLoop_ ||
      force ||
      currentTime == null ||
      currentTime < nextTime
    ) {
      map.set('time', nextTime);
      this.delayLoop_ = this.config_.metadata.tags.includes(
        constants.TAG_DELAY_LOOP
      );
    } else {
      this.delayLoop_ = false;
    }
  }

  /**
   *
   * @returns {*}
   * @private
   */
  getPrevTime_() {
    const { time } = this.config_;
    const lastTimeIndex = this.times_.length - 1;
    let timeIndex;
    for (let i = lastTimeIndex; i >= 0; i -= 1) {
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
  previous() {
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
  isReady_() {
    return this.get('map') != null && this.times_.length > 0;
  }

  /**
   *
   * @api
   */
  pause() {
    this.get('map').set('playing', false);
  }

  /**
   * @api
   * @param layerId
   */
  setLegend(layerId) {
    this.selectedLegend_ = layerId;
    this.updateLegend();
  }

  stop() {
    this.pause();
  }

  clear_() {
    unByKey(this.layerListeners_);
    unByKey(this.sourceListeners_);
  }

  /**
   *
   * @api
   */
  destroy() {
    this.clear_();
    unByKey(this.playingListener_);
    unByKey(this.nextListener_);
    unByKey(this.previousListener_);
    unByKey(this.timeListener_);
    unByKey(this.optionsListener_);
    if (this.resizeDetector_ != null) {
      this.resizeDetector_.removeAllListeners(
        document.getElementById(this.config_.target)
      );
    }
    document.removeEventListener(
      'visibilitychange',
      this.visibilityListener_,
      false
    );
    document.onfullscreenchange = null;
    document.onwebkitfullscreenchange = null;
    clearInterval(this.refreshTimer_);
    clearTimeout(this.animationTimeout_);
    this.get('timeSlider').destroy();
    this.get('map').setTarget(null);
    this.set('map', null);
  }

  /**
   *
   * @param coordinate
   * @param source
   * @param destination
   * @returns {import("./coordinate.js").Coordinate}
   */
  static transform(coordinate, source, destination) {
    proj4.defs(
      'EPSG:3067',
      '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    );
    proj4.defs(
      'EPSG:3035',
      '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs'
    );
    proj4.defs(
      'EPSG:3395',
      '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'
    );
    register(proj4);
    return transform(coordinate, source, destination);
  }
}

export default MetOClient;
