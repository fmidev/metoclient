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
import type BaseLayer from 'ol/layer/Base';
import type { EventsKey } from 'ol/events';
import type Control from 'ol/control/Control';
import type Interaction from 'ol/interaction/Interaction';
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
 * Augment Document to include webkit fullscreen property.
 */
declare global {
  interface Document {
    webkitCurrentFullScreenElement?: Element | null;
  }
  interface HTMLElement {
    onwebkitfullscreenchange: ((this: HTMLElement, ev: Event) => any) | null;
  }
}

/** Configuration for a single layer. */
interface LayerConfig {
  id: string;
  source: string;
  url?: Record<string, any>;
  time?: {
    source?: string;
    range?: string;
    data?: number[];
    name?: string;
    offset?: string;
  };
  type?: string;
  metadata?: {
    type?: string;
    title?: string;
    legendUrl?: string;
    legendVisible?: boolean;
    tags?: string[];
    timeProperty?: string;
  };
  opacity?: number;
  visibility?: string;
  timeout?: number;
  previous?: string;
  next?: string;
  legendTitle?: string;
  legendUrl?: string;
  [key: string]: any;
}

/** Source configuration. */
interface SourceConfig {
  type?: string;
  tiles?: string[];
  tileSize?: number | number[];
  times?: number[];
  capabilities?: string;
  server?: string;
  data?: string | object;
  [key: string]: any;
}

/** Capabilities entry. */
interface CapabilitiesEntry {
  updated: number;
  type: string;
  server: string | null;
  data: any;
  startTime: number;
  endTime: number;
  query: Record<string, string>;
}

/** Vector config (Mapbox Style Spec structure). */
interface VectorConfig {
  version: number;
  sources: Record<string, any>;
  layers: LayerConfig[];
  sprite?: string;
}

/** Legend entry. */
interface LegendEntry {
  title: string;
  url: string | null;
}

/** Play options for animation. */
interface PlayOptions {
  delay?: number;
  periodDelay?: number;
}

/** Main MetOClient configuration object. */
interface MetOClientConfig {
  center: number[];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  minExtent: number[];
  projection: string;
  metadata: {
    refreshInterval?: string;
    tags: string[];
  };
  transition: {
    delay?: number;
    [key: string]: any;
  };
  sources: Record<string, SourceConfig>;
  layers: LayerConfig[];
  time: number | null;
  timeZone: string;
  timeZoneLabel: string;
  timeout: number;
  target: string;
  periodDelay: number;
  locale: string;
  texts: Record<string, string>;
  resolutions?: number[];
  container?: string;
  tags?: string[];
  rotation?: number;
  extent?: number[];
  sprite?: string;
  timeSliderContainerId?: string;
  refreshInterval?: string;
  [key: string]: any;
}

/**
 * @classdesc Main MetOClient class for creating animated weather maps.
 */
export class MetOClient extends BaseObject {
  private config_!: MetOClientConfig;

  private vectorConfig_: VectorConfig | null;

  private status_: Record<string | number, string>;

  private resolutionOnEnterFullScreen_: number | null | undefined;

  private delay_: number;

  private periodDelay_: number;

  private times_: number[];

  private playingListener_: EventsKey | null;

  private previousListener_: EventsKey | null;

  private nextListener_!: EventsKey;

  private timeListener_: EventsKey | null;

  private visibilityListener_: ((this: Document, ev: Event) => void) | null;

  private renderComplete_: boolean;

  private updateNeeded_: boolean;

  private waitingRender_: number;

  private refreshInterval_: number;

  private extent_: (number | null)[];

  private resizeDetector_: elementResizeDetectorMaker.Erd;

  private capabilities_: Record<string, CapabilitiesEntry>;

  private legends_: Record<string, LegendEntry>;

  private selectedLegend_: string;

  private layerSwitcherWatcher: ElementVisibilityWatcher | null;

  private delayLoop_: boolean;

  private refreshTimer_: ReturnType<typeof setInterval> | null;

  private animationTimeout_: ReturnType<typeof setTimeout> | null;

  private layerListeners_: EventsKey[];

  private sourceListeners_: EventsKey[];

  private optionsListener_: EventsKey;

  /**
   * @param {object} options Map options.
   */
  constructor(options: Record<string, any> = {}) {
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
    this.optionsListener_ = (this as any).on('change:options', () => {
      this.postProcessOptions();
      this.refresh_();
    }) as EventsKey;
    if (this.config_.metadata.tags.includes(constants.TAG_RENDER_IMMEDIATELY)) {
      this.render();
    }
  }

  /**
   * Post-process and normalize configuration options.
   */
  postProcessOptions(): void {
    const options = this.get('options') as Record<string, any>;
    this.config_ = assign(
      {},
      constants.DEFAULT_OPTIONS,
      options
    ) as unknown as MetOClientConfig;
    if (this.config_.tags != null) {
      this.config_.metadata.tags = this.config_.tags;
    }
    this.config_.texts = assign(
      {},
      constants.DEFAULT_OPTIONS.texts,
      options?.texts?.[this.config_.locale] ?? options.texts
    ) as Record<string, string>;
    this.config_.transition = assign(
      {},
      constants.DEFAULT_OPTIONS.transition,
      options.transition
    ) as MetOClientConfig['transition'];
    if (options.target == null && options.container != null) {
      this.config_.target = this.config_.container as string;
    }
    if (this.config_.resolutions == null) {
      if (
        (constants.PROJECTION_RESOLUTIONS as Record<string, any>)[
          this.config_.projection
        ] != null
      ) {
        this.config_.resolutions = (
          constants.PROJECTION_RESOLUTIONS as Record<string, any>
        )[this.config_.projection];
      } else {
        const projExtent = getProjection(this.config_.projection)!.getExtent();
        const startResolution = getWidth(projExtent) / 256;
        const numResolutions = this.config_.maxZoom - this.config_.minZoom + 1;
        const resolutions = new Array(numResolutions);
        for (let i = 0, ii = resolutions.length; i < ii; i += 1) {
          resolutions[i] = startResolution / 2 ** i;
        }
        this.config_.resolutions = resolutions;
      }
    }
    this.config_.layers.forEach(
      (layer: LayerConfig, index: number, layers: LayerConfig[]) => {
        if (
          layer != null &&
          layer.url != null &&
          typeof layer.url.layers === 'string'
        ) {
          layers[index].url!.layers = layer.url.layers.replace(/\s/g, '');
        }
        layer.timeout = this.config_.timeout;
      }
    );
  }

