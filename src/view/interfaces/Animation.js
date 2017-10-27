/**
 * @fileoverview Interface definitions for common map animator view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

/**
 * An interface for map animator view.
 * @interface
 */
export default class Animation {
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
  createAnimation (layers, capabilities, currentTime, animationTime, animationBeginTime, animationEndTime, animationResolutionTime, animationNumIntervals, callbacks) {
  };

  /**
   * Destroys map animation.
   */
  destroyAnimation () {
  };

  /**
   * Sets map zoom level.
   * @param {number} level Zoom level.
   */
  setZoom (level) {
  };

  /**
   * Sets map center.
   * @param {Array} coordinates Center coordinates.
   */
  setCenter (coordinates) {
  };

  /**
   * Sets map rotation.
   * @param {number} angle Rotation.
   */
  setRotation (angle) {
  };

  /**
   * Gets the animation map.
   * @return {Object} Animation map.
   */
  getMap () {
  };

  /**
   * Gets vector layer features.
   * @param layerTitle {string} Vector layer title.
   * @return {Array<Object>} Features.
   */
  getFeatures (layerTitle) {
  };

  /**
   * Gets vector layer features at given location.
   * @param layerTitle {string} Vector layer title.
   * @param coordinate {Array} Vector coordinates.
   * @param tolerance {number} Coordinate resolution in pixels.
   * @return {Array<Object>} Features.
   */
  getFeaturesAt (layerTitle, coordinate, tolerance) {
  };

  /**
   * Adds features to vector layer.
   * @param layerTitle {string} Vector layer title.
   * @param projection {string} Projection.
   * @param featureOptions {Array<Object>} New feature options.
   */
  addFeatures (layerTitle, projection, featureOptions) {
  };

  /**
   * Removes all features from a vector layer.
   * @param layerTitle {string} Vector layer title.
   */
  clearFeatures (layerTitle) {
  };

  /**
   * Shows a popup window on the map.
   * @param content {string} HTML content of the popup window.
   * @param coordinate {Array} Popup coordinates.
   */
  showPopup (content, coordinate) {
  };

  /**
   * Hides popup window on the map.
   */
  hidePopup () {
  };

  /**
   * Gets a map layer.
   * @param layerTitle {string} Layer title.
   * @return {Object} Map layer.
   */
  getLayer (layerTitle) {
  };

  /**
   * Request a map view update.
   */
  requestViewUpdate () {
  };

  /**
   * Sets layer visibility.
   * @param layerTitle {string} Layer title.
   * @param visibility {boolean} Layer visibility.
   */
  setLayerVisible (layerTitle, visibility) {
  };

  /**
   * Sets map interactions.
   * @param interactionOptions {Object} Interaction options.
   */
  setInteractions (interactionOptions) {
  };

  /**
   * Enables or disables static map controls.
   * @param staticControls {boolean} Static controls status.
   */
  setStaticControls (staticControls) {
  };

  /**
   * Returns static map controls status.
   * @return {boolean} Static controls status.
   */
  getStaticControls () {
  };

  /**
   * Sets callback functions.
   * @param callbacks {Object} Callback functions.
   */
  setCallbacks (callbacks) {
  };
}
