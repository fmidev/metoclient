/**
 * @fileoverview OpenLayers 4 implementation of map view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import EventEmitter from 'wolfy87-eventemitter'
import elementResizeDetectorMaker from 'element-resize-detector'
import extend from 'extend'
import isNumeric from 'fast-isnumeric'
import { default as proj4 } from 'proj4'
import 'core-js/fn/array/from'
import moment from 'moment-timezone'
import * as constants from '../../constants'
import renameKeys from 'rename-keys'
import LayerSwitcher from './LayerSwitcher'
import MapProducer from './MapProducer'
import FeatureProducer from './FeatureProducer'
import Ol from 'ol/index'
import OlCollection from 'ol/collection'
import OlControlZoom from 'ol/control/zoom'
import olEventsCondition from 'ol/events/condition'
import OlFeature from 'ol/feature'
import OlFormatWMSCapabilities from 'ol/format/wmscapabilities'
import OlFormatWMTSCapabilities from 'ol/format/wmtscapabilities'
import OlInteraction from 'ol/interaction'
import OlInteractionDoubleClickZoom from 'ol/interaction/doubleclickzoom'
import OlInteractionDragPan from 'ol/interaction/dragpan'
import OlInteractionDragRotate from 'ol/interaction/dragrotate'
import OlInteractionDragRotateAndZoom from 'ol/interaction/dragrotateandzoom'
import OlInteractionDragZoom from 'ol/interaction/dragzoom'
import OlInteractionKeyboardPan from 'ol/interaction/keyboardpan'
import OlInteractionKeyboardZoom from 'ol/interaction/keyboardzoom'
import OlInteractionMouseWheelZoom from 'ol/interaction/mousewheelzoom'
import OlInteractionPinchRotate from 'ol/interaction/pinchrotate'
import OlInteractionPinchZoom from 'ol/interaction/pinchzoom'
import OlInteractionSelect from 'ol/interaction/select'
import OlLayerGroup from 'ol/layer/group'
import OlLayerImage from 'ol/layer/image'
import OlLayerTile from 'ol/layer/tile'
import OlLayerVector from 'ol/layer/vector'
import OlMap from 'ol/map'
import OlObject from 'ol/object'
import OlOverlay from 'ol/overlay'
import OlProj from 'ol/proj'
import OlStyleIcon from 'ol/style/icon'
import OlStyleStyle from 'ol/style/style'
import OlView from 'ol/view'
import OlSourceVector from 'ol/source/vector'
import OlSourceWMTS from 'ol/source/wmts'
import OlGeomPoint from 'ol/geom/point'

export default class MapAnimation {
  /**
   * Constructs OpenLayers 4 based map view.
   * @constructor
   * @param config {object} Configuration for map view.
   * @extends {ol.Object}
   * @implements {fi.fmi.metoclient.ui.animator.view.interfaces.Animation}
   */
  constructor (config) {
    // Call to the OpenLayers superclass constructor
    OlObject.call(this)
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
    this.set('updateVisibility', null)
    this.set('interactionConfig', null)
    this.set('configChanged', false)
    this.loadedOnce = false
    this.viewOptions = {}
    this.asyncLoadQueue = {}
    this.asyncLoadCount = {}
    this.numIntervalItems = {}
    this.loadId = 0
    this.finishedId = 0
    this.actionEvents = new EventEmitter()
    this.variableEvents = new EventEmitter()
    this.loading = false
    // Todo: case insensitive
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
Ol.inherits(MapAnimation, OlObject)

/**
 * Creates layered animated map.
 * @param {Object=} layers Map layers.
 * @param {Object=} capabilities Capabilities for time steps.
 * @param {number=} currentTime Current real-world time.
 * @param {number=} animationTime Animation time.
 * @param {number=} animationBeginTime Animation begin time.
 * @param {number=} animationEndTime Animation end time.
 * @param {number=} animationResolutionTime Animation end time.
 * @param {number=} animationNumIntervals Number of animation intervals.
 * @param {Object=} callbacks Callback functions for map events.
 */
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
  const map = this.get('map')
  if (layers != null) {
    numLayers = layers.length
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
  OlProj.setProj4(proj4)
  if (OlProj.get('EPSG:3067') == null) {
    this.initEPSG3067Projection()
  }

  if (callbacks != null) {
    this.set('callbacks', callbacks)
  }

  this.set('viewProjection', this.get('config')['projection'])
  this.updateStorage()
  this.parameterizeLayers(capabilities)
  this.initMap()
}

/**
 * Performs bidirectional data exchange with local storage.
 */
MapAnimation.prototype.updateStorage = function () {
  try {
    if (typeof window['localStorage'] === 'undefined') {
      return
    }
    const layers = this.get('layers')
    let localStorageOpacity
    let localStorageVisible
    let project = this.get('config')['project']
    let i
    let layer
    let numLayers = layers.length

    for (i = 0; i < numLayers; i++) {
      layer = layers[i]
      if (layer['useSavedOpacity']) {
        localStorageOpacity = this.loadLayerPropertyFromLocalStorage(layer['title'], 'opacity')
        if (localStorageOpacity != null) {
          layer['opacity'] = localStorageOpacity
        }
      }
      if (layer['opacity'] != null) {
        window['localStorage'].setItem(project + '-' + layer['title'] + '-opacity', layer['opacity'])
      }
      if (layer['useSavedVisible']) {
        localStorageVisible = this.loadLayerPropertyFromLocalStorage(layer['title'], 'visible')
        if (localStorageVisible != null) {
          layer['visible'] = localStorageVisible
        }
      }
      if (layer['visible'] != null) {
        window['localStorage'].setItem(project + '-' + layer['title'] + '-visible', layer['visible'])
      }
    }
  } catch (e) {
    console.log('Local storage is not supported. ' + e)
  }
}

/**
 * Parses time values from capabilities string.
 * @param {Object} layer Layer configuration.
 * @param {string} values Capabilities time definitions.
 */
MapAnimation.prototype.parseCapabTimes = function (layerAnimation, values) {
  let parameters = values.split('/')
  let i, dates, datesLen, capabTime
  if (parameters.length >= 3) {
    layerAnimation['capabBeginTime'] = moment(parameters[0]).valueOf()
    layerAnimation['capabEndTime'] = moment(parameters[1]).valueOf()
    layerAnimation['capabResolutionTime'] = moment.duration(parameters[2]).asMilliseconds()
  } else {
    dates = values.split(',')
    layerAnimation['capabTimes'] = []
    for (i = 0, datesLen = dates.length; i < datesLen; i++) {
      capabTime = moment(dates[i]).valueOf()
      if (isNumeric(capabTime)) {
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
  const results = {}
  const layers = this.get('layers')
  let result
  let numLayers
  let template
  let i
  let l
  let id
  let len
  let layersCapab
  let dimension
  let values
  let wmsParser
  let wmtsParser
  let options
  numLayers = layers.length
  loopLayers: for (i = 0; i < numLayers; i++) {
    if (layers[i]['className'].toLowerCase() !== 'vector') {
      layers[i] = renameKeys(layers[i], (key, val) => {
        if ((key === 'source') && (typeof val === 'object')) {
          val = renameKeys(layers[i], (key, val) => {
            if ((key === 'tilegrid') && (typeof val === 'object')) {
              return 'tilegridOptions'
            }
            return key
          })
          return 'sourceOptions'
        }
        return key
      })
    }
    template = layers[i]
    // WMTS/tiles
    if (capabilities != null) {
      wmtsParser = new OlFormatWMTSCapabilities()
      if ((template['tileCapabilities'] != null) && (capabilities[template['tileCapabilities']] != null)) {
        if (results[template['tileCapabilities']] === undefined) {
          results[template['tileCapabilities']] = wmtsParser.read(capabilities[template['tileCapabilities']])
        }
        options = OlSourceWMTS.optionsFromCapabilities(results[template['tileCapabilities']], {
          'layer': template['sourceOptions']['layer'],
          'matrixSet': template['sourceOptions']['matrixSet']
        })
        extend(template['sourceOptions'], options)
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
      template['timeCapabilitiesInit'] = null
      continue
    }
    if (template['timeCapabilities'] == null) {
      continue
    }
    if (capabilities == null) {
      continue
    }
    wmsParser = new OlFormatWMSCapabilities()
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
    layersCapab = result['Capability']['Layer']['Layer']
    // todo: remove ifs
    // todo: generalize
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
  const callbacks = this.get('callbacks')
  const controls = new OlCollection()
  const mapContainer = config['mapContainer']
  const maxZoom = config['defaultMaxZoom']
  const minZoom = config['defaultMinZoom']
  const self = this
  const target = document.getElementById(mapContainer)
  const viewProjection = /** @type {string} */ (this.get('viewProjection'))
  let interactionConfig = this.get('interactionConfig')
  let interactionOptions
  let interactions
  let layerSwitcher
  let layerVisibility = {}
  let map = this.get('map')
  let overlay
  let mapContainerElement
  let popupCloser
  let popupContainer
  let viewCenter
  let viewZoom
  let i
  let layerGroup
  let layerGroups
  let numLayerGroups
  let staticLayers
  if (target == null) {
    return
  }
  mapContainerElement = document.getElementById(mapContainer)
  if (this.get('configChanged')) {
    this.set('configChanged', false)
  }
  if (map != null) {
    layerVisibility = map.get('layerVisibility')
    this.getLayersByGroup(config['overlayGroupName']).forEach(layer => {
      layer.setLayers(new OlCollection())
    })
    layerGroups = map.getLayers()
    numLayerGroups = layerGroups.getLength()
    for (i = 0; i < numLayerGroups; i++) {
      layerGroup = layerGroups.item(i)
      if (layerGroup.get('title') === config['featureGroupName']) {
        staticLayers = self.loadStaticLayers(layerVisibility, this.layerTypes['features'])
        if (staticLayers != null) {
          layerGroup.setLayers(new OlCollection(staticLayers))
        }
        break
      }
    }
    this.requestViewUpdate()
    return
  }
  viewCenter = this.viewOptions['center'] != null ? this.viewOptions['center'] : (config['defaultCenterProjection'] === viewProjection ? config['defaultCenterLocation'] : OlProj.transform(
      config['defaultCenterLocation'],
      config['defaultCenterProjection'],
      viewProjection)
  )
  viewZoom = this.viewOptions['zoom'] != null ? this.viewOptions['zoom'] : config['defaultZoomLevel']
  let erd = elementResizeDetectorMaker()
  erd.listenTo(mapContainerElement, function (element) {
    let map = self.get('map')
    if (map != null) {
      map.updateSize()
    }
  })
  popupContainer = document.getElementById(`${mapContainer}-popup`)
  if (popupContainer != null) {
    target.appendChild(popupContainer)
  }
  Array.from(target.getElementsByClassName('ol-viewport')).forEach((olContainer) => {
    olContainer.parentNode.removeChild(olContainer)
  })
  Ol['ASSUME_TOUCH'] = false
  if (interactionConfig != null) {
    interactionOptions = extend(true, {}, interactionConfig)
  } else {
    interactionOptions = (config['interactions'] != null) ? config['interactions'] : {}
    interactionConfig = extend(true, {}, interactionOptions)
    this.set('interactionConfig', interactionConfig)
  }
  if (config['staticControls']) {
    this.initStaticInteractions(interactionOptions)
  } else {
    controls.push(new OlControlZoom({
      'duration': 0,
      'zoomInTipLabel': config['zoomInTooltip'],
      'zoomOutTipLabel': config['zoomInTooltip']
    }))
    mapContainerElement.style.pointerEvents = 'auto'
  }
  interactions = OlInteraction.defaults(interactionOptions)
  popupContainer = document.getElementById(`${mapContainer}-popup`)
  popupCloser = document.getElementById(`${mapContainer}-popup-closer`)
  // Create an overlay to anchor the popup to the map.
  overlay = new OlOverlay(/** @type {olx.OverlayOptions} */ ({
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
  map = new OlMap({
    layers: [
      new OlLayerGroup({
        'nested': true,
        'title': config['baseGroupName'],
        'layers': self.loadStaticLayers(layerVisibility, this.layerTypes['map'])
      }),
      new OlLayerGroup({
        'nested': true,
        'title': config['overlayGroupName'],
        'layers': []
      }),
      new OlLayerGroup({
        'nested': true,
        'title': config['featureGroupName'],
        'layers': self.loadStaticLayers(layerVisibility, this.layerTypes['features'])
      }),
      new OlLayerGroup({
        'nested': true,
        'title': '', // config['staticOverlayGroupName'],
        'layers': self.loadStaticLayers(layerVisibility, this.layerTypes['overlay']),
        'zIndex': 1000
      })
    ],
    overlays: [overlay],
    target: target,
    controls,
    interactions,
    view: new OlView(this.viewOptions)
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
      'elementId': config['layerSwitcherContainer'],
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
  Array.from(mapContainerElement.getElementsByClassName('ol-zoom-in')).forEach((zoomIn) => {
    zoomIn.setAttribute('title', config['zoomInTooltip'])
  })
  Array.from(mapContainerElement.getElementsByClassName('ol-zoom-out')).forEach((zoomIn) => {
    zoomIn.setAttribute('title', config['zoomOutTooltip'])
  })
  Array.from(mapContainerElement.getElementsByClassName('ol-viewport')).forEach((olViewport) => {
    olViewport.style.touchAction = 'auto'
  })
  self.set('map', map)
  this.setViewListeners()
  if (!self.get('listenersInitialized')) {
    self.initListeners()
  }
  if ((callbacks != null) && (typeof callbacks['init'] === 'function')) {
    callbacks['init']()
  }
  Array.from(mapContainerElement.getElementsByClassName('ol-popup')).forEach((olPopup) => {
    olPopup.style.display = ''
  })
  this.defineSelect()
}

/**
 * Defines feature selection functionality and styles.
 */
MapAnimation.prototype.defineSelect = function () {
  const map = this.get('map')
  const config = this.get('config')
  const callbacks = this.get('callbacks')
  let select
  let selectedFeatures = new OlCollection()
  let extraStyles
  let mappings = {
    'styleHover': {
      'condition': 'pointerMove',
      'select': 'hover',
      'deselect': 'unhover'
    },
    'styleSelected': {
      'condition': function (event) {
        if (event['type'] === 'singleclick') {
          return map.forEachFeatureAtPixel(event['pixel'], function () {
            return true
          })
        }
        return false
      },
      'select': 'selected',
      'deselect': 'deselected'
    }
  }
  this.getLayersByGroup(config['featureGroupName']).forEach(layer => {
    extraStyles = layer.get('extraStyles')
    if (extraStyles != null) {
      extraStyles.forEach((extraStyle) => {
        extraStyle['data'].forEach((style) => {
          if (style instanceof OlStyleStyle) {
            select = new OlInteractionSelect({
              'condition': typeof mappings[extraStyle['name']]['condition'] === 'function' ? mappings[extraStyle['name']]['condition'] : olEventsCondition[mappings[extraStyle['name']]['condition']],
              'layers': [layer],
              'style': style
            })
            map.addInteraction(select)
            selectedFeatures = select.getFeatures()
            selectedFeatures.on('add', function (event) {
              if ((callbacks != null) && (typeof callbacks[mappings[extraStyle['name']]['select']] === 'function')) {
                callbacks[mappings[extraStyle['name']]['select']](event['element'])
              }
            })
            selectedFeatures.on('remove', function (event) {
              if ((callbacks != null) && (typeof callbacks[mappings[extraStyle['name']]['deselect']] === 'function')) {
                callbacks[mappings[extraStyle['name']]['deselect']](event['element'])
              }
            })
          }
        })
      })
    }
    layer.getSource().getFeatures().forEach(feature => {
      if (feature.get('selected')) {
        selectedFeatures.push(feature)
      }
    })
  })
}

/**
 * Sets view property change listeners.
 */
MapAnimation.prototype.setViewListeners = function () {
  const self = this
  const callbacks = this.get('callbacks')
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
  document.getElementById(config['mapContainer']).style.pointerEvents = 'none'
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
          document.getElementById(config['layerSwitcherContainer']).classList.remove('disabled')
        }
        if (self.get('updateVisibility') !== null) {
          map.set('layerVisibility', self.get('updateVisibility'))
          self.set('updateVisibility', null)
          requestUpdate = true
        }
      }
      if (layerSwitcher != null) {
        Array.from(document.querySelectorAll('.layer-switcher input:disabled')).forEach((layerSwitcher) => {
          layerSwitcher.disabled = false
        })
      }
      if (config['showLoadProgress']) {
        // Remove spinner
        Array.from(document.getElementsByClassName(config['spinnerContainer'])).forEach((spinner) => {
          spinner.style.display = 'none'
        })
      }
      // Todo: tee onFinished-funktio
      // Update visibility values
      this.getLayersByGroup(config['overlayGroupName']).forEach(overlay => {
        if (overlay.get('opacity') === 0) {
          overlay.set('visible', false)
          overlay.set('opacity', overlay.get('defaultOpacity'))
        }
      })
      self.updateAnimation()
      callbacks = self.get('callbacks')
      if ((runLoaded) && (callbacks != null) && (typeof callbacks['loaded'] === 'function')) {
        callbacks['loaded']()
      }
      if ((runLoaded) && (!self.loadedOnce) && (callbacks != null) && (typeof callbacks['loadedOnce'] === 'function')) {
        self.loadedOnce = true
        callbacks['loadedOnce']()
      }
      if (requestUpdate) {
        this.set('updateRequested', Date.now())
      }
    }
  })

  this.on('change:updateRequested', function (e) {
    const updateRequested = /** @type {number} */ (this.get('updateRequested'))
    const self = this
    self.loadId = -1

    setTimeout(() => {
      let loadId
      let asyncLoadCount
      let asyncLoadQueue
      let extent
      let overlayGroupName
      let featureGroupName
      let groupNames
      let map
      let currentVisibility
      let layerVisibility
      let layerGroupTitle
      let anyVisible = false
      if (/** @type {number} */ (self.get('updateRequested')) > updateRequested) {
        return
      }
      extent = self.calculateExtent(true)
      self.updateStorage()
      if (self.reloadNeeded(extent)) {
        loadId = Date.now()
        if (self.loadId < loadId) {
          self.loadId = loadId
        } else {
          self.loadId++
          loadId = self.loadId
        }
        self.latestLoadId = self.loadId
        asyncLoadQueue = {}
        asyncLoadQueue[loadId] = []
        self.asyncLoadQueue = asyncLoadQueue
        asyncLoadCount = {}
        asyncLoadCount[loadId] = 0
        self.asyncLoadCount = asyncLoadCount
        self.numIntervalItems = []
        // Todo: toteuta tämä LayerSwitcherissä funktiona
        Array.from(document.querySelectorAll('.layer-switcher input')).forEach((layerSwitcher) => {
          layerSwitcher.disabled = true
        })
        self.actionEvents.emitEvent('reload')
        self.loadOverlayGroup(extent, loadId)
      } else {
        overlayGroupName = self.get('config')['overlayGroupName']
        featureGroupName = self.get('config')['featureGroupName']
        groupNames = [overlayGroupName, featureGroupName]
        map = self.get('map')
        layerVisibility = map.get('layerVisibility')
        groupNames.forEach(groupName => {
          this.getLayersByGroup(groupName).forEach(layer => {
            currentVisibility = layerVisibility[layer.get('title')]
            if (currentVisibility !== undefined) {
              layer.setVisible(currentVisibility)
            }
            if (layerGroupTitle === overlayGroupName) {
              if (currentVisibility) {
                anyVisible = currentVisibility
              }
            }
          })
        })
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
    let mapProducer = new MapProducer()
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
      if (animationGroups.length === 0) {
        // Not ready
        return
      }
      // Set source
      layer = animationGroups[asyncLoadItem['overlay']][asyncLoadItem['layer']]
      layer.setOpacity(0)
      className = layer.get('className')
      sourceOptions = layer.get('sourceOptions')
      if (sourceOptions == null) {
        sourceOptions = {}
      }
      source = mapProducer.sourceFactory(className, sourceOptions)
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
  let map
  let layerVisibility
  let currentVisibility
  let layer
  let numLayers
  let config
  let containsAnimationLayers = false
  let overlayGroupName
  let layerConfigs = this.get('layers')
  let layers
  let subLayers
  let numSubLayers
  let subLayerExtent
  let i
  numLayers = layerConfigs.length
  for (i = 0; i < numLayers; i++) {
    if (this.isAnimationLayer(layerConfigs[i])) {
      containsAnimationLayers = true
      break
    }
  }
  if (!containsAnimationLayers) {
    return false
  }
  map = this.get('map')
  layerVisibility = map.get('layerVisibility')
  config = this.get('config')
  overlayGroupName = config['overlayGroupName']
  layers = this.getLayersByGroup(overlayGroupName)
  numLayers = layers.getLength()
  if (numLayers === 0) {
    return true
  }
  for (i = 0; i < numLayers; i++) {
    layer = layers.item(i)
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
      subLayerExtent = subLayers.item(0).get('extent') // Todo: check all items
      if ((subLayerExtent.length !== extent.length) ||
        (subLayerExtent[0] > extent[0]) ||
        (subLayerExtent[1] > extent[1]) ||
        (subLayerExtent[2] < extent[2]) ||
        (subLayerExtent[3] < extent[3])) {
        return true
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
  const marker = new OlGeomPoint([null, null])
  this.set('marker', marker)
  const markerFeature = new OlFeature({
    'geometry': marker
  })
  const markerStyle = new OlStyleStyle({
    'image': new OlStyleIcon(/** @type {olx.style.IconOptions} */ ({
      'anchor': [0.5, 1],
      'anchorXUnits': 'fraction',
      'anchorYUnits': 'fraction',
      'src': this.get('config')['markerImagePath']
    })),
    'zIndex': 10000
  })
  markerFeature.setStyle(markerStyle)
  const markerSource = new OlSourceVector({
    'features': [markerFeature]
  })
  return new OlLayerVector({
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
  const maxExtent = config['projection'] === projection ? configExtent : OlProj.transformExtent(configExtent, config['projection'], projection)
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
      map.setView(new OlView(self.viewOptions))
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
      layerGroups.setAt(i, new OlLayerGroup({
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
  let mapProducer = new MapProducer()
  let projection = /** @type {ol.proj.Projection|string} */ (this.get('viewProjection'))
  // Features may be too slow to extend
  template = ((options['source'] == null) || (options['source']['features'] == null)) ? options : extend(true, {}, options)
  return mapProducer.layerFactory(template, extent, projection, this.get('animationBeginTime'), this.get('animationEndTime'))
}

/**
 * Loads a layer parameter from the local storage.
 * @param {string} layer Layer title.
 * @param {string} property Property name.
 */
MapAnimation.prototype.loadLayerPropertyFromLocalStorage = function (layer, property) {
  if (typeof window['localStorage'] === 'undefined') {
    return null
  }
  let item = window['localStorage'].getItem(this.get('config')['project'] + '-' + layer + '-' + property)
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
  let self = this
  const layers = this.get('layers')
  let numLayers
  let layer
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
      template = (layers[i]['features'] != null) ? layers[i] : extend(true, {}, layers[i])
      if (layerVisibility[template['title']] != null) {
        template['visible'] = layerVisibility[template['title']]
      }
      if ((!visible) && (template['visible'])) {
        visible = true
      }
      layer = this.createLayer(template)
      if ((layerType === this.layerTypes['features']) && (layer.get('animation') != null)) {
        layer.getSource().on('addfeature', (event) => {
          let newFeature = event['feature']
          if (newFeature == null) {
            return
          }
          newFeature.setStyle(new OlStyleStyle({}))
          let featureTime = newFeature.get('time')
          if (featureTime == null) {
            return
          }
          let timestamp = moment(featureTime).utc().valueOf()
          let featureEndTime = newFeature.get('endtime')
          let endTimestamp = (featureEndTime != null) ? moment(featureEndTime).utc().valueOf() : Number.POSITIVE_INFINITY
          let vectorSource = event['target']
          let featureTimes = vectorSource.get('featureTimes')
          let numFeatureTimes
          let newIndex
          let i
          if (featureTimes == null) {
            featureTimes = []
          }
          numFeatureTimes = featureTimes.length
          newIndex = 0
          for (i = 0; i < numFeatureTimes; i++) {
            if (timestamp >= featureTimes[i]) {
              break
            }
            newIndex++
          }
          featureTimes.splice(newIndex, 0, {
            time: timestamp,
            endtime: endTimestamp,
            feature: newFeature
          })
          vectorSource.set('featureTimes', featureTimes)
          self.updateFeatureAnimation()
        })
      }
      layerData.push(layer)
    }
  }
  if ((!visible) && (layerType === this.layerTypes['map']) && (layerData.length > 0)) {
    layerData[0].set('visible', true)
  }
  return layerData
}

/**
 * Loads a new data layer.
 * @param layer Layer template based on user configurations.
 * @param mapLayers Loaded data layers.
 * @param {Array} extent Extent of overlays to be loaded.
 * @param {number} loadId Identifier for loading instance.
 */
MapAnimation.prototype.loadOverlay = function (layer, mapLayers, extent, loadId) {
  const self = this
  const config = self.get('config')
  const animation = layer['animation']
  const absBeginTime = /** @type {number} */ (this.get('animationBeginTime'))
  const absEndTime = /** @type {number} */ (this.get('animationEndTime'))
  const newOverlay = false
  let layerTime
  let layerOptions
  let layerVisibility
  let currentVisibility
  let prevLayerTime = Number.NEGATIVE_INFINITY
  let i
  let j
  let numIntervalsLen
  let iMin
  let iMax
  let mapLayer
  let largest
  let t
  let tEnd
  let k
  let tAnimation
  let tk
  let tkEnd
  let currentTime
  const epsilon = this.layerResolution
  let resolutionTime = /** @type {number} */ (self.get('animationResolutionTime'))
  let filteredCapabTimes = []
  let capabTimesDefined = false
  let deltaTime
  let endTime

  layerVisibility = this.get('map').get('layerVisibility')
  currentVisibility = layerVisibility[layer['title']]
  if (typeof currentVisibility === 'undefined') {
    currentVisibility = layer['visible']
  }
  if ((typeof currentVisibility !== 'undefined') && (!currentVisibility)) {
    return
  }
  if (Array.isArray(animation['capabTimes'])) {
    filteredCapabTimes = animation['capabTimes'].filter(capabTime => isNumeric(capabTime))
    animation['capabTimes'] = filteredCapabTimes
  }
  if (typeof animation['capabResolutionTime'] === 'number') {
    if (resolutionTime == null) {
      resolutionTime = animation['capabResolutionTime']
    }
    animation['beginTime'] = absBeginTime + Math.floor((animation['beginTime'] - absBeginTime) / resolutionTime) * resolutionTime
    animation['beginTime'] = animation['beginTime'] <= animation['capabBeginTime'] ? animation['beginTime'] + Math.ceil((animation['capabBeginTime'] - animation['beginTime']) / animation['resolutionTime']) * animation['resolutionTime'] : animation['capabBeginTime'] + Math.ceil((animation['beginTime'] - animation['capabBeginTime']) / animation['capabResolutionTime']) * animation['capabResolutionTime']
    if ((typeof animation['resolutionTime'] !== 'number') || (animation['resolutionTime'] < animation['capabResolutionTime'])) {
      animation['resolutionTime'] = animation['capabResolutionTime']
    }
    animation['beginTime'] -= Math.ceil((animation['beginTime'] - absBeginTime) / animation['resolutionTime']) * animation['resolutionTime']
    if (!isNumeric(animation['endTime'])) {
      animation['endTime'] = animation['capabEndTime']
    } else if (isNumeric(animation['capabEndTime'])) {
      animation['endTime'] = Math.min(animation['endTime'], animation['capabEndTime'])
    }
    iMin = 0
    iMax = Math.ceil((animation['endTime'] - animation['beginTime']) / animation['resolutionTime'])
    animation['endTime'] = animation['beginTime'] + iMax * animation['resolutionTime']
  } else if (filteredCapabTimes.length > 0) {
    if ((typeof animation['resolutionTime'] !== 'number') && (typeof resolutionTime === 'number')) {
      animation['resolutionTime'] = resolutionTime
    }
    if ((typeof absBeginTime === 'number') && ((typeof animation['beginTime'] !== 'number') || (animation['beginTime'] < absBeginTime))) {
      animation['beginTime'] = absBeginTime
    }
    if (typeof animation['beginTime'] !== 'number') {
      animation['beginTime'] = Number.NEGATIVE_INFINITY
    }
    if ((typeof absEndTime === 'number') && ((typeof animation['endTime'] !== 'number') || (animation['endTime'] > absEndTime))) {
      animation['endTime'] = absEndTime
    }
    if (typeof animation['endTime'] !== 'number') {
      animation['endTime'] = Number.POSITIVE_INFINITY
    }
    filteredCapabTimes = animation['capabTimes'].reduce((capabTimes, capabTime) => {
      const numCapabTimes = capabTimes.length
      if (((animation['resolutionTime'] != null)) && ((numCapabTimes >= 2) && (capabTimes[numCapabTimes - 1] - capabTimes[numCapabTimes - 2] < animation['resolutionTime']) && (capabTime - capabTimes[numCapabTimes - 2] < animation['resolutionTime']))) {
        capabTimes[numCapabTimes - 1] = capabTime
      } else if ((capabTime >= animation['beginTime']) && (capabTime <= animation['endTime'])) {
        capabTimes.push(capabTime)
      }
      return capabTimes
    }, [])
    animation['capabTimes'] = filteredCapabTimes
    iMin = 0
    iMax = animation['capabTimes'].length - 1
    animation['beginTime'] = animation['capabTimes'][0]
    animation['endTime'] = animation['capabTimes'][animation['capabTimes'].length - 1]
  } else {
    if (typeof animation['resolutionTime'] !== 'number') {
      animation['resolutionTime'] = resolutionTime
    }
    iMin = 0
    iMax = Math.ceil((animation['endTime'] - animation['beginTime']) / animation['resolutionTime'])
    animation['endTime'] = animation['beginTime'] + iMax * animation['resolutionTime']
  }

  const loadStart = ({target}) => {
    let i
    const config = self.get('config')
    const loadId = target.get('loadId')
    let numIntervalItemsLength
    let layerSwitcherContainer
    let layerTime
    let intervalIndex
    if (target.get('loadId') !== self.loadId) {
      return
    }
    if (self.finishedId < target.get('loadId')) {
      // Todo: toteuta nämä funktioina LayerSwitcherissä
      self.loading = true
      layerSwitcherContainer = document.getElementById(config['layerSwitcherContainer'])
      if (layerSwitcherContainer != null) {
        layerSwitcherContainer.classList.add('disabled')
        layerSwitcherContainer.parentNode.classList.remove('shown')
      }
      Array.from(document.querySelectorAll('.layer-switcher input')).forEach((layerSwitcher) => {
        layerSwitcher.disabled = true
      })
      if ((config['showLoadProgress'])) {
        Array.from(document.getElementsByClassName(config['spinnerContainer'])).forEach((spinner) => {
          spinner.style.display = ''
        })
      }
    }
    let tilesLoading = target.get('tilesLoading')
    if (tilesLoading === undefined) {
      tilesLoading = 0
    }
    tilesLoading++
    target.set('tilesLoading', tilesLoading)
    // Interval status
    layerTime = target.get('layerTime')
    intervalIndex = -1
    numIntervalItemsLength = self.numIntervalItems[loadId].length
    for (i = 0; i < numIntervalItemsLength; i++) {
      if (layerTime === self.numIntervalItems[loadId][i]['endTime']) {
        intervalIndex = i
        break
      }
    }
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
    let tilesLoaded = target.get('tilesLoaded')
    const loadId = target.get('loadId')
    let numIntervalItemsLength
    let layerTime
    let intervalIndex

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
      layerTime = target.get('layerTime')
      intervalIndex = -1
      numIntervalItemsLength = self.numIntervalItems[loadId].length
      for (i = 0; i < numIntervalItemsLength; i++) {
        if (layerTime === self.numIntervalItems[loadId][i]['endTime']) {
          intervalIndex = i
          break
        }
      }
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
    const callbacks = self.get('callbacks')
    const loadId = target.get('loadId')
    let numIntervalItemsLength
    let layerTime
    let intervalIndex

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
    layerTime = target.get('layerTime')
    intervalIndex = -1
    numIntervalItemsLength = self.numIntervalItems[loadId].length
    for (i = 0; i < numIntervalItemsLength; i++) {
      if (layerTime === self.numIntervalItems[loadId][i]['endTime']) {
        intervalIndex = i
        break
      }
    }
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

  currentTime = Date.now()
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
    numIntervalsLen = this.numIntervalItems[loadId].length
    if (numIntervalsLen === 0) {
      this.numIntervalItems[loadId].push({
        'beginTime': Number.NEGATIVE_INFINITY,
        'endTime': layerTime,
        'status': '',
        'loaded': 0,
        'toBeLoaded': 1
      })
    } else {
      for (j = 0; j < numIntervalsLen; j++) {
        if (layerTime === this.numIntervalItems[loadId][j]['endTime']) {
          this.numIntervalItems[loadId][j]['toBeLoaded']++
          break
        } else if (layerTime < this.numIntervalItems[loadId][j]['endTime']) {
          this.numIntervalItems[loadId].splice(j, 0, {
            'beginTime': this.numIntervalItems[loadId][j]['beginTime'],
            'endTime': layerTime,
            'status': '',
            'loaded': 0,
            'toBeLoaded': 1
          })
          this.numIntervalItems[loadId][j + 1]['beginTime'] = layerTime
          break
        } else if (j === numIntervalsLen - 1) {
          this.numIntervalItems[loadId].push({
            'beginTime': this.numIntervalItems[loadId][j]['endTime'],
            'endTime': layerTime,
            'status': '',
            'loaded': 0,
            'toBeLoaded': 1
          })
        }
      }
    }

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
    layerOptions = /** @type {olx.layer.TileOptions} */ (extend(true, layerOptions, layer))
    layerOptions['defaultOpacity'] = (layer['opacity'] !== undefined) ? layer['opacity'] : 1
    layerOptions['sourceProperties'] = {
      'loadId': loadId,
      'layerTime': layerTime,
      'tilesLoaded': 0,
      'tilesLoading': 0
    }
    layerOptions['visible'] = true
    // Todo: Generalize
    if (layerOptions['className'] === 'ImageWMS') {
      layerOptions['sourceOn'] = {
        'imageloadstart': loadStart,
        'imageloadend': loadEnd,
        'imageloaderror': loadError
      }
      mapLayer = new OlLayerImage(layerOptions)
    } else {
      layerOptions['sourceOn'] = {
        'tileloadstart': loadStart,
        'tileloadend': loadEnd,
        'tileloaderror': loadError
      }
      mapLayer = new OlLayerTile(layerOptions)
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
  if (this.numIntervalItems[loadId].length > 2) {
    this.numIntervalItems[loadId][0]['beginTime'] = 2 * this.numIntervalItems[loadId][0]['endTime'] - this.numIntervalItems[loadId][1]['endTime']
  }
  if (this.numIntervalItems[loadId].length > 0) {
    endTime = this.numIntervalItems[loadId][this.numIntervalItems[loadId].length - 1]['endTime']
    if ((this.get('animationResolutionTime') == null) && (absEndTime != null) && (endTime < absEndTime)) {
      this.numIntervalItems[loadId].push({
        'beginTime': endTime,
        'endTime': absEndTime,
        'status': '',
        'loaded': 0,
        'toBeLoaded': 0
      })
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
  let i
  let j
  let k
  let l
  let layer
  let animationBeginTime = /** @type {number} */ (this.get('animationBeginTime'))
  let animationEndTime = /** @type {number} */ (this.get('animationEndTime'))
  let animationResolutionTime = /** @type {number} */ (this.get('animationResolutionTime'))
  let overlayLegends
  let duplicateLegend = -1
  let title
  let overlay
  let layerLegend
  let legendUrls
  let animation
  let mapLayers
  let newOverlay
  let opacity
  let oldOverlayTitle
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
  if ((isNumeric(numIntervals)) && (numIntervals > 0)) {
    for (i = 0; i < numIntervals; i++) {
      this.numIntervalItems[loadId].push({
        'beginTime': animationBeginTime + (i - 1) * animationResolutionTime,
        'endTime': animationBeginTime + i * animationResolutionTime,
        'status': '',
        'loaded': 0,
        'toBeLoaded': 0
      })
    }
    this.variableEvents.emitEvent('numIntervalItems', [this.numIntervalItems[loadId]])
  }

  // Update visibility values
  layerVisibility = this.get('map').get('layerVisibility')
  this.getLayersByGroup(config['overlayGroupName']).forEach(oldOverlay => {
    oldOverlayTitle = oldOverlay.get('title')
    for (i = 0; i < numLayers; i++) {
      if (layers[i]['title'] === oldOverlayTitle) {
        if (layerVisibility[oldOverlayTitle] != null) {
          layers[i]['visible'] = layerVisibility[oldOverlayTitle]
        } else {
          layerVisibility[oldOverlayTitle] = layers[i]['visible']
        }
      }
    }
  })
  for (i = 0; i < numLayers; i++) {
    if (this.isAnimationLayer(layers[i])) {
      layer = extend(true, {}, layers[i])
      animation = layer['animation']
      // Shrink animation time frame if necessary
      if (animation['beginTime'] < animationBeginTime) {
        animation['beginTime'] = animationBeginTime
      }
      if (animationEndTime < animation['endTime']) {
        animation['endTime'] = animationEndTime
      }
      if (animation['resolutionTime'] === undefined) {
        animation['resolutionTime'] = animationResolutionTime
      }

      mapLayers = new OlCollection()
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
      this.loadOverlay(layer, mapLayers, extent, loadId)
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
          legendUrls = self.getLegendUrls(layer)
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
        pGrp.push(0)
        opacity = (layer['opacity'] != null) ? layer['opacity'] : 1
        overlay = new OlLayerGroup({
          'title': title,
          'layers': mapLayers,
          'legends': layerLegend !== null ? [layerLegend] : [],
          'visible': mapLayers.getLength() > 0 ? true : layer['visible'],
          'opacity': opacity,
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
      Array.from(document.querySelectorAll('.layer-switcher input:disabled')).forEach((layerSwitcher) => {
        layerSwitcher.disabled = false
      })
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
  urls = []
  if (!(layer && layer['animation'])) {
    return urls
  }
  hasLegend = layer['animation']['hasLegend']
  if (typeof hasLegend === 'string') {
    // Explicit legend URL
    urls.push(encodeURI(hasLegend))
  } else {
    if (!(layer['sourceOptions'] && layer['sourceOptions']['params'])) {
      return urls
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
      return urls
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
    containers,
    img,
    captionText,
    createFigure
  // Are legends already drawn?
  if (this.get('legendsCreated')) {
    return
  }
  config = this.get('config')
  containers = Array.from(document.getElementsByClassName(config['legendContainer']))
  containers.forEach((container) => {
    container.innerHTML = ''
    container.classList.add(constants.LEGEND_CONTAINER_CLASS)
  })
  createFigure = (legend, visible) => {
    let caption
    const figure = document.createElement('figure')
    figure.style.display = (visible ? '' : 'none')
    figure.classList.add(constants.LEGEND_FIGURE_CLASS_PREFIX + legend['id'].toString(10))
    caption = document.createElement('figcaption')
    captionText = document.createTextNode(legend['title'])
    caption.appendChild(captionText)
    figure.appendChild(caption)
    if (legend['source'] !== undefined) {
      figure.append(legend['source'])
    } else {
      img = document.createElement('img')
      img.addEventListener('load', () => {
        figure.appendChild(img)
      })
      img.src = legend['url']
    }
    containers.forEach((container) => {
      container.appendChild(figure)
    })
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
  let callbacks = this.get('callbacks')
  let currentTime = this.get('animationTime')
  if (currentTime === animationTime) {
    return
  }
  this.set('animationTime', animationTime)
  if ((callbacks != null) && (typeof callbacks['time'] === 'function')) {
    callbacks['time'](animationTime)
  }
  this.updateAnimation()
  this.updateFeatureAnimation()
}

MapAnimation.prototype.getFirstAnimationTime = function () {
  const key = this.latestLoadId
  if (key == null) {
    return null
  }
  const intervals = this.numIntervalItems[key]
  if ((intervals == null) || (intervals.length === 0)) {
    return null
  }
  return intervals[0]['beginTime']
}

MapAnimation.prototype.getPreviousAnimationTime = function (animationTime) {
  let i
  const key = this.latestLoadId
  if (key == null) {
    return null
  }
  const intervals = this.numIntervalItems[key]
  if (intervals == null) {
    return null
  }
  const lastIndex = intervals.length - 1
  if (lastIndex < 0) {
    return null
  }
  for (i = lastIndex; i >= 0; i--) {
    if (intervals[i]['endTime'] < animationTime) {
      return intervals[i]['endTime']
    }
  }
  return intervals[lastIndex]['endTime']
}

MapAnimation.prototype.getNextAnimationTime = function (animationTime) {
  let i
  const key = this.latestLoadId
  if (key == null) {
    return null
  }
  const intervals = this.numIntervalItems[key]
  if (intervals == null) {
    return null
  }
  const numIntervals = intervals.length
  if (numIntervals === 0) {
    return null
  }
  for (i = 0; i < numIntervals; i++) {
    if (intervals[i]['endTime'] > animationTime) {
      return intervals[i]['endTime']
    }
  }
  return intervals[0]['endTime']
}

/**
 * Updates map animation.
 */
MapAnimation.prototype.updateAnimation = function () {
  let i
  let mapLayers
  let nextPGrp
  let lastIndex
  const newPGrp = []
  const animationGroups = this.get('animationGroups')
  const numGroups = animationGroups.length
  const pGrp = this.get('pGrp')
  const currentTime = Date.now()
  const time = /** @type {number} */ (this.get('animationTime'))
  let animation
  let animationTime
  let nextAnimationTime = this.getNextAnimationTime(time)
  if (nextAnimationTime == null) {
    return
  }
  // Collect updating information
  for (i = 0; i < numGroups; i++) {
    mapLayers = animationGroups[i]
    if (mapLayers.length <= pGrp[i]) {
      newPGrp.push(pGrp[i])
      continue
    }
    // Restart from beginning
    lastIndex = mapLayers.length - 1
    if (mapLayers[pGrp[i]].get('animation')['animationTime'] > time) {
      nextPGrp = 0
    } else if (mapLayers[lastIndex].get('animation')['animationTime'] <= time) {
      nextPGrp = lastIndex
    } else {
      nextPGrp = pGrp[i]
    }
    while ((nextPGrp < mapLayers.length - 1) && (mapLayers[nextPGrp + 1].get('animation')['animationTime'] < nextAnimationTime)) {
      nextPGrp = nextPGrp + 1
    }
    newPGrp.push(nextPGrp)
  }
  // Update
  animationTime = /** @type {number} */ (this.get('animationTime'))
  for (i = 0; i < numGroups; i++) {
    mapLayers = animationGroups[i]
    if (mapLayers.length <= pGrp[i]) {
      continue
    }
    animation = mapLayers[pGrp[i]].get('animation')
    if (((pGrp[i] === mapLayers.length - 1) && (mapLayers[pGrp[i]].get('type') === this.layerTypes['observation']) && (animationTime > animation['animationTime'])) || ((pGrp[i] === 0) && (mapLayers[pGrp[i]].get('type') === this.layerTypes['forecast']) && (animationTime < currentTime))) {
      // Hide previous frame
      mapLayers[pGrp[i]].setOpacity(0)
      continue
    }
    if (pGrp[i] !== newPGrp[i]) {
      // Hide previous frame
      mapLayers[pGrp[i]].setOpacity(0)
    }
    pGrp[i] = newPGrp[i]
    if (!((pGrp[i] === 0) && (mapLayers[pGrp[i]].get('type') === this.layerTypes['forecast']) && (animationTime < currentTime))) {
      // Show current frame
      mapLayers[pGrp[i]].setOpacity(1)
    }
  }
}

MapAnimation.prototype.updateFeatureAnimation = function () {
  let animationTime = /** @type {number} */ (this.get('animationTime'))
  let previousAnimationTime = this.getPreviousAnimationTime(animationTime)
  const config = this.get('config')
  const featureGroupName = config['featureGroupName']
  const map = this.get('map')
  let layers
  if (map == null) {
    return
  }
  layers = this.getLayersByGroup(featureGroupName)
  layers.forEach((layer) => {
    let source = layer.getSource()
    if (source == null) {
      return
    }
    let featureTimes = source.get('featureTimes')
    if (featureTimes == null) {
      return
    }
    featureTimes.forEach((featureTime, index, allFeatureTimes) => {
      if (((previousAnimationTime < featureTime['time']) && (featureTime['time'] <= animationTime)) || ((featureTime['time'] <= animationTime) && (previousAnimationTime < featureTime['endtime']))) {
        featureTime['feature'].setStyle(null)
      } else {
        featureTime['feature'].setStyle(new OlStyleStyle({}))
      }
    })
  })
}

/**
 * Destroys map animation.
 */
MapAnimation.prototype.destroyAnimation = function () {
  this.actionEvents.removeAllListeners()
  this.variableEvents.removeAllListeners()
  const config = this.get('config')
  let elementNames = [config['spinnerContainer'], config['legendContainer'], config['mapContainer'], config['container']]
  let map = this.get('map')
  if (map !== null) {
    map.setTarget(null)
    map.setLayerGroup(new OlLayerGroup())
    this.set('map', null)
  }
  this.set('layers', null)
  this.set('overlayTitles', null)
  this.set('extent', null)
  this.set('marker', null)
  this.set('callbacks', null)
  this.set('animationGroups', [])
  this.set('legends', null)
  this.set('pGrp', null)
  this.set('layerSwitcher', null)
  elementNames.forEach((elementName) => {
    let element = document.getElementById(elementName)
    if (element != null) {
      document.getElementById(elementName).innerHTML = ''
    }
    Array.from(document.getElementsByClassName(elementName)).forEach((element) => {
      element.innerHTML = ''
    })
  })
}

/**
 * Returns layers contained in the given group.
 * @param {string} groupTitle Group title.
 * @returns {Array} Layers array.
 */
MapAnimation.prototype.getLayersByGroup = function (groupTitle) {
  let map = this.get('map')
  let layerGroups = (map != null) ? map.getLayers() : new OlCollection()
  let numLayerGroups = layerGroups.getLength()
  let i, layerGroup
  for (i = 0; i < numLayerGroups; i++) {
    layerGroup = layerGroups.item(i)
    if (layerGroup.get('title') === groupTitle) {
      return layerGroup.getLayers()
    }
  }
  return []
}

/**
 * Sets map zoom level.
 * @param {number} level Zoom level.
 */
MapAnimation.prototype.setZoom = function (level) {
  let map = this.get('map')
  if (map != null) {
    map.getView().setZoom(level)
  }
}

/**
 * Sets map center.
 * @param {Array} coordinates Center coordinates.
 */
MapAnimation.prototype.setCenter = function (coordinates) {
  const view = this.get('map').getView()
  const centerProjection = this.get('config')['defaultCenterProjection']
  const viewProjection = view.getProjection()
  view.setCenter(((centerProjection == null) || (centerProjection === viewProjection.getCode())) ? coordinates : OlProj.transform(
    coordinates,
    centerProjection,
    viewProjection
  ))
}

/**
 * Sets map rotation.
 * @param {number} angle Rotation.
 */
MapAnimation.prototype.setRotation = function (angle) {
  this.get('map').getView().setRotation(angle)
}

/**
 * Gets the animation map.
 * @return {Object} Animation map.
 */
MapAnimation.prototype.getMap = function () {
  return /** @type {Object} */ (this.get('map'))
}

/**
 * Gets vector layer features.
 * @param layerTitle {string} Vector layer title.
 * @return {Array<Object>} Features.
 */
MapAnimation.prototype.getFeatures = function (layerTitle) {
  const config = this.get('config')
  const featureGroupName = config['featureGroupName']
  const map = this.get('map')
  let layers
  let layer
  let numLayers
  let i
  if (map == null) {
    return []
  }
  layers = this.getLayersByGroup(featureGroupName)
  numLayers = layers.getLength()
  for (i = 0; i < numLayers; i++) {
    layer = layers.item(i)
    if (!layer.get('visible')) {
      continue
    }
    if (layer.get('title') === layerTitle) {
      return layer.getSource().getFeatures()
    }
  }
  return []
}

/**
 * Gets vector layer features at given location.
 * @param layerTitle {string} Vector layer title.
 * @param coordinate {Array} Vector coordinates.
 * @param tolerance {number} Coordinate resolution in pixels.
 * @return {Array<Object>} Features.
 */
MapAnimation.prototype.getFeaturesAt = function (layerTitle, coordinate, tolerance) {
  const config = this.get('config')
  const baseGroupName = config['featureGroupName']
  const map = this.get('map')
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
  let j
  let k
  let l
  layers = this.getLayersByGroup(baseGroupName)
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
  return []
}

/**
 * Adds features to vector layer.
 * @param layerTitle {string} Vector layer title.
 * @param projection {string} Projection.
 * @param featureOptions {Array<Object>} New feature options.
 */
MapAnimation.prototype.addFeatures = function (layerTitle, projection, featureOptions) {
  const config = this.get('config')
  const featureGroupName = config['featureGroupName']
  let layers
  let layer
  let numLayers
  let features
  let source
  let featureProducer = new FeatureProducer()
  const viewProjection = /** @type {ol.proj.Projection|string} */ (this.get('viewProjection'))
  let i
  layers = this.getLayersByGroup(featureGroupName)
  numLayers = layers.getLength()
  for (i = 0; i < numLayers; i++) {
    layer = layers.item(i)
    if (layer.get('title') === layerTitle) {
      source = layer.getSource()
      features = featureProducer.featureFactory(featureOptions)
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

/**
 * Removes all features from a vector layer.
 * @param layerTitle {string} Vector layer title.
 */
MapAnimation.prototype.clearFeatures = function (layerTitle) {
  const config = this.get('config')
  let layers
  let layer
  let numLayers
  let i
  layers = this.getLayersByGroup(config['overlayGroupName'])
  numLayers = layers.getLength()
  for (i = 0; i < numLayers; i++) {
    layer = layers.item(i)
    if (layer.get('title') === layerTitle) {
      layer.getSource().clear()
      return
    }
  }
}

/**
 * Shows a popup window on the map.
 * @param content {string} HTML content of the popup window.
 * @param coordinate {Array} Popup coordinates.
 */
MapAnimation.prototype.showPopup = function (content, coordinate) {
  const popupContent = document.getElementById(`${this.get('config')['mapContainer']}-popup-content`)
  popupContent['innerHTML'] = content
  this.get('overlay').setPosition(coordinate)
}

/**
 * Hides popup window on the map.
 */
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

/**
 * Gets a map layer.
 * @param layerTitle {string} Layer title.
 * @return {Object} Map layer.
 */
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

/**
 * Request a map view update.
 */
MapAnimation.prototype.requestViewUpdate = function () {
  this.set('updateRequested', Date.now())
}

/**
 * Sets layer visibility.
 * @param layerTitle {string} Layer title.
 * @param visibility {boolean} Layer visibility.
 */
MapAnimation.prototype.setLayerVisible = function (layerTitle, visibility) {
  const map = this.get('map')
  const localStorageId = this.get('config')['project'] + '-' + layerTitle + '-visible'
  const layerVisibility = map.get('layerVisibility')
  const layer = this.getLayer(layerTitle)
  let updateVisibility
  if (layerVisibility[layerTitle] == null) {
    if (this.loading) {
      updateVisibility = extend(true, {}, layerVisibility)
      updateVisibility[layerTitle] = visibility
      this.set('updateVisibility', updateVisibility)
    } else {
      layer.setVisible(visibility)
      layerVisibility[layerTitle] = visibility
      if (typeof window['localStorage'] !== 'undefined') {
        window['localStorage'].setItem(localStorageId, visibility)
      }
      this.requestViewUpdate()
    }
  } else {
    layer.setVisible(visibility)
    layerVisibility[layerTitle] = visibility
    try {
      if (typeof window['localStorage'] !== 'undefined') {
        window['localStorage'].setItem(localStorageId, visibility)
      }
    } catch (e) {
      console.log('Local storage is not supported. ' + e)
    }
    this.requestViewUpdate()
  }
}

/**
 * Sets map interactions.
 * @param interactionOptions {Object} Interaction options.
 */
MapAnimation.prototype.setInteractions = function (interactionOptions) {
  let map = this.get('map')
  let interaction
  let mapInteractions
  let i
  loopOptions:
    for (interaction in interactionOptions) {
      if (interactionOptions.hasOwnProperty(interaction)) {
        mapInteractions = map.getInteractions()
        i = 0
        // Arrangements for Closure compiler advanced optimizations
        switch (interaction) {
          case ('DragRotate'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionDragRotate) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionDragRotate(interactionOptions[interaction]))
            }
            break
          case ('DragRotateAndZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionDragRotateAndZoom) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionDragRotateAndZoom(interactionOptions[interaction]))
            }
            break
          case ('DoubleClickZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionDoubleClickZoom) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionDoubleClickZoom(interactionOptions[interaction]))
            }
            break
          case ('DragPan'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionDragPan) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionDragPan(interactionOptions[interaction]))
            }
            break
          case ('PinchRotate'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionPinchRotate) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionPinchRotate(interactionOptions[interaction]))
            }
            break
          case ('PinchZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionPinchZoom) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionPinchZoom(interactionOptions[interaction]))
            }
            break
          case ('KeyboardPan'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionKeyboardPan) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionKeyboardPan(interactionOptions[interaction]))
            }
            break
          case ('KeyboardZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionKeyboardZoom) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionKeyboardZoom(interactionOptions[interaction]))
            }
            break
          case ('MouseWheelZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionMouseWheelZoom) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionMouseWheelZoom(interactionOptions[interaction]))
            }
            break
          case ('DragZoom'):
            while (i < mapInteractions.getLength()) {
              if (mapInteractions.item(i) instanceof OlInteractionDragZoom) {
                if (interactionOptions[interaction]) {
                  continue loopOptions
                }
                mapInteractions.removeAt(i)
                continue
              }
              i++
            }
            if (interactionOptions[interaction]) {
              mapInteractions.push(new OlInteractionDragZoom(interactionOptions[interaction]))
            }
            break
        }
      }
    }
}

/**
 * Enables or disables static map controls.
 * @param staticControls {boolean} Static controls status.
 */
MapAnimation.prototype.setStaticControls = function (staticControls) {
  const config = this.get('config')
  config['staticControls'] = staticControls
  this.set('configChanged', true)
  this.createAnimation()
}

/**
 * Returns static map controls status.
 * @return {boolean} Static controls status.
 */
MapAnimation.prototype.getStaticControls = function () {
  return this.get('config')['staticControls'] === true
}

/**
 * Sets callback functions.
 * @param callbacks {Object} Callback functions.
 */
MapAnimation.prototype.setCallbacks = function (callbacks) {
  const callbackFunctions = this.get('callbacks')
  for (const callback in callbacks) {
    if (callbacks.hasOwnProperty(callback)) {
      callbackFunctions[callback] = callbacks[callback]
    }
  }
}
