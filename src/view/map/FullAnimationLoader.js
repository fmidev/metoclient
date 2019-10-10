/**
 * @fileoverview OpenLayers 4 implementation of map view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import elementResizeDetectorMaker from 'element-resize-detector'
import extend from 'extend'
import isNumeric from 'fast-isnumeric'
import 'core-js/fn/array/from'
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

export default class FullAnimationLoader extends MapAnimation {
}

/**
 * Initializes map.
 */
FullAnimationLoader.prototype.initMap = function () {
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
    this.requestViewUpdate()
    while (this.activeInteractions.length > 0) {
      interaction = this.activeInteractions.pop()
      map.removeInteraction(interaction)
    }
    this.defineSelect()
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
FullAnimationLoader.prototype.initListeners = function () {
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
    let layerSwitcherContainer
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
        // Todo: move to LayerSwitcher.js
        layerSwitcher = self.get('layerSwitcher')
        if (layerSwitcher != null) {
          layerSwitcher.setMap(self.getMap())
          layerSwitcherContainer = document.getElementById(config['layerSwitcherContainer'])
          if (layerSwitcherContainer != null) {
            layerSwitcherContainer.classList.remove('disabled')
          }
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

  this.on('change:updateRequested', e => {
    setTimeout(() => {
      this.handleUpdateRequest(this.get('updateRequested'), true)
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
      layer.setOpacity(0)
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
FullAnimationLoader.prototype.loadOverlay = function (layer, mapLayers, extent, loadId) {
  const self = this
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
      if ((animation['resolutionTime'] != null) && (numCapabTimes >= 2) && (capabTimes[numCapabTimes - 1] - capabTimes[numCapabTimes - 2] < animation['resolutionTime']) && (capabTimes[numCapabTimes - 1] % animation['resolutionTime'] !== 0)) {
        if ((capabTime - capabTimes[numCapabTimes - 2] >= animation['resolutionTime']) || (capabTime % animation['resolutionTime'] === 0)) {
          capabTimes[numCapabTimes - 1] = capabTime
        }
      } else if ((animation['resolutionTime'] != null) && (numCapabTimes === 1) && (capabTime - capabTimes[0] < animation['resolutionTime']) && (capabTimes[0] % animation['resolutionTime'] !== 0) && (capabTime % animation['resolutionTime'] === 0)) {
        capabTimes[0] = capabTime
      } else if (((capabTime >= animation['beginTime']) && (capabTime <= animation['endTime'])) && ((numCapabTimes === 0) || (animation['resolutionTime'] == null) || (allCapabTimes[allCapabTimes.length - 1] - capabTimes[numCapabTimes - 1] >= animation['resolutionTime']))) {
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
    if (!this.isValidLayerTime(layerTime, prevLayerTime, currentTime, layer)) {
      continue
    }
    deltaTime = capabTimesDefined ? animation['capabTimes'][Math.min(i + 1, iMax)] - animation['capabTimes'][i] : animation['resolutionTime']
    // Ignore forecast history
    if ((layerTime <= currentTime - deltaTime) && (layer['type'] === self.layerTypes['forecast'])) {
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
  if (this.numIntervalItems[loadId] != null) {
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
}

/**
 * Arrange data layer loading order.
 * @param {Array} overlays Data layers to be loaded.
 * @param {number} loadId Identifier for loading instance.
 */
FullAnimationLoader.prototype.scheduleOverlayLoading = function (overlays, loadId) {
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
 * Updates map animation.
 */
FullAnimationLoader.prototype.updateAnimation = function () {
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

