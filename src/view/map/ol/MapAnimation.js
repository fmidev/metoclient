/**
 * @fileoverview OpenLayers 4 implementation of map view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

// import Interface from 'contracts-es6';
// import Animation from '../../interfaces/Animation';
import jQuery from 'jquery'
import EventEmitter from 'wolfy87-eventemitter'
import { default as proj4 } from 'proj4'
import moment from 'moment-timezone'
import * as constants from '../../../constants'
import LayerSwitcher from './LayerSwitcher'
import _ol_ from 'ol/index'
// #if !process.env.SKIP_OL_COLLECTION
import _ol_Collection_ from 'ol/collection'
// #endif
// #if !process.env.SKIP_OL_CONTROL_ZOOM
import _ol_control_Zoom_ from 'ol/control/zoom'
// #endif
// #if !process.env.SKIP_OL_FEATURE
import _ol_Feature_ from 'ol/feature'
// #endif
// #if !process.env.SKIP_OL_FORMAT_GEOJSON
import _ol_format_GeoJSON_ from 'ol/format/geojson'
// #endif
// #if !process.env.SKIP_OL_FORMAT_GML
import _ol_format_GML_ from 'ol/format/gml'
// #endif
// #if !process.env.SKIP_OL_FORMAT_WFS
import _ol_format_WFS_ from 'ol/format/wfs'
// #endif
// #if !process.env.SKIP_OL_FORMAT_WMSCAPABILITIES
import _ol_format_WMSCapabilities_ from 'ol/format/wmscapabilities'
// #endif
// #if !process.env.SKIP_OL_FORMAT_WMTSCAPABILITIES
import _ol_format_WMTSCapabilities_ from 'ol/format/wmtscapabilities'
// #endif
// #if !process.env.SKIP_OL_GEOM_POINT
import _ol_geom_Point_ from 'ol/geom/point'
// #endif
// #if !process.env.SKIP_OL_INTERACTION
import _ol_Interaction_ from 'ol/interaction'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_DOUBLECLICKZOOM
import _ol_interaction_DoubleClickZoom_ from 'ol/interaction/doubleclickzoom'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_DRAGPAN
import _ol_interaction_DragPan_ from 'ol/interaction/dragpan'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_DRAGROTATE
import _ol_interaction_DragRotate_ from 'ol/interaction/dragrotate'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_DRAGROTATEANDZOOM
import _ol_interaction_DragRotateAndZoom_ from 'ol/interaction/dragrotateandzoom'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_DRAGZOOM
import _ol_interaction_DragZoom_ from 'ol/interaction/dragzoom'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_KEYBOARDPAN
import _ol_interaction_KeyboardPan_ from 'ol/interaction/keyboardpan'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_KEYBOARDZOOM
import _ol_interaction_KeyboardZoom_ from 'ol/interaction/keyboardzoom'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_MOUSEWHEELZOOM
import _ol_interaction_MouseWheelZoom_ from 'ol/interaction/mousewheelzoom'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_PINCHROTATE
import _ol_interaction_PinchRotate_ from 'ol/interaction/pinchrotate'
// #endif
// #if !process.env.SKIP_OL_INTERACTION_PINCHZOOM
import _ol_interaction_PinchZoom_ from 'ol/interaction/pinchzoom'
// #endif
// #if !process.env.SKIP_OL_LAYER_GROUP
import _ol_layer_Group_ from 'ol/layer/group'
// #endif
// #if !process.env.SKIP_OL_LAYER_IMAGE
import _ol_layer_Image_ from 'ol/layer/image'
// #endif
// #if !process.env.SKIP_OL_LAYER_TILE
import _ol_layer_Tile_ from 'ol/layer/tile'
// #endif
// #if !process.env.SKIP_OL_LAYER_VECTOR
import _ol_layer_Vector_ from 'ol/layer/vector'
// #endif
// #if !process.env.SKIP_OL_MAP
import _ol_Map_ from 'ol/map'
// #endif
// #if !process.env.SKIP_OL_OBJECT
import _ol_Object_ from 'ol/object'
// #endif
// #if !process.env.SKIP_OL_OVERLAY
import _ol_Overlay_ from 'ol/overlay'
// #endif
// #if !process.env.SKIP_OL_PROJ
import _ol_Proj_ from 'ol/proj'
// #endif
// #if !process.env.SKIP_OL_SOURCE_IMAGEWMS
import _ol_source_ImageWMS_ from 'ol/source/imagewms'
// #endif
// #if !process.env.SKIP_OL_SOURCE_OSM
import _ol_source_OSM_ from 'ol/source/osm'
// #endif
// #if !process.env.SKIP_OL_SOURCE_STAMEN
import _ol_source_Stamen_ from 'ol/source/stamen'
// #endif
// #if !process.env.SKIP_OL_SOURCE_TILEWMS
import _ol_source_TileWMS_ from 'ol/source/tilewms'
// #endif
// #if !process.env.SKIP_OL_SOURCE_VECTOR
import _ol_source_Vector_ from 'ol/source/vector'
// #endif
// #if !process.env.SKIP_OL_SOURCE_WMTS
import _ol_source_WMTS_ from 'ol/source/wmts'
// #endif
// #if !process.env.SKIP_OL_STYLE_FILL
import _ol_style_Fill_ from 'ol/style/fill'
// #endif
// #if !process.env.SKIP_OL_STYLE_ICON
import _ol_style_Icon_ from 'ol/style/icon'
// #endif
// #if !process.env.SKIP_OL_STYLE_STROKE
import _ol_style_Stroke_ from 'ol/style/stroke'
// #endif
// #if !process.env.SKIP_OL_STYLE_STYLE
import _ol_style_Style_ from 'ol/style/style'
// #endif
// #if !process.env.SKIP_OL_STYLE_TEXT
import _ol_style_Text_ from 'ol/style/text'
// #endif
// #if !process.env.SKIP_OL_TILEGRID_TILEGRID
import _ol_tilegrid_TileGrid_ from 'ol/tilegrid/tilegrid'
// #endif
// #if !process.env.SKIP_OL_TILEGRID_WMTS
import _ol_tilegrid_WMTS_ from 'ol/tilegrid/wmts'
// #endif
// #if !process.env.SKIP_OL_VIEW
import _ol_View_ from 'ol/view'
// #endif

// export default class MapAnimation extends Interface.StrictInterface(Animation) {
export default class MapAnimation {
  /**
   * Constructs OpenLayers 4 based map view.
   * @constructor
   * @param config {object} Configuration for map view.
   * @extends {ol.Object}
   * @implements {fi.fmi.metoclient.ui.animator.view.interfaces.Animation}
   */
  constructor (config) {
    // super();
    // Call to the OpenLayers superclass constructor
    _ol_Object_.call(this)
    this.set('config', config)
    this.set('map', null)
    this.set('layers', [])
    this.set('overlayTitles', [])
    this.set('extent', [0, 0, 0, 0])
    this.set('extentByZoomLevel', null)
    this.set('marker', null)
    this.set('callbacks', null)
    this.set('animationGroups', [])
    this.set('legends', [])
    this.set('legendsCreated', false)
    this.set('pGrp', [])
    this.set('layerSwitcher', null)
    this.set('listenersInitialized', false)
    this.set('updateRequested', Date.now())
    this.set('featureCount', 0)
    this.set('updateVisibility', null)
    this.set('interactionConfig', null)
    this.set('configChanged', false)
    this.viewOptions = {}
    this.asyncLoadQueue = {}
    this.asyncLoadCount = {}
    this.numIntervalItems = {}
    this.loadId = 0
    this.finishedId = 0
    this.actionEvents = new EventEmitter()
    this.variableEvents = new EventEmitter()
    this.loading = false
    // Todo: ignore case sensitivity
    /** @const */
    this.layerTypes = {
      'map': 'map',
      'overlay': 'overlay',
      'observation': 'obs',
      'forecast': 'for',
      'features': 'features'
    }
    /** @const */
    this.updateRequestResolution = 50
    /** @const */
    this.layerResolution = 60 * 1000
  };
}
_ol_.inherits(MapAnimation, _ol_Object_)

/** @inheritDoc */
MapAnimation.prototype.createAnimation = function (layers, capabilities, currentTime, animationTime, animationBeginTime, animationEndTime, animationResolutionTime, animationNumIntervals, callbacks) {
  const config = this.get('config')
  const featureGroupName = config['featureGroupName']
  let isFeatureGroup
  let layerGroups
  let layerGroup
  let numLayerGroups
  let layer
  let numLayers
  let currentLayers
  let currentLayer
  let currentLayerTitle
  let numCurrentLayers
  let currentSource
  let i
  let j
  let k
  if (layers != null) {
    numLayers = layers.length
    const map = this.get('map')
    if (map != null) {
      layerGroups = map.getLayers()
      numLayerGroups = layerGroups.getLength()
      for (i = 0; i < numLayerGroups; i++) {
        layerGroup = layerGroups.item(i)
        if (typeof layerGroup.getLayers !== 'function') {
          continue
        }
        currentLayers = layerGroup.getLayers()
        isFeatureGroup = (layerGroup.get('title') === featureGroupName)
        numCurrentLayers = currentLayers.getLength()
        for (j = 0; j < numCurrentLayers; j++) {
          currentLayer = currentLayers.item(j)
          currentLayerTitle = currentLayer.get('title')
          if (currentLayerTitle == null) {
            continue
          }
          for (k = 0; k < numLayers; k++) {
            layer = layers[k]
            if (layer['title'] === currentLayerTitle) {
              layer['visible'] = currentLayer.getVisible()
              layer['opacity'] = currentLayer.getOpacity()
              if (isFeatureGroup) {
                currentSource = currentLayer.getSource()
                if (currentSource != null) {
                  layers['source'] = currentSource
                }
              }
              break
            }
          }
        }
      }
    }
    this.set('layers', layers)
    this.set('map', null)
  }
  if (currentTime != null) {
    this.set('currentTime', currentTime)
  }
  if (animationTime != null) {
    this.set('animationTime', animationTime)
  }
  if (animationResolutionTime != null) {
    this.set('animationResolutionTime', animationResolutionTime)
  }
  if (animationBeginTime != null) {
    this.set('animationBeginTime', animationBeginTime)
  }
  if (animationEndTime != null) {
    this.set('animationEndTime', animationEndTime)
  }
  if (animationNumIntervals != null) {
    this.set('animationNumIntervals', animationNumIntervals)
  }
  _ol_Proj_.setProj4(proj4)
  if (_ol_Proj_.get('EPSG:3067') == null) {
    this.initEPSG3067Projection()
  }

  if (callbacks != null) {
    this.set('callbacks', callbacks)
  }

  this.set('viewProjection', this.get('config')['projection'])
  // console.log("Start to handle capabilities");
  // console.log(goog.now());
  this.updateStorage()
  this.parameterizeLayers(capabilities)
  // console.log("End capabilities handling");
  // console.log(goog.now());
  this.initMap()
}

/**
 * Performs bidirectional data exchange with local storage.
 */
