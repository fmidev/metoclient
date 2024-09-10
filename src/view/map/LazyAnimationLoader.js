/**
 * @fileoverview OpenLayers 4 implementation of map view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import elementResizeDetectorMaker from 'element-resize-detector'
import extend from 'extend'
import isNumeric from 'fast-isnumeric'
import 'core-js/features/array/from'
import * as constants from '../../constants'
import LayerSwitcher from './LayerSwitcher'
import MapProducer from './MapProducer'
import MapAnimation from './MapAnimation'
import CustomControl from './CustomControl'
import Ol from 'ol/index'
import OlCollection from 'ol/collection'
import OlControlZoom from 'ol/control/zoom'
import OlInteraction from 'ol/interaction'
import OlLayerGroup from 'ol/layer/group'
import OlLayerImage from 'ol/layer/image'
import OlLayerTile from 'ol/layer/tile'
import OlMap from 'ol/map'
import OlOverlay from 'ol/overlay'
import OlProj from 'ol/proj'
import OlView from 'ol/view'

export default class LazyAnimationLoader extends MapAnimation {
  /**
   * Constructs OpenLayers 4 based map view.
   * @constructor
   * @param config {object} Configuration for map view.
   * @param {Object=} sessionForage Session storage.
   * @extends {ol.Object}
   */
  constructor (config, sessionForage) {
    super(config, sessionForage)
    this.nextLayerId = 0
    this.ready = 0
  }
}

/**
 * Initializes map.
 */
