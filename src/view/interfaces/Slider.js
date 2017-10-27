/**
 * @fileoverview Interface definitions for common time view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

/**
 * An interface for time view.
 * @interface
 */
export default class Slider {
  /**
   * Creates a new time slider.
   * @param {number} currentTime Current real-world time.
   * @param {number} animationTime Animation time.
   * @param {number} beginTime Animation begin time.
   * @param {number} endTime Animation end time.
   * @param {number} resolutionTime Animation resolution time.
   * @param {number} numIntervals Number of animation intervals.
   */
  createTimeSlider (currentTime, animationTime, beginTime, endTime, resolutionTime, numIntervals) {
  };

  /**
   * Destroys current time slider.
   */
  destroyTimeSlider () {
  };

  /**
   * Sets an animation time.
   * @param {string} animationTime Animation time.
   */
  setAnimationTime (animationTime) {
  };

  /**
   * Turns animation play on or off.
   * @param {boolean} animationPlay True if play is turned on.
   */
  setAnimationPlay (animationPlay) {
  };

  /**
   * Sets a time zone.
   * @param {string} timeZone Time zone.
   */
  setTimeZone (timeZone) {
  };

  /**
   * Sets a time zone.
   * @param {string} timeZoneLabel Time zone label.
   */
  setTimeZoneLabel (timeZoneLabel) {
  };

  /**
   * Updates loading state visualization
   * @param {Object} numIntervalItems Loader counter information for intervals.
   */
  updateTimeLoaderVis (numIntervalItems) {
  };
}