MapAnimation.prototype.updateStorage = function () {
  const layers = this.get('layers')
  let localStorageOpacity, localStorageVisible
  let project = this.get('config')['project'];
  let i, layer
  let numLayers = layers.length

  for (i = 0; i < numLayers; i++) {
    layer = layers[i]
    if (layer['useSavedOpacity']) {
      localStorageOpacity = this.loadLayerPropertyFromLocalStorage(layer['title'], 'opacity')
      if (localStorageOpacity != null) {
        layer['opacity'] = localStorageOpacity;
      }
    }
    if (layer['opacity'] != null) {
      localStorage.setItem(project+'-'+layer['title']+'-opacity', layer['opacity'])
    }
    if (layer['useSavedVisible']) {
      localStorageVisible = this.loadLayerPropertyFromLocalStorage(layer['title'], 'visible')
      if (localStorageVisible != null) {
        layer['visible'] = localStorageVisible;
      }
    }
    if (layer['visible'] != null) {
      localStorage.setItem(project+'-'+layer['title']+'-visible', layer['visible'])
    }
  }
}

/**
 * Parses time values from capabilities string.
 * @param {Object} layer Layer configuration.
 * @param {string} values Capabilities time definitions.
 */
MapAnimation.prototype.parseCapabTimes = function (layerAnimation, values) {
  let parameters = values.split('/')
  let i, dates, datesLen,capabTime
  if (parameters.length >= 3) {
    layerAnimation['capabBeginTime'] = moment(parameters[0]).valueOf()
    layerAnimation['capabEndTime'] = moment(parameters[1]).valueOf()
    layerAnimation['capabResolutionTime'] = moment.duration(parameters[2]).asMilliseconds()
  } else {
    dates = values.split(',')
    layerAnimation['capabTimes'] = []
    for (i = 0, datesLen = dates.length; i < datesLen; i++) {
      capabTime = moment(dates[i]).valueOf()
      if (jQuery.isNumeric(capabTime)) {
        layerAnimation['capabTimes'].push(capabTime)
      }
    }
    if (layerAnimation['capabTimes'].length > 0) {
      layerAnimation['capabBeginTime'] = layerAnimation['capabTimes'][0]
      layerAnimation['capabEndTime'] = layerAnimation['capabTimes'][layerAnimation['capabTimes'].length - 1]
    }
  }
}

/**
 * Defines type and animation time properties for layers.
 * @param {Object=} capabilities Capabilities for time steps.
 */
MapAnimation.prototype.parameterizeLayers = function (capabilities) {
  const currentTime = /** @type {number} */ (this.get('currentTime'))
  const results = {}
  const layers = this.get('layers')
  let result, numLayers, template, found, i, l, id, len,
    layersCapab, dimension, values, wmsParser, wmtsParser, options
  numLayers = layers.length
  loopLayers: for (i = 0; i < numLayers; i++) {
    template = layers[i]
    // WMTS/tiles
    if (capabilities != null) {
      wmtsParser = new _ol_format_WMTSCapabilities_()
      if ((template['tileCapabilities'] != null) && (capabilities[template['tileCapabilities']] != null)) {
        if (results[template['tileCapabilities']] === undefined) {
          results[template['tileCapabilities']] = wmtsParser.read(capabilities[template['tileCapabilities']])
        }
        options = _ol_source_WMTS_.optionsFromCapabilities(results[template['tileCapabilities']], {
          'layer': template['sourceOptions']['layer'],
          'matrixSet': template['sourceOptions']['matrixSet']
        })
        jQuery.extend(template['sourceOptions'], options)
      }
    }

    // WMS/times
    // Layer is a base layer if its type is defined as 'map'
    // or it doesn't have an animation object or
    // capabilities information should be available but it is not
    if (template['type'] == null) {
      template['type'] = ''
    } else if ([this.layerTypes['map'], this.layerTypes['overlay'], this.layerTypes['features']].includes(template['type'])) {
      continue
    }
    if ((template['className'] != null) && (template['className'].toLowerCase() === 'vector')) {
      template['type'] = this.layerTypes['features']
      continue
    }
    if (template['animation'] == null) {
      template['type'] = this.layerTypes['map']
      continue
    }
    if (template['animation']['beginTime'] == null) {
      template['animation']['beginTime'] = /** @type {number} */ (this.get('animationBeginTime'))
    }
    if (template['animation']['endTime'] == null) {
      template['animation']['endTime'] = /** @type {number} */ (this.get('animationEndTime'))
    }
    if (template['timeCapabilitiesInit'] != null) {
      this.parseCapabTimes(template['animation'], template['timeCapabilitiesInit'])
      template['timeCapabilitiesInit'] = null;
      continue;
    }
    if (template['timeCapabilities'] == null) {
      continue
    }
    if (capabilities == null) {
      continue
    }
    wmsParser = new _ol_format_WMSCapabilities_()
    if (results[template['timeCapabilities']] === undefined) {
      results[template['timeCapabilities']] = wmsParser.read(capabilities[template['timeCapabilities']])
    }
    result = results[template['timeCapabilities']]
    if (typeof result === 'undefined') {
      template['type'] = this.layerTypes['map']
      continue
    }

    if ((typeof result['Capability'] === 'undefined') || (typeof result['Capability']['Layer'] === 'undefined')) {
      template['type'] = this.layerTypes['map']
      continue
    }
    found = false
    layersCapab = result['Capability']['Layer']['Layer']
    // todo: korvaa iffittely paremmalla rakenteella
    // lisäksi yleistä TileWMS
    if (['TileWMS', 'ImageWMS'].includes(template['className'])) {
      id = template['sourceOptions']['params']['LAYERS']
    } else if (template['className'] === 'WMTS') {
      id = template['sourceOptions']['layer']
    }
    for (l = 0, len = layersCapab.length; l < len; l++) {
      const layerCapab = layersCapab[l]
      if (layerCapab['Name'] !== id) {
        continue
      }
      found = true

      if (typeof template['animation'] === 'undefined') {
        template['animation'] = {}
      }
      if ((typeof layerCapab['Dimension'] === 'undefined') || (!Array.isArray(layerCapab['Dimension'])) || (layerCapab['Dimension'].length === 0)) {
        template['type'] = this.layerTypes['map']
        continue loopLayers
      }
      dimension = layerCapab['Dimension'][0]
      if (typeof dimension['values'] === 'undefined') {
        template['type'] = this.layerTypes['map']
        continue loopLayers
      }
      values = dimension['values']
      this.parseCapabTimes(template['animation'], values)
      break
    }
  }
}

/**
 * Defines EPSG:3067 projection.
 */
MapAnimation.prototype.initEPSG3067Projection = () => {
  proj4.defs('EPSG:3067', '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs')
}

/**
 * Initializes map.
 */
MapAnimation.prototype.initMap = function () {
  // Create controls and interactions
  let config = this.get('config')
  let viewCenter
  let viewZoom
  const minZoom = config['defaultMinZoom']
  const maxZoom = config['defaultMaxZoom']
  const controls = new _ol_Collection_()
  let interactionOptions
  let interactionConfig = this.get('interactionConfig')
  let layerSwitcher
  let interactions
  let map = this.get('map')
  let view
  const viewProjection = /** @type {string} */ (this.get('viewProjection'))
  const mapContainer = config['mapContainer']
  const target = jQuery(`#${mapContainer}`)
  let layerVisibility
  const callbacks = this.get('callbacks')
  let overlayTitles
  let numOverlayTitles
  let layerVisible
  let visible
  let i
  let j
  let layerGroups
  let layerGroup
  let layers
  let numLayers
  let numLayerGroups
  let overlayGroupName
  let overlay
  let popupContainer
  let popupCloser
  const self = this
  if (target.length === 0) {
    return
  }
  if (map != null) {
    layerVisibility = map.get('layerVisibility')
    overlayTitles = this.get('overlayTitles')
    numOverlayTitles = overlayTitles.length
    visible = false
    for (i = 0; i < numOverlayTitles; i++) {
      layerVisible = layerVisibility[overlayTitles[i]]
      if ((layerVisible === undefined) || (layerVisible)) {
        visible = true
        break
      }
    }
    // No need to reload if nothing is visible
    if (!visible) {
      layerGroups = map.getLayers()
      numLayerGroups = layerGroups.getLength()
      config = this.get('config')
      // Todo: tee getOverlays-funktio loopin sijaan
      overlayGroupName = config['overlayGroupName']
      for (i = 0; i < numLayerGroups; i++) {
        layerGroup = layerGroups.item(i)
        if (layerGroup.get('title') === overlayGroupName) {
          layers = layerGroup.getLayers()
          numLayers = layers.getLength()
          // Force reloading in the future
          for (j = 0; j < numLayers; j++) {
            layers.item(j).setLayers(new _ol_Collection_())
          }
        }
      }
      if (this.get('configChanged')) {
        this.set('configChanged', false)
      } else {
        return
      }
    }
    view = map.getView()
    viewCenter = view.get('center')
    viewZoom = view.getZoom()
  } else {
    viewCenter = this.viewOptions['center'] != null ? this.viewOptions['center'] : (config['defaultCenterProjection'] === viewProjection ? config['defaultCenterLocation'] : _ol_Proj_.transform(
        config['defaultCenterLocation'],
        config['defaultCenterProjection'],
        viewProjection)
    )
    viewZoom = this.viewOptions['zoom'] != null ? this.viewOptions['zoom'] : config['defaultZoomLevel']
    layerVisibility = {}
  }
  jQuery(`#${mapContainer}-popup`).appendTo(target)
  target.find('.ol-viewport').remove()
  _ol_['ASSUME_TOUCH'] = false
  if (interactionConfig != null) {
    interactionOptions = jQuery.extend(true, {}, interactionConfig)
  } else {
    interactionOptions = (config['interactions'] != null) ? config['interactions'] : {}
    interactionConfig = jQuery.extend(true, {}, interactionOptions)
    this.set('interactionConfig', interactionConfig)
  }
  if (config['staticControls']) {
    this.initStaticInteractions(interactionOptions)
  } else {
    controls.push(new _ol_control_Zoom_({
      'duration': 0,
      'zoomInTipLabel': '', // Todo
      'zoomOutTipLabel': '' // Todo
    }))
    jQuery(`#${config['mapContainer']}`).css('pointer-events', 'auto')
  }
  interactions = _ol_Interaction_.defaults(interactionOptions)
  popupContainer = document.getElementById(`${mapContainer}-popup`)
  popupCloser = document.getElementById(`${mapContainer}-popup-closer`)
  // Create an overlay to anchor the popup to the map.
  overlay = new _ol_Overlay_(/** @type {olx.OverlayOptions} */ ({
    'element': popupContainer,
    'autoPan': true,
    'autoPanAnimation': {
      'duration': 250
    }
  }))
  this.set('overlay', overlay)
  if (popupCloser != null) {
    /**
     * Add a click handler to hide the popup.
     * @return {boolean} Don't follow the href.
     */
    popupCloser.onclick = () => {
      overlay.setPosition(undefined)
      popupCloser.blur()
      if ((callbacks != null) && (typeof callbacks['popupClosed'] === 'function')) {
        callbacks['popupClosed']()
      }
      return false
    }
  }
  this.viewOptions = {
    'projection': viewProjection,
    'center': viewCenter,
    'resolutions': config['resolutions'],
    'zoom': viewZoom,
    'minZoom': minZoom,
    'maxZoom': maxZoom,
    'extent': ((config['extentByZoomLevel'] == null) || (config['extentByZoomLevel'][viewZoom] == null)) ? config['extent'] : config['extentByZoomLevel'][viewZoom]
  }
  map = new _ol_Map_({
    layers: [
      new _ol_layer_Group_({
        'nested': true,
        'title': config['baseGroupName'],
        'layers': self.loadStaticLayers(layerVisibility, this.layerTypes['map'])
      }),
      new _ol_layer_Group_({
        'nested': true,
        'title': config['overlayGroupName'],
        'layers': []
      }),
      new _ol_layer_Group_({
        'nested': true,
        'title': config['featureGroupName'],
        'layers': self.loadStaticLayers(layerVisibility, this.layerTypes['features'])
      }),
      new _ol_layer_Group_({
        'nested': true,
        'title': '', // config['staticOverlayGroupName'],
        'layers': self.loadStaticLayers(layerVisibility, this.layerTypes['overlay']),
        'zIndex': 1000
      })
    ],
    overlays: [overlay],
    target: target[0],
    controls,
    interactions,
    view: new _ol_View_(this.viewOptions)
  })
  map.set('layerVisibility', layerVisibility)
  map.on('moveend', () => {
    self.set('updateRequested', Date.now())
  })
  if (config['showMarker']) {
    map.addLayer(this.createMarkerLayer())
    map.on('singleclick', e => {
      map.getView().setCenter(e['coordinate'])
    })
  }
  if (config['showLayerSwitcher']) {
    layerSwitcher = new LayerSwitcher({
      'project': config['project'],
      'tipLabel': config['layersTooltip'],
      'showLegend': config['showLegend'],
      'legendContainer': config['legendContainer'],
      'legendTitle': config['legendTitle'],
      'noLegendText': config['noLegendText'],
      'baseGroupName': config['baseGroupName'],
      'opacityTitle': config['opacityTitle']
    })
    this.set('layerSwitcher', layerSwitcher)
    map.addControl(layerSwitcher)
  }
  jQuery(`#${mapContainer} .ol-zoom-in`).attr('title', config['zoomInTooltip'])
  jQuery(`#${mapContainer} .ol-zoom-out`).attr('title', config['zoomOutTooltip'])
  jQuery(`#${mapContainer} .ol-viewport`).css('touch-action', 'auto')
  self.set('map', map)
  this.setViewListeners()
  if (!self.get('listenersInitialized')) {
    self.initListeners()
  }
  if ((callbacks != null) && (typeof callbacks['init'] === 'function')) {
    callbacks['init']()
  }
  jQuery(`#${mapContainer} .ol-popup`).show()
}

