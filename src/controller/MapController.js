/**
 * @fileoverview Map controller for animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import Map from '../model/Map'
import MapAnimation from '../view/map/ol/MapAnimation'
import EventEmitter from 'wolfy87-eventemitter'
import jQuery from 'jquery'

export default class MapController {
  /**
   * Constructs a new map controller.
   * @param {Object} config User configuration.
   * @param {number} referenceTime World creation time.
   * @constructor
   */
  constructor (config, referenceTime) {
    /**
     * @type {Object}
     * @private
     */
    this.config_ = config
    this.actionEvents = new EventEmitter()
    this.variableEvents = new EventEmitter()
    /**
     * @type {Object}
     * @private
     */
    this.model_ = new Map(config['model'], referenceTime)
    /**
     * @type {Object}
     * @private
     */
    this.view_ = new MapAnimation(config['view'])
    this.reloadListener_ = () => {
    }
    this.numIntervalItemsListener_ = () => {
    }
  };

  /**
   * Produces a new map.
   * @param {number=} currentTime Current real-world time.
   * @param {number=} animationTime Animation time.
   * @param {number=} animationBeginTime Animation begin time.
   * @param {number=} animationEndTime Animation end time.
   * @param {number=} animationResolutionTime Animation resolution time.
   * @param {number=} animationNumIntervals Number of animation time intervals.
   * @param {Object=} callbacks Callback functions for map events.
   */
  createMap (currentTime, animationTime, animationBeginTime, animationEndTime, animationResolutionTime, animationNumIntervals, callbacks) {
    const self = this
    const capabilities = {}
    let layers
    let promises
    // console.log("Start to load capabilities.");
    // console.log(goog.now());
    this.model_.refreshLayers(currentTime, animationResolutionTime)
    promises = this.model_.loadCapabilities(capabilities)
    layers = this.model_.getLayers()
    this.reloadListener_ = () => {
      self.actionEvents.emitEvent('reload')
    }
    // The listener will not be added if it is a duplicate.
    this.view_.actionEvents.addListener('reload', this.reloadListener_)
    this.numIntervalItemsListener_ = numIntervalItems => {
      self.variableEvents.emitEvent('numIntervalItems', [numIntervalItems])
    }
    // The listener will not be added if it is a duplicate.
    this.view_.variableEvents.addListener('numIntervalItems', this.numIntervalItemsListener_)
    jQuery.when.apply(null, promises).done(() => {
      // console.log("Capabilities loaded.");
      // console.log(goog.now());
      self.view_.createAnimation(layers, capabilities, currentTime, animationTime, animationBeginTime, animationEndTime, animationResolutionTime, animationNumIntervals, callbacks)
    })
  };

  /**
   * Refreshes the animation map.
   */
  refreshMap () {
    this.view_.createAnimation()
  };

  /**
   * Destroys the animation map.
   */
  destroyAnimation () {
    this.actionEvents.removeAllListeners()
    this.variableEvents.removeAllListeners()
    this.view_.destroyAnimation()
  };

  /**
   * Sets the animation time.
   * @param {number} animationTime Animation time.
   */
  setAnimationTime (animationTime) {
    this.view_.setAnimationTime(animationTime)
  };

  /**
   * Gets the number of animation time intervals.
   * @returns {number} The number of time intervals.
   */
  getAnimationNumIntervals () {
    return this.model_.getAnimationNumIntervals()
  };

  /**
   * Sets map zoom level.
   * @param {number} level Zoom level.
   */
  setZoom (level) {
    this.view_.setZoom(level)
  };

  /**
   * Sets map center.
   * @param {Array} coordinates Center coordinates.
   */
  setCenter (coordinates) {
    this.view_.setCenter(coordinates)
  };

  /**
   * Sets map rotation.
   * @param {number} angle Rotation.
   */
  setRotation (angle) {
    this.view_.setRotation(angle)
  };

  /**
   * Sets the map layers.
   * @param layers Map layers.
   */
  setLayers (layers) {
    this.model_.setLayers(layers)
  };

  /**
   * Gets the animation map.
   * @return {Object} Animation map.
   */
  getMap () {
    return this.view_.getMap()
  };

  /**
   * Gets vector layer features.
   * @param layerTitle {string} Vector layer title.
   * @return {Array<Object>} Features.
   */
  getFeatures (layerTitle) {
    return this.view_.getFeatures(layerTitle)
  };

  /**
   * Gets vector layer features at given location.
   * @param layerTitle {string} Vector layer title.
   * @param coordinate {Array} Vector coordinates.
   * @param tolerance {number} Coordinate resolution in pixels.
   * @return {Array<Object>} Features.
   */
  getFeaturesAt (layerTitle, coordinate, tolerance) {
    return this.view_.getFeaturesAt(layerTitle, coordinate, tolerance)
  };

  /**
   * Adds features to vector layer.
   * @param layerTitle {string} Vector layer title.
   * @param projection {string} Projection.
   * @param featureOptions {Array<Object>} New feature options.
   */
  addFeatures (layerTitle, projection, featureOptions) {
    this.view_.addFeatures(layerTitle, projection, featureOptions)
  };

  /**
   * Removes all features from a vector layer.
   * @param layerTitle {string} Vector layer title.
   */
  clearFeatures (layerTitle) {
    this.view_.clearFeatures(layerTitle)
  };

  /**
   * Shows a popup window on the map.
   * @param content {string} HTML content of the popup window.
   * @param coordinate {Array} Popup coordinates.
   */
  showPopup (content, coordinate) {
    this.view_.showPopup(content, coordinate)
  };

  /**
   * Hides popup window on the map.
   */
  hidePopup () {
    this.view_.hidePopup()
  };

  /**
   * Gets a map layer.
   * @param layerTitle {string} Layer title.
   * @return {Object} Map layer.
   */
  getLayer (layerTitle) {
    return this.view_.getLayer(layerTitle)
  };

  /**
   * Request a map view update.
   */
  requestViewUpdate () {
    this.view_.requestViewUpdate()
  };

  /**
   * Sets layer visibility.
   * @param layerTitle {string} Layer title.
   * @param visibility {boolean} Layer visibility.
   */
  setLayerVisible (layerTitle, visibility) {
    this.view_.setLayerVisible(layerTitle, visibility)
  };

  /**
   * Sets map interactions.
   * @param interactionOptions {Object} Interaction options.
   */
  setInteractions (interactionOptions) {
    this.view_.setInteractions(interactionOptions)
  };

  /**
   * Enables or disables static map controls.
   * @param staticControls {boolean} Static controls status.
   */
  setStaticControls (staticControls) {
    this.view_.setStaticControls(staticControls)
  };

  /**
   * Returns static map controls status.
   * @return {boolean} Static controls status.
   */
  getStaticControls () {
    return this.view_.getStaticControls()
  };

  /**
   * Sets callback functions.
   * @param callbacks {Object} Callback functions.
   */
  setCallbacks (callbacks) {
    this.view_.setCallbacks(callbacks)
  };

  /**
   * Sets the capabilities data.
   * @param {Object} capabilities Capabilities data.
   */
  setCapabilities (capabilities) {
    this.model_.setCapabilities(capabilities)
  };
}
