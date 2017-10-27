/**
 * @fileoverview Time controller for animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import Time from '../model/Time'
import TimeSlider from '../view/time/raphael/TimeSlider'
import EventEmitter from 'wolfy87-eventemitter'
import jQuery from 'jquery'

export default class TimeController {
    /**
     * Constructs a new time controller.
     * @param {Object} config User
     * @constructor
     */
  constructor (config) {
        /**
         * @type {Object}
         * @private
         */
    this.config_ = config
    this.variableEvents = new EventEmitter()
    this.actionEvents = new EventEmitter()
        /**
         * @function
         * @param {number} animationTime Animation time.
         * @private
         */
    this.animationTimeTimerListener_ = animationTime => {
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
         * @private
         */
    this.previousListener_ = () => {
    }
        /**
         * @function
         * @private
         */
    this.nextListener_ = () => {
    }
        /**
         * @function
         * @param {number} animationTime Animation time.
         * @private
         */
    this.animationTimeUserListener_ = animationTime => {
    }
        /**
         * @function
         * @param {boolean} animationPlay Animation playback state.
         * @private
         */
    this.animationPlayListener_ = animationPlay => {
    }
        /**
         * @private
         */
    this.model_ = new Time(config['model'])
        /**
         * @private
         */
    this.views_ = []
  };

    /**
     * Produces a time model and views.
     */
  createTime () {
    const self = this
    let containers
    let numViews
    let i
    this.previousListener_ = () => {
      self.previous()
    }
    this.nextListener_ = () => {
      self.next()
    }
    this.animationTimeUserListener_ = animationTime => {
      self.model_.setAnimationTime(animationTime)
    }
    this.animationPlayListener_ = animationPlay => {
      if (animationPlay) {
        self.play()
      } else {
        self.pause()
      }
    }
    containers = jQuery(`.${this.config_['view']['timeSliderContainer']}`)
    numViews = containers.length
    for (i = 0; i < numViews; i++) {
      this.views_.push(new TimeSlider(this.config_['view'], containers[i]))
      this.views_[i].actionEvents.addListener('previous', self.previousListener_)
      this.views_[i].actionEvents.addListener('next', self.nextListener_)
      this.views_[i].variableEvents.addListener('animationTime', self.animationTimeUserListener_)
      this.views_[i].variableEvents.addListener('animationPlay', self.animationPlayListener_)
    }

        /**
         * @private
         */
    this.playListener_ = () => {
      self.actionEvents.emitEvent('play')
    }
    this.model_.actionEvents.addListener('play', this.playListener_)
        /**
         * @private
         */
    this.refreshListener_ = () => {
      self.actionEvents.emitEvent('refresh')
    }
    this.model_.actionEvents.addListener('refresh', this.refreshListener_)
        /**
         * @private
         */
    this.animationTimeTimerListener_ = animationTime => {
      if (self.config_['view']['showTimeSlider']) {
        self.updateTimeSlider()
      }
      self.variableEvents.emitEvent('animationTime', [animationTime])
    }
    this.model_.variableEvents.addListener('animationTime', this.animationTimeTimerListener_)

    this.createTimer()
    this.createTimeSlider()
  };

    /**
     * Creates a time slider for each view.
     */
  createTimeSlider () {
    const numViews = this.views_.length
    let i
    if (!this.config_['view']['showTimeSlider']) {
      return
    }
    for (i = 0; i < numViews; i++) {
      this.views_[i].createTimeSlider(
                this.model_.getCurrentTime(),
                this.model_.getAnimationTime(),
                this.model_.getAnimationBeginTime(),
                this.model_.getAnimationEndTime(),
                this.model_.getAnimationResolutionTime(),
                this.model_.getAnimationNumIntervals()
            )
    }
  };

    /**
     * Updates time slider in each view.
     */
  updateTimeSlider () {
    const animationTime = this.model_.getAnimationTime()
    const numViews = this.views_.length
    let i
    for (i = 0; i < numViews; i++) {
      this.views_[i].setAnimationTime(animationTime)
    }
  };

    /**
     * Updates loader state visualizations.
     * @param {Array<Object>} numIntervalItems Loader counter information for intervals.
     */
  updateTimeLoaderVis (numIntervalItems) {
    const numViews = this.views_.length
    const numIntervals = numIntervalItems.length
    let i
    for (i = 0; i < numViews; i++) {
      this.views_[i].updateTimeLoaderVis(numIntervalItems)
    }
    if (this.model_.isWaitingAutoStart()) {
      for (i = 0; i < numIntervals; i++) {
        if (![fi.fmi.metoclient.ui.animator.Constants.LOADING_STATUS['ready'], fi.fmi.metoclient.ui.animator.Constants.LOADING_STATUS['error']].includes(numIntervalItems[i]['status'])) {
          return
        }
      }
      this.play()
    }
  };

    /**
     * Gets the real-world creation time.
     * @returns {number} Real-world creation time.
     */
  getCreationTime () {
    return this.model_.getCreationTime()
  };

    /**
     * Gets current real-world time.
     * @returns {number} Current real-world time.
     */
  getCurrentTime () {
    return this.model_.getCurrentTime()
  };

    /**
     * Gets animation time.
     * @returns {number} Animation time.
     */
  getAnimationTime () {
    return this.model_.getAnimationTime()
  };

    /**
     * Gets animation begin time.
     * @returns {number} Animation begin time.
     */
  getAnimationBeginTime () {
    return this.model_.getAnimationBeginTime()
  };

    /**
     * Gets animation end time.
     * @returns {number} Gets animation end time.
     */
  getAnimationEndTime () {
    return this.model_.getAnimationEndTime()
  };

    /**
     * Gets animation resolution time.
     * @returns {number} Animation resolution time.
     */
  getAnimationResolutionTime () {
    return this.model_.getAnimationResolutionTime()
  };

    /**
     * Gets number of animation time intervals.
     * @returns {number} Number of animation time intervals.
     */
  getAnimationNumIntervals () {
    return this.model_.getAnimationNumIntervals()
  };

    /**
     * Refreshes current real-world time.
     */
  refreshTime () {
    const currentTime = Date.now(), resolutionTime = this.model_.getAnimationResolutionTime()
    this.model_.setAnimationLastRefreshed(currentTime)
    this.model_.setCurrentTime(currentTime)
    this.model_.moveAnimationTimeFrame(Math.floor(currentTime / resolutionTime) * resolutionTime - Math.floor(this.model_.getCreationTime() / resolutionTime) * resolutionTime)
  };

    /**
     * Starts to play animation.
     */
  play () {
    this.model_.play()
    this.views_.forEach(view => {
      view.setAnimationPlay(true)
    })
  };

    /**
     * Pauses animation.
     */
  pause () {
    this.model_.pause()
    this.views_.forEach(view => {
      view.setAnimationPlay(false)
    })
  };

    /**
     * Stops (pauses and rewinds) animation.
     */
  stop () {
    this.model_.stop()
    this.views_.forEach(view => {
      view.setAnimationPlay(false)
    })
  };

    /**
     * Moves to previous time frame.
     */
  previous () {
    this.model_.previous()
  };

    /**
     * Moves to next time frame.
     */
  next () {
    this.model_.next()
  };

    /**
     * Moves to given time frame.
     * @param time {number} Timestamp of new animation time.
     */
  setAnimationTime (time) {
    this.model_.setAnimationTime(time)
  };

    /**
     * Sets animations frame rate.
     * @param {number} frameRate Frame rate.
     */
  setFrameRate (frameRate) {
    this.model_.setFrameRate(frameRate)
  };

    /**
     * Sets animation begin time.
     * @param {number} beginTime Animation begin time.
     */
  setBeginTime (beginTime) {
    this.model_.setBeginTime(beginTime)
  };

    /**
     * Sets animation end time.
     * @param {number} endTime Animation end time.
     */
  setEndTime (endTime) {
    this.model_.setEndTime(endTime)
  };

    /**
     * Sets animation time step.
     * @param timeStep Animation time step.
     */
  setTimeStep (timeStep) {
    this.model_.setResolutionTime(timeStep)
  };

    /**
     * Sets time zone.
     * @param {string} timeZone Time zone.
     */
  setTimeZone (timeZone) {
    this.views_.forEach(view => {
      view.setTimeZone(timeZone)
    })
  };

    /**
     * Sets time zone.
     * @param {string} timeZoneLabel Time zone.
     */
  setTimeZoneLabel (timeZoneLabel) {
    this.views_.forEach(view => {
      view.setTimeZoneLabel(timeZoneLabel)
    })
  };

    /**
     * Sets time grid offset from midnight.
     * @param gridTimeOffset {Number} Time grid offset.
     */
  setDayStartOffset (gridTimeOffset) {
    this.model_.setDayStartOffset(gridTimeOffset)
  };

    /**
     * Produces a new timer definition.
     */
  createTimer () {
    this.model_.createTimer()
  };

    /**
     * Destroys current time model and views.
     */
  destroyTime () {
    const numViews = this.views_.length
    let i
    this.actionEvents.removeAllListeners()
    this.variableEvents.removeAllListeners()
    for (i = 0; i < numViews; i++) {
      this.views_[i].destroyTimeSlider()
    }
    this.model_.destroyTimer()
  };
}