/**
 * Sets view property change listeners.
 */
MapAnimation.prototype.setViewListeners = function () {
  const self = this, callbacks = this.get('callbacks')
  this.get('map').getView().on('propertychange', function (e) {
    let coordinates
    switch (e['key']) {
      case 'center':
        self.viewOptions['center'] = this.getCenter()
        if ((callbacks != null) && (typeof callbacks['center'] === 'function')) {
          coordinates = this.getCenter()
          callbacks['center'](coordinates[0], coordinates[1])
        }
        break
      case 'resolution':
        self.viewOptions['zoom'] = this.getZoom()
        if ((callbacks != null) && (typeof callbacks['zoom'] === 'function')) {
          callbacks['zoom'](this.getZoom())
        }
        break
      case 'rotation':
        self.viewOptions['rotation'] = this.getRotation()
        if ((callbacks != null) && (typeof callbacks['rotation'] === 'function')) {
          callbacks['rotation'](this.getRotation())
        }
        break
    }
  })
}

/**
 * Initializes interaction options for a static map.
 * @param {Object} interactionOptions Default interaction options.
 */
MapAnimation.prototype.initStaticInteractions = function (interactionOptions) {
  const config = this.get('config')
  interactionOptions['doubleClickZoom'] = false
  interactionOptions['dragPan'] = false
  interactionOptions['dragRotate'] = false
  interactionOptions['dragRotateAndZoom'] = false
  interactionOptions['dragZoom'] = false
  interactionOptions['keyboardPan'] = false
  interactionOptions['keyboardZoom'] = false
  interactionOptions['mouseWheelZoom'] = false
  interactionOptions['pinchRotate'] = false
  interactionOptions['pinchZoom'] = false
  interactionOptions['altShiftDragRotate'] = false
  jQuery(`#${config['mapContainer']}`).css('pointer-events', 'none')
}

/**
 * Test if layer is a supported animation layer.
 * @param layer Layer to be tested.
 * @returns {boolean} Support result.
 */
MapAnimation.prototype.isAnimationLayer = function (layer) {
  return (([this.layerTypes['observation'], this.layerTypes['forecast'], ''].includes(layer['type'])) && (layer['animation'] !== undefined))
}

/**
 * Initializes listeners utilized by the animator view.
 */
MapAnimation.prototype.initListeners = function () {
  const self = this
  let layerSwitcher
  self.set('listenersInitialized', true)

  this.on('updateLoadState', function (e) {
    const config = self.get('config')
    let len
    let finished = true
    let layerGroup
    let layerGroups
    let numLayerGroups
    let overlays
    let numOverlays
    let key
    let callbacks
    let runLoaded = false
    let i
    const map = self.get('map')
    let requestUpdate = false
    key = self.loadId
    len = self.numIntervalItems[key].length
    if (len === 0) {
      return
    }
    for (i = 0; i < len; i++) {
      if (self.numIntervalItems[key][i]['status'] === constants.LOADING_STATUS['ready']) {
        continue
      }
      if ((self.numIntervalItems[key][i]['loaded'] >= self.numIntervalItems[key][i]['toBeLoaded']) && (self.numIntervalItems[key][i]['status'] !== constants.LOADING_STATUS['error']) && (self.numIntervalItems[key][i]['status'] !== constants.LOADING_STATUS['ready'])) {
        self.numIntervalItems[key][i]['status'] = constants.LOADING_STATUS['ready']
      }
      finished = finished && (self.numIntervalItems[key][i]['status'] === constants.LOADING_STATUS['ready'] || self.numIntervalItems[key][i]['status'] === constants.LOADING_STATUS['error'])
    }
    if (key !== self.loadId) {
      return
    }
    self.variableEvents.emitEvent('numIntervalItems', [self.numIntervalItems[key]])
    // Everything is loaded
    if (finished) {
      if (key > self.finishedId) {
        self.loading = false
        self.finishedId = key
        runLoaded = true
        // Todo: toteuta nämä funktiona LayerSwitcherissä
        layerSwitcher = self.get('layerSwitcher')
        if (layerSwitcher != null) {
          layerSwitcher.setMap(self.getMap())
          jQuery(`#${constants.MAP_LAYER_SWITCHER_ID}`).show()
        }
        if (self.get('updateVisibility') !== null) {
          map.set('layerVisibility', self.get('updateVisibility'))
          self.set('updateVisibility', null)
          requestUpdate = true
        }
      }
      if (layerSwitcher != null) {
        jQuery('.layer-switcher input:disabled').prop('disabled', false)
      }
      if (config['showLoadProgress']) {
        // Remove spinner
        jQuery(`.${config['spinnerContainer']}`).hide()
      }
      // Todo: tee getOverlays-funktio loopin sijaan
      // Todo: tee onFinished-funktio
      // Update visibility values
      layerGroups = map.getLayers()
      numLayerGroups = layerGroups.getLength()
      for (i = 0; i < numLayerGroups; i++) {
        layerGroup = layerGroups.item(i)
        if (layerGroup.get('title') === config['overlayGroupName']) {
          overlays = layerGroup.getLayers()
          numOverlays = overlays.getLength()
          break
        }
      }
      for (i = 0; i < numOverlays; i++) {
        const overlay = overlays.item(i)
        if (overlay.get('opacity') === 0) {
          overlay.set('visible', false)
          overlay.set('opacity', overlay.get('defaultOpacity'))
        }
      }
      self.updateAnimation()
      callbacks = self.get('callbacks')
      if ((runLoaded) && (callbacks != null) && (typeof callbacks['loaded'] === 'function')) {
        callbacks['loaded']()
      }
      if (requestUpdate) {
        this.set('updateRequested', Date.now())
      }
    }
  })

  this.on('change:updateRequested', function (e) {
    const updateRequested = /** @type {number} */ (this.get('updateRequested')), self = this
    self.loadId = -1

    setTimeout(() => {
      let loadId, asyncLoadCount, asyncLoadQueue, extent, overlayGroupName, featureGroupName, map, layerGroups,
        layerGroup, numLayerGroups, numLayers, layers, layer, currentVisibility, layerVisibility,
        layerGroupTitle, anyVisible = false, i, j
      if (/** @type {number} */ (self.get('updateRequested')) > updateRequested) {
        return
      }
      loadId = Date.now()
      if (self.loadId < loadId) {
        self.loadId = loadId
      } else {
        self.loadId++
        loadId = self.loadId
      }
      asyncLoadQueue = {}
      asyncLoadQueue[loadId] = []
      self.asyncLoadQueue = asyncLoadQueue
      asyncLoadCount = {}
      asyncLoadCount[loadId] = 0
      self.asyncLoadCount = asyncLoadCount
      self.numIntervalItems = []
      extent = self.calculateExtent(true)
      self.updateStorage()
      if (self.reloadNeeded(extent)) {
        // Todo: toteuta tämä LayerSwitcherissä funktiona
        jQuery('.layer-switcher input').prop('disabled', true)
        self.actionEvents.emitEvent('reload')
        self.loadOverlayGroup(extent, loadId)
      } else {
        // Todo: tee get-funktio loopin sijaan
        overlayGroupName = self.get('config')['overlayGroupName']
        featureGroupName = self.get('config')['featureGroupName']
        map = self.get('map')
        layerVisibility = map.get('layerVisibility')
        layerGroups = map.getLayers()
        numLayerGroups = layerGroups.getLength()
        for (i = 0; i < numLayerGroups; i++) {
          layerGroup = layerGroups.item(i)
          layerGroupTitle = layerGroup.get('title')
          if ([overlayGroupName, featureGroupName].includes(layerGroupTitle)) {
            layers = layerGroup.getLayers()
            numLayers = layers.getLength()
            for (j = 0; j < numLayers; j++) {
              layer = layers.item(j)
              currentVisibility = layerVisibility[layer.get('title')]
              if (currentVisibility !== undefined) {
                layer.setVisible(currentVisibility)
              }
              if (layerGroupTitle === overlayGroupName) {
                if (currentVisibility) {
                  anyVisible = currentVisibility
                }
              }
            }
          }
        }
        if (!anyVisible) {
          self.actionEvents.emitEvent('reload')
        }
        if (self.get('config')['showMarker']) {
          self.get('marker').setCoordinates(map.getView().getCenter())
          self.dispatchEvent('markerMoved')
        }
      }
    }, self.updateRequestResolution)
  })

  this.on('updateLoadQueue', e => {
    let animationGroups
    let config
    let maxAsyncLoadCount
    let asyncLoadItem
    let prop
    let layer
    let className
    let sourceOptions
    let source
    let sourceProperties
    let sourceOn
    let tileMatrixLimits
    const loadId = self.loadId
    if ((self.asyncLoadQueue[loadId] == null) || (self.asyncLoadQueue[loadId].length === 0)) {
      return
    }
    animationGroups = self.get('animationGroups')
    if (!Array.isArray(animationGroups)) {
      return
    }
    config = self.get('config')
    maxAsyncLoadCount = config['maxAsyncLoadCount']
    if (self.asyncLoadCount[loadId] < maxAsyncLoadCount) {
      asyncLoadItem = self.asyncLoadQueue[loadId].shift()
      self.asyncLoadCount[loadId]++
      self.dispatchEvent('updateLoadQueue')
      // Set source
      layer = animationGroups[asyncLoadItem['overlay']][asyncLoadItem['layer']]
      layer.setOpacity(0)
      className = layer.get('className')
      sourceOptions = layer.get('sourceOptions')
      if (sourceOptions == null) {
        sourceOptions = {}
      }
      // Todo: create factories based on string
      source = null
      switch (className) {
        case 'TileWMS':
          if (sourceOptions['tileGridOptions'] != null) {
            sourceOptions['tileGrid'] = new _ol_tilegrid_TileGrid_(sourceOptions['tileGridOptions'])
          }
          source = new _ol_source_TileWMS_(sourceOptions)
          break
        case 'ImageWMS':
          if ((sourceOptions['url'] == null) && (sourceOptions['urls'] != null) && (sourceOptions['urls'].length > 0)) {
            sourceOptions['url'] = sourceOptions['urls'][Math.floor(Math.random() * sourceOptions['urls'].length)]
          }
          source = new _ol_source_ImageWMS_(sourceOptions)
          break
        case 'WMTS':
          if ((sourceOptions['matrixSet'] != null) && (typeof sourceOptions['matrixSet'] === 'object')) {
            if (sourceOptions['matrixSetLimits'] != null) {
              tileMatrixLimits = sourceOptions['matrixSetLimits']['TileMatrixLimits']
            }
            sourceOptions['tileGrid'] = _ol_tilegrid_WMTS_.createFromCapabilitiesMatrixSet(sourceOptions['matrixSet'], sourceOptions['extent'], tileMatrixLimits)
          } else if (sourceOptions['tileGridOptions'] != null) {
            sourceOptions['tileGrid'] = new _ol_tilegrid_WMTS_(sourceOptions['tileGridOptions'])
          }
          source = new _ol_source_WMTS_(sourceOptions)
          const originalTileUrlFunction = source.getTileUrlFunction()
          source.setTileUrlFunction(function () {
            let url = `${originalTileUrlFunction.apply(source, arguments)}&Time=${sourceOptions['params']['TIME']}`
            if (sourceOptions['elevation'] != null) {
              url = `${url}&Elevation=${sourceOptions['elevation']}`
            }
            return url
          })
          break
        case 'Stamen':
          source = new _ol_source_Stamen_(sourceOptions)
          break
        case 'OSM':
          source = new _ol_source_OSM_(sourceOptions)
          break
        default:
          return
      }

      sourceProperties = layer.get('sourceProperties')
      if (typeof sourceProperties !== 'undefined') {
        for (prop in sourceProperties) {
          if (sourceProperties.hasOwnProperty(prop)) {
            source.set(prop, sourceProperties[prop])
          }
        }
      }
      sourceOn = layer.get('sourceOn')
      if (typeof sourceOn !== 'undefined') {
        for (const event in sourceOn) {
          if (sourceOn.hasOwnProperty(event)) {
            source.on(event, sourceOn[event])
          }
        }
      }
      animationGroups[asyncLoadItem['overlay']][asyncLoadItem['layer']].setSource(source)
    }
  })

  this.on('markerMoved', e => {
    const marker = self.get('marker')
    const callbacks = self.get('callbacks')
    let coordinates
    if (marker == null) {
      return
    }
    coordinates = marker.getCoordinates()
    if ((callbacks != null) && (typeof callbacks['marker'] === 'function')) {
      callbacks['marker'](coordinates[0], coordinates[1])
    }
  })
}

