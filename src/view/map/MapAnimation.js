/**
 * @fileoverview OpenLayers 4 implementation of map view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import EventEmitter from 'wolfy87-eventemitter'
import extend from 'extend'
import isNumeric from 'fast-isnumeric'
import { default as proj4 } from 'proj4'
import 'core-js/fn/array/from'
import moment from 'moment-timezone'
import * as constants from '../../constants'
import renameKeys from 'rename-keys'
import MapProducer from './MapProducer'
import FeatureProducer from './FeatureProducer'
import Ol from 'ol/index'
import OlCollection from 'ol/collection'
import olEventsCondition from 'ol/events/condition'
import OlFeature from 'ol/feature'
import OlFormatWMSCapabilities from 'ol/format/wmscapabilities'
import OlFormatWMTSCapabilities from 'ol/format/wmtscapabilities'
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
import OlLayerVector from 'ol/layer/vector'
import OlObject from 'ol/object'
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
    this.activeInteractions = []
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
 * @param {Object=} animationCallbacks Callback functions for map events.
 */
MapAnimation.prototype.createAnimation = function (layers, capabilities, currentTime, animationTime, animationBeginTime, animationEndTime, animationResolutionTime, animationNumIntervals, animationCallbacks) {
  const config = this.get('config')
  let callbacks
  const featureGroupName = config['featureGroupName']
  const overlayGroupName = config['overlayGroupName']
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
  let foundAnimLayers = false
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
        foundAnimLayers = foundAnimLayers || ((layerGroup.get('title') === overlayGroupName) && (numCurrentLayers > 0))
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
      if (!foundAnimLayers) {
        callbacks = this.get('callbacks')
        if ((callbacks != null) && (typeof callbacks['ready'] === 'function')) {
          callbacks['ready']()
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

  if (animationCallbacks != null) {
    this.set('callbacks', animationCallbacks)
  }

  this.set('viewProjection', this.get('config')['projection'])
  this.updateStorage()
  this.parameterizeLayers(capabilities)
  this.initMap()
}

/**
 * Inits mouse hover and click functionality.
 */
MapAnimation.prototype.initMouseInteractions = function () {
  let self = this
  let map = this.get('map')

  let handleWFSInteraction = (type, pixel) => {
    let dataShown = false
    let features = []
    let view = map.getView()
    let viewProjection = view.getProjection()
    let typeActive = false
    let config = self.get('config')
    let layers = self.getLayersByGroup(config['featureGroupName']).getArray()
    let numLayers = layers.length
    let i
    let layerData
    let coordOffset = [0, 0]
    for (i = 0; i < numLayers; i++) {
      layerData = layers[i].get(type + 'Data')
      if ((Array.isArray(layerData)) && (layerData.length > 0) && (layers[i].get('visible')) && (layers[i].get('opacity'))) {
        typeActive = true
        break
      }
    }
    map.forEachFeatureAtPixel(pixel, function (feature, layer) {
      if (layer == null) {
        return
      }
      layerData = layer.get(type + 'Data')
      if ((!Array.isArray(layerData)) || (layerData.length === 0)) {
        return
      }
      feature.set(type + 'Data', layerData)
      let layerId = feature.getId()
      if (layerId != null) {
        const separatorIndex = layerId.indexOf('.')
        if (separatorIndex > 0) {
          layerId = layerId.substr(0, separatorIndex)
        }
      } else {
        layerId = ''
      }
      feature.set('layerId', layerId)
      features.push(feature)
    }, {
      'hitTolerance': 8
    })
    features.sort(function (a, b) {
      const layerIdProperty = 'layerId'
      const timeProperty = 'time'
      const aLayerId = a.get(layerIdProperty)
      const bLayerId = b.get(layerIdProperty)
      if (aLayerId !== bLayerId) {
        return aLayerId.localeCompare(bLayerId)
      }
      let aMs = null
      const aTime = a.get(timeProperty)
      if (aTime != null) {
        aMs = Date.parse(aTime)
      }
      if (aMs != null) {
        let bMs = null
        const bTime = b.get(timeProperty)
        if (bTime != null) {
          bMs = Date.parse(bTime)
        }
        if (bMs != null) {
          return aMs - bMs
        }
      }
      return 0
    })
    let numFeatures = features.length
    if (numFeatures > 0) {
      let content = ''
      for (let j = 0; j < numFeatures; j++) {
        let properties = features[j].get(type + 'Data')
        let numProperties = properties.length
        let layerId = features[j].get('layerId')
        if (content.length === 0) {
          content += '<div class="fmi-metoclient-' + type + '-content">'
        }
        content += '<div class="fmi-metoclient-' + type + '-item">'
        if (layerId.length > 0) {
          content += '<b>' + layerId + '</b><br>'
        }
        for (let i = 0; i < numProperties; i++) {
          let property = properties[i].trim()
          if (property === 'the_geom') {
            let coord = features[j].getGeometry().getCoordinates()
            if (coord != null) {
              let coord4326 = OlProj.transform(
                coord,
                viewProjection,
                'EPSG:4326'
              )
              content += 'coordinates: ' + coord4326[1].toFixed(3) + ' ' + coord4326[0].toFixed(3) + '<br>'
            }
          } else {
            let propertyData = features[j].get(property)
            if (propertyData != null) {
              if (['time', 'begintime', 'endtime'].indexOf(property) >= 0) {
                content += property + ': ' + moment(propertyData).format('HH:mm DD.MM.YYYY') + '<br>'
              } else if ((property === 'name') && (numProperties === 1)) {
                content += propertyData + '<br>'
              } else  {
                content += property + ': ' + propertyData + '<br>'
              }
            }
          }
        }
        content += '</div>'
      }
      if (content.length > 0) {
        content += '</div>'
        if (type === 'tooltip') {
          coordOffset = config['tooltipOffset']
        }
        let coord = map.getCoordinateFromPixel([pixel[0] + coordOffset[0], pixel[1] + coordOffset[1]])
        self.showPopup(content, coord, true, type)
        dataShown = true
      }
    } else if (typeActive) {
      self.hidePopup()
    }
    return dataShown
  }

  map.on('pointermove', function (evt) {
    let map = self.get('map')
    let groups = map.getLayers().getArray()
    let numGroups = groups.length
    let group
    let layers
    let numLayers
    let layer
    let subLayers
    let numSubLayers
    let subLayer
    let tooltipData
    let popupData
    let dataFound = false
    let hit = false
    let className
    let i
    let j
    let k
    loopGroups: for (i = 0; i < numGroups; i++) {
      group = groups[i]
      if (typeof group.getLayers !== 'function') {
        continue
      }
      layers = group.getLayers().getArray()
      numLayers = layers.length
      loopLayers: for (j = 0; j < numLayers; j++) {
        layer = layers[j]
        subLayers = (typeof layer.getLayers === 'function') ? layer.getLayers().getArray() : [layer]
        numSubLayers = subLayers.length
        for (k = 0; k < numSubLayers; k++) {
          subLayer = subLayers[k]
          if ((subLayer.getVisible()) && (subLayer.getOpacity() > 0)) {
            className = subLayer.get('className')
            if ((className != null) && (className.length > 0) && (['imagewms', 'tilewms', 'wmts'].includes(className.toLowerCase()))) {
              popupData = subLayer.get('popupData')
              if ((Array.isArray(popupData)) && (popupData.length > 0)) {
                hit = true
                dataFound = true
                break loopGroups
              }
            } else {
              if ((className == null) || (className.length === 0)) {
                continue
              }
              if (className.toLowerCase() === 'vector') {
                tooltipData = subLayer.get('tooltipData')
                if ((Array.isArray(tooltipData)) && (tooltipData.length > 0)) {
                  dataFound = true
                  break loopLayers
                }
                popupData = subLayer.get('popupData')
                if ((Array.isArray(popupData)) && (popupData.length > 0)) {
                  dataFound = true
                  break loopLayers
                }
              }
            }
          }
        }
      }
    }
    if (!hit) {
      hit = this.forEachFeatureAtPixel(evt['pixel'], function (feature, layer) {
        return ((layer != null) && ((layer.get('popupData') != null) || (layer.get('tooltipData') != null)))
      })
    }
    if (hit) {
      this.getTargetElement().style.cursor = 'pointer'
    } else if (dataFound) {
      this.getTargetElement().style.cursor = ''
    }
    handleWFSInteraction('tooltip', evt['pixel'])
  })

  map.on('singleclick', function (evt) {
    let config = self.get('config')
    let view = map.getView()
    let viewResolution = /** @type {number} */ (view.getResolution())
    let viewProjection = view.getProjection()
    let popupShown = false
    // WMS
    let getPopupLayers = (layers) => {
      return layers.getArray().reduce((popupLayers, layer) => {
        if (layer instanceof OlLayerGroup) {
          if ((layer.get('title') !== config['featureGroupName']) && (layer.get('visible')) && (layer.get('opacity'))) {
            return popupLayers.concat(getPopupLayers(layer.getLayers()))
          }
        } else if ((['TileWMS', 'ImageWMS'].includes(layer.get('className'))) && (layer.get('visible')) && (layer.get('opacity'))) {
          let wmsPopupData = layer.get('popupData')
          if (wmsPopupData != null) {
            popupLayers.push(layer)
          }
        }
        return popupLayers
      }, [])
    }
    let req
    let layers = map.getLayers()
    let popupLayers = getPopupLayers(layers)
    popupShown = handleWFSInteraction('popup', evt['pixel'])

    let getFeatureInfoOnLoad = (req, layer) => {
      let response
      let properties
      let popupText = ''
      let popupContent
      let popupContentChild
      let popupContentChildren
      let numPopupContentChildren
      let i
      if (req.status === 200) {
        try {
          response = JSON.parse(req.response)
        } catch (e) {
          console.log('GetFeatureInfo response error')
          return
        }
        if ((response['features'] != null) && (response['features'].length > 0) && (response['features'][0]['properties'] != null)) {
          properties = response['features'][0]['properties']
        } else if ((Array.isArray(response)) && (response.length > 0)) {
          properties = response[0]
        }
        if (properties != null) {
          let propertyNames = Object.keys(properties)
          propertyNames.sort()
          let popupData = layer.get('popupData')
          popupText += propertyNames.reduce((currentText, propertyName) => {
            if ((popupData.includes(propertyName)) && (properties[propertyName] != null)) {
              currentText += propertyName + ': ' + properties[propertyName] + '<br>'
            }
            return currentText
          }, '<div class="fmi-metoclient-popup-item"><b>' + layer.get('title') + '</b><br>') + '</div>'
          if (popupShown) {
            popupContent = document.getElementById(`${config['mapContainer']}-popup-content`)
            popupContentChildren = popupContent.children
            if (popupContentChildren != null) {
              numPopupContentChildren = popupContentChildren.length
              for (i = 0; i < numPopupContentChildren; i++) {
                popupContentChild = popupContentChildren[i]
                if (popupContentChild.classList.contains('fmi-metoclient-popup-content')) {
                  popupContentChild['innerHTML'] += popupText
                  break;
                }
              }
            }
          } else {
            self.showPopup(popupText, evt['coordinate'], true)
            popupShown = true
          }
        }
      }
    }

    popupLayers.forEach((layer) => {
      let source = layer.getSource()
      if (source == null) {
        return
      }
      let url = source.getGetFeatureInfoUrl(evt['coordinate'], viewResolution, viewProjection, {
        'INFO_FORMAT': 'application/json'
      })
      req = new XMLHttpRequest()
      req.open('GET', url)
      req.timeout = 20000
      req.onload = (event) => {
        getFeatureInfoOnLoad(event['target'], layer)
      }
      req.onerror = () => {
        console.log('Network error')
      }
      req.send()
    })
  })
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
 * Defines feature selection functionality and styles.
 */
MapAnimation.prototype.defineSelect = function () {
  let self = this
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
            select.set('type', mappings[extraStyle['name']]['select'])
            map.addInteraction(select)
            self.activeInteractions.push(select)
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
      // Todo: check all items
      subLayerExtent = subLayers.item(0).get('extent')
      // Todo: yhtäsuuruudelle epsilon-käsittely
      if ((subLayerExtent.length !== extent.length) || (subLayerExtent.some((v, i) => v !== extent[i]))) {
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
    }))
  })
  markerFeature.setStyle(markerStyle)
  const markerSource = new OlSourceVector({
    'features': [markerFeature]
  })
  return new OlLayerVector({
    'source': markerSource,
    'zIndex': 10000
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
    urls.push(hasLegend)
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
    } else if (typeof params['Layers'] !== 'undefined') {
      layerIds = params['Layers']
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
    imageFormat = params['format'] || params['FORMAT'] || params['Format'] || 'image/png'
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
  const config = this.get('config')
  let containers
  let createFigure
  // Are legends already drawn?
  if (this.get('legendsCreated')) {
    return
  }
  containers = Array.from(document.getElementsByClassName(config['legendContainer']))
  containers.forEach((container) => {
    container.innerHTML = ''
    container.classList.add(constants.LEGEND_CONTAINER_CLASS)
  })
  createFigure = (legend, visible) => {
    let img
    const caption = document.createElement('figcaption')
    const captionText= document.createTextNode(legend['title'])
    const figure = document.createElement('figure')
    figure.style.display = (visible ? '' : 'none')
    figure.classList.add(constants.LEGEND_FIGURE_CLASS_PREFIX + legend['id'].toString(10))
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
  legends.forEach((legend, index) => {
    createFigure(legend, index === defaultLegend)
  })
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
  let elementNames = [config['legendContainer'], config['mapContainer'], config['container']]
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
  let source
  layers = this.getLayersByGroup(config['featureGroupName'])
  numLayers = layers.getLength()
  for (i = 0; i < numLayers; i++) {
    layer = layers.item(i)
    if (layer.get('title') === layerTitle) {
      source = layer.getSource()
      source.clear()
      source.refresh()
      return
    }
  }
}

/**
 * Shows a popup window on the map.
 * @param content {string} HTML content of the popup window.
 * @param coordinate {Array} Popup coordinates.
 * @param append {boolean=} Append content into popup, if it already exists and is located at the same coordinates.
 * @param type {string=} Popup type.
 */
MapAnimation.prototype.showPopup = function (content, coordinate, append, type) {
  const popupContent = document.getElementById(`${this.get('config')['mapContainer']}-popup-content`)
  let overlay = this.get('overlay')
  let overlayPosition = overlay.get('position')

  if ((append) && (overlayPosition != null) && (overlayPosition[0] === coordinate[0]) && (overlayPosition[1] === coordinate[1])) {
    // Todo: improve popup to have structure instead of single string
    if (!popupContent['innerHTML'].includes(content)) {
      popupContent['innerHTML'] += content
    }
  } else {
    if (popupContent['innerHTML'] !== content) {
      popupContent['innerHTML'] = content
      overlay.setPosition(coordinate)
    }
  }
  if (type != null) {
    popupContent.parentElement.setAttribute('data-fmi-metoclient-popup-type', type)
  }
}

/**
 * Hides popup window on the map.
 */
MapAnimation.prototype.hidePopup = function () {
  const popupContent = document.getElementById(`${this.get('config')['mapContainer']}-popup-content`)
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
  popupContent['innerHTML'] = ''
  popupContent.parentElement.setAttribute('data-fmi-metoclient-popup-type', '')
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

/**
 * Checks if animation time is valid for a given layer.
 *
 * @param {number} layerTime Layer time value to be checked.
 * @param {number} prevLayerTime Previous time value.
 * @param {number} currentTime Current time.
 * @param layerOptions Layer template based on user configurations.
 *
 */
MapAnimation.prototype.isValidLayerTime = function (layerTime, prevLayerTime, currentTime, layerOptions) {
  let config = this.get('config')
  // Ignore future observations (empty images)
  if ((layerTime >= currentTime - config['ignoreObsOffset']) && (layerOptions['type'] === this.layerTypes['observation'])) {
    return false
  }
  // Checking maximum resolution
  return layerTime - prevLayerTime >= this.layerResolution;
}

/**
 * Selects a vector feature.
 * @param {Object} feature Feature to be selected.
 */
MapAnimation.prototype.selectFeature = function (feature) {
  let interactions = this.activeInteractions
  if (interactions == null) {
    return
  }
  let numInteraction = interactions.length
  let interaction
  let i
  for (i = 0; i < numInteraction; i++) {
    interaction = interactions[i]
    if (interaction.get('type') === 'selected') {
      interaction.getFeatures().clear()
      interaction.getFeatures().push(feature)
      break
    }
  }
}
