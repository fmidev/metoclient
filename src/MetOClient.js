/**
 * @fileoverview An entry point and main controller of the animator library.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import './config/globalExport'
import * as utils from './utils'
import * as constants from './constants'
import TimeController from './controller/TimeController'
import MapController from './controller/MapController'
import { tz } from 'moment-timezone'
import extend from 'extend'
import isNumeric from 'fast-isnumeric'
import localforage from 'localforage'

export class MetOClient {
  /**
   * Constructs a new animator main controller.
   * @param {Object} config User configuration.
   * @constructor
   */
  constructor (config) {
    let locale
    let project
    let mapPostId
    let animationResolutionTime
    let instanceId = 'metoclient'
    let newConfig = {
      'project': '',
      'map': {
        'model': {},
        'view': {}
      },
      'time': {
        'model': {},
        'view': {}
      },
      'localization': {}
    }

    /**
     * @type {Object}
     * @private
     */
    this.config_ = (config == null) ? extend(true, {}, newConfig) : this.rearrangeConfig(config)

    /**
     * @function
     * @private
     */
    this.reloadListener_ = () => {
    }
    /**
     * @function
     * @private
     */
    this.playListener_ = () => {
    }
    /**
     * @function
     * @private
     */
    this.refreshListener_ = () => {
    }
    /**
     * @function
     * @param {number} numIntervalItems Number of interval items.
     * @private
     */
    this.numIntervalItemsListener_ = (numIntervalItems) => {
    }
    /**
     * @function
     * @param {number} animationTime Animation time.
     * @private
     */
    this.animationTimeListener_ = animationTime => {
    }
    /**
     *
     * @type {Object}
     * @private
     */
    this.updateQueue_ = null

    // Configuration from default values
    extend(true, newConfig, this.getDefaultConfig())
    // Configuration from newConfiguration files
    project = (this.config_['project'] == null) ? newConfig['project'] : this.config_['project']
    if ((project) && (window['fi']) && (window['fi']['fmi']) && (window['fi']['fmi']['config']) && (window['fi']['fmi']['config']['metoclient']) && (window['fi']['fmi']['config']['metoclient'][project])) {
      extend(true, newConfig, this.rearrangeConfig(window['fi']['fmi']['config']['metoclient'][project]))
    }
    this.config_['map']['view']['project'] = project

    // Configuration from parameter values
    this.config_ = extend(true, newConfig, this.config_)
    // The map model might be too slow to extend because of large vector data sets
    this.config_['map']['model']['layers'] = config['layers']

    animationResolutionTime = Number(this.config_['time']['model']['resolutionTime'])
    if ((!isNumeric(animationResolutionTime) || (animationResolutionTime <= 0))) {
      this.config_['time']['model']['resolutionTime'] = null
    }
    if (this.config_['time']['model']['gridTime'] == null) {
      this.config_['time']['model']['gridTime'] = (this.config_['time']['model']['resolutionTime'] != null) ? this.config_['time']['model']['resolutionTime'] : constants.DEFAULT_GRID_TIME
    }

    mapPostId = 0
    while (document.getElementById(`${this.config_['map']['view']['mapContainer']}-${mapPostId}`) != null) {
      mapPostId++
    }
    this.config_['map']['view']['mapContainer'] += `-${mapPostId}`

    // Localization
    if (this.config_['localization']['locale'] != null) {
      locale = this.config_['localization']['locale']
      this.config_['map']['view']['baseGroupName'] = this.config_['localization'][locale]['baseLayers']
      this.config_['map']['view']['featureGroupName'] = this.config_['localization'][locale]['features']
      this.config_['map']['view']['layersTooltip'] = this.config_['localization'][locale]['layersTooltip']
      this.config_['map']['view']['legendTitle'] = this.config_['localization'][locale]['legend']
      this.config_['map']['view']['noLegendText'] = this.config_['localization'][locale]['noLegend']
      this.config_['map']['view']['opacityTitle'] = this.config_['localization'][locale]['opacity']
      this.config_['map']['view']['overlayGroupName'] = this.config_['localization'][locale]['overlays']
      this.config_['map']['view']['staticOverlayGroupName'] = this.config_['localization'][locale]['staticOverlays']
      this.config_['map']['view']['surfaceGroupName'] = this.config_['localization'][locale]['surface']
      this.config_['map']['view']['zoomInTooltip'] = this.config_['localization'][locale]['zoomInTooltip']
      this.config_['map']['view']['zoomOutTooltip'] = this.config_['localization'][locale]['zoomOutTooltip']
      this.config_['time']['view']['beginTimeText'] = this.config_['localization'][locale]['beginTimeText']
      this.config_['time']['view']['endTimeText'] = this.config_['localization'][locale]['endTimeText']
      this.config_['time']['view']['locale'] = this.config_['localization']['locale']
      this.config_['time']['view']['timeStepText'] = this.config_['localization'][locale]['timeStepText']
    }

    instanceId += '-' + project
    localforage.config({
      name: instanceId,
      storeName: instanceId
    })
    if ((!localforage.supports(localforage.INDEXEDDB)) && (!localforage.supports(localforage.WEBSQL)) && (!localforage.supports(localforage.LOCALSTORAGE))) {
      this.config_['map']['view']['mapLoader'] = 'all'
    }
    /**
     * @private
     */
    this.callbacks_ = {}
  }

  /**
   * Restructure configuration for class implementation.
   * @param userConfig User configuration.
   * @returns {Object} Nested configuration.
   */
  rearrangeConfig (userConfig) {
    if (userConfig == null) {
      return {}
    }
    let config = {
      'project': userConfig['project'],
      'map': {
        'model': {},
        'view': {}
      },
      'time': {
        'model': {},
        'view': {}
      },
      'localization': userConfig['localization']
    }
    let mapView = [
      'asyncLoadDelay',
      'baseGroupName',
      'cacheTime',
      'container',
      'defaultCenterLocation',
      'defaultCenterProjection',
      'defaultMaxZoom',
      'defaultMinZoom',
      'defaultZoomLevel',
      'extent',
      'featureGroupName',
      'ignoreObsOffset',
      'interactions',
      'layerSwitcherContainer',
      'legendContainer',
      'legendLabel',
      'mapContainer',
      'mapLoader',
      'markerImagePath',
      'maxAsyncLoadCount',
      'noLegendText',
      'overlayGroupName',
      'overlayOptions',
      'projection',
      'resolutions',
      'showLayerSwitcher',
      'showLegend',
      'showMarker',
      'staticControls',
      'staticOverlayGroupName',
      'surfaceGroupName',
      'tooltipOffset',
      'useStorage'
    ]
    let timeModel = [
      'autoReplay',
      'autoStart',
      'beginTime',
      'defaultAnimationTime',
      'endTime',
      'endTimeDelay',
      'timeLimitsForced',
      'frameRate',
      'gridTime',
      'gridTimeOffset',
      'refreshInterval',
      'resolutionTime',
      'waitUntilLoaded'
    ]
    let timeView = [
      'beginTime',
      'endTime',
      'firstDataPointTime',
      'lastDataPointTime',
      'locale',
      'modifiedResolutionTime',
      'mouseWheelTimeStep',
      'resolutionTime',
      'showTimeSlider',
      'showTimeSliderMenu',
      'timeSliderContainer',
      'timeZone',
      'timeZoneLabel',
      'vertical'
    ]

    mapView.forEach(propertyName => {
      if (userConfig[propertyName] != null) {
        config['map']['view'][propertyName] = userConfig[propertyName]
      }
    })

    timeModel.forEach(propertyName => {
      if (userConfig[propertyName] != null) {
        config['time']['model'][propertyName] = userConfig[propertyName]
      }
    })
    timeView.forEach(propertyName => {
      if (userConfig[propertyName] != null) {
        config['time']['view'][propertyName] = userConfig[propertyName]
      }
    })
    return config
  }

  /**
   * Static getter for an utility function floorTime.
   * @return {function} Function to floor a time based on given resolution.
   * @export
   */
  static get floorTime () {
    return utils['floorTime']
  }

  /**
   * Static getter for an utility function createMenu.
   * @return {function} Function to generate dropdown menu used in MetOClient.
   * @export
   */
  static get createMenu () {
    return utils['createMenu']
  }

  /**
   * Static getter for an utility function createTimeMenu.
   * @return {function} Function to generate dropdown menu used in MetOClient.
   * @export
   */
  static get createTimeMenu () {
    return utils['createTimeMenu']
  };

  /**
   * Static getter for an utility function transformCoordinates.
   * @return {function} Function to transform coordinates between projections.
   * @export
   */
  static get transformCoordinates () {
    return utils['transformCoordinates']
  }

  /**
   * Produces a new time model and views.
   * @param {Object=} callbacks Callback functions for time events.
   */
  createTime (callbacks) {
    this.timeController_.createTime(callbacks)
  }

  /**
   * Produces a new map model and view.
   * @param {Object=} callbacks Callback functions for map events.
   * @param {boolean=} useConfig Use layer configuration values.
   */
  createMap (callbacks, useConfig = false) {
    let self = this
    let currentAnimationTime = this.timeController_.getAnimationTime()
    let mapCallbacks
    let userReadyCallback
    if (callbacks !== null) {
      if (typeof callbacks === 'undefined') {
        callbacks = {}
      }
      if (typeof callbacks['ready'] === 'function') {
        userReadyCallback = callbacks['ready'].bind()
      }
      mapCallbacks = callbacks
      mapCallbacks['ready'] = () => {
        let backupTime = self.timeController_.getAnimationBackupTime()
        if (backupTime != null) {
          self.setTime(backupTime)
          self.timeController_.resetAnimationBackupTime()
        }
        if (typeof userReadyCallback === 'function') {
          userReadyCallback()
        }
      }
    }
    this.mapController_.createMap(
      this.timeController_.getCurrentTime(),
      currentAnimationTime,
      this.timeController_.getAnimationBeginTime(),
      this.timeController_.getAnimationEndTime(),
      this.timeController_.getAnimationResolutionTime(),
      this.timeController_.getAnimationNumIntervals(),
      mapCallbacks,
      useConfig
    )
  }

  /**
   * Gets a default configuration.
   * @returns {Object}
   */
  getDefaultConfig () {
    return {
      'project': 'default',
      'map': {
        'model': {
          'layers': {}
        },
        'view': {
          'asyncLoadDelay': 10,
          'baseGroupName': 'Base layers',
          'cacheTime': 10 * 60 * 1000,
          'container': 'fmi-metoclient',
          'defaultCenterLocation': [389042, 6673664],
          'defaultCenterProjection': 'EPSG:3067',
          'defaultMaxZoom': 15,
          'defaultMinZoom': 0,
          'defaultZoomLevel': 5,
          'extent': [50199.4814, 6582464.0358, 761274.6247, 7799839.8902],
          'featureGroupName': 'Features',
          'ignoreObsOffset': 0,
          'interactions': {
            'pinchRotate': false,
            'altShiftDragRotate': false
          },
          'layerSwitcherContainer': 'fmi-metoclient-layer-switcher',
          'legendContainer': 'fmi-metoclient-legend',
          'legendLabel': 'Legend',
          'mapContainer': 'fmi-metoclient-map',
          'mapLoader': 'single',
          'markerImagePath': '../img/marker.png',
          'maxAsyncLoadCount': 5,
          'noLegendText': 'None',
          'overlayGroupName': 'Overlays',
          'overlayOptions': {},
          'projection': 'EPSG:3067',
          'showLayerSwitcher': true,
          'showLegend': true,
          'showMarker': false,
          'staticControls': false,
          'staticOverlayGroupName': 'Static overlays',
          'surfaceGroupName': 'Surface',
          'tooltipOffset': [20, 0],
          'useStorage': true
        }
      },
      'time': {
        'model': {
          'autoReplay': true,
          'autoStart': false,
          'beginTime': Date.now(),
          'defaultAnimationTime': Date.now(),
          'endTime': Date.now(),
          'endTimeDelay': 0,
          'timeLimitsForced': false,
          'frameRate': 500,
          'gridTimeOffset': 0,
          'refreshInterval': 15 * 60 * 1000,
          'waitUntilLoaded': false
        },
        'view': {
          'locale': 'en',
          'mouseWheelTimeStep': true,
          'showTimeSlider': true,
          'showTimeSliderMenu': false,
          'timeSliderContainer': 'fmi-metoclient-timeslider',
          'timeZone': tz.guess(),
          'timeZoneLabel': '',
          'vertical': false
        }
      },
      'localization': {
        'locale': 'en',
        'fi': {
          'baseLayers': 'Taustakartat',
          'beginTimeText': 'Aloitusaika',
          'browserNotSupported': 'Tämä selain ei ole tuettu.',
          'endTimeText': 'Lopetusaika',
          'features': 'Kohteet',
          'layersTooltip': 'Karttatasot',
          'legend': 'Selite',
          'noLegend': 'Ei selitettä',
          'opacity': 'Peittokyky',
          'overlays': 'Sääaineistot',
          'staticOverlays': 'Merkinnät',
          'surface': 'Pintakartta',
          'timeStepText': 'Aika-askeleet',
          'zoomInTooltip': 'Lähennä',
          'zoomOutTooltip': 'Loitonna'
        },
        'sv': {
          'baseLayers': 'Bakgrundskartor',
          'beginTimeText': 'Starttid',
          'browserNotSupported': 'Webbläsaren stöds inte.',
          'endTimeText': 'Sluttid',
          'features': 'Objekter',
          'layersTooltip': 'Nivåer',
          'legend': 'Legend',
          'noLegend': 'Ingen legend',
          'opacity': 'Opacitet',
          'overlays': 'Väder data',
          'staticOverlays': 'Statisk data',
          'surface': 'Yta',
          'timeStepText': 'Tidssteg',
          'zoomInTooltip': 'Zooma in',
          'zoomOutTooltip': 'Zooma ut'
        },
        'en': {
          'baseLayers': 'Base layers',
          'beginTimeText': 'Begin time',
          'browserNotSupported': 'This browser is not supported.',
          'endTimeText': 'End time',
          'features': 'Features',
          'layersTooltip': 'Layers',
          'legend': 'Legend',
          'noLegend': 'None',
          'opacity': 'Opacity',
          'overlays': 'Overlays',
          'staticOverlays': 'Static overlays',
          'surface': 'Surface map',
          'timeStepText': 'Timesteps',
          'zoomInTooltip': 'Zoom in',
          'zoomOutTooltip': 'Zoom out'
        }
      },
      'disableTouch': false
    }
  }

  /**
   * Initializes DOM element containers.
   */
  initContainers () {
    const animatorContainerIdOrClass = this.config_['map']['view']['container']
    const mapContainerIdOrClass = this.config_['map']['view']['mapContainer']
    const legendContainerClass = this.config_['map']['view']['legendContainer']
    const timeSliderContainerClass = this.config_['time']['view']['timeSliderContainer']
    let animatorContainers
    let animatorContainer
    let animatorContainerId
    let animatorContainerClass
    let mapContainer
    let popupContainer
    let popupCloser
    let popupContent
    let legendContainer
    let timeSliderContainer

    if (!animatorContainerIdOrClass) {
      return
    }

    let parseClassList = classList => {
      return classList
        .split(' ')
        .map(classItem => classItem.trim())
        .filter(classItem => classItem.length > 0)
    }

    let addClassListToContainer = (classList, container) => {
      parseClassList(classList).forEach(classItem => {
        container.classList.add(classItem)
      })
    }
    animatorContainerId = animatorContainerIdOrClass
    if (animatorContainerId.charAt(0) === '#') {
      animatorContainerId = animatorContainerIdOrClass.substr(1)
    }
    animatorContainer = document.getElementById(animatorContainerId)
    if (animatorContainer == null) {
      animatorContainerClass = animatorContainerIdOrClass.replace(/\./g, ' ')
      animatorContainers = document.getElementsByClassName(animatorContainerClass)
      if (animatorContainers.length === 0) {
        return
      }
      animatorContainer = animatorContainers.item(0)
      animatorContainer.setAttribute('id', animatorContainerIdOrClass)
    }
    mapContainer = document.createElement('div')
    addClassListToContainer(mapContainerIdOrClass, mapContainer)
    mapContainer.classList.add('metoclient-map')
    mapContainer.setAttribute('id', mapContainerIdOrClass)
    legendContainer = document.createElement('div')
    addClassListToContainer(legendContainerClass, legendContainer)
    mapContainer.appendChild(legendContainer)
    timeSliderContainer = document.createElement('div')
    addClassListToContainer(timeSliderContainerClass, timeSliderContainer)
    mapContainer.appendChild(timeSliderContainer)
    animatorContainer.innerHTML = ''
    animatorContainer.appendChild(mapContainer)

    popupContainer = document.createElement('div')
    popupContainer.classList.add('ol-popup')
    popupContainer.setAttribute('id', `${mapContainerIdOrClass}-popup`)
    popupContainer.style.display = 'none'
    popupCloser = document.createElement('div')
    popupCloser.classList.add('ol-popup-closer')
    popupCloser.setAttribute('id', `${mapContainerIdOrClass}-popup-closer`)
    popupCloser.innerHTML = '✖'
    popupContainer.appendChild(popupCloser)
    popupContent = document.createElement('div')
    popupContent.setAttribute('id', `${mapContainerIdOrClass}-popup-content`)
    popupContainer.appendChild(popupContent)
    animatorContainer.appendChild(popupContainer)

    if (!this.config_['disableTouch']) {
      animatorContainer.addEventListener('touchmove', function (event) {
        event.preventDefault()
      }, false)
    }

    // Debug div for mobile devices
    // jQuery(divElement).attr('id','fmi-debug-div').width('320px').height('200px').css({'background-color':'#EEEEEE', 'position':'absolute', 'right': '0px'}).appendTo(animatorContainer);
  }

  /**
   * Sets animation begin time.
   * @param {number} beginTime Animation begin time.
   * @export
   */
  setTimeBegin (beginTime) {
    this.timeController_.setBeginTime(beginTime)
    this.refresh()
  }

  /**
   * Sets animation end time.
   * @param {number} endTime Animation end time.
   * @export
   */
  setTimeEnd (endTime) {
    this.timeController_.setEndTime(endTime)
    this.refresh()
  }

  /**
   * Sets animation time step.
   * @param {number} timeStep Animation time step.
   * @export
   */
  setTimeStep (timeStep) {
    this.timeController_.setTimeStep(timeStep)
    this.refresh()
  }

  /**
   * Updates animation.
   * @param {Object} options Animation options.
   * @param {Object=} callbacks Callback functions for map events.
   * @export
   */
  updateAnimation (options, callbacks) {
    if ((this.timeController_ == null) || (this.mapController_ == null)) {
      this.updateQueue_ = {
        options,
        callbacks
      }
      return
    }
    if (options['gridTime'] != null) {
      this.timeController_.setGridTime(options['gridTime'])
    }
    if (options['timeLimitsForced'] != null) {
      this.timeController_.setTimeLimitsForced(options['timeLimitsForced'])
    }
    if (options['beginTime'] != null) {
      this.timeController_.setBeginTime(options['beginTime'])
    }
    if (options['endTime'] != null) {
      this.timeController_.setEndTime(options['endTime'])
    }
    if (typeof options['timeStep'] !== 'undefined') {
      this.timeController_.setTimeStep(options['timeStep'])
    }
    if (options['timeZone'] != null) {
      this.timeController_.setTimeZone(options['timeZone'])
    }
    if (options['timeZoneLabel'] != null) {
      this.timeController_.setTimeZoneLabel(options['timeZoneLabel'])
    }
    if (options['layers'] != null) {
      this.mapController_.setLayers(options['layers'])
    } else if (options['layersChanged'] != null) {
      this.mapController_.updateLayers(options['layersChanged'])
    }
    this.timeController_.createTimer()
    if (options['animationTime'] != null) {
      this.timeController_.setAnimationTime(options['animationTime'])
    }
    if (callbacks != null) {
      this.callbacks_ = callbacks
    }
    if (callbacks === null) {
      this.callbacks_ = {}
    }
    this.timeController_.refreshTime(this.callbacks_)
    this.createMap(this.callbacks_, true)
  }

  /**
   * Destroys animation.
   * @export
   */
  destroyAnimation () {
    this.mapController_.destroyAnimation()
    this.timeController_.destroyTime()
  }

  /**
   * Sets animation speed.
   * @param frameRate Animation speed.
   * @export
   */
  setFrameRate (frameRate) {
    this.timeController_.setFrameRate(frameRate)
  }

  /**
   * Sets animation speed.
   * @param frameRate Animation speed.
   * @export
   * @deprecated
   */
  setTimeRate (frameRate) {
    this.timeController_.setFrameRate(frameRate)
  }

  /**
   * Sets animation time zone.
   * @param {string} timeZone Animation time zone.
   * @export
   */
  setTimeZone (timeZone) {
    this.timeController_.setTimeZone(timeZone)
    this.createTimeSlider()
  }

  /**
   * Sets time zone label.
   * @param {string} timeZoneLabel Time zone label.
   * @export
   */
  setTimeZoneLabel (timeZoneLabel) {
    this.timeController_.setTimeZoneLabel(timeZoneLabel)
    this.createTimeSlider()
  }

  /**
   * Refreshes animation data.
   * @param {Object=} callbacks Callback functions for map and time events.
   * @export
   */
  refresh (callbacks) {
    this.timeController_.refreshTime(callbacks)
    this.createMap(callbacks)
  }

  /**
   * Starts to play animation.
   * @export
   */
  play () {
    this.timeController_.play()
  }

  /**
   * Pauses animation.
   * @export
   */
  pause () {
    this.timeController_.pause()
  }

  /**
   * Stops (pauses and rewinds) animation.
   * @export
   */
  stop () {
    this.timeController_.stop()
  }

  /**
   * Moves to previous time frame.
   * @export
   */
  previous () {
    this.timeController_.previous()
  }

  /**
   * Sets map zoom level.
   * @param {number} level Zoom level.
   * @export
   */
  setZoom (level) {
    this.mapController_.setZoom(level)
  }

  /**
   * Sets map center.
   * @param {number} x X coordinate.
   * @param {number} y Y coordinate.
   * @export
   */
  setCenter (x, y) {
    this.mapController_.setCenter([x, y])
  }

  /**
   * Sets map rotation.
   * @param {number} angle Rotation.
   * @export
   */
  setRotation (angle) {
    this.mapController_.setRotation(angle)
  }

  /**
   * Gets the animation map.
   * @return {Object} Animation map.
   * @export
   */
  getMap () {
    return this.mapController_.getMap()
  }

  /**
   * Gets current time as a timestamp.
   * @return {number} Current time.
   * @export
   */
  getTime () {
    return this.timeController_.getAnimationTime()
  }

  /**
   * Sets current time frame.
   * @param animationTime {number} Timestamp of new time frame.
   * @export
   */
  setTime (animationTime) {
    this.timeController_.setAnimationTime(animationTime)
  }

  /**
   * Adds features to vector layer.
   * @param layerTitle {string} Vector layer title.
   * @param projection {string} Projection.
   * @param featureOptions {Array<Object>} New feature options.
   * @export
   */
  addFeatures (layerTitle, projection, featureOptions) {
    this.mapController_.addFeatures(layerTitle, projection, featureOptions)
  }

  /**
   * Removes all features from a vector layer.
   * @param layerTitle {string} Vector layer title.
   * @export
   */
  clearFeatures (layerTitle) {
    this.mapController_.clearFeatures(layerTitle)
  }

  /**
   * Gets vector layer features.
   * @param layerTitle {string} Vector layer title.
   * @return {Array<Object>} Features.
   * @export
   */
  getFeatures (layerTitle) {
    return this.mapController_.getFeatures(layerTitle)
  }

  /**
   * Gets vector layer features at given location.
   * @param layerTitle {string} Vector layer title.
   * @param x {number} Feature X coordinate.
   * @param y {number} Feature Y coordinate.
   * @param tolerance {number} Coordinate resolution in pixels.
   * @return {Array<Object>} Features.
   * @export
   */
  getFeaturesAt (layerTitle, x, y, tolerance) {
    return this.mapController_.getFeaturesAt(layerTitle, [x, y], tolerance)
  }

  /**
   * Shows a popup window on the map.
   * @param content {string} HTML content of the popup window.
   * @param x {number} Popup X coordinate.
   * @param y {number} Popup Y coordinate.
   * @param append {boolean=} Append content into popup, if it already exists and is located at the same coordinates.
   * @export
   */
  showPopup (content, x, y, append) {
    this.mapController_.showPopup(content, [x, y], append)
  }

  /**
   * Hides popup window on the map.
   * @export
   */
  hidePopup () {
    this.mapController_.hidePopup()
  }

  /**
   * Gets a map layer.
   * @param layerTitle {string} Layer title.
   * @return {Object} Map layer.
   * @export
   */
  getLayer (layerTitle) {
    return this.mapController_.getLayer(layerTitle)
  }

  /**
   * Request a map view update.
   * @export
   */
  requestViewUpdate () {
    this.mapController_.requestViewUpdate()
  }

  /**
   * Sets layer visibility.
   * @param layerTitle {string} Layer title.
   * @param visibility {boolean} Layer visibility.
   * @export
   */
  setLayerVisible (layerTitle, visibility) {
    this.mapController_.setLayerVisible(layerTitle, visibility)
  }

  /**
   * Sets map interactions.
   * @param interactionOptions {Object} Interaction options.
   * @export
   */
  setInteractions (interactionOptions) {
    this.mapController_.setInteractions(interactionOptions)
  }

  /**
   * Enables or disables static map controls.
   * @param staticControls {boolean} Static controls status.
   * @export
   */
  setStaticControls (staticControls) {
    this.mapController_.setStaticControls(staticControls)
  }

  /**
   * Returns static map controls status.
   * @return {boolean} Static controls status.
   * @export
   */
  getStaticControls () {
    return this.mapController_.getStaticControls()
  }

  /**
   * Sets callback functions.
   * @param callbacks {Object} Callback functions.
   * @export
   */
  setCallbacks (callbacks) {
    let self = this
    let currentAnimationTime = this.timeController_.getAnimationTime()
    let userReadyCallback
    if (callbacks != null) {
      if (callbacks['ready'] != null) {
        userReadyCallback = callbacks['ready'].bind()
        callbacks['ready'] = () => {
          self.setTime(currentAnimationTime)
          if (typeof userReadyCallback === 'function') {
            userReadyCallback()
          }
        }
      }
      this.callbacks_ = callbacks
    }
    if (callbacks === null) {
      this.callbacks_ = {}
    }
    this.mapController_.setCallbacks(this.callbacks_)
    this.timeController_.setCallbacks(this.callbacks_)
  }

  /**
   * Sets time grid offset from midnight.
   * @param gridTimeOffset {Number} Time grid offset.
   * @export
   */
  setDayStartOffset (gridTimeOffset) {
    this.timeController_.setDayStartOffset(gridTimeOffset)
  }

  /**
   * Sets the capabilities data corresponding to a given url.
   * @param {Object} capabilities Capabilities data.
   * @export
   */
  setCapabilities (capabilities) {
    this.mapController_.setCapabilities(capabilities)
  }

  /**
   * Destructor.
   * @export
   */
  destruct () {
    this.destroyAnimation()
    this.mapController_ = null
    this.timeController_ = null
  }

  /**
   * Starts a new animation creation.
   * @param {Object=} callbacks Callback functions for map events.
   * @return {MetOClient} Owner class.
   * @export
   */
  createAnimation (callbacks) {
    let self = this
    if ((this.config_['map']['view']['mapLoader'] === 'all') && (!this.config_['map']['view']['useStorage'])) {
      this.produceAnimation(callbacks)
    } else {
      // Test storage before relying on it
      localforage.setItem('metoclient-key', 'metoclient-value').then(function () {
        return localforage.getItem('metoclient-key')
      }).catch(err => {
        self.config_['map']['view']['mapLoader'] = 'all'
        self.config_['map']['view']['useStorage'] = false
      }).finally(() => {
        self.produceAnimation(callbacks)
      })
    }
  }

  /**
   * Produces a new animation.
   * @param {Object=} callbacks Callback functions for map events.
   * @return {MetOClient} Owner class.
   * @export
   */
  produceAnimation (callbacks) {
    let self = this
    let updateOptions
    let updateCallbacks
    this.timeController_ = new TimeController(this.config_['time'])
    this.mapController_ = new MapController(this.config_['map'], this.timeController_.getCreationTime())
    utils.supportOldBrowsers()
    this.initContainers()
    this.reloadListener_ = () => {
    }
    this.mapController_.actionEvents.addListener('reload', this.reloadListener_)
    this.playListener_ = () => {
      self.play()
    }
    this.timeController_.actionEvents.addListener('play', this.playListener_)
    this.refreshListener_ = () => {
      self.refresh(this.callbacks_)
      if (typeof this.callbacks_['refreshed'] === 'function') {
        this.callbacks_['refreshed']()
      }
    }
    this.timeController_.actionEvents.addListener('refresh', this.refreshListener_)
    this.animationTimeListener_ = animationTime => {
      self.mapController_.setAnimationTime(animationTime)
    }
    this.timeController_.variableEvents.addListener('animationTime', this.animationTimeListener_)
    this.numIntervalItemsListener_ = numIntervalItems => {
      self.timeController_.updateTimeSteps(numIntervalItems)
    }
    this.mapController_.variableEvents.addListener('numIntervalItems', this.numIntervalItemsListener_)
    if (callbacks == null) {
      callbacks = {}
    }
    this.callbacks_ = callbacks
    this.createTime(callbacks)
    if (this.updateQueue_ == null) {
      this.createMap(callbacks)
    } else {
      updateOptions = this.updateQueue_['options']
      updateCallbacks = this.updateQueue_['callbacks']
      this.updateQueue_ = null
      this.updateAnimation(updateOptions, updateCallbacks)
    }
    return this
  }

  /**
   * Refreshes the map.
   * @export
   */
  refreshMap () {
    this.mapController_.refreshMap()
  }

  /**
   * Creates a time slider for each view.
   * @export
   */
  createTimeSlider () {
    this.timeController_.createTimeSlider()
  }

  /**
   * Selects a vector feature.
   * @param {Object} feature Feature to be selected.
   * @export
   */
  selectFeature (feature) {
    this.mapController_.selectFeature(feature)
  }

  /**
   * Gets animation time moments.
   * @return {Array<number>} Time moments.
   * @export
   */
  getAnimationTimes () {
    return this.timeController_.getAnimationTimes()
  }
}