/**
 * Checks if layers need to be reloaded.
 * @param {Array} extent Extent of overlays to be loaded.
 * @returns {boolean} Reload need.
 */
MapAnimation.prototype.reloadNeeded = function (extent) {
  let map, layerVisibility, currentVisibility, layerGroups, numLayerGroups, config, containsAnimationLayers = false,
    overlayGroupName, layerGroup, layers = this.get('layers'), layer, numLayers, subLayers, numSubLayers,
    subLayerExtent, i, j
  numLayers = layers.length
  for (i = 0; i < numLayers; i++) {
    if (this.isAnimationLayer(layers[i])) {
      containsAnimationLayers = true
      break
    }
  }
  if (!containsAnimationLayers) {
    return false
  }
  map = this.get('map')
  layerVisibility = map.get('layerVisibility')
  layerGroups = map.getLayers()
  numLayerGroups = layerGroups.getLength()
  config = this.get('config')
  // Todo: tee getOverlays-funktio loopin sijaan
  overlayGroupName = config['overlayGroupName']
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    if (layerGroup.get('title') === overlayGroupName) {
      layers = layerGroup.getLayers()
      numLayers = layers.getLength()
      if (numLayers === 0) {
        return true
      }
      for (j = 0; j < numLayers; j++) {
        layer = layers.item(j)
        currentVisibility = layerVisibility[layer.get('title')]
        if ((currentVisibility !== undefined) ? currentVisibility : layer.get('visible')) {
          numSubLayers = 0
          if (typeof layer.getLayers === 'function') {
            subLayers = layer.getLayers()
            numSubLayers = subLayers.getLength()
          }
          if (numSubLayers === 0) {
            return true
          }
          subLayerExtent = subLayers.item(0).get('extent')
          // Todo: yhtäsuuruudelle epsilon-käsittely
          if ((subLayerExtent.length !== extent.length) || (subLayerExtent.some((v, i) => v !== extent[i]))) {
            return true
          }
        }
      }
    }
  }
  return false
}

/**
 * Creates a layer for markers.
 * @returns {ol.layer.Vector} Marker layer.
 */
MapAnimation.prototype.createMarkerLayer = function () {
  const marker = new _ol_geom_Point_([null, null])
  this.set('marker', marker)
  const markerFeature = new _ol_Feature_({
    'geometry': marker
  })
  const markerStyle = new _ol_style_Style_({
    'image': new _ol_style_Icon_(/** @type {olx.style.IconOptions} */ ({
      'anchor': [0.5, 1],
      'anchorXUnits': 'fraction',
      'anchorYUnits': 'fraction',
      'src': this.get('config')['markerImagePath']
    })),
    'zIndex': 10000
  })
  markerFeature.setStyle(markerStyle)
  const markerSource = new _ol_source_Vector_({
    'features': [markerFeature]
  })
  return new _ol_layer_Vector_({
    'source': markerSource
  })
}

/**
 * Calculates extent for layers.
 * @param {boolean} useMap True if current map is used.
 * @returns {Array} Extent.
 */
MapAnimation.prototype.calculateExtent = function (useMap) {
  const self = this
  const config = this.get('config')
  const projection = /** @type {ol.proj.Projection|string} */ (this.get('viewProjection'))
  const map = this.get('map')
  const view = (map == null) ? null : map.getView()
  const zoomLevel = (view == null) ? null : view.getZoom()
  const useZoomLevelExtent = config['extentByZoomLevel'] != null
  const currentExtent = ((zoomLevel != null) && (useZoomLevelExtent)) ? config['extentByZoomLevel'][zoomLevel] : null
  const configExtent = currentExtent == null ? config['extent'] : currentExtent
  const maxExtent = config['projection'] === projection ? configExtent : _ol_Proj_.transformExtent(configExtent, config['projection'], projection)
  const extent = maxExtent.slice(0)
  let viewExtent
  if (useMap) {
    viewExtent = view.calculateExtent(map.getSize())
    // Crop the extent box
    for (let i = 0; i < 4; i++) {
      extent[i] = (i < 2) ? Math.max(extent[i], viewExtent[i]) : Math.min(extent[i], viewExtent[i])
    }
    if ((self.viewOptions['zoom'] !== zoomLevel) && (useZoomLevelExtent) && (config['extentByZoomLevel'][zoomLevel] != null)) {
      self.viewOptions['center'] = view.getCenter()
      self.viewOptions['zoom'] = zoomLevel
      self.viewOptions['extent'] = config['extentByZoomLevel'][zoomLevel]
      map.setView(new _ol_View_(self.viewOptions))
      self.setViewListeners()
    }
  }
  return extent
}

/**
 * Loads on overlay group.
 * @param {Array} extent Extent of overlays to be loaded.
 * @param {number} loadId Identifier for loading instance.
 */
MapAnimation.prototype.loadOverlayGroup = function (extent, loadId) {
  const layerGroups = this.get('map').getLayers()
  let layerGroup
  const numLayerGroups = layerGroups.getLength()
  const config = this.get('config')
  const overlayGroupName = config['overlayGroupName']
  let i
  if (overlayGroupName == null) {
    return
  }
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    if (layerGroup.get('title') === overlayGroupName) {
      layerGroups.setAt(i, new _ol_layer_Group_({
        'nested': true,
        'title': config['overlayGroupName'],
        'layers': this.loadOverlays(extent, loadId)
      }))
    }
  }
  if (loadId === this.loadId) {
    this.dispatchEvent('updateLoadQueue')
    this.updateAnimation()
  }
  if (config['showMarker']) {
    this.get('marker').setCoordinates(this.get('map').getView().getCenter())
    this.dispatchEvent('markerMoved')
  }
}

/**
 * Creates a new plain layer.
 * @param {Object} options Layer template based on user configuration.
 * @returns {ol.layer.Tile|ol.layer.Image|ol.layer.Vector} Map layer.
 */
MapAnimation.prototype.createLayer = function (options) {
  const extent = this.calculateExtent(false)
  let template
  let source = null
  let projection
  let sourceOptions
  let features
  let numStyles
  let layer
  let i
  let tileMatrixLimits

  const z = {
    value: 0
  }

  // Features may be too slow to extend
  template = options['type'] === this.layerTypes['features'] ? options : jQuery.extend(true, {}, options)
  if (template['className']) {
    sourceOptions = (template['sourceOptions'] != null) ? template['sourceOptions'] : {}
    // Todo: new ol.source[template['className']]
    switch (template['className']) {
      case 'TileWMS':
        if (sourceOptions['tileGridOptions'] != null) {
          sourceOptions['tileGrid'] = new _ol_tilegrid_TileGrid_(sourceOptions['tileGridOptions'])
        }
        source = new _ol_source_TileWMS_(sourceOptions)
        break
      case 'WMTS':
        if ((sourceOptions['matrixSet'] != null) && (typeof sourceOptions['matrixSet'] === 'object')) {
          if (sourceOptions['matrixSetLimits'] !== undefined) {
            tileMatrixLimits = sourceOptions['matrixSetLimits']['TileMatrixLimits']
          }
          sourceOptions['tileGrid'] = _ol_tilegrid_WMTS_.createFromCapabilitiesMatrixSet(sourceOptions['matrixSet'], sourceOptions['extent'], tileMatrixLimits)
        } else if (sourceOptions['tileGridOptions'] != null) {
          sourceOptions['tileGrid'] = new _ol_tilegrid_WMTS_(sourceOptions['tileGridOptions'])
        }
        source = new _ol_source_WMTS_(sourceOptions)
        break
      case 'Stamen':
        source = new _ol_source_Stamen_(sourceOptions)
        break
      case 'OSM':
        source = new _ol_source_OSM_(sourceOptions)
        break
      case 'Vector':
        sourceOptions = (template['source'] != null) ? template['source'] : {}
        if ((sourceOptions['features'] !== undefined) || (sourceOptions['type'] !== undefined)) {
          // Todo: korvaa iffittely factorylla
          projection = /** @type {ol.proj.Projection|string} */ (this.get('viewProjection'))
          if (sourceOptions['features'] !== undefined) {
            features = this.createFeatures(sourceOptions['features'])
          }
          sourceOptions['features'] = features
          // Todo: korvaa iffittely factorylla
          if ((sourceOptions['type'] !== undefined) && (sourceOptions['type'].toLowerCase() === 'gml')) {
            sourceOptions['format'] = new _ol_format_GML_()
          }
          if ((sourceOptions['type'] !== undefined) && (sourceOptions['type'].toLowerCase() === 'wfs')) {
            sourceOptions['format'] = new _ol_format_WFS_()
          }
          if ((sourceOptions['type'] !== undefined) && (sourceOptions['type'].toLowerCase() === 'geojson')) {
            sourceOptions['format'] = new _ol_format_GeoJSON_()
          }
          if ((sourceOptions['features'] != null) && (Array.isArray(sourceOptions['features']))) {
            sourceOptions['features'] = new _ol_Collection_(sourceOptions['features'])
          }
          // Projection
          if ((sourceOptions['projection'] != null) && (sourceOptions['projection'] !== projection) && (sourceOptions['features'] != null)) {
            sourceOptions['features'].forEach(feature => {
              feature.getGeometry().transform(sourceOptions['projection'], projection)
            })
          }
          template['source'] = new _ol_source_Vector_(sourceOptions)
          if (template['style'] != null) {
            numStyles = template['style'].length
            for (i = 0; i < numStyles; i++) {
              template['style'][i] = this.createFeatureStyle(template['style'][i], z)
            }
          }
          template['zIndex'] = constants.zIndex.vector + z['value']
        }
        layer = new _ol_layer_Vector_(template)
        layer.setZIndex(template['zIndex'])
        return layer
      case 'ImageWMS': // Todo: järkevämmäksi
        if ((sourceOptions['url'] == null) && (sourceOptions['urls'] != null) && (sourceOptions['urls'].length > 0)) {
          sourceOptions['url'] = sourceOptions['urls'][Math.floor(Math.random() * sourceOptions['urls'].length)]
        }
        source = new _ol_source_ImageWMS_(sourceOptions)
        return new _ol_layer_Image_({
          'extent': extent,
          'type': template['type'],
          'title': template['title'],
          'visible': template['visible'],
          'animation': template['animation'],
          'opacity': template['opacity'],
          'editOpacity': template['editOpacity'],
          'zIndex': template['zIndex'],
          'source': source
        })
    }
  }
  return new _ol_layer_Tile_({
    'extent': extent,
    'type': template['type'],
    'title': template['title'],
    'visible': template['visible'],
    'animation': template['animation'],
    'opacity': template['opacity'],
    'editOpacity': template['editOpacity'],
    'zIndex': template['zIndex'],
    'source': source
  })
}