LazyAnimationLoader.prototype.initMap = function () {
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
  let interaction
  let interactions
  let layerSwitcher
  let layerVisibility = {}
  let map = this.get('map')
  let overlay
  let mapContainerElement
  let popupCloser
  let popupContainer
  let overlayOptions
  let viewCenter
  let viewZoom
  let i
  let layerGroup
  let layerGroups
  let numLayerGroups
  let staticLayers
  let layerType
  let selectedFeature
  let timeSlider
  let timeSliders
  let timePropertyName
  if (target == null) {
    return
  }
  mapContainerElement = document.getElementById(mapContainer)
  if (this.get('configChanged')) {
    this.set('configChanged', false)
  }
  if (map != null) {
    selectedFeature = this.getSelectedFeature()
    if (selectedFeature != null) {
      this.set('selectedFeatureLayer', selectedFeature.get('layerTitle'))
      timePropertyName = selectedFeature.get('timePropertyName')
      if ((timePropertyName != null) && (timePropertyName.length > 0)) {
        this.set('selectedFeatureTime', selectedFeature.get(timePropertyName))
      }
    }
    layerVisibility = map.get('layerVisibility')
    this.getLayersByGroup(config['overlayGroupName']).forEach(layer => {
      layer.setLayers(new OlCollection())
    })
    layerGroups = map.getLayers()
    numLayerGroups = layerGroups.getLength()
    for (i = 0; i < numLayerGroups; i++) {
      layerType = null
      layerGroup = layerGroups.item(i)
      switch (layerGroup.get('title')) {
        case config['featureGroupName']:
          layerType = this.layerTypes['features']
          break
        case config['surfaceGroupName']:
          if (!this.staticReloadNeeded('surface')) {
            continue
          }
          layerType = this.layerTypes['surface']
          break
        case config['baseGroupName']:
          if (!this.staticReloadNeeded('map')) {
            continue
          }
          layerType = this.layerTypes['map']
          break
        case config['staticOverlayGroupName']:
          if (!this.staticReloadNeeded('overlay')) {
            continue
          }
          layerType = this.layerTypes['overlay']
          break
      }
      if (layerType != null) {
        staticLayers = self.loadStaticLayers(layerVisibility, this.layerTypes[layerType])
        if (staticLayers != null) {
          layerGroup.setLayers(new OlCollection(staticLayers))
        }
      }
    }
    while (this.activeInteractions.length > 0) {
      interaction = this.activeInteractions.pop()
      map.removeInteraction(interaction)
    }
    this.defineSelect()
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
  timeSliders = document.getElementsByClassName(config['timeSliderContainer'])
  if (timeSliders.length > 0) {
    timeSlider = timeSliders[0]
    controls.push(new CustomControl({
      element: timeSlider,
      elementClass: config['timeSliderContainer']
    }))
  }
  interactions = OlInteraction.defaults(interactionOptions)
  popupContainer = document.getElementById(`${mapContainer}-popup`)
  popupCloser = document.getElementById(`${mapContainer}-popup-closer`)
  // Create an overlay to anchor the popup to the map.
  overlayOptions = extend(true, {
    'element': popupContainer
  }, config['overlayOptions'])
  overlay = new OlOverlay(/** @type {olx.OverlayOptions} */ (overlayOptions))
  this.set('overlay', overlay)
  if (popupCloser != null) {
    /**
     * Add a click handler to hide the popup.
     * @return {boolean} Don't follow the href.
     */
    popupCloser.onclick = () => {
      self.hidePopup()
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
        'title': config['surfaceGroupName'],
        'layers': self.loadStaticLayers(layerVisibility, this.layerTypes['surface'])
      }),
      new OlLayerGroup({
        'nested': true,
        'title': config['staticOverlayGroupName'],
        'layers': self.loadStaticLayers(layerVisibility, this.layerTypes['overlay']),
        'zIndex': constants.ZINDEX['overlay']
      })
    ],
    overlays: [overlay],
    target: target,
    controls,
    interactions,
    view: new OlView(this.viewOptions)
  })
  self.set('map', map)
  map.set('layerVisibility', layerVisibility)
  map.on('change:layerVisibility', () => {
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
      'opacityTitle': config['opacityTitle'],
      'useStorage': config['useStorage']
    })
    this.set('layerSwitcher', layerSwitcher)
    map.addControl(layerSwitcher)
  }
  map.addControl(this.createContextMenu())
  Array.from(mapContainerElement.getElementsByClassName('ol-zoom-in')).forEach((zoomIn) => {
    zoomIn.setAttribute('title', config['zoomInTooltip'])
  })
  Array.from(mapContainerElement.getElementsByClassName('ol-zoom-out')).forEach((zoomIn) => {
    zoomIn.setAttribute('title', config['zoomOutTooltip'])
  })
  Array.from(mapContainerElement.getElementsByClassName('ol-viewport')).forEach((olViewport) => {
    olViewport.style.touchAction = 'auto'
  })
  this.initMouseInteractions()
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
  this.requestViewUpdate()
}

/**
 * Initializes listeners utilized by the animator view.
 */
