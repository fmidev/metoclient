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
import MapAnimation from './MapAnimation'

export default class LazyAnimationLoader extends MapAnimation {
  /**
   * Constructs OpenLayers 4 based map view.
   * @constructor
   * @param config {object} Configuration for map view.
   * @extends {ol.Object}
   * @implements {fi.fmi.metoclient.ui.animator.view.interfaces.Animation}
   */
  constructor (config) {
    super(config)
    this.nextLayerId = 0
    this.ready = 0
  };
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
    self.loadId = -1
    self.set('updateRequested', Date.now())
  })
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
        if ((callbacks != null) && (typeof callbacks['ready'] === 'function')) {
          callbacks['ready']()
        }
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

  this.on('change:updateRequested', function (e) {
    const updateRequested = /** @type {number} */ (this.get('updateRequested'))
    const self = this

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
 * Loads a new data layer.
 * @param layer Layer template based on user configurations.
 * @param mapLayers Loaded data layers.
 * @param {Array} extent Extent of overlays to be loaded.
 * @param {number} loadId Identifier for loading instance.
 */
LazyAnimationLoader.prototype.loadOverlay = function (layer, mapLayers, extent, loadId) {
  const self = this
  const config = self.get('config')
  const animation = layer['animation']
  const absBeginTime = /** @type {number} */ (this.get('animationBeginTime'))
  const absEndTime = /** @type {number} */ (this.get('animationEndTime'))
  let layerTime
  let layerOptions
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
  const epsilon = this.layerResolution
  let resolutionTime = /** @type {number} */ (self.get('animationResolutionTime'))
  let filteredCapabTimes = []
  let capabTimesDefined = false
  let deltaTime
  let endTime
  let layerTimes = []
  let animationTime = this.get('animationTime')

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
    const loadId = target.get('loadId')
    let numIntervalItemsLength
    let layerTime
    let intervalIndex
    if (target.get('loadId') !== self.loadId) {
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
  this.variableEvents.emitEvent('numIntervalItems', [this.numIntervalItems[loadId]])
  layerOptions = {
    'extent': extent,
    'animation': {
      'animationTime': animationTime
    },
    'layerTimes': layerTimes,
    'sourceOptions': {
      'transition': 0,
      'params': {
        'TIME': new Date(animationTime).toISOString(),
        'TRANSPARENT': 'FALSE'
      }
    }
  }
  layerOptions = /** @type {olx.layer.TileOptions} */ (extend(true, layerOptions, layer))
  layerOptions['defaultOpacity'] = (layer['opacity'] !== undefined) ? layer['opacity'] : 1
  layerOptions['sourceProperties'] = {
    'loadId': loadId,
    'layerTime': animationTime,
    'tilesLoaded': 0,
    'tilesLoading': 0
  }
  layerOptions['visible'] = true
  // Todo: Generalize
  for (k = 0; k < 2; k++) {
    if (layerOptions['className'] === 'ImageWMS') {
      layerOptions['sourceOn'] = {
        'imageloadstart': loadStart,
        'imageloadend': loadEnd,
        'imageloaderror': loadError
      }
      newLayers[k] = new OlLayerImage(layerOptions)
    } else {
      layerOptions['sourceOn'] = {
        'tileloadstart': loadStart,
        'tileloadend': loadEnd,
        'tileloaderror': loadError
      }
      newLayers[k] = new OlLayerTile(layerOptions)
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
}

/**
 * Updates map animation.
 */
LazyAnimationLoader.prototype.updateAnimation = function () {
  if (this.loading) {
    return
  }
  let i
  let j
  let prevMapLayer
  let mapLayer
  let mapLayerClone
  let mapLayers
  let numMapLayers
  let source
  let sourceClone
  let nextPGrp
  const newPGrp = []
  const animationGroups = this.get('animationGroups')
  const numGroups = animationGroups.length
  const pGrp = this.get('pGrp')
  const currentTime = Date.now()
  const animationTime = /** @type {number} */ (this.get('animationTime'))
  if (!isNumeric(animationTime)) {
    return
  }
  const animationTimeFormatted = new Date(animationTime).toISOString()
  if (!isNumeric(animationTime)) {
    return
  }
  let animationTimes
  let numAnimationTimes
  let nextAnimationTime = this.getNextAnimationTime(animationTime)
  if (!isNumeric(nextAnimationTime)) {
    return
  }

  // Collect updating information
  for (i = 0; i < numGroups; i++) {
    mapLayers = animationGroups[i]
    numMapLayers = mapLayers.length
    nextPGrp = numMapLayers - 1
    for (j = 0; j < numMapLayers; j++) {
      mapLayer = mapLayers[j]
      animationTimes = mapLayer.get('layerTimes')
      numAnimationTimes = animationTimes.length
      if ((numAnimationTimes > 0) && (mapLayer.get('active')) && (animationTime <= animationTimes[numAnimationTimes - 1])) {
        nextPGrp = j
        break
      }
    }
    newPGrp.push(nextPGrp)
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
    prevMapLayer = mapLayers[pGrp[i]]
    mapLayer = mapLayers[newPGrp[i]]
    if ((prevMapLayer.get('id') !== mapLayer.get('id')) && (prevMapLayer.get('id') !== mapLayer.get('clone').get('id'))) {
      prevMapLayer.setOpacity(0)
      prevMapLayer.get('clone').setOpacity(0)
    }
    pGrp[i] = newPGrp[i]
    mapLayer = mapLayers[pGrp[i]]
    mapLayerClone = mapLayer.get('clone')
    mapLayerClone.setOpacity(0)
    if ((mapLayer.get('type') === this.layerTypes['forecast']) && (animationTime < currentTime)) {
      mapLayer.setOpacity(0)
      mapLayer.get('clone').setOpacity(0)
    } else {
      source = mapLayer.getSource()
      if ((source != null) && source.get('layerTime') !== animationTime) {
        sourceClone = mapLayerClone.getSource()
        if ((sourceClone != null) && (sourceClone.get('layerTime') !== animationTime)) {
          sourceClone.set('layerTime', animationTime)
          sourceClone.set('tilesLoaded', 0)
          sourceClone.set('tilesLoading', 0)
          if (sourceClone.get('sourceType') === 'WMTS') {
            sourceClone.set('timeFormatted', animationTimeFormatted)
          } else {
            sourceClone.updateParams({
              'TIME': animationTimeFormatted
            })
          }
          sourceClone.refresh()
        } else {
          mapLayer.setOpacity(0)
          mapLayerClone.setOpacity(1)
          mapLayer.set('active', false)
          mapLayerClone.set('active', true)
        }
      }
    }
  }
}