/**
 * Creates new features.
 * @param options Feature options.
 * @returns {Array} Features.
 */
MapAnimation.prototype.createFeatures = function (options) {
  const self = this
  let i
  let numStyles
  let featureCount
  let newFeature
  const features = []

  const z = {
    value: 0
  }

  options.forEach(feature => {
    if (feature['type'] != null) {
      // For Closure Compiler advanced optimizations
      switch (feature['type'].toLowerCase()) {
        case 'point':
          feature['geometry'] = new _ol_geom_Point_(feature['geometry'])
          break
        case 'multipoint':
          feature['geometry'] = new _ol_geom_MultiPoint_(feature['geometry'])
          break
        case 'linestring':
          feature['geometry'] = new _ol_geom_LineString_(feature['geometry'])
          break
        case 'multilinestring':
          feature['geometry'] = new _ol_geom_MultiLineString_(feature['geometry'])
          break
        case 'polygon':
          feature['geometry'] = new _ol_geom_Polygon_(feature['geometry'])
          break
        case 'multipolygon':
          feature['geometry'] = new _ol_geom_MultiPolygon_(feature['geometry'])
          break
        default:
          return
      }
      newFeature = new _ol_Feature_(feature)
    } else {
      newFeature = feature
    }
    if (feature['style'] != null) {
      numStyles = feature['style'].length
      for (i = 0; i < numStyles; i++) {
        feature['style'][i] = self.createFeatureStyle(feature['style'][i], z)
      }
      newFeature.setStyle(feature['style'], z)
    }
    featureCount = self.get('featureCount') + 1
    self.set('featureCount', featureCount)
    newFeature['id'] = featureCount
    features.push(newFeature)
  })
  return features
}

/**
 * Creates a feature style.
 * @param options Style options.
 * @param z Z-index.
 * @returns {ol.style.Style} Feature style.
 */
MapAnimation.prototype.createFeatureStyle = (options, z) => {
  const styleOptions = (options != null) ? options : {}
  if ((styleOptions['image'] !== undefined) && (styleOptions['image']['type'] !== undefined) && (styleOptions['image']['type'].toLowerCase() === 'icon')) {
    styleOptions['image'] = new _ol_style_Icon_(/** @type {olx.style.IconOptions} */ (styleOptions['image']))
    z['value'] = z['value'] | 8
  }
  if (styleOptions['text'] !== undefined) {
    if (styleOptions['text']['fill'] !== undefined) {
      styleOptions['text']['fill'] = new _ol_style_Fill_(styleOptions['text']['fill'])
    }
    if (styleOptions['text']['stroke'] !== undefined) {
      styleOptions['text']['stroke'] = new _ol_style_Stroke_(styleOptions['text']['stroke'])
    }
    styleOptions['text'] = new _ol_style_Text_(styleOptions['text'])
    z['value'] = z['value'] | 4
  }
  if (styleOptions['stroke'] !== undefined) {
    styleOptions['stroke'] = new _ol_style_Stroke_((styleOptions['stroke']))
    z['value'] = z['value'] | 2
  }
  if (styleOptions['fill'] !== undefined) {
    styleOptions['fill'] = new _ol_style_Fill_((styleOptions['fill']))
    z['value'] = z['value'] | 1
  }
  styleOptions['zIndex'] = ((styleOptions['zIndex'] !== undefined) ? styleOptions['zIndex'] : 0) + constants.zIndex.vector + z['value'] * 10
  return new _ol_style_Style_(styleOptions)
}

/**
 * Loads a layer parameter from the local storage.
 * @param {string} layer Layer title.
 * @param {string} property Property name.
 */
MapAnimation.prototype.loadLayerPropertyFromLocalStorage = function(layer, property) {
  let item = localStorage.getItem(this.get('config')['project']+'-'+layer+'-'+property)
  if (item != null) {
    item = JSON.parse(item)
  }
  return item
}

/**
 * Loads new static layers.
 * @param {boolean} layerVisibility True if layer is visible.
 * @param {string} layerType Layer type for filtering.
 * @returns {Array} Base layers.
 */
MapAnimation.prototype.loadStaticLayers = function (layerVisibility, layerType) {
  const layers = this.get('layers')
  let numLayers
  const layerData = []
  let template
  let visible = false
  let i
  if (layers === undefined) {
    return layerData
  }
  numLayers = layers.length
  for (i = 0; i < numLayers; i++) {
    if (layers[i]['type'] === layerType) {
      // Features may be too slow to extend
      template = (layerType === this.layerTypes['features']) ? layers[i] : jQuery.extend(true, {}, layers[i])
      if (layerVisibility[template['title']] != null) {
        template['visible'] = layerVisibility[template['title']]
      }
      if ((!visible) && (template['visible'])) {
        visible = true
      }
      layerData.push(this.createLayer(template))
    }
  }
  if ((!visible) && (layerType === 'map') && (layerData.length > 0)) {
    layerData[0].set('visible', true)
  }
  return layerData
}

/**
 * Loads a new data layer.
 * @param layer Layer template based on user configurations.
 * @param mapLayers Loaded data layers.
 * @param {Object} numIntervalItems Loader counter information for intervals.
 * @param {Array} extent Extent of overlays to be loaded.
 * @param {number} loadId Identifier for loading instance.
 */