LazyAnimationLoader.prototype.initListeners = function () {
  const self = this
  self.set('listenersInitialized', true)

  this.on('updateLoadState', function (e) {
    const config = self.get('config')
    let len
    let finished = true
    let ready = true
    let key
    let callbacks = self.get('callbacks')
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
      ready = ready && (self.numIntervalItems[key][i]['status'] === '' || self.numIntervalItems[key][i]['status'] === constants.LOADING_STATUS['ready'] || self.numIntervalItems[key][i]['status'] === constants.LOADING_STATUS['error'])
      finished = finished && (self.numIntervalItems[key][i]['status'] === constants.LOADING_STATUS['ready'] || self.numIntervalItems[key][i]['status'] === constants.LOADING_STATUS['error'])
    }
    if (key !== self.loadId) {
      return
    }
    self.loading = !ready
    if (ready) {
      self.updateAnimation()
      if (self.ready < key) {
        self.ready = key
      }
    }
    self.variableEvents.emitEvent('numIntervalItems', [self.numIntervalItems[key]])
    // Everything is loaded
    if (finished) {
      if (key > self.finishedId) {
        self.finishedId = key
        runLoaded = true
        if (self.get('updateVisibility') !== null) {
          map.set('layerVisibility', self.get('updateVisibility'))
          self.set('updateVisibility', null)
          requestUpdate = true
        }
      }
      // Update visibility values
      this.getLayersByGroup(config['overlayGroupName']).forEach(overlay => {
        if (overlay.get('opacity') === 0) {
          overlay.set('visible', false)
          overlay.set('opacity', overlay.get('defaultOpacity'))
        }
      })
      self.updateAnimation()
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

  this.on('change:updateRequested', e => {
    setTimeout(() => {
      this.handleUpdateRequest(this.get('updateRequested'), false)
    }, this.updateRequestResolution)
  })

  this.on('updateLoadQueue', e => {
    let animationGroups
    let asyncLoadItem
    let className
    let config
    let layer
    let mapProducer = new MapProducer(this.get('sessionForage'))
    let maxAsyncLoadCount
    let prop
    let source
    let sourceOn
    let sourceOptions
    let sourceProperties
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
      className = layer.get('className')
      sourceOptions = layer.get('sourceOptions')
      if (sourceOptions == null) {
        sourceOptions = {}
      }
      sourceOptions['useStorage'] = config['useStorage']
      source = mapProducer.sourceFactory(className, sourceOptions, config['cacheTime'])
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
 * Loads a new data layer.
 * @param layer Layer template based on user configurations.
 * @param mapLayers Loaded data layers.
 * @param {Array} extent Extent of overlays to be loaded.
 * @param {number} loadId Identifier for loading instance.
 */
LazyAnimationLoader.prototype.loadOverlay = function (layer, mapLayers, extent, loadId) {
  const self = this
  const animation = layer['animation']
  const absBeginTime = /** @type {number} */ (this.get('animationBeginTime'))
  const absEndTime = /** @type {number} */ (this.get('animationEndTime'))
  let layerTime
  let layerOptions = []
  let layerVisibility
  let currentVisibility
  let prevLayerTime = Number.NEGATIVE_INFINITY
  let i
  let j
  let k
  let numIntervalsLen
  let iMin
  let iMax
  let newLayers = []
  let currentTime
  let resolutionTime = /** @type {number} */ (self.get('animationResolutionTime'))
  let filteredCapabTimes = []
  let capabTimesDefined = false
  let deltaTime
  let layerTimes = []
  let animationTime = this.get('animationTime')
  let animationTimes = []
  let nextAnimationTime
  let loadAnimationTime
  let hideLoading = false
  let timeOffset = this.get('config').gridTimeOffset || 0

  if ((animation['beginTime'] != null) && (animationTime < animation['beginTime'])) {
    animationTime = animation['beginTime']
    hideLoading = true
  } else if ((animation['endTime'] != null) && (animationTime > animation['endTime'])) {
    animationTime = animation['endTime']
    hideLoading = true
  }
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
    if (layer['type'] === self.layerTypes['forecast']) {
      animation['beginTime'] -= animation['beginTime'] % animation['resolutionTime']
    }
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
    filteredCapabTimes = animation['capabTimes'].reduce((capabTimes, capabTime, index, allCapabTimes) => {
      const numCapabTimes = capabTimes.length
      if ((animation['resolutionTime'] != null) && (numCapabTimes >= 2) && (capabTimes[numCapabTimes - 1] - capabTimes[numCapabTimes - 2] < animation['resolutionTime']) && ((capabTimes[numCapabTimes - 1] - timeOffset) % animation['resolutionTime'] !== 0)) {
        if ((capabTime - capabTimes[numCapabTimes - 2] >= animation['resolutionTime']) || ((capabTime - timeOffset) % animation['resolutionTime'] === 0)) {
          capabTimes[numCapabTimes - 1] = capabTime
        }
      } else if ((animation['resolutionTime'] != null) && (numCapabTimes === 1) && (capabTime - capabTimes[0] < animation['resolutionTime']) && ((capabTimes[0] - timeOffset) % animation['resolutionTime'] !== 0) && ((capabTime - timeOffset) % animation['resolutionTime'] === 0)) {
        capabTimes[0] = capabTime
      } else if (((capabTime >= animation['beginTime']) && (capabTime <= animation['endTime'])) && ((animation['resolutionTime'] == null) || ((numCapabTimes === 0) && ((capabTime  - timeOffset) % animation['resolutionTime'] === 0)) || (allCapabTimes[allCapabTimes.length - 1] - capabTimes[numCapabTimes - 1] >= animation['resolutionTime']))) {
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
    const loadId = target.get('loadId')
    let numIntervalItemsLength
    let layerTime
    let intervalIndex
    if ((target.get('loadId') !== self.loadId) || (target.get('hideLoading'))) {
      return
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
    if ((target.get('loadId') !== self.loadId) || (target.get('hideLoading'))) {
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
    if ((target.get('loadId') !== self.loadId) || ((target.get('hideLoading')))) {
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
  if (this.numIntervalItems[loadId] == null) {
    return
  }

  currentTime = Date.now()
  for (i = iMin; i <= iMax; i++) {
    capabTimesDefined = (Array.isArray(animation['capabTimes']) && (animation['capabTimes'].length > 0))
    layerTime = capabTimesDefined ? animation['capabTimes'][i] : animation['beginTime'] + i * animation['resolutionTime']
    if (!this.isValidLayerTime(layerTime, prevLayerTime, currentTime, layer)) {
      continue
    }
    deltaTime = capabTimesDefined ? animation['capabTimes'][Math.min(i + 1, iMax)] - animation['capabTimes'][i] : animation['resolutionTime']
    // Ignore forecast history
    if ((layerTime <= currentTime - deltaTime) && (layer['type'] === self.layerTypes['forecast'])) {
      continue
    }
    layerTimes.push(layerTime)
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
  }
  if (layerTimes.length === 0) {
    return
  }
  if (layerTimes.includes(animationTime)) {
    loadAnimationTime = animationTime
  } else {
    hideLoading = true
    loadAnimationTime = layerTimes[0]
  }
  this.variableEvents.emitEvent('numIntervalItems', [this.numIntervalItems[loadId]])
  nextAnimationTime = this.getNextAnimationTime(loadAnimationTime)
  animationTimes[0] = loadAnimationTime
  animationTimes[1] = (((animation['beginTime'] == null) || (animation['beginTime'] <= nextAnimationTime)) && ((animation['endTime'] == null) || (nextAnimationTime <= animation['endTime'])) && (this.isValidLayerTime(nextAnimationTime, animationTime, currentTime, layer))) ? nextAnimationTime : loadAnimationTime
  for (k = 0; k < 2; k++) {
    layerOptions.push({
      'animation': {
        'animationTime': animationTimes[k]
      },
      'layerTimes': layerTimes,
      'sourceOptions': {
        'transition': 0,
        'params': {
          'TIME': new Date(animationTimes[k]).toISOString(),
          'TRANSPARENT': 'FALSE'
        }
      }
    })
    layerOptions[k] = /** @type {olx.layer.TileOptions} */ (extend(true, layerOptions[k], layer))
    layerOptions[k]['defaultOpacity'] = (layer['opacity'] !== undefined) ? layer['opacity'] : 1
    layerOptions[k]['opacity'] = 0
    layerOptions[k]['sourceProperties'] = {
      'loadId': loadId,
      'layerTime': animationTimes[k],
      'tilesLoaded': 0,
      'tilesLoading': 0,
      'hideLoading': hideLoading
    }
    layerOptions[k]['visible'] = true
    // Todo: Generalize
    if (layerOptions[k]['className'] === 'ImageWMS') {
      layerOptions[k]['sourceOn'] = {
        'imageloadstart': loadStart,
        'imageloadend': loadEnd,
        'imageloaderror': loadError
      }
      newLayers[k] = new OlLayerImage(layerOptions[k])
    } else {
      layerOptions[k]['sourceOn'] = {
        'tileloadstart': loadStart,
        'tileloadend': loadEnd,
        'tileloaderror': loadError
      }
      newLayers[k] = new OlLayerTile(layerOptions[k])
    }
  }
  newLayers[0].set('clone', newLayers[1])
  newLayers[0].set('active', true)
  newLayers[0].set('id', ++self.nextLayerId)
  newLayers[1].set('clone', newLayers[0])
  newLayers[1].set('active', false)
  newLayers[1].set('id', ++self.nextLayerId)
  mapLayers.push(newLayers[0])
  mapLayers.push(newLayers[1])
  if ((this.numIntervalItems[loadId] != null) && (this.numIntervalItems[loadId].length > 2)) {
    this.numIntervalItems[loadId][0]['beginTime'] = 2 * this.numIntervalItems[loadId][0]['endTime'] - this.numIntervalItems[loadId][1]['endTime']
  }
}

/**
 * Arrange data layer loading order.
 * @param {Array} overlays Data layers to be loaded.
 * @param {number} loadId Identifier for loading instance.
 */
LazyAnimationLoader.prototype.scheduleOverlayLoading = function (overlays, loadId) {
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
}

/**
 * Updates map animation.
 */
LazyAnimationLoader.prototype.updateAnimation = function () {
  if ((this.loading) || (this.loadId < 0)) {
    return
  }
  let i
  let j
  let k
  let minIndex
  let mapLayerPrev
  let mapLayerPrevClone
  let mapLayersPrev
  let mapLayer
  let mapLayerClone
  let mapLayers
  let numMapLayers
  let source
  let sourceClone
  let sourcesPrev
  let sourceNext
  let nextPGrp
  const newPGrp = []
  const animationGroups = this.get('animationGroups')
  const numGroups = animationGroups.length
  const pGrp = this.get('pGrp')
  const currentTime = Date.now()
  const animationTime = /** @type {number} */ (this.get('animationTime'))
  let preparePrevious = false
  if (!isNumeric(animationTime)) {
    return
  }
  const animationTimeFormatted = new Date(animationTime).toISOString()
  let animationTimes
  let numAnimationTimes
  let animationTimesPrev
  let animationTimesLastIndexPrev
  let animationTimeRangePrev
  let layerTime
  let layerTimeFormatted
  let layerTimes
  let numLayerTimes
  let layerTimesPrev
  let layerTimesPrevIndex
  let nextAnimationTime = this.getNextAnimationTime(animationTime)
  if (!isNumeric(nextAnimationTime)) {
    return
  }
  const nextAnimationTimeFormatted = new Date(nextAnimationTime).toISOString()
  let animationTimeFormattedPrev
  let lenNumIntervalItems

  // Collect updating information
  for (i = 0; i < numGroups; i++) {
    mapLayers = animationGroups[i]
    numMapLayers = mapLayers.length
    nextPGrp = numMapLayers - 1
    for (j = 0; j < numMapLayers; j++) {
      mapLayer = mapLayers[j]
      animationTimes = mapLayer.get('layerTimes')
      numAnimationTimes = animationTimes.length
      if ((numAnimationTimes > 0) && (mapLayer.get('active')) && (animationTimes[0] <= animationTime) && (animationTime <= animationTimes[numAnimationTimes - 1])) {
        nextPGrp = j
        break
      }
    }
    newPGrp.push(nextPGrp)
  }
  lenNumIntervalItems = this.numIntervalItems[this.loadId].length
  for (i = 0; i < lenNumIntervalItems; i++) {
    this.numIntervalItems[this.loadId][i]['toBeLoaded'] = 1
  }
  // Update
  for (i = 0; i < numGroups; i++) {
    if (animationGroups[i].length === 0) {
      continue
    }
    mapLayers = animationGroups[i]
    numMapLayers = mapLayers.length
    if ((numMapLayers <= pGrp[i]) || (numMapLayers <= newPGrp[i])) {
      continue
    }
    mapLayerPrev = mapLayers[pGrp[i]]
    mapLayer = mapLayers[newPGrp[i]]
    if ((mapLayerPrev.get('id') !== mapLayer.get('id')) && (mapLayerPrev.get('id') !== mapLayer.get('clone').get('id'))) {
      mapLayerPrev.setOpacity(0)
      mapLayerPrevClone = mapLayerPrev.get('clone')
      mapLayerPrevClone.setOpacity(0)
      preparePrevious = true
    }
    pGrp[i] = newPGrp[i]
    mapLayerClone = mapLayer.get('clone')
    mapLayerClone.setOpacity(0)
    layerTimes = mapLayer.get('layerTimes')
    numLayerTimes = layerTimes.length
    if ((layerTimes[0] > animationTime) || ((2 * layerTimes[numLayerTimes - 1] - layerTimes[numLayerTimes - 2] <= animationTime)) || ((mapLayer.get('type') === this.layerTypes['observation']) && (currentTime < animationTime)) || ((mapLayer.get('type') === this.layerTypes['forecast']) && (animationTime < currentTime))) {
      mapLayer.setOpacity(0)
      mapLayer.get('clone').setOpacity(0)
    } else {
      source = mapLayer.getSource()
      sourceClone = mapLayerClone.getSource()
      if (mapLayer.get('layerTimes').includes(animationTime)) {
        layerTime = animationTime
        layerTimeFormatted = animationTimeFormatted
      } else {
        layerTime = null
        for (j = 0; j < numLayerTimes; j++) {
          if (layerTimes[j] <= animationTime) {
            layerTime = layerTimes[j]
          } else {
            break
          }
        }
        if (layerTime != null) {
          layerTimeFormatted = new Date(layerTime).toISOString()
        }
      }
      if ((source != null) && (source.get('layerTime') === layerTime)) {
        if ((mapLayer.get('type') !== this.layerTypes['forecast']) || (animationTime >= currentTime)) {
          mapLayer.setOpacity(1)
        }
      } else {
        if ((sourceClone != null) && (sourceClone.get('layerTime') !== layerTime)) {
          sourceClone.set('layerTime', layerTime)
          sourceClone.set('tilesLoaded', 0)
          sourceClone.set('tilesLoading', 0)
          sourceClone.set('hideLoading', false)
          if (mapLayerClone.get('className') === 'WMTS') {
            sourceClone.set('timeFormatted', layerTimeFormatted)
          } else {
            sourceClone.updateParams({
              'TIME': layerTimeFormatted
            })
          }
          sourceClone.refresh()
        } else {
          mapLayer.setOpacity(0)
          mapLayerClone.setOpacity(1)
          mapLayer.set('active', false)
          mapLayerClone.set('active', true)
          if (layerTimes.includes(nextAnimationTime)) {
            layerTime = nextAnimationTime
            layerTimeFormatted = nextAnimationTimeFormatted
          } else {
            layerTime = null
            for (j = 0; j < numLayerTimes; j++) {
              if (layerTimes[j] <= nextAnimationTime) {
                layerTime = layerTimes[j]
              } else {
                break
              }
            }
            if (layerTime != null) {
              layerTimeFormatted = new Date(layerTime).toISOString()
            }
          }
          if ((source != null) && (source.get('layerTime') !== layerTime)) {
            layerTimes = mapLayer.get('layerTimes')
            if (layerTime != null) {
              source.set('layerTime', layerTime)
              source.set('tilesLoaded', 0)
              source.set('tilesLoading', 0)
              source.set('hideLoading', false)
              if (mapLayer.get('className') === 'WMTS') {
                source.set('timeFormatted', layerTimeFormatted)
              } else {
                source.updateParams({
                  'TIME': layerTimeFormatted
                })
              }
              source.refresh()
            }
          }
        }
      }
    }
    if (preparePrevious) {
      animationTimesPrev = mapLayerPrev.get('layerTimes')
      animationTimesLastIndexPrev = animationTimesPrev.length - 1
      if (animationTimesLastIndexPrev >= 0) {
        minIndex = 0
        // Favor observation in case of duplicates
        if (mapLayerPrev.get('type') === this.layerTypes['forecast']) {
          minIndex--
          for (j = 0; j <= animationTimesLastIndexPrev; j++) {
            for (k = 0; k < numMapLayers; k++) {
              mapLayer = mapLayers[k]
              if (mapLayer.get('type') === this.layerTypes['forecast']) {
                continue
              }
              layerTimes = mapLayer.get('layerTimes')
              if ((mapLayer.get('type') === this.layerTypes['observation']) && (layerTimes.includes(animationTimesPrev[j]))) {
                break
              }
              minIndex = j
            }
            if (minIndex >= 0) {
              break
            }
          }
        }
        if (minIndex >= 0) {
          animationTimeRangePrev = [animationTimesPrev[minIndex]]
          if (animationTimeRangePrev[0] !== animationTimesPrev[animationTimesLastIndexPrev]) {
            animationTimeRangePrev.push(animationTimesPrev[animationTimesLastIndexPrev])
          }
          mapLayersPrev = [mapLayerPrev, mapLayerPrevClone]
          sourcesPrev = mapLayersPrev.map(mapLayer => mapLayer.getSource())
          animationTimeRangePrev.forEach((animationTimeLimit, index, animationTimeLimits) => {
            layerTimesPrev = sourcesPrev.map(sourcePrev => (sourcePrev == null) ? null : sourcePrev.get('layerTime'))
            if (!layerTimesPrev.includes(animationTimeLimit)) {
              animationTimeFormattedPrev = new Date(animationTimeLimit).toISOString()
              layerTimesPrevIndex = (layerTimesPrev[0] !== animationTimeLimits[(index + 1) % 2]) ? 0 : 1
              if (sourcesPrev[layerTimesPrevIndex] != null) {
                sourcesPrev[layerTimesPrevIndex].set('layerTime', animationTimeLimit)
                sourcesPrev[layerTimesPrevIndex].set('tilesLoaded', 0)
                sourcesPrev[layerTimesPrevIndex].set('tilesLoading', 0)
                sourcesPrev[layerTimesPrevIndex].set('hideLoading', false)
                if (mapLayersPrev[layerTimesPrevIndex].get('className') === 'WMTS') {
                  sourcesPrev[layerTimesPrevIndex].set('timeFormatted', animationTimeFormattedPrev)
                } else {
                  sourcesPrev[layerTimesPrevIndex].updateParams({
                    'TIME': animationTimeFormattedPrev
                  })
                }
                sourcesPrev[layerTimesPrevIndex].refresh()
              }
            }
          })
        }
      }
    }
    loopAllLayers: for (j = 0; j < numMapLayers; j++) {
      sourceNext = mapLayers[j].getSource()
      if ((sourceNext != null) && (isNumeric(nextAnimationTime)) && (sourceNext.get('layerTime') === nextAnimationTime) && (sourceNext.get('hideLoading'))) {
        for (k = 0; k < lenNumIntervalItems; k++) {
          if (nextAnimationTime === this.numIntervalItems[this.loadId][k]['endTime']) {
            this.numIntervalItems[this.loadId][k]['status'] = constants.LOADING_STATUS['ready']
            this.variableEvents.emitEvent('numIntervalItems', [this.numIntervalItems[this.loadId]])
            break loopAllLayers
          }
        }
      }
    }
  }
}