  /**
   * Set a property value.
   * @param {string} key Property key.
   * @param {object | string | number | boolean | null} value Property value.
   * @param {boolean} silent Whether to suppress change event.
   */
  set(key: string, value: any, silent?: boolean): void {
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
   * Get the vector configuration.
   * @returns {VectorConfig} Vector config.
   * @private
   */
  private getVectorConfig_(): VectorConfig {
    this.vectorConfig_ = this.config_.layers.reduce(
      (vectorConfig: VectorConfig, layer: LayerConfig) => {
        const source = this.config_.sources[layer.source];
        if (
          source != null &&
          layer.url == null &&
          ['geojson', 'vector', 'raster'].includes(source.type as string)
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
    );
    return this.vectorConfig_;
  }

  /**
   * Render the animation map based on current configuration.
   * @returns {Promise} Promise object representing rendered map.
   */
  render(): Promise<Map | void> {
    return this.updateCapabilities_()
      .then(() => {
        this.clear_();
        this.updateTimes_();
        let defaultTime = this.times_[0];
        const realWorldTime = Date.now();
        let anyFuture = false;
        this.times_.some((time: number) => {
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
        Object.keys(this.config_.sources).forEach((source: string) => {
          if (
            this.config_.sources[source].times != null &&
            this.config_.sources[source].times!.length > 0
          ) {
            this.config_.sources[source].tiles = updateSourceTime(
              this.config_.sources[source].tiles as string[],
              this.config_.sources[source].times!.includes(defaultTime)
                ? defaultTime
                : this.config_.sources[source].times![0]
            );
          }
        });
        this.vectorConfig_ = this.getVectorConfig_();
        return this.updateMap_()
          .then((map: any) => {
            // Limit bounds after refresh
            const visibleTimes = this.times_.reduce(
              (foundVisibleTimes: number[], time: number) => {
                if (this.isVisibleTime_(time)) {
                  foundVisibleTimes.push(time);
                }
                return foundVisibleTimes;
              },
              []
            );
            const [firstVisibleTime] = visibleTimes;
            if ((this.config_.time as number) < firstVisibleTime) {
              this.config_.time = firstVisibleTime;
            }
            const lastTimeIndex = visibleTimes.length - 1;
            if ((this.config_.time as number) > visibleTimes[lastTimeIndex]) {
              this.config_.time = visibleTimes[lastTimeIndex];
            }
            map.set('time', this.config_.time);
            if (this.config_.metadata.tags.includes(constants.TAG_AUTOPLAY)) {
              this.config_.metadata.tags = this.config_.metadata.tags.filter(
                (tag: string) => tag !== constants.TAG_AUTOPLAY
              );
              this.play();
            }
            return map as Map;
          })
          .catch((error: any) => {
            console.error(error);
          });
      })
      .catch((error: any) => {
        console.error(error);
      });
  }

  /**
   * Refresh the map by re-rendering with current configuration.
   * @private
   */
  private refresh_(): void {
    const map = this.get('map') as Map | null;
    if (map != null) {
      const layers = map.getLayers().getArray();
      layers.forEach((layer: BaseLayer) => {
        const source = (layer as any).getSource();
        const time = source.get(constants.TIME);
        if (time != null) {
          source.set(constants.TIME, null);
        }
        const id = layer.get('id') as string | undefined;
        if (id != null && !id.startsWith(constants.METOCLIENT_PREFIX)) {
          const config = this.config_.layers.find(
            (layerConfig: LayerConfig) =>
              layerConfig.id === layer.get(constants.ID)
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
        this.config_.center = view.getCenter() as number[];
        this.config_.zoom = view.getZoom() as number;
        this.config_.rotation = view.getRotation();
      }
    }
    const timeSlider = this.get('timeSlider') as any;
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
      map!.renderSync();
    });
  }

  /**
   * Update capabilities from WMS/WMTS services.
   * @returns {Promise<void>} Promise.
   * @private
   */
  private async updateCapabilities_(): Promise<void> {
    const updateTime = Date.now();
    const responses = await Promise.all(
      Object.entries(
        this.config_.layers.reduce(
          (capabilities: Record<string, any>, layer: LayerConfig) => {
            if (layer.source == null) {
              return capabilities;
            }
            const sourceIds: string[] = [layer.source];
            let timeData: number[] | undefined;
            if (layer.time != null) {
              if (
                layer.time.source != null &&
                !sourceIds.includes(layer.time.source)
              ) {
                sourceIds.push(layer.time.source);
              }
              if (layer.time.range != null) {
                timeData = parseTimes(layer.time.range, null);
              }
            }
            sourceIds.forEach((sourceId: string) => {
              const source = this.config_.sources[sourceId];
              if (source == null) {
                return;
              }
              const sourceCapabilitiesUrl = getSourceCapabilitiesUrl(source);
              if (sourceCapabilitiesUrl == null) {
                return;
              }
              let url: string;
              let query: Record<string, string> = {};
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
                type = layer.url!.service.toLowerCase();
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
                const [firstTime] = timeData;
                if (firstTime < capabilities[url].startTime) {
                  capabilities[url].startTime = firstTime;
                }
                const maxTimeIndex = timeData.length - 1;
                if (timeData[maxTimeIndex] > capabilities[url].endTime) {
                  capabilities[url].endTime = timeData[maxTimeIndex];
                }
              }
            });
            return capabilities;
          },
          {} as Record<string, any>
        )
      ).map(([capabKey, capabValue]: [string, any]) => {
        this.capabilities_[capabKey] = capabValue;
        const params: Record<string, string> = {};
        Object.keys(capabValue.query).forEach((key: string) => {
          params[key.toLowerCase()] = capabValue.query[key];
        });
        if (params.service == null) {
          params.service = capabValue.type;
        }
        params.request = 'GetCapabilities';
        (['startTime', 'endTime'] as const).forEach((timeParam) => {
          if (
            params.service === 'wms' &&
            capabValue.server === constants.SMARTMET_SERVER
          ) {
            const timeISO = DateTime.fromMillis(capabValue[timeParam])
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
        const url = `${capabKey}?${Object.keys(params)
          .map((key: string) => `${key}=${params[key]}`)
          .join('&')}`;
        return ajax({
          url,
          crossDomain: true,
          contentType: 'text/plain',
          /** @param {object} jqxhr The request object. */
          beforeSend(jqxhr) {
            jqxhr.requestURL = url;
          },
        });
      })
    );
    responses.forEach((response: any) => {
      if (
        response.responseText != null &&
        response.requestURL.includes(constants.GET_CAPABILITIES_QUERY)
      ) {
        let capabKey: string = response.requestURL.split('?')[0];
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
          typeof (CapabilitiesReader as any)[
            this.capabilities_[capabKey].type
          ] === 'function'
        ) {
          this.capabilities_[capabKey].data = (CapabilitiesReader as any)[
            this.capabilities_[capabKey].type
          ](response.responseText);
        }
      }
    });
    Object.keys(this.capabilities_).forEach((capabilitiesKey: string) => {
      if (
        this.capabilities_[capabilitiesKey] != null &&
        this.capabilities_[capabilitiesKey].updated < updateTime
      ) {
        delete this.capabilities_[capabilitiesKey];
      }
    });
  }

  /**
   * Check if a layer is tiled.
   * @param {object} layer Layer configuration.
   * @returns {boolean} Whether layer is tiled.
   * @private
   */
  private isTiledLayer_(layer: LayerConfig): boolean {
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
    let tiled: boolean[] = Array.isArray(source.tileSize)
      ? (source.tileSize as number[]).map(
          (tileSize: number) => Number(tileSize) > 0
        )
      : new Array(2).fill(Number(source.tileSize) > 0);
    if (Array.isArray(source.tiles)) {
      // Todo: Handle also other indexes
      const url = new Url(source.tiles[0].toLowerCase());
      tiled = ['width', 'height'].map(
        (measure: string, index: number) =>
          (url.query != null &&
            url.query[measure] !== undefined &&
            Number(url.query[measure]) > 0) ||
          tiled[index]
      );
    }
    if (layer.url != null) {
      ['width', 'height'].forEach((measure: string, index: number) => {
        if (layer.url![measure] !== undefined) {
          tiled[index] = Number(layer.url![measure]) > 0;
        }
      });
    }
    return tiled.every(Boolean);
  }

  /**
   * Check if a layer is an animation layer.
   * @param {BaseLayer} layer OpenLayers layer.
   * @returns {boolean} Whether the layer is an animation layer.
   * @private
   */
  private isAnimationLayer_(layer: BaseLayer): boolean {
    return (
      layer.get('times') != null &&
      !(layer.get('id') as string).startsWith(constants.METOCLIENT_PREFIX)
    );
  }

  /**
   * Get the layer type for a layer configuration.
   * @param {object} layer Layer configuration.
   * @returns {string} Layer type string.
   * @private
   */
  private getLayerType_(layer: LayerConfig): string {
    if (this.isTiledLayer_(layer)) {
      return 'tiled';
    }
    if (layer.type != null && layer.type !== 'raster') {
      return layer.type;
    }
    return 'image';
  }

  /**
   * Create an OpenLayers layer from a layer configuration.
   * @param {object} layerConfig Layer configuration.
   * @param {number | null} time Time value.
   * @param {string} postfix Layer id postfix.
   * @returns {BaseLayer | null} Created layer or null.
   * @private
   */
  private createLayer_(
    layerConfig: LayerConfig,
    time: number | null = this.config_.time,
    postfix = ''
  ): BaseLayer | null {
    const layerType = this.getLayerType_(layerConfig);
    if ((LayerCreator as any)[layerType] == null) {
      return null;
    }
    const source = this.config_.sources[layerConfig.source];
    const timeDefined =
      layerConfig.time != null && layerConfig.time.data != null;
    const postfixDefined = postfix.length > 0;
    if (postfixDefined && !timeDefined) {
      return null;
    }
    const options: any = { ...this.config_ };
    if (timeDefined) {
      options.time = time;
      if (!layerConfig.time!.data!.includes(options.time)) {
        options.time = layerConfig.time!.data!.reduce(
          (prevT: number, t: number) => {
            let prevTime = prevT;
            if (t < (this.config_.time as number) && t > prevTime) {
              prevTime = t;
            }
            return prevTime;
          },
          layerConfig.time!.data![0]
        );
      }
    }
    const tiles = source.tiles != null ? source.tiles[0].split('?')[0] : null;
    const url =
      source.capabilities != null && source.capabilities.length > 0
        ? source.capabilities.split('?')[0]
        : tiles;
    const layer: BaseLayer | null = (LayerCreator as any)[layerType](
      layerConfig,
      options,
      url != null ? this.capabilities_[url] : null
    );
    if (layer != null) {
      this.layerListeners_.push(
        layer.on('change:visible', () => {
          const visible = layer.getVisible();
          ['previous', 'next'].forEach((relative: string) => {
            this.setRelativesVisible_(layer, relative, visible);
            const previousLayer = layer.get(
              constants.PREVIOUS
            ) as BaseLayer | null;
            if (previousLayer != null) {
              previousLayer.setVisible(visible);
            }
            const nextLayer = layer.get(constants.NEXT) as BaseLayer | null;
            if (nextLayer != null) {
              nextLayer.setVisible(visible);
            }
          });
          if (this.isAnimationLayer_(layer)) {
            if (!this.isVisibleTime_(this.config_.time as number)) {
              const nextTime = this.getNextTime_();
              const prevTime = this.getPrevTime_();
              const newTime =
                Math.abs(nextTime - (this.config_.time as number)) <
                Math.abs((this.config_.time as number) - prevTime)
                  ? nextTime
                  : prevTime;
              if (newTime != null) {
                (this.get('map') as Map).set('time', newTime);
              }
            }
            this.clearTimeStatuses_();
            this.updateTimeSlider_();
          }
        }) as EventsKey
      );
      if (timeDefined) {
        layer.set('times', layerConfig.time!.data);
      }
      layer.set(
        constants.OPACITY,
        layerConfig.opacity != null ? layerConfig.opacity : 1
      );
      const id = layer.get('id') as string;
      layer.set(constants.ID, id);
      if (postfixDefined) {
        layer.set('id', `metoclient:${id}${postfix}`);
        layer.set('title', '');
        MetOClient.hideLayer_(layer);
      } else {
        const prevLayerId = layer.get('previous') as string | undefined;
        const prevLayer =
          prevLayerId != null && prevLayerId.length > 0
            ? this.config_.layers.find(
                (configLayer: LayerConfig) => configLayer.id === prevLayerId
              )
            : null;
        const prevTimes =
          prevLayer != null && prevLayer.time != null
            ? prevLayer.time.data || []
            : [];
        if (prevTimes.includes(this.config_.time as number)) {
          MetOClient.hideLayer_(layer);
        }
      }
    }
    return layer;
  }

  /**
   * Create a combined title for the layer switcher.
   * @param {object} layerConfig Layer configuration.
   * @returns {string} Combined layer switcher title.
   * @private
   */
  private createLayerSwitcherTitle_(layerConfig: LayerConfig): string {
    let title: string = layerConfig.metadata!.title || '';
    const layersConfig = this.config_.layers;
    const nextLayerId =
      layerConfig.next != null
        ? layerConfig.next
        : [
            this.config_.layers.find(
              (layer: LayerConfig) => layer.previous === layerConfig.id
            ),
          ].map((l) => (l == null ? null : l.id))[0];
    const nextLayerConfig =
      nextLayerId != null && nextLayerId.length > 0
        ? layersConfig.find((layer: LayerConfig) => layer.id === nextLayerId)
        : null;
    const nextTitle =
      nextLayerConfig != null
        ? this.createLayerSwitcherTitle_(nextLayerConfig)
        : '';
    if (nextTitle != null && nextTitle.length > 0 && title !== nextTitle) {
      title += ` / ${nextTitle}`;
    }
    layerConfig.metadata!.title = '';
    return title;
  }

  /**
   * Set visibility of relative layers recursively.
   * @param {BaseLayer} layer Base layer.
   * @param {string} relative Relative direction ('previous' or 'next').
   * @param {boolean} visible Visibility state.
   * @private
   */
  private setRelativesVisible_(
    layer: BaseLayer,
    relative: string,
    visible: boolean
  ): void {
    const relativeLayerId = layer.get(relative) as string | undefined;
    const layers = (this.get('map') as Map).getLayers().getArray();
    const relativeLayer =
      relativeLayerId != null && relativeLayerId.length > 0
        ? layers.find((l: BaseLayer) => l.get('id') === relativeLayerId)
        : null;
    if (relativeLayer != null) {
      relativeLayer.setVisible(visible);
      this.setRelativesVisible_(relativeLayer, relative, visible);
      const previousLayer = relativeLayer.get(
        constants.PREVIOUS
      ) as BaseLayer | null;
      if (previousLayer != null) {
        previousLayer.setVisible(visible);
      }
      const nextLayer = relativeLayer.get(constants.NEXT) as BaseLayer | null;
      if (nextLayer != null) {
        nextLayer.setVisible(visible);
      }
    }
  }

  /**
   * Create OpenLayers layer collection from configuration.
   * @returns {Collection} Collection of layers.
   * @private
   */
  private createLayers_(): Collection<BaseLayer> {
    const baseMapConfigs = this.config_.layers.filter(
      (layerConfig: LayerConfig) =>
        layerConfig != null &&
        layerConfig.metadata != null &&
        layerConfig.metadata.type != null &&
        layerConfig.metadata.type.toLowerCase() === constants.BASE_MAP
    );
    const lastVisibleBaseMapIndex = baseMapConfigs.reduce(
      (
        prevVisibleBaseMapIndex: number,
        baseMapConfig: LayerConfig,
        index: number
      ) =>
        baseMapConfig.visibility === constants.VISIBLE
          ? index
          : prevVisibleBaseMapIndex,
      baseMapConfigs.length - 1
    );
    baseMapConfigs.forEach((baseMapConfig: LayerConfig, index: number) => {
      baseMapConfig.visibility =
        index === lastVisibleBaseMapIndex
          ? constants.VISIBLE
          : constants.NOT_VISIBLE;
    });
    const layers = new Collection<BaseLayer>(
      this.config_.layers
        .map((layerConfig: LayerConfig) => {
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
        .reduce((olLayers: BaseLayer[], layerConfig: LayerConfig) => {
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
              (lowerCased: Record<string, any>, key: string) => {
                lowerCased[key.toLowerCase()] = layerConfig.url![key];
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
    layers
      .getArray()
      .forEach((layer: BaseLayer, index: number, layersArray: BaseLayer[]) => {
        const opacity = layer.get(constants.OPACITY) as number;
        if (layer.get('times') == null) {
          layers.item(index).setOpacity(opacity);
        } else {
          const source = (layer as any).getSource();
          const time = source.get(constants.TIME);
          if (time === this.config_.time) {
            const previousId = layer.get('previous') as string | undefined;
            if (previousId != null && previousId.length > 0) {
              const previous = layersArray.find(
                (l: BaseLayer) => l.get('id') === previousId
              );
              const previousTimes = previous!.get('times') as number[];
              if (!previousTimes.includes(this.config_.time as number)) {
                layers.item(index).setOpacity(opacity);
              }
            }
          }
        }
      });
    return layers;
  }

  /**
   * Set layer visibility by adjusting opacity.
   * @param {BaseLayer} layer OpenLayers layer.
   * @param {boolean} visible Visibility state.
   * @private
   */
  private setVisible_(layer: BaseLayer, visible: boolean): void {
    if (visible) {
      MetOClient.showLayer_(layer);
    } else {
      MetOClient.hideLayer_(layer);
    }
  }

  /**
   * Show a layer by restoring its opacity.
   * @param {BaseLayer} layer OpenLayers layer.
   * @private
   */
  static showLayer_(layer: BaseLayer): void {
    let opacity = layer.get(constants.OPACITY) as number | undefined;
    if (opacity == null) {
      opacity = 1;
    }
    layer.setOpacity(opacity);
  }

  /**
   * Hide a layer by setting its opacity to zero.
   * @param {BaseLayer} layer OpenLayers layer.
   * @private
   */
  static hideLayer_(layer: BaseLayer): void {
    layer.setOpacity(0);
  }

  /**
   * Create the map view.
   * @returns {View} View.
   * @private
   */
  private createView_(): View {
    const viewOptions: any = { ...this.config_ };
    delete viewOptions.sources;
    delete viewOptions.layers;
    const view = new View(viewOptions);
    view.on('change:resolution', () => {
      if (
        !document.fullscreenElement &&
        !(document as Document).webkitCurrentFullScreenElement
      ) {
        this.resolutionOnEnterFullScreen_ = view.getResolution();
      }
    });
    this.resolutionOnEnterFullScreen_ = view.getResolution();
    return view;
  }

  /**
   * Check if a time is visible in any layer.
   * @param {number} time Time value to check.
   * @returns {boolean} Whether the time is visible.
   * @private
   */
  private isVisibleTime_(time: number): boolean {
    const map = this.get('map') as Map | null;
    return (
      map != null &&
      map
        .getLayers()
        .getArray()
        .some(
          (layer: BaseLayer) =>
            layer.getVisible() &&
            layer.get('times') != null &&
            (layer.get('times') as number[]).includes(time)
        )
    );
  }

  /**
   * Clear time loading statuses for all times except the current one.
   * @private
   */
  private clearTimeStatuses_(): void {
    const map = this.get('map') as Map | null;
    if (map == null) {
      return;
    }
    map
      .getLayers()
      .getArray()
      .forEach((layer: BaseLayer) => {
        const source = (layer as any).getSource();
        source.set(constants.LOADING_ERROR, false);
      });
    Object.keys(this.status_)
      .filter((key: string) => Number(key) !== this.config_.time)
      .forEach((key: string) => {
        this.status_[key] = '';
      });
  }

  /**
   * Update the time slider visualization.
   * @param {boolean} forceUpdate Whether to force a full update.
   * @private
   */
  private updateTimeSlider_(forceUpdate = false): void {
    (this.get('timeSlider') as any).updateTimeLoaderVis(
      this.times_.map((time: number) => ({
        endTime: time,
        status: this.status_[time],
        active: this.isVisibleTime_(time),
      })),
      forceUpdate
    );
  }

  /**
   * Handle render completion for the current time.
   * @private
   */
  private currentTimeRendered_(): void {
    const map = this.get('map') as Map | null;
    if (map == null) {
      return;
    }
    const layers = map
      .getLayers()
      .getArray()
      .filter((layer: BaseLayer) => layer.get(constants.MAPBOX_SOURCE) == null);
    layers.forEach((layer: BaseLayer) => {
      const times = layer.get('times') as number[] | undefined;
      let visible = times == null || !Array.isArray(times);
      if (!visible) {
        const source = (layer as any).getSource();
        const visibleTime = this.getVisibleTime_(layer);
        if (source.get(constants.TIME) === visibleTime) {
          visible = true;
          const prevLayerId = layer.get('previous') as string | undefined;
          const prevLayer =
            prevLayerId != null && prevLayerId.length > 0
              ? layers.find((l: BaseLayer) => l.get('id') === prevLayerId)
              : null;
          if (prevLayer != null) {
            const prevTimes = prevLayer.get('times') as number[];
            if (
              prevTimes[prevTimes.length - 1] >= (this.config_.time as number)
            ) {
              visible = false;
            }
          }
        }
      }
      this.setVisible_(layer, visible);
    });
    let loadingError = false;
    layers
      .filter((layer: BaseLayer) => layer.getOpacity() > 0)
      .forEach((layer: BaseLayer) => {
        const source = (layer as any).getSource();
        if (source.get(constants.LOADING_ERROR)) {
          loadingError = true;
        }
      });
    this.status_[this.config_.time as number] = loadingError
      ? constants.STATUS_ERROR
      : constants.STATUS_SUCCESS;
    this.updateTimeSlider_();
    if (this.updateNeeded_) {
      this.updateNeeded_ = false;
      this.renderComplete_ = true;
      this.timeUpdated_();
    } else if (this.config_.time != null) {
      const prevTime = this.getPrevTime_();
      const nextTime = this.getNextTime_();
      layers
        .filter((layer: BaseLayer) => {
          const times = layer.get('times') as number[] | undefined;
          if (times == null || !Array.isArray(times) || times.length === 0) {
            return false;
          }
          return !(layer.get('id') as string).startsWith(
            constants.METOCLIENT_PREFIX
          );
        })
        .forEach((layer: BaseLayer) => {
          const layerId = layer.get('id') as string;
          const layerConfig = this.config_.layers.find(
            (lc: LayerConfig) => lc.id === layerId
          );
          let skipPrevious = false;
          let skipNext = false;
          const times = layer.get('times') as number[];
          let layerPrevTime: number | undefined;
          let layerNextTime: number | undefined;
          const previous = layer.get('previous') as string | undefined;
          const next = layer.get('next') as string | undefined;
          if (
            map.get('playing') ||
            (prevTime < times[0] && previous != null && previous.length > 0)
          ) {
            skipPrevious = true;
          } else {
            layerPrevTime = times.includes(prevTime)
              ? prevTime
              : times.reduce(
                  (closestPrevTime: number, time: number) =>
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
                  (closestNextTime: number, time: number) =>
                    time > nextTime && nextTime - time > closestNextTime
                      ? time
                      : closestNextTime,
                  Number.NEGATIVE_INFINITY
                );
            if (layerNextTime < nextTime) {
              layerNextTime = Math.min(...times);
            }
          }
          const mapLayers = map.getLayers();
          let prevLayer = layer.get(constants.PREVIOUS) as BaseLayer | null;
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
            prevLayer!.setVisible(layer.getVisible());
            const idx = mapLayers
              .getArray()
              .findIndex(
                (l: BaseLayer) =>
                  l.get(constants.ID) === layer.get(constants.ID)
              );
            mapLayers.insertAt(idx, prevLayer!);
            layer.set(constants.PREVIOUS, prevLayer);
          }
          if (!skipPrevious && prevLayer != null) {
            const prevSource = (prevLayer as any).getSource();
            if (prevSource.get(constants.TIME) !== layerPrevTime) {
              MetOClient.hideLayer_(prevLayer);
              (SourceUpdater as any)[prevSource.get(constants.OL_CLASS_NAME)](
                prevSource,
                layerPrevTime
              );
            }
          }
          let nextLayer = layer.get(constants.NEXT) as BaseLayer | null;
          if (
            nextLayer == null &&
            layerConfig != null &&
            layerNextTime != null
          ) {
            nextLayer = this.createLayer_(layerConfig, layerNextTime, '-next');
            nextLayer!.setVisible(layer.getVisible());
            const idx = mapLayers
              .getArray()
              .findIndex(
                (l: BaseLayer) =>
                  l.get(constants.ID) === layer.get(constants.ID)
              );
            mapLayers.insertAt(idx, nextLayer!);
            layer.set(constants.NEXT, nextLayer);
          }
          if (!skipNext && nextLayer != null) {
            const nextSource = (nextLayer as any).getSource();
            if (nextSource.get(constants.TIME) !== layerNextTime) {
              MetOClient.hideLayer_(nextLayer);
              (SourceUpdater as any)[nextSource.get(constants.OL_CLASS_NAME)](
                nextSource,
                layerNextTime
              );
            }
          }
        });
      map.renderSync();
      map.once('rendercomplete', () => {
        this.renderComplete_ = true;
        if (this.updateNeeded_) {
          this.updateNeeded_ = false;
          this.timeUpdated_();
        } else if (this.waitingRender_ > 0) {
          clearTimeout(this.animationTimeout_!);
          this.animationTimeout_ = setTimeout(
            this.animate_.bind(this),
            Math.max(this.delay_ - (Date.now() - this.waitingRender_), 0)
          );
        }
      });
    }
  }

  /**
   * Get the layer switcher control.
   * @returns {object | null | undefined} Layer switcher control.
   * @private
   */
  private getLayerSwitcher_():
    | (Control & {
        shownClassName: string;
        showPanel(): void;
        hidePanel(): void;
      })
    | null
    | undefined {
    const map = this.get('map') as Map | null;
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
        (control: Control) =>
          control.get(constants.OL_CLASS_NAME) === 'LayerSwitcher'
      ) as any;
  }

  /**
   * Get the visible time for a layer.
   * @param {BaseLayer} layer OpenLayers layer.
   * @returns {number | null} Visible time.
   * @private
   */
  private getVisibleTime_(layer: BaseLayer): number | null {
    let visibleTime: number | null = null;
    const layerTimes = layer.get('times') as number[] | undefined;
    if (
      layerTimes != null &&
      Array.isArray(layerTimes) &&
      layerTimes.length > 0 &&
      (this.config_.time as number) >= layerTimes[0]
    ) {
      layerTimes.some((time: number) => {
        const notHistory = time >= (this.config_.time as number);
        if (notHistory) {
          visibleTime = time;
        }
        return notHistory;
      });
    }
    return visibleTime;
  }

  /**
   * Get the current time for a feature layer.
   * @param {BaseLayer} featureLayer Feature layer.
   * @returns {number | null} Feature layer time or null.
   * @private
   */
  private getFeatureLayerTime_(featureLayer: BaseLayer): number | null {
    const map = this.get('map') as Map | null;
    if (map == null) {
      return null;
    }
    const mapTime = map.get('time') as number;
    const layerTimes = featureLayer.get('times') as number[];
    const hideAll =
      mapTime < layerTimes[0] || mapTime > layerTimes[layerTimes.length - 1];
    return hideAll
      ? null
      : [...layerTimes].reverse().find((time: number) => time <= mapTime) ??
          null;
  }

  /**
   * Swap layers so that the next layer becomes the main layer.
   * @param {BaseLayer} layer Current main layer.
   * @param {BaseLayer | null} prevLayer Previous layer.
   * @param {BaseLayer} nextLayer Next layer.
   * @private
   */
  private useNextLayer_(
    layer: BaseLayer,
    prevLayer: BaseLayer | null,
    nextLayer: BaseLayer
  ): void {
    const baseId = layer.get(constants.ID) as string;
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
   * Handle time update events and update layer visibility.
   * @private
   */
  private timeUpdated_(): void {
    const map = this.get('map') as Map;
    const layers = map.getLayers().getArray();
    layers
      .filter(
        (layer: BaseLayer) =>
          layer.get(constants.MAPBOX_SOURCE) != null &&
          layer.get('times') != null
      )
      .forEach((featureLayer: BaseLayer) => {
        const layerTime = this.getFeatureLayerTime_(featureLayer);
        (featureLayer as any)
          .getSource()
          .getFeatures()
          .forEach((feature: any) => {
            if (
              layerTime == null ||
              feature.get(constants.TIME) !== layerTime
            ) {
              feature.setStyle(new Style({}));
            } else {
              feature.setStyle(null);
            }
          });
      });
    if (!this.renderComplete_) {
      const mapTime = (this.get('map') as Map).get('time') as number;
      if (this.status_[mapTime] !== constants.STATUS_SUCCESS) {
        this.status_[mapTime] = constants.STATUS_WORKING;
        this.updateTimeSlider_();
      }
      this.updateNeeded_ = true;
      return;
    }
    (this.get('map') as Map).once(
      'rendercomplete',
      this.currentTimeRendered_.bind(this)
    );
    this.config_.time = (this.get('map') as Map).get('time') as number;
    this.status_[this.config_.time] = constants.STATUS_WORKING;
    Object.keys(this.status_).forEach((time: string) => {
      if (
        Number(time) !== this.config_.time &&
        this.status_[time] === constants.STATUS_WORKING
      ) {
        this.status_[time] = '';
      }
    });
    this.updateTimeSlider_();
    layers
      .filter((layer: BaseLayer) => layer.get(constants.MAPBOX_SOURCE) == null)
      .filter((layer: BaseLayer) => {
        const times = layer.get('times') as number[] | undefined;
        if (times == null || !Array.isArray(times) || times.length === 0) {
          return false;
        }
        if (
          (this.config_.time as number) < times[0] ||
          (this.config_.time as number) > times[times.length - 1]
        ) {
          MetOClient.hideLayer_(layer);
          return false;
        }
        const prevLayerId = layer.get('previous') as string | undefined;
        const prevLayer =
          prevLayerId != null && prevLayerId.length > 0
            ? layers.find((l: BaseLayer) => l.get('id') === prevLayerId)
            : null;
        const prevTimes =
          prevLayer != null
            ? (prevLayer.get('times') as number[])
            : ([] as number[]);
        if (prevTimes.includes(this.config_.time as number)) {
          MetOClient.hideLayer_(layer);
          return false;
        }
        return !(layer.get('id') as string).startsWith(
          constants.METOCLIENT_PREFIX
        );
      })
      .forEach((layer: BaseLayer) => {
        const source = (layer as any).getSource();
        const visibleTime = this.getVisibleTime_(layer);
        if (source.get(constants.TIME) === visibleTime) {
          const prevLayer = layer.get(constants.PREVIOUS) as BaseLayer | null;
          if (prevLayer != null) {
            MetOClient.hideLayer_(prevLayer);
          } else {
            this.status_[this.config_.time as number] =
              constants.STATUS_SUCCESS;
            this.updateTimeSlider_();
          }
          const nextLayer = layer.get(constants.NEXT) as BaseLayer | null;
          if (nextLayer != null) {
            MetOClient.hideLayer_(nextLayer);
          }
          MetOClient.showLayer_(layer);
        } else {
          const prevLayer = layer.get(constants.PREVIOUS) as BaseLayer | null;
          const nextLayer = layer.get(constants.NEXT) as BaseLayer | null;
          if (prevLayer != null) {
            const prevSource = (prevLayer as any).getSource();
            if (
              prevSource != null &&
              prevSource.get(constants.TIME) === visibleTime
            ) {
              MetOClient.hideLayer_(layer);
              MetOClient.showLayer_(prevLayer);
              const baseId = layer.get(constants.ID) as string;
              layer.set('id', `metoclient:${baseId}-next`);
              prevLayer.set('id', baseId);
              if (nextLayer != null) {
                nextLayer.set('id', `metoclient:${baseId}-previous`);
              }
              prevLayer.set(constants.PREVIOUS, nextLayer);
              prevLayer.set(constants.NEXT, layer);
              prevLayer.set('title', layer.get('title'));
              layer.set(constants.NEXT, prevLayer);
              layer.set('title', '');
              return;
            }
          }
          if (nextLayer != null) {
            const nextSource = (nextLayer as any).getSource();
            if (nextSource != null) {
              if (nextSource.get(constants.TIME) === visibleTime) {
                MetOClient.hideLayer_(layer);
                MetOClient.showLayer_(nextLayer);
                this.useNextLayer_(layer, prevLayer, nextLayer);
                return;
              }
              this.useNextLayer_(layer, prevLayer, nextLayer);
              (SourceUpdater as any)[nextSource.get(constants.OL_CLASS_NAME)](
                nextSource,
                visibleTime
              );
              return;
            }
          }
          (SourceUpdater as any)[source.get(constants.OL_CLASS_NAME)](
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

  /**
   * Get the layer switcher panel element.
   * @returns {Element | null} Layer switcher panel element or null.
   * @private
   */
  private getLayerSwitcherPanel_(): Element | null {
    return document.querySelector(
      `div#${constants.LAYER_SWITCHER_CONTAINER_ID} div.panel`
    );
  }

  /**
   * Check if the layer switcher panel is visible.
   * @returns {boolean | null} Whether the layer switcher is visible.
   * @private
   */
  private isLayerSwitcherVisible_(): boolean | null {
    const layerSwitcher = this.getLayerSwitcher_();
    if (layerSwitcher == null) {
      return null;
    }
    return document
      .getElementById(constants.LAYER_SWITCHER_CONTAINER_ID)!
      .classList.contains(layerSwitcher.shownClassName);
  }

  /**
   * Update the legend display.
   */
  updateLegend(): void {
    Array.from(
      document.getElementsByClassName(constants.LEGEND_CONTAINER_CLASS)
    ).forEach((legendContainer: Element) => {
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
          legendImage.setAttribute('alt', this.config_.texts.Legend);
          legendFigure.appendChild(legendImage);
          legendContainer.appendChild(legendFigure);
        }
      }
    });
  }

  /**
   * Create the legend chooser UI in the layer switcher panel.
   * @private
   */
  private createLegendChooser_(): void {
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
    legendSelectLabel.innerHTML = this.config_.texts['Legend Selector'];
    legendChooserContainer.appendChild(legendSelectLabel);

    const legendSelect = document.createElement('select');
    legendSelect.setAttribute('id', constants.LEGEND_CHOOSER_SELECT_ID);
    Object.keys(this.legends_).forEach((key: string) => {
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
      layerList.addEventListener('change', (event: Event) => {
        if (
          (event.target as HTMLElement).className !==
          constants.OPACITY_CONTROL_CLASS
        ) {
          this.refineLayerSwitcher_();
        }
      });
    }
  }

  /**
   * Update layer opacity from input event.
   * @param {Event} e Input event.
   * @private
   */
  private updateOpacity_(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (!isNumeric(target.value)) {
      target.value = '100';
    }
    let opacity = Number(target.value) / 100;
    if (opacity < 0.01) {
      target.value = '1';
      opacity = 0.01;
    } else if (opacity > 1) {
      target.value = '100';
      opacity = 1;
    }
    const label = (target.previousSibling as HTMLElement).innerText;
    (this.get('map') as Map)
      .getLayers()
      .getArray()
      .filter(
        (mapLayer: BaseLayer) => mapLayer.get('layerSwitcherTitle') === label
      )
      .forEach((layer: BaseLayer) => {
        layer.set(constants.OPACITY, opacity);
        const layerOpacity = layer.get('opacity') as number;
        if (layerOpacity > 0) {
          layer.setOpacity(opacity);
        }
      });
    this.config_.layers.forEach((layer: LayerConfig, index: number) => {
      if (layer.metadata!.title === label) {
        this.config_.layers[index].opacity = opacity;
      }
    });
  }

  /**
   * Create opacity controls in the layer switcher.
   * @private
   */
  private createOpacityControl_(): void {
    const layerSwitcherPanel = this.getLayerSwitcherPanel_();
    if (layerSwitcherPanel == null) {
      return;
    }
    const map = this.get('map') as Map;
    const mapLayers = map.getLayers().getArray();
    (
      layerSwitcherPanel as HTMLElement
    ).className += ` ${constants.OPACITY_CONTAINER_CLASS}`;
    const layerList = layerSwitcherPanel.querySelector('ul');
    if (layerList != null) {
      const layerElements = layerList.getElementsByTagName('li');
      const numLayers = layerElements.length;
      for (let i = 0; i < numLayers; i += 1) {
        const { childNodes } = layerElements[i];
        const numChildnodes = childNodes.length;

        let label = '';
        for (let j = 0; j < numChildnodes; j += 1) {
          if (
            (childNodes[j] as HTMLElement).tagName &&
            (childNodes[j] as HTMLElement).tagName.toLowerCase() === 'label'
          ) {
            label = (childNodes[j] as HTMLElement).innerText;
          }
        }
        if (label.length > 0) {
          let opacity = 1;
          const titleLayer = mapLayers.find(
            (mapLayer: BaseLayer) =>
              mapLayer.get('layerSwitcherTitle') === label
          );
          if (titleLayer != null) {
            const layerOpacity = titleLayer.get(constants.OPACITY) as
              | number
              | undefined;
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
          opacityField.addEventListener(
            'input',
            this.updateOpacity_.bind(this)
          );
          layerElements[i].append(opacityField);
        }
      }
    }
  }

  /**
   * Refine the layer switcher by adding legend chooser and opacity controls.
   * @private
   */
  private refineLayerSwitcher_(): void {
    if (Object.entries(this.legends_).length > 1) {
      this.createLegendChooser_();
    }
    if (this.config_.metadata.tags.includes(constants.TAG_OPACITY_CONTROL)) {
      this.createOpacityControl_();
    }
  }

  /**
   * Create a watcher to detect layer switcher panel visibility changes.
   * @private
   */
  private createLayerSwitcherWatcher_(): void {
    if (this.layerSwitcherWatcher != null) {
      return;
    }
    const layerSwitcherPanel = this.getLayerSwitcherPanel_();
    // A workaround for https://github.com/walkermatt/ol-layerswitcher/issues/209
    if (layerSwitcherPanel != null) {
      this.layerSwitcherWatcher = new ElementVisibilityWatcher();
      this.layerSwitcherWatcher.watch(
        layerSwitcherPanel as HTMLElement,
        (visible: boolean) => {
          if (visible) {
            this.refineLayerSwitcher_();
          }
        }
      );
    }
  }

  /**
   * Create the legend container element in the map DOM.
   * @private
   */
  private createLegendContainer_(): void {
    const mapContainer = document.getElementById(this.config_.target);
    if (mapContainer != null) {
      const legendContainer = document.createElement('div');
      legendContainer.setAttribute('id', constants.LEGEND_CONTAINER_CLASS);
      legendContainer.setAttribute('class', constants.LEGEND_CONTAINER_CLASS);
      mapContainer.appendChild(legendContainer);
    }
  }

  /**
   * Build legend entries from map layers and create the legend container.
   * @private
   */
  private createLegends_(): void {
    const map = this.get('map') as Map | null;
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
      .filter((layer: BaseLayer) => this.isAnimationLayer_(layer))
      .reduce(
        (legendArray: Record<string, LegendEntry>, layer: BaseLayer) => {
          let legendUrl: string | undefined;
          const customLegendUrl = layer.get('legendUrl') as string | undefined;
          if (customLegendUrl != null && customLegendUrl.length > 0) {
            legendUrl = customLegendUrl;
          }
          if (legendUrl == null) {
            const source = (layer as any).getSource();
            if (source != null && typeof source.getLegendUrl === 'function') {
              legendUrl = source.getLegendUrl();
            }
          }
          if (legendUrl != null && legendUrl.length > 0) {
            legendArray[layer.get('id') as string] = {
              title: layer.get('legendTitle') as string,
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
   * Handle fullscreen state changes.
   */
  private handleFullScreen_(): void {
    const map = this.get('map') as Map | null;
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
      !(document as Document).webkitCurrentFullScreenElement
    ) {
      const resolution = view.getResolution()!;
      const newResolution = this.resolutionOnEnterFullScreen_! / resolution;
      view.adjustResolution(newResolution);
      map.once('moveend', () => {
        view.adjustResolution(newResolution);
      });
    }
  }

  /**
   * Create fullscreen event listener.
   * @private
   */
  private createFullScreenListener_(): void {
    const element = document.getElementById(this.config_.target)!;
    element.onfullscreenchange = this.handleFullScreen_.bind(this);
    (element as HTMLElement).onwebkitfullscreenchange =
      this.handleFullScreen_.bind(this);
  }

  /**
   * Initialize the map with controls, listeners, and time slider.
   * @param {Map} map OpenLayers map.
   * @returns {Map} Initialized map.
   * @private
   */
  private initMap_(map: Map): Map {
    this.set('map', map);
    if (!this.config_.metadata.tags.includes(constants.TAG_NO_LAYER_SWITCHER)) {
      const layerSwitcher = new LayerSwitcher({
        tipLabel: this.config_.texts['Layer Switcher'],
        reverse: false,
      });
      layerSwitcher.set(constants.OL_CLASS_NAME, 'LayerSwitcher');
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
          layerSwitcherButton.onmouseover = () => {
            /* noop */
          };
          layerSwitcherButton.onclick = () => {
            const ls = this.getLayerSwitcher_();
            if (this.isLayerSwitcherVisible_()) {
              ls!.hidePanel();
            } else {
              ls!.showPanel();
            }
          };
        }
        const layerSwitcherPanel = this.getLayerSwitcherPanel_();
        if (layerSwitcherPanel != null) {
          (layerSwitcherPanel as HTMLElement).onmouseout = () => {
            /* noop */
          };
        }
      }
    }
    this.createLegends_();
    this.createLayerSwitcherWatcher_();
    this.createFullScreenListener_();
    this.renderComplete_ = true;
    (this.get('timeSlider') as any).createTimeSlider(this.times_);
    this.playingListener_ = (this.get('map') as any).on(
      'change:playing',
      () => {
        if (map.get('playing')) {
          this.animate_();
        }
      }
    ) as EventsKey;
    this.timeListener_ = (map as any).on(
      'change:time',
      this.timeUpdated_.bind(this)
    ) as EventsKey;
    this.nextListener_ = (map as any).on('next', (evt: any) => {
      this.next(evt.force);
    }) as EventsKey;
    this.previousListener_ = (map as any).on('previous', () => {
      this.previous();
    }) as EventsKey;
    map.set('time', this.config_.time);
    this.refreshTimer_ = setInterval(
      this.refresh_.bind(this),
      this.refreshInterval_
    );
    this.updateLegend();
    if (
      typeof document.addEventListener !== 'undefined' ||
      typeof (globalThis as any).hidden !== 'undefined'
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

  /**
   * Handle document visibility state changes for refresh timer.
   * @private
   */
  private handleVisibilityChange_(): void {
    clearInterval(this.refreshTimer_!);
    if (document.visibilityState === 'hidden') {
      return;
    }
    this.refreshTimer_ = setInterval(
      this.refresh_.bind(this),
      this.refreshInterval_
    );
    this.refresh_();
  }

  /**
   * Add times to the internal times array.
   * @param {Array<number>} times Time values to add.
   * @private
   */
  private addTimes_(times: number[]): void {
    if (times != null && Array.isArray(times) && times.length > 0) {
      this.times_ = [...new Set([...this.times_, ...times])].sort();
    }
    const map = this.get('map') as Map | null;
    if (map != null && map.get('time') == null && this.times_.length > 0) {
      const currentTime = Date.now();
      map.set(
        'time',
        this.times_[
          Math.max(
            this.times_.findIndex((time: number) => time > currentTime) - 1,
            0
          )
        ]
      );
    }
  }

  /**
   * Update vector configuration by loading remote data sources.
   * @param {VectorConfig} vectorConfig Vector configuration.
   * @returns {Promise<VectorConfig>} Updated vector configuration.
   * @private
   */
  private updateVectorConfig_(
    vectorConfig: VectorConfig
  ): Promise<VectorConfig> {
    return Promise.all(
      Object.entries(vectorConfig.sources).map((source: [string, any]) => {
        if (typeof source[1].data === 'string') {
          return ajax({
            url: source[1].data,
            crossDomain: true,
          }).then((response: any): [string, any] => [
            source[0],
            {
              data: response,
              type: source[1].type,
            },
          ]);
        }
        return Promise.resolve(source);
      })
    ).then((sources: [string, any][]) => {
      vectorConfig.sources = Object.fromEntries(sources);
      return vectorConfig;
    });
  }

  /**
   * Create vector layers from configuration and add them to the map.
   * @param {Map} map OpenLayers map.
   * @param {VectorConfig} vectorConfig Vector layer configuration.
   * @returns {Promise<Map>} Promise resolving to the updated map.
   * @private
   */
  private createVectorLayers_(
    map: Map,
    vectorConfig: VectorConfig
  ): Promise<Map> {
    return this.updateVectorConfig_(vectorConfig)
      .then((config: VectorConfig) => olms(map, config as any))
      .then((updatedMap: Map) => {
        if (vectorConfig.layers != null) {
          const mapProjection = updatedMap.getView().getProjection().getCode();
          updatedMap
            .getLayers()
            .getArray()
            .filter(
              (layer: BaseLayer) => layer.get(constants.MAPBOX_SOURCE) != null
            )
            .forEach((layer: BaseLayer) => {
              let layerConfig: LayerConfig | undefined;
              const layerTimes: number[] = [];
              let timeProperty: string | undefined;
              const mapboxLayers = layer.get('mapbox-layers') as
                | string[]
                | undefined;
              if (mapboxLayers != null) {
                layer.set('id', mapboxLayers.join('-'));
                const title = mapboxLayers.reduce(
                  (acc: string, layerId: string) => {
                    layerConfig = vectorConfig.layers.find(
                      (l: LayerConfig) => l.id === layerId
                    );
                    if (
                      layerConfig != null &&
                      layerConfig.metadata != null &&
                      layerConfig.metadata.title != null &&
                      layerConfig.metadata.title.length > 0
                    ) {
                      const separator = acc.length > 0 ? ' / ' : '';
                      timeProperty = layerConfig.metadata.timeProperty;
                      return acc + separator + layerConfig.metadata.title;
                    }
                    return acc;
                  },
                  ''
                );
                if (title != null && title.length > 0) {
                  layer.set('title', title);
                }
              }
              const source = (layer as any).getSource();
              /** Update layer and global times. */
              const updateTimes = (): void => {
                if (layerConfig != null) {
                  if (layerConfig.time == null) {
                    layerConfig.time = {};
                  }
                  layerConfig.time.data = layerTimes;
                  layer.set('times', layerConfig.time.data);
                }
                this.addTimes_(layerTimes);
              };
              /** @param {object} feature OpenLayers feature. */
              const initFeature = (feature: any): void => {
                if (timeProperty != null && timeProperty.length > 0) {
                  const time = feature.get(timeProperty);
                  if (time != null && time.length > 0) {
                    const parsedTime = DateTime.fromISO(time).valueOf();
                    if (
                      typeof parsedTime === 'number' &&
                      !Number.isNaN(parsedTime)
                    ) {
                      feature.set(constants.TIME, parsedTime);
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
                source.on('addfeature', (event: any) => {
                  initFeature(event.feature);
                }) as EventsKey
              );
              source.getFeatures().forEach((feature: any) => {
                initFeature(feature);
                if (mapProjection !== 'EPSG:3857') {
                  feature.getGeometry().transform('EPSG:3857', mapProjection);
                }
              });
            });
          if (this.config_.time == null && this.times_.length > 0) {
            [this.config_.time] = this.times_;
          }
        }
        return updatedMap;
      });
  }

  /**
   * Create map interactions based on configuration tags.
   * @returns {Array<Interaction>} Array of map interactions.
   * @private
   */
  private createInteractions_(): Interaction[] {
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
   * Create the OpenLayers map with all layers and controls.
   * @returns {Promise<Map>} Promise resolving to the created map.
   * @private
   */
  private createMap_(): Promise<Map> {
    const interactions = this.createInteractions_();
    this.set(
      'timeSlider',
      new TimeSlider({
        target: this.config_.timeSliderContainerId,
        locale: this.config_.locale,
        buttonPlayText: this.config_.texts.Play,
        buttonPauseText: this.config_.texts.Pause,
        showTimeSlider: true,
        timeZone: this.config_.timeZone,
        timeZoneLabel: this.config_.timeZoneLabel,
        enableMouseWheel: this.config_.metadata.tags.includes(
          constants.TAG_MOUSE_WHEEL_INTERACTIONS
        ),
        meteorologicalMode: !this.config_.metadata.tags.includes(
          constants.TAG_INSTANT_TIMESLIDER
        ),
      } as any)
    );
    const controls: Control[] = [
      new Zoom({
        zoomInLabel: this.config_.texts['Zoom In Label'] as any,
        zoomOutLabel: this.config_.texts['Zoom Out Label'] as any,
        zoomInTipLabel: this.config_.texts['Zoom In'],
        zoomOutTipLabel: this.config_.texts['Zoom Out'],
      }),
      this.get('timeSlider') as Control,
    ];
    if (
      this.config_.metadata.tags.includes(constants.TAG_FULL_SCREEN_CONTROL)
    ) {
      controls.push(
        new FullScreen({
          label: this.config_.texts['Fullscreen Label'] as any,
          labelActive: this.config_.texts['Fullscreen Label Active'] as any,
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
    newMap.on('moveend', () => {
      this.clearTimeStatuses_();
      (this.get('map') as Map).once(
        'rendercomplete',
        this.currentTimeRendered_.bind(this)
      );
    });
    const view = newMap.getView();
    const minZoom = view.getMinZoom();
    let extent = view.calculateExtent();
    while (
      (extent[2] - extent[0] < this.config_.minExtent[0] ||
        extent[3] - extent[1] < this.config_.minExtent[1]) &&
      view.getZoom()! > minZoom
    ) {
      this.config_.zoom = view.getZoom()! - 1;
      view.setZoom(this.config_.zoom);
      extent = view.calculateExtent();
    }
    if (this.resizeDetector_ != null) {
      this.extent_ = this.config_.extent != null ? this.config_.extent : extent;
      this.resizeDetector_.listenTo(
        document.getElementById(this.config_.target)!,
        () => {
          const map = this.get('map') as Map | null;
          if (map == null) {
            return;
          }
          if (this.config_.metadata.tags.includes(constants.TAG_FIXED_EXTENT)) {
            view.fit(this.extent_ as number[], {
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
    if (this.vectorConfig_!.layers.length > 0) {
      return this.createVectorLayers_(newMap, this.vectorConfig_!).then(
        (map: Map) => this.initMap_(map)
      );
    }
    return new Promise((resolve) => {
      resolve(this.initMap_(newMap));
    });
  }

  /**
   * Update the existing map or create a new one.
   * @returns {Promise<Map | void>} Promise resolving to the updated map.
   * @private
   */
  private updateMap_(): Promise<Map | void> {
    const map = this.get('map') as Map | null;
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
            (layer: BaseLayer) =>
              layer.get(constants.ID) == null &&
              layer.get(constants.MAPBOX_SOURCE) == null
          )
      )
    );
    map.setView(this.createView_());
    map.set('time', this.config_.time);
    if (this.vectorConfig_!.layers.length > 0) {
      return this.createVectorLayers_(map, this.vectorConfig_!).then(
        (updatedMap: Map) => {
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
   * Update internal time arrays from layer configurations and capabilities data.
   * @private
   */
  private updateTimes_(): void {
    this.times_ = [];
    this.status_ = {};
    this.config_.layers.forEach((layer: LayerConfig) => {
      if (layer.time != null && layer.time.range != null) {
        const source =
          layer.time.source != null
            ? this.config_.sources[layer.time.source]
            : this.config_.sources[layer.source];
        const capabilities =
          this.capabilities_[
            (source.capabilities != null && source.capabilities.length > 0
              ? source.capabilities
              : source.tiles![0]
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
        let parsedData: number[] = [];
        capabilities.data.Capability.Layer.Layer.filter((element: any) =>
          layer.time!.name != null
            ? layer.time!.name === element.Name
            : [layer.url!.layer, layer.url!.layers].some((layerIds: any) =>
                // Todo: check namespace
                typeof layerIds === 'string'
                  ? layerIds
                      .split(',')
                      .some(
                        (layerId: string) =>
                          layerId.slice(-element.Name.length) === element.Name
                      )
                  : false
              )
        ).forEach((layerElement: any) => {
          const data =
            layerElement != null && layerElement.Dimension != null
              ? layerElement.Dimension.find(
                  (element: any) => element.name.toLowerCase() === 'time'
                ).values
              : [];
          parsedData = [...new Set(parsedData.concat(parseTimes(data, null)))];
        });
        const times = parseTimes(
          layer.time.range,
          layer.time.offset ?? null,
          parsedData
        );
        const currentTime = Date.now();
        let historyData: number[] | undefined;
        let historyIndex = 0;
        let futureData: number[] | undefined;
        let futureIndex = 0;
        times.forEach((time: number, index: number) => {
          if (!Number.isNaN(time) && !Number.isFinite(time)) {
            if (time < 0) {
              if (historyData == null) {
                historyData = parsedData
                  .filter((t: number) => t < currentTime)
                  .sort()
                  .reverse();
              }
              times[index] = historyData[historyIndex];
              historyIndex += 1;
            } else {
              if (futureData == null) {
                futureData = parsedData
                  .filter((t: number) => t >= currentTime)
                  .sort();
              }
              times[index] = futureData[futureIndex];
              futureIndex += 1;
            }
          }
        });
        times.sort();
        layer.time.data = times.filter((time: number) =>
          parsedData.includes(time)
        );
        this.addTimes_(layer.time.data);
      }
    });
    this.times_.forEach((time: number) => {
      this.status_[time] = '';
    });
  }

  /**
   * Start animation playback.
   * @param {PlayOptions} options Play options.
   */
  play(options?: PlayOptions): void {
    if (options != null && Math.sign(options.delay!)) {
      this.delay_ = options.delay!;
    }
    if (options != null && Math.sign(options.periodDelay!)) {
      this.periodDelay_ = options.periodDelay!;
    }
    (this.get('map') as Map).set('playing', true);
  }

  /**
   * Advance the animation to the next frame if render is complete.
   * @private
   */
  private animate_(): void {
    if ((this.get('map') as Map).get('playing')) {
      if (this.renderComplete_) {
        clearTimeout(this.animationTimeout_!);
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
   * Get the next visible time step.
   * @returns {number} Next time.
   * @private
   */
  private getNextTime_(): number {
    const { time } = this.config_;
    const numTimes = this.times_.length;
    let timeIndex: number | undefined;
    for (let i = 0; i < numTimes; i += 1) {
      if (this.isVisibleTime_(this.times_[i])) {
        if (this.times_[i] > (time as number)) {
          timeIndex = i;
          break;
        }
        if (timeIndex == null) {
          timeIndex = i;
        }
      }
    }
    return this.times_[timeIndex!];
  }

  /**
   * Move to the next time step.
   * @param {boolean} force Whether to force the step.
   */
  next(force?: boolean): void {
    if (!this.isReady_()) {
      return;
    }
    const map = this.get('map') as Map;
    const currentTime = map.get('time') as number;
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
   * Get the previous visible time step.
   * @returns {number} Previous time.
   * @private
   */
  private getPrevTime_(): number {
    const { time } = this.config_;
    const lastTimeIndex = this.times_.length - 1;
    let timeIndex: number | undefined;
    for (let i = lastTimeIndex; i >= 0; i -= 1) {
      if (this.isVisibleTime_(this.times_[i])) {
        if (this.times_[i] < (time as number)) {
          timeIndex = i;
          break;
        }
        if (timeIndex == null) {
          timeIndex = i;
        }
      }
    }
    return this.times_[timeIndex!];
  }

  /**
   * Move to the previous time step.
   */
  previous(): void {
    if (!this.isReady_()) {
      return;
    }
    (this.get('map') as Map).set('time', this.getPrevTime_());
  }

  /**
   * Check if the client is ready for operations.
   * @returns {boolean} Whether the client is ready.
   * @private
   */
  private isReady_(): boolean {
    return this.get('map') != null && this.times_.length > 0;
  }

  /**
   * Pause the animation playback.
   */
  pause(): void {
    (this.get('map') as Map).set('playing', false);
  }

  /**
   * Set the active legend by layer id.
   * @param {string} layerId Layer id for the legend.
   */
  setLegend(layerId: string): void {
    this.selectedLegend_ = layerId;
    this.updateLegend();
  }

  /**
   * Stop the animation playback.
   */
  stop(): void {
    this.pause();
  }

  /**
   * Clear layer and source listeners.
   * @private
   */
  private clear_(): void {
    unByKey(this.layerListeners_);
    unByKey(this.sourceListeners_);
  }

  /**
   * Destroy the MetOClient instance and clean up resources.
   */
  destroy(): void {
    this.clear_();
    unByKey(this.playingListener_!);
    unByKey(this.nextListener_);
    unByKey(this.previousListener_!);
    unByKey(this.timeListener_!);
    unByKey(this.optionsListener_);
    if (this.resizeDetector_ != null) {
      this.resizeDetector_.removeAllListeners(
        document.getElementById(this.config_.target)!
      );
    }
    document.removeEventListener(
      'visibilitychange',
      this.visibilityListener_ as EventListener,
      false
    );
    (document as any).onfullscreenchange = null;
    (document as any).onwebkitfullscreenchange = null;
    clearInterval(this.refreshTimer_!);
    clearTimeout(this.animationTimeout_!);
    (this.get('timeSlider') as any).destroy();
    (this.get('map') as Map).setTarget(undefined as any);
    this.set('map', null);
  }

  /**
   * Transform a coordinate from source to destination projection.
   * @param {Array<number>} coordinate Coordinate to transform.
   * @param {string} source Source projection.
   * @param {string} destination Destination projection.
   * @returns {Array<number>} Transformed coordinate.
   */
  static transform(
    coordinate: number[],
    source: string,
    destination: string
  ): number[] {
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