MapAnimation.prototype.loadOverlay = function (layer, mapLayers, numIntervalItems, extent, loadId) {
  const self = this
  const config = self.get('config')
  const animation = layer['animation']
  const absBeginTime = /** @type {number} */ (this.get('animationBeginTime'))
  const newOverlay = false
  let layerTime, layerOptions, layerVisibility, currentVisibility
  let prevLayerTime = Number.NEGATIVE_INFINITY
  let i, len, iMin, iMax, n, mapLayer, largest, t, tEnd, k, tAnimation
  let tk, tkEnd, currentTime, intervalIndex
  const numIntervals = /** @type {number} */ (this.get('animationNumIntervals'))
  const epsilon = this.layerResolution
  const resolutionTime = /** @type {number} */ (self.get('animationResolutionTime'))
  let filteredCapabTimes = []
  let capabTimesDefined = false
  let deltaTime
  layerVisibility = this.get('map').get('layerVisibility')
  currentVisibility = layerVisibility[layer['title']]
  if (typeof currentVisibility === 'undefined') {
    currentVisibility = layer['visible']
  }
  if ((typeof currentVisibility !== 'undefined') && (!currentVisibility)) {
    return
  }
  if (Array.isArray(animation['capabTimes'])) {
    filteredCapabTimes = animation['capabTimes'].filter(capabTime => jQuery.isNumeric(capabTime))
    animation['capabTimes'] = filteredCapabTimes
  }
  if (typeof animation['capabResolutionTime'] === 'number') {
    animation['beginTime'] = absBeginTime + Math.floor((animation['beginTime'] - absBeginTime) / resolutionTime) * resolutionTime
    animation['beginTime'] = animation['beginTime'] <= animation['capabBeginTime'] ? animation['capabBeginTime'] : animation['capabBeginTime'] + Math.ceil((animation['beginTime'] - animation['capabBeginTime']) / animation['capabResolutionTime']) * animation['capabResolutionTime']
    if ((typeof animation['resolutionTime'] !== 'number') || (animation['resolutionTime'] < animation['capabResolutionTime'])) {
      animation['resolutionTime'] = animation['capabResolutionTime']
    }
    animation['beginTime'] -= Math.ceil((animation['beginTime'] - absBeginTime) / animation['resolutionTime']) * animation['resolutionTime']
    animation['endTime'] = Math.min(animation['endTime'], animation['capabEndTime'])
    iMin = 0
    iMax = Math.ceil((animation['endTime'] - animation['beginTime']) / animation['resolutionTime'])
    animation['endTime'] = animation['beginTime'] + iMax * animation['resolutionTime']
  } else if (filteredCapabTimes.length > 0) {
    if (typeof animation['resolutionTime'] !== 'number') {
      animation['resolutionTime'] = resolutionTime
    }
    filteredCapabTimes = animation['capabTimes'].reduce((capabTimes, capabTime) => {
      const numCapabTimes = capabTimes.length
      if ((numCapabTimes >= 2) && (capabTimes[numCapabTimes - 1] - capabTimes[numCapabTimes - 2] < animation['resolutionTime']) && (capabTime - capabTimes[numCapabTimes - 2] < animation['resolutionTime'])) {
        capabTimes[numCapabTimes - 1] = capabTime
      } else {
        capabTimes.push(capabTime)
      }
      return capabTimes
    }, [])
    animation['capabTimes'] = filteredCapabTimes
    for (i = 1, len = animation['capabTimes'].length; i < len; i++) {
      if (animation['capabTimes'][i] >= animation['beginTime']) {
        iMin = i - 1
        animation['beginTime'] = animation['capabTimes'][iMin]
        break
      }
    }
    for (i = len - 1; i >= 0; i--) {
      if (animation['capabTimes'][i] <= animation['endTime']) {
        iMax = i
        break
      }
    }
  } else {
    if (typeof animation['resolutionTime'] !== 'number') {
      animation['resolutionTime'] = resolutionTime
    }
    iMin = 0
    iMax = Math.ceil((animation['endTime'] - animation['beginTime']) / animation['resolutionTime'])
    animation['endTime'] = animation['beginTime'] + iMax * animation['resolutionTime']
  }

  const loadStart = ({target}) => {
    const config = self.get('config'), loadId = target.get('loadId')
    if (target.get('loadId') !== self.loadId) {
      return
    }
    if (self.finishedId < target.get('loadId')) {
      // Todo: toteuta nämä funktioina LayerSwitcherissä
      self.loading = true
      jQuery(`#${constants.MAP_LAYER_SWITCHER_ID}`).hide()
      jQuery('.layer-switcher input').prop('disabled', true)
      if ((config['showLoadProgress'])) {
        jQuery(`.${config['spinnerContainer']}`).show()
      }
    }
    let tilesLoading = target.get('tilesLoading')
    if (tilesLoading === undefined) {
      tilesLoading = 0
    }
    tilesLoading++
    target.set('tilesLoading', tilesLoading)
    // Interval status
    const intervalIndex = target.get('intervalIndex')
    if (intervalIndex >= 0) {
      if (self.numIntervalItems[loadId] === undefined) {
        return
      }
      if ((self.numIntervalItems[loadId][intervalIndex]['status'] !== constants.LOADING_STATUS['loading']) && (self.numIntervalItems[loadId][intervalIndex]['status'] !== constants.LOADING_STATUS['error']) && (self.numIntervalItems[loadId][intervalIndex]['status'] !== constants.LOADING_STATUS['ready'])) {
        self.numIntervalItems[loadId][intervalIndex]['status'] = constants.LOADING_STATUS['loading']
        if (target.get('loadId') !== self.loadId) {
          return
        }
        self.dispatchEvent('updateLoadState')
      }
    }
  }
  const loadEnd = ({target}) => {
    let tilesLoaded = target.get('tilesLoaded'), intervalIndex
    const loadId = target.get('loadId')
    if (target.get('loadId') !== self.loadId) {
      return
    }
    if (tilesLoaded == null) {
      tilesLoaded = 0
    }
    tilesLoaded++
    target.set('tilesLoaded', tilesLoaded)
    if (target.get('tilesLoading') <= target.get('tilesLoaded')) {
      if (!target.get('finished')) {
        target.set('finished', true)
        self.asyncLoadCount[loadId]--
        self.dispatchEvent('updateLoadQueue')
      }
      // Interval status
      intervalIndex = target.get('intervalIndex')
      if (intervalIndex >= 0) {
        if (self.numIntervalItems[loadId] === undefined) {
          return
        }
        self.numIntervalItems[loadId][intervalIndex]['loaded']++
        self.numIntervalItems[loadId][intervalIndex]['loaded'] = Math.min(self.numIntervalItems[loadId][intervalIndex]['loaded'], self.numIntervalItems[loadId][intervalIndex]['toBeLoaded'])
        if (target.get('loadId') !== self.loadId) {
          return
        }
        self.dispatchEvent('updateLoadState')
      }
    }
  }
  const loadError = ({target}) => {
    let tilesLoaded = target.get('tilesLoaded')
    let intervalIndex
    const callbacks = self.get('callbacks')
    const loadId = target.get('loadId')
    if (target.get('loadId') !== self.loadId) {
      return
    }
    if (tilesLoaded == null) {
      tilesLoaded = 0
    }
    tilesLoaded++
    target.set('tilesLoaded', tilesLoaded)
    if ((target.get('tilesLoading') <= target.get('tilesLoaded')) && (!target.get('finished'))) {
      target.set('finished', true)
      self.asyncLoadCount[loadId]--
      self.dispatchEvent('updateLoadQueue')
    }

    // Interval status
    intervalIndex = target.get('intervalIndex')
    if (intervalIndex >= 0) {
      if (self.numIntervalItems[loadId] === undefined) {
        return
      }
      if (self.numIntervalItems[loadId][intervalIndex]['status'] !== constants.LOADING_STATUS['error']) {
        self.numIntervalItems[loadId][intervalIndex]['status'] = constants.LOADING_STATUS['error']
        if (target.get('loadId') !== self.loadId) {
          return
        }
        self.dispatchEvent('updateLoadState')
      }
    }
    if ((callbacks != null) && (typeof callbacks['loadError'] === 'function')) {
      callbacks['loadError'](target.getParams())
    }
  }

  currentTime = (new Date()).getTime()
  for (i = iMin; i <= iMax; i++) {
    capabTimesDefined = (Array.isArray(animation['capabTimes']) && (animation['capabTimes'].length > 0))
    layerTime = capabTimesDefined ? animation['capabTimes'][i] : animation['beginTime'] + i * animation['resolutionTime']
    // Ignore future observations (empty images)
    if ((layerTime >= currentTime - config['ignoreObsOffset']) && (layer['type'] === self.layerTypes['observation'])) {
      continue
    }
    deltaTime = capabTimesDefined ? animation['capabTimes'][Math.min(i + 1, iMax)] - animation['capabTimes'][i] : animation['resolutionTime']
    // Ignore forecast history
    if ((layerTime <= currentTime - deltaTime) && (layer['type'] === self.layerTypes['forecast'])) {
      continue
    }
    // Checking maximum resolution
    if (layerTime - prevLayerTime < epsilon) {
      continue
    }
    prevLayerTime = layerTime
    layerOptions = {
      'extent': extent,
      'animation': {
        'animationTime': layerTime
      },
      'sourceOptions': {
        'params': {
          'TIME': new Date(layerTime).toISOString()
        }
      }
    }
    layerOptions = /** @type {olx.layer.TileOptions} */ (jQuery.extend(true, layerOptions, layer))
    layerOptions['defaultOpacity'] = (layer['opacity'] !== undefined) ? layer['opacity'] : 1
    // Frame count
    intervalIndex = -1
    for (n = 0; n < numIntervals; n++) {
      if (layerTime < absBeginTime + (n + 1) * resolutionTime) {
        intervalIndex = n
        break
      }
    }
    if ((intervalIndex === -1) && (layerTime === absBeginTime + numIntervals * resolutionTime)) {
      intervalIndex = numIntervals - 1
    }
    if (intervalIndex >= 0) {
      this.numIntervalItems[loadId][intervalIndex]['toBeLoaded']++
    } else {
      continue
    }
    layerOptions['sourceProperties'] = {
      'loadId': loadId,
      'intervalIndex': intervalIndex,
      'tilesLoaded': 0,
      'tilesLoading': 0
    }
    layerOptions['visible'] = true
    // Todo: yleistä
    if (layerOptions['className'] === 'ImageWMS') {
      layerOptions['sourceOn'] = {
        'imageloadstart': loadStart,
        'imageloadend': loadEnd,
        'imageloaderror': loadError
      }
      mapLayer = new _ol_layer_Image_(layerOptions)
    } else {
      layerOptions['sourceOn'] = {
        'tileloadstart': loadStart,
        'tileloadend': loadEnd,
        'tileloaderror': loadError
      }
      mapLayer = new _ol_layer_Tile_(layerOptions)
    }

    largest = true
    // Add layer to an existing layer group
    if (!newOverlay) {
      t = layerTime
      tEnd = animation['endTime']
      k = 0
      while (k < mapLayers.getLength()) {
        tAnimation = mapLayers.item(k).get('animation')
        tk = tAnimation['animationTime']
        tkEnd = tAnimation['endTime']
        // When time values are identical, observation is shown, not forecast.
        if ((t < tk) || ((t === tk) && (layer['type'] === this.layerTypes['forecast']) && (mapLayers.item(k).get('type') === this.layerTypes['observation']))) {
          mapLayers.insertAt(k, mapLayer)
          largest = false
          break
        }
        k++
      }
    }
    if (largest) {
      mapLayers.push(mapLayer)
    }
  }
}

/**
 * Load all data layers.
 * @param {Array} extent Extent of overlays to be loaded.
 * @param {number} loadId Identifier for loading instance.
 * @returns {Array} Data layers.
 */
MapAnimation.prototype.loadOverlays = function (extent, loadId) {
  const layers = this.get('layers')
  const config = this.get('config')
  const animationGroups = []
  const pGrp = []
  let numLayers
  const overlays = []
  const legends = []
  let numLegends
  const numIntervals = /** @type {number} */ (this.get('animationNumIntervals'))
  const numIntervalItems = {}
  let i
  let j
  let k
  let l
  let layer
  let animationBeginTime
  let animationEndTime
  let overlayLegends
  let duplicateLegend = -1
  let title
  let overlay
  let layerLegend
  let legendUrls
  let animation
  let mapLayers
  let newOverlay
  let layerGroup
  let layerGroups
  let numLayerGroups
  let opacity
  let oldOverlay
  let oldOverlayTitle
  let oldOverlays
  let numOldOverlays
  let layerVisibility
  const overlayTitles = []
  let callbacks
  let defaultLegend = -1
  const self = this

  if (layers === undefined) {
    return overlays
  }
  numLayers = layers.length
  callbacks = self.get('callbacks')
  if ((numLayers > 0) && (callbacks != null) && (typeof callbacks['preload'] === 'function')) {
    callbacks['preload']()
  }

  this.numIntervalItems[loadId] = []
  for (i = 0; i < numIntervals; i++) {
    this.numIntervalItems[loadId].push({
      'status': '',
      'loaded': 0,
      'toBeLoaded': 0
    })
  }
  // Update visibility values
  layerGroups = this.get('map').getLayers()
  numLayerGroups = layerGroups.getLength()
  // Todo: korvaa silmukka funktiolla getOverlays
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    if (layerGroup.get('title') === config['overlayGroupName']) {
      oldOverlays = layerGroup.getLayers()
      break
    }
  }
  layerVisibility = this.get('map').get('layerVisibility')
  numOldOverlays = oldOverlays.getLength()
  for (i = 0; i < numOldOverlays; i++) {
    oldOverlay = oldOverlays.item(i)
    oldOverlayTitle = oldOverlay.get('title')
    for (j = 0; j < numLayers; j++) {
      if (layers[j]['title'] === oldOverlayTitle) {
        if (layerVisibility[oldOverlayTitle] != null) {
          layers[j]['visible'] = layerVisibility[oldOverlayTitle]
        } else {
          layerVisibility[oldOverlayTitle] = layers[j]['visible']
        }
      }
    }
  }
  for (i = 0; i < numLayers; i++) {
    if (this.isAnimationLayer(layers[i])) {
      layer = jQuery.extend(true, {}, layers[i])
      animation = layer['animation']
      // Shrink animation time frame if necessary
      animationBeginTime = /** @type {number} */ (this.get('animationBeginTime'))
      if (animation['beginTime'] < animationBeginTime) {
        animation['beginTime'] = animationBeginTime
      }
      animationEndTime = (this.get('animationEndTime'))
      if (animationEndTime < animation['endTime']) {
        animation['endTime'] = animationEndTime
      }
      if (animation['resolutionTime'] === undefined) {
        animation['resolutionTime'] = this.get('animationResolutionTime')
      }

      mapLayers = new _ol_Collection_()
      title = layer['title']
      // Check if new overlay is needed
      newOverlay = true
      overlayLegends = null
      for (j = 0; j < overlays.length; j++) {
        if (title === overlays[j].get('title')) {
          newOverlay = false
          mapLayers = overlays[j].getLayers()
          overlayLegends = overlays[j].get('legends')
          if (overlayLegends == null) {
            overlayLegends = []
          }
          break
        }
      }
      this.loadOverlay(layer, mapLayers, numIntervalItems, extent, loadId)
      layerLegend = null
      if (layer['animation']['hasLegend']) {
        if (layer['animation']['legendSource'] != null) {
          numLegends = legends.length
          duplicateLegend = -1
          for (k = 0; k < numLegends; k++) {
            if ((title === legends[k]['title']) && (layer['animation']['legendSource'] === legends[k]['source'])) {
              duplicateLegend = k
              break
            }
          }
          if (duplicateLegend < 0) {
            layerLegend = {
              'title': title,
              'source': layer['animation']['legendSource'],
              'id': numLegends
            }
            legends.push(layerLegend)
          }
        } else {
          legendUrls = this.getLegendUrls(layer)
          for (l = 0; l < legendUrls.length; l++) {
            if (legendUrls[l] != null) {
              numLegends = legends.length
              duplicateLegend = -1
              for (k = 0; k < numLegends; k++) {
                if ((title === legends[k]['title']) && (layer['animation']['legendSource'] === legends[k]['source'])) {
                  duplicateLegend = k
                  break
                }
              }
              if (duplicateLegend < 0) {
                layerLegend = {
                  'title': title,
                  'url': legendUrls[l],
                  'id': numLegends
                }
                legends.push(layerLegend)
              }
            }
          }
        }
        if (layer['animation']['legendVisible']) {
          defaultLegend = (duplicateLegend < 0) ? legends.length - 1 : duplicateLegend
        }
      }
      if (newOverlay) {
        animationGroups.push(mapLayers.getArray())
        pGrp.push(-1)
        opacity = (layer['opacity'] != null) ? layer['opacity'] : 1
        overlay = new _ol_layer_Group_({
          'title': title,
          'layers': mapLayers,
          'legends': layerLegend !== null ? [layerLegend] : [],
          'visible': mapLayers.getLength() > 0 ? true : layer['visible'],
          'opacity': layer['visible'] ? opacity : 0,
          'editOpacity': layer['editOpacity']
        })
        overlay.set('defaultOpacity', opacity)
        overlays.push(overlay)
        overlayTitles.push(title)
      } else if (layerLegend !== null) {
        overlayLegends.push(layerLegend)
      }
    }
  }
  if (this.loadId !== loadId) {
    return null
  }
  this.scheduleOverlayLoading(overlays, loadId)
  if (this.get('config')['showLegend']) {
    this.generateLegendFigures(legends, defaultLegend)
  }
  this.set('overlayTitles', overlayTitles)
  this.set('legends', legends)
  this.set('animationGroups', animationGroups)
  this.set('pGrp', pGrp)
  this.set('extent', this.calculateExtent(true))
  return overlays
}

/**
 * Arrange data layer loading order.
 * @param {Array} overlays Data layers to be loaded.
 * @param {number} loadId Identifier for loading instance.
 */
MapAnimation.prototype.scheduleOverlayLoading = function (overlays, loadId) {
  const self = this
  const asyncLoadQueue = {}
  const animationTime = /** @type {number} */ (this.get('animationTime'))
  let i
  let j
  let k
  let len
  let overlay
  let layers
  let jMax
  let kAnimationTime
  let q
  let r
  let item
  let asyncLoadItem
  let layerSwitcher
  asyncLoadQueue[loadId] = []
  for (i = 0, len = overlays.length; i < len; i++) {
    overlay = overlays[i]
    layers = overlay.getLayers()
    jMax = layers.getLength()
    loopLayers: for (j = 0; j < jMax; j++) {
      item = layers.item(j)
      asyncLoadItem = {
        'overlay': i,
        'layer': j,
        'animationTime': item.get('animation')['animationTime']
      }
      // Optimizing rules for loading queue location:
      // 1. Future times before past times
      // 2. Smaller time values before greater ones
      const p = asyncLoadItem['animationTime'] >= animationTime
      for (k = 0; k < asyncLoadQueue[loadId].length; k++) {
        kAnimationTime = asyncLoadQueue[loadId][k]['animationTime']
        q = kAnimationTime >= animationTime
        r = asyncLoadItem['animationTime'] <= kAnimationTime
        if ((p || !q) && (p || r) && (!q || r)) {
          asyncLoadQueue[loadId].splice(k, 0, asyncLoadItem)
          continue loopLayers
        }
      }
      asyncLoadQueue[loadId].push(asyncLoadItem)
    }
  }
  self.asyncLoadQueue = asyncLoadQueue
  if (asyncLoadQueue[loadId].length === 0) {
    layerSwitcher = self.get('layerSwitcher')
    if (layerSwitcher != null) {
      jQuery('.layer-switcher input:disabled').prop('disabled', false)
    }
  }
}

/**
 * Create legend urls based on layer configuration.
 * @param {Object} layer Map layer.
 * @returns {Array} Legend urls.
 */
MapAnimation.prototype.getLegendUrls = layer => {
  let urls, hasLegend, baseUrl, params, layerIds, lastChar, imageFormat, layerId, i
  if (!(layer && layer['animation'])) {
    return null
  }
  urls = []
  hasLegend = layer['animation']['hasLegend']
  if (typeof hasLegend === 'string') {
    // Explicit legend URL
    urls.push(encodeURI(hasLegend))
  } else {
    if (!(layer['sourceOptions'] && layer['sourceOptions']['params'])) {
      return null
    }

    // Create GeoServer style legend URL
    params = layer['sourceOptions']['params']
    // Layer IDs may be given as an array in layer params.
    // Property name for IDs depends on the layer class.
    if (typeof params['LAYERS'] !== 'undefined') {
      layerIds = params['LAYERS']
    } else if (typeof params['layers'] !== 'undefined') {
      layerIds = params['layers']
    } else {
      return null
    }
    layerIds = layerIds.split(',')
    baseUrl = layer['sourceOptions']['url']
    // First check if ? or & is required in the end
    // of the url before query string.
    lastChar = baseUrl.charAt(baseUrl.length - 1)
    if (!baseUrl.includes('?')) {
      // URL does not contain ? yet.
      // URL should contain only one ? in the beginning of query.
      baseUrl += '?'
    } else if (lastChar !== '?' && lastChar !== '&') {
      // URL did not end with ? but contains it.
      // Append & delimiter to the beginning of the query
      // because it was not included there yet.
      baseUrl += '&'
    }
    imageFormat = params['format'] || params['FORMAT'] || 'image/png'
    baseUrl += `REQUEST=GetLegendGraphic&FORMAT=${encodeURIComponent(imageFormat)}&LAYER=`
    // Single layer may contain multiple layer IDs.
    // Provide separate URL for each layer ID.
    for (i = 0; i < layerIds.length; i++) {
      layerId = layerIds[i]
      // Skip empty ids.
      if (layerId) {
        urls.push(baseUrl + encodeURIComponent(layerId))
      }
    }
  }
  return urls
}

/**
 * Generates legend images.
 * @param {Array} legends Information of legends.
 * @param {number} defaultLegend Index of visible default legend.
 */
MapAnimation.prototype.generateLegendFigures = function (legends, defaultLegend) {
  let config,
    container,
    img,
    createFigure
  // Are legends already drawn?
  if (this.get('legendsCreated')) {
    return
  }
  config = this.get('config')
  container = jQuery(`div.${config['legendContainer']}`)
  container.empty()
  container.addClass(constants.LEGEND_CONTAINER_CLASS);
  createFigure = (legend, visible) => {
    let caption
    const figure = jQuery('<figure></figure>')
    if (!visible) {
      figure.hide()
    }
    figure.addClass(constants.LEGEND_FIGURE_CLASS_PREFIX + legend['id'].toString(10))
    caption = jQuery('<figcaption></figcaption>')
    caption.append(legend['title'])
    figure.append(caption)
    if (legend['source'] !== undefined) {
      figure.append(legend['source'])
    } else {
      img = new Image()
      jQuery(img).on('load', function () {
        figure.append(jQuery(this))
      }).attr({
        'src': legend['url']
      })
    }
    container.append(figure)
  }
  for (let i = 0; i < legends.length; i++) {
    createFigure(legends[i], i === defaultLegend)
  }
  this.set('legendsCreated', true)
}

/**
 * Sets animation time.
 * @param {number} animationTime Animation time.
 */
MapAnimation.prototype.setAnimationTime = function (animationTime) {
  let callbacks = this.get('callbacks'),
    currentTime = this.get('animationTime')
  if (currentTime === animationTime) {
    return
  }
  this.set('animationTime', animationTime)
  if ((callbacks != null) && (typeof callbacks['time'] === 'function')) {
    callbacks['time'](animationTime)
  }
  this.updateAnimation()
}

/**
 * Updates map animation.
 */
MapAnimation.prototype.updateAnimation = function () {
  const self = this
  let i
  let mapLayers
  let nextPGrp
  const newPGrp = []
  const animationGroups = this.get('animationGroups')
  const numGroups = animationGroups.length
  const pGrp = this.get('pGrp')
  const animationEndTime = /** @type {number} */ (this.get('animationEndTime'))
  const animationResolutionTime = /** @type {number} */ (self.get('animationResolutionTime'))
  const time = /** @type {number} */ (this.get('animationTime'))
  let opacity
  let animation
  let maxAnimationTime
  let animationTime
  const currentTime = Date.now()
  // Collect updating information
  for (i = 0; i < numGroups; i++) {
    mapLayers = animationGroups[i]
    // Restart from beginning
    if ((pGrp[i] > -1) && (mapLayers[pGrp[i]].get('animation')['animationTime'] > time)) {
      nextPGrp = 0
    } else {
      nextPGrp = pGrp[i] + 1
    }
    while ((nextPGrp < mapLayers.length) && (mapLayers[nextPGrp].get('animation')['animationTime'] < time + animationResolutionTime)) {
      nextPGrp = nextPGrp + 1
    }
    newPGrp.push(nextPGrp - 1)
  }
  // Update
  animationTime = /** @type {number} */ (this.get('animationTime'))
  for (i = 0; i < numGroups; i++) {
    mapLayers = animationGroups[i]
    if (pGrp[i] >= 0) {
      animation = mapLayers[pGrp[i]].get('animation')
      maxAnimationTime = (animation['endTime'] == null) ? animationEndTime : Math.min(animation['endTime'], animationEndTime)
      if (((pGrp[i] === mapLayers.length - 1) && (mapLayers[pGrp[i]].get('type') === self.layerTypes['observation']) && (animationTime >= animation['animationTime'] + animationResolutionTime)) || ((pGrp[i] === 0) && (mapLayers[pGrp[i]].get('type') === self.layerTypes['forecast']) && (animationTime < currentTime))) {
        // Hide previous frame
        mapLayers[pGrp[i]].setOpacity(0)
        continue
      }
    }
    if ((pGrp[i] !== newPGrp[i]) && (pGrp[i] >= 0)) {
      // Hide previous frame
      mapLayers[pGrp[i]].setOpacity(0)
    }
    pGrp[i] = newPGrp[i]
    if ((pGrp[i] >= 0) && (!((pGrp[i] === 0) && (mapLayers[pGrp[i]].get('type') === self.layerTypes['forecast']) && (animationTime < currentTime)))) {
      // Show current frame
      opacity = mapLayers[pGrp[i]].get('defaultOpacity')
      mapLayers[pGrp[i]].setOpacity(opacity)
    }
  }
  // console.log("Animation updated.");
  // console.log(goog.now());
}

/** @inheritDoc */
MapAnimation.prototype.destroyAnimation = function () {
  this.actionEvents.removeAllListeners()
  this.variableEvents.removeAllListeners()
  let map = this.get('map')
  const config = this.get('config')
  if (map !== null) {
    map.setTarget(null)
    map = null
  }
  this.set('map', null)
  this.set('layers', null)
  this.set('overlayTitles', null)
  this.set('extent', null)
  this.set('marker', null)
  this.set('callbacks', null)
  this.set('animationGroups', null)
  this.set('legends', null)
  this.set('pGrp', null)
  this.set('layerSwitcher', null)
  jQuery(`#${config['container']}`).empty()
  jQuery(`.${config['container']}`).empty()
  jQuery(`#${config['mapContainer']}`).empty()
  jQuery(`.${config['mapContainer']}`).empty()
  jQuery(`#${config['legendContainer']}`).empty()
  jQuery(`.${config['legendContainer']}`).empty()
  jQuery(`#${config['spinnerContainer']}`).hide()
  jQuery(`.${config['spinnerContainer']}`).hide()
}

/** @inheritDoc */
MapAnimation.prototype.setZoom = function (level) {
  this.get('map').getView().setZoom(level)
}

/** @inheritDoc */
MapAnimation.prototype.setCenter = function (coordinates) {
  const view = this.get('map').getView(), centerProjection = this.get('config')['defaultCenterProjection'],
    viewProjection = view.getProjection()
  view.setCenter(((centerProjection == null) || (centerProjection === viewProjection.getCode())) ? coordinates : _ol_Proj_.transform(
    coordinates,
    centerProjection,
    viewProjection
  ))
}

/** @inheritDoc */
MapAnimation.prototype.setRotation = function (angle) {
  this.get('map').getView().setRotation(angle)
}

/** @inheritDoc */
MapAnimation.prototype.getMap = function () {
  return /** @type {Object} */ (this.get('map'))
}

/** @inheritDoc */
MapAnimation.prototype.getFeatures = function (layerTitle) {
  const config = this.get('config')
  const featureGroupName = config['featureGroupName']
  const map = this.get('map')
  let layerGroups
  let layerGroup
  let numLayerGroups
  let layers
  let layer
  let numLayers
  let i
  let j
  if (map == null) {
    return []
  }
  layerGroups = map.getLayers()
  numLayerGroups = layerGroups.getLength()
  // Todo: tee get-funktio loopin sijaan
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    if (layerGroup.get('title') === featureGroupName) {
      layers = layerGroup.getLayers()
      numLayers = layers.getLength()
      for (j = 0; j < numLayers; j++) {
        layer = layers.item(j)
        if (!layer.get('visible')) {
          continue
        }
        if (layer.get('title') === layerTitle) {
          return layer.getSource().getFeatures()
        }
      }
    }
  }
  return []
}

/** @inheritDoc */
MapAnimation.prototype.getFeaturesAt = function (layerTitle, coordinate, tolerance) {
  const config = this.get('config')
  const baseGroupName = config['featureGroupName']
  const map = this.get('map')
  const layerGroups = map.getLayers()
  let layerGroup
  const numLayerGroups = layerGroups.getLength()
  let layers
  let layer
  let numLayers
  let numFeatures
  let numFeaturesAtCoordinate
  let source
  let geometry
  let features
  let featuresAtCoordinate = []
  const clickedPixel = map.getPixelFromCoordinate(coordinate)
  let featurePixel
  let i
  let j
  let k
  let l
  // Todo: tee getBaseLayers-funktio loopin sijaan
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    if (layerGroup.get('title') === baseGroupName) {
      layers = layerGroup.getLayers()
      numLayers = layers.getLength()
      for (j = 0; j < numLayers; j++) {
        layer = layers.item(j)
        if (!layer.get('visible')) {
          continue
        }
        if (layer.get('title') === layerTitle) {
          source = layer.getSource()
          featuresAtCoordinate = source.getFeaturesAtCoordinate(coordinate)
          numFeaturesAtCoordinate = featuresAtCoordinate.length
          // Point features
          features = source.getFeatures()
          numFeatures = features.length
          loopFeatures:
            for (k = 0; k < numFeatures; k++) {
              for (l = 0; l < numFeaturesAtCoordinate; l++) {
                if (featuresAtCoordinate[l].getId() === features[k].getId()) {
                  continue loopFeatures
                }
              }
              geometry = features[k].getGeometry()
              if (geometry.getType() === 'Point') { // Todo: MultiPoint
                featurePixel = map.getPixelFromCoordinate(geometry.getCoordinates())
                if (Math.sqrt((featurePixel[0] - clickedPixel[0]) ** 2 + (featurePixel[1] - clickedPixel[1]) ** 2) <= tolerance) {
                  featuresAtCoordinate.push(features[k])
                }
              }
            }
          return featuresAtCoordinate
        }
      }
    }
  }
  return []
}

/** @inheritDoc */
MapAnimation.prototype.addFeatures = function (layerTitle, projection, featureOptions) {
  const config = this.get('config')
  const featureGroupName = config['featureGroupName']
  const map = this.get('map')
  const layerGroups = map.getLayers()
  let layerGroup
  const numLayerGroups = layerGroups.getLength()
  let layers
  let layer
  let numLayers
  let features
  let source
  const viewProjection = /** @type {ol.proj.Projection|string} */ (this.get('viewProjection'))
  let i
  let j
  // Todo: tee get-funktio loopin sijaan
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    if (layerGroup.get('title') === featureGroupName) {
      layers = layerGroup.getLayers()
      numLayers = layers.getLength()
      for (j = 0; j < numLayers; j++) {
        layer = layers.item(j)
        if (layer.get('title') === layerTitle) {
          source = layer.getSource()
          features = this.createFeatures(featureOptions)
          if (features.length > 0) {
            features.forEach(feature => {
              if (projection !== viewProjection) {
                feature.getGeometry().transform(projection, viewProjection)
              }
              source.addFeature(feature)
            })
          }
          return
        }
      }
    }
  }
}

/** @inheritDoc */
MapAnimation.prototype.clearFeatures = function (layerTitle) {
  const config = this.get('config')
  const featureGroupName = config['featureGroupName']
  const map = this.get('map')
  const layerGroups = map.getLayers()
  let layerGroup
  const numLayerGroups = layerGroups.getLength()
  let layers
  let layer
  let numLayers
  let i
  let j
  // Todo: tee get-funktio loopin sijaan
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    if (layerGroup.get('title') === featureGroupName) {
      layers = layerGroup.getLayers()
      numLayers = layers.getLength()
      for (j = 0; j < numLayers; j++) {
        layer = layers.item(j)
        if (layer.get('title') === layerTitle) {
          layer.getSource().clear()
          return
        }
      }
    }
  }
}

/** @inheritDoc */
MapAnimation.prototype.showPopup = function (content, coordinate) {
  const popupContent = document.getElementById(`${this.get('config')['mapContainer']}-popup-content`)
  popupContent['innerHTML'] = content
  this.get('overlay').setPosition(coordinate)
}

/** @inheritDoc */
MapAnimation.prototype.hidePopup = function () {
  const mapContainer = this.get('config')['mapContainer']
  let popupCloser
  const overlay = this.get('overlay')
  if (overlay != null) {
    overlay.setPosition(undefined)
  }
  popupCloser = document.getElementById(`${mapContainer}-popup-closer`)
  if (popupCloser != null) {
    popupCloser.blur()
  }
}

/** @inheritDoc */
MapAnimation.prototype.getLayer = function (layerTitle) {
  const map = this.get('map')
  const layerGroups = map.getLayers()
  const numLayerGroups = layerGroups.getLength()
  let layerGroup
  let layers
  let numLayers
  let layer
  let i
  let j
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    layers = layerGroup.getLayers()
    numLayers = layers.getLength()
    for (j = 0; j < numLayers; j++) {
      layer = layers.item(j)
      if (layer.get('title') === layerTitle) {
        return layer
      }
    }
  }
  return null
}

/** @inheritDoc */
MapAnimation.prototype.requestViewUpdate = function () {
  this.set('updateRequested', Date.now())
}

/** @inheritDoc */
MapAnimation.prototype.setLayerVisible = function (layerTitle, visibility) {
  const map = this.get('map')
  const localStorageId = this.get('config')['project']+'-'+layerTitle+'-visible'
  const layerVisibility = map.get('layerVisibility')
  const layer = this.getLayer(layerTitle)
  let updateVisibility
  if (layerVisibility[layerTitle] == null) {
    if (this.loading) {
      updateVisibility = jQuery.extend(true, {}, layerVisibility)
      updateVisibility[layerTitle] = visibility
      this.set('updateVisibility', updateVisibility)
    } else {
      layer.setVisible(visibility)
      layerVisibility[layerTitle] = visibility
      localStorage.setItem(localStorageId, visibility)
      this.requestViewUpdate()
    }
  } else {
    layer.setVisible(visibility)
    layerVisibility[layerTitle] = visibility
    localStorage.setItem(localStorageId, visibility)
    this.requestViewUpdate()
  }
}

/** @inheritDoc */
MapAnimation.prototype.setInteractions = function (interactionOptions) {
  let map = this.get('map'),
    interaction,
    mapInteractions,
    i
  loopOptions:
    for (interaction in interactionOptions) {
      if (interactionOptions.hasOwnProperty(interaction)) {
        mapInteractions = map.getInteractions()
        i = 0
        // Arrangements for Closure compiler advanced optimizations
        switch (interaction) {
          case ('DragRotate'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_DragRotate_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_DragRotate_(interactionOptions[interaction]))
            }
            break
          case ('DragRotateAndZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_DragRotateAndZoom_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_DragRotateAndZoom_(interactionOptions[interaction]))
            }
            break
          case ('DoubleClickZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_DoubleClickZoom_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_DoubleClickZoom_(interactionOptions[interaction]))
            }
            break
          case ('DragPan'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_DragPan_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_DragPan_(interactionOptions[interaction]))
            }
            break
          case ('PinchRotate'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_PinchRotate_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_PinchRotate_(interactionOptions[interaction]))
            }
            break
          case ('PinchZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_PinchZoom_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_PinchZoom_(interactionOptions[interaction]))
            }
            break
          case ('KeyboardPan'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_KeyboardPan_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_KeyboardPan_(interactionOptions[interaction]))
            }
            break
          case ('KeyboardZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_KeyboardZoom_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_KeyboardZoom_(interactionOptions[interaction]))
            }
            break
          case ('MouseWheelZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_MouseWheelZoom_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_MouseWheelZoom_(interactionOptions[interaction]))
            }
            break
          case ('DragZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof _ol_interaction_DragZoom_) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new _ol_interaction_DragZoom_(interactionOptions[interaction]))
            }
            break
        }
      }
    }
}

/** @inheritDoc */
MapAnimation.prototype.setStaticControls = function (staticControls) {
  const config = this.get('config')
  config['staticControls'] = staticControls
  this.set('configChanged', true)
  this.createAnimation()
}

/** @inheritDoc */
MapAnimation.prototype.getStaticControls = function () {
  return this.get('config')['staticControls'] === true
}

/** @inheritDoc */
MapAnimation.prototype.setCallbacks = function (callbacks) {
  const callbackFunctions = this.get('callbacks')
  for (const callback in callbacks) {
    if (callbacks.hasOwnProperty(callback)) {
      callbackFunctions[callback] = callbacks[callback]
    }
  }
}
