/**
 * @fileoverview Time controller for animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import Time from '../model/Time'
import TimeSlider from '../view/time/TimeSlider'
import * as constants from '../constants'
import EventEmitter from 'wolfy87-eventemitter'

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
  }

  /**
   * Produces a time model and views.
   * @param {Object=} callbacks Callback functions for time events.
   */
  createTime (callbacks) {
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
    this.animationTimeUserListener_ = (animationTime) => {
      self.setAnimationTime(animationTime)
      self.updateAnimationBackupTime()
    }
    this.animationPlayListener_ = (animationPlay) => {
      if (animationPlay) {
        self.play()
      } else {
        self.pause()
      }
    }
    containers = document.getElementsByClassName(this.config_['view']['timeSliderContainer'])
    numViews = containers.length
    if (this.config_['view']['showTimeSlider']) {
      for (i = 0; i < numViews; i++) {
        this.views_.push(new TimeSlider(this.config_['view'], containers[i], callbacks))
        this.views_[i].actionEvents.addListener('previous', self.previousListener_)
        this.views_[i].actionEvents.addListener('next', self.nextListener_)
        this.views_[i].variableEvents.addListener('animationTime', self.animationTimeUserListener_)
        this.views_[i].variableEvents.addListener('animationPlay', self.animationPlayListener_)
      }
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
      self.updateTimeSlider()
      self.variableEvents.emitEvent('animationTime', [animationTime])
    }
    this.model_.variableEvents.addListener('animationTime', this.animationTimeTimerListener_)

    this.createTimer()
  }

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
      this.views_[i].createTimeSlider(this.model_.getAnimationTimes())
    }
  }

  /**
   * Updates time slider in each view.
   */
  updateTimeSlider () {
    const animationTime = this.model_.getAnimationTime()
    const numViews = this.views_.length
    let i
    if (!this.config_['view']['showTimeSlider']) {
      return
    }
    for (i = 0; i < numViews; i++) {
      this.views_[i].setAnimationTime(animationTime)
    }
  }

  /**
   * Updates time steps.
   * @param {Array<Object>} numIntervalItems Loader counter information for intervals.
   */
  updateTimeSteps (numIntervalItems) {
    const numViews = this.views_.length
    let numIntervals
    let i
    let empty = true
    if (numIntervalItems.length === 0) {
      return
    }
    if (this.getAnimationBackupTime() == null) {
      this.updateAnimationBackupTime()
    }
    // Remove empty time steps from start and end if not every step is empty
    if (!this.model_.getTimeLimitsForced()) {
      numIntervals = numIntervalItems.length
      for (i = 0; i < numIntervals; i++) {
        if ((numIntervalItems[i].toBeLoaded == null) || (numIntervalItems[i].toBeLoaded > 0)) {
          empty = false
          break
        }
      }
      if (!empty) {
        i = 0
        while (i < numIntervalItems.length) {
          if ((numIntervalItems[i].toBeLoaded == null) || (numIntervalItems[i].toBeLoaded > 0)) {
            break
          }
          numIntervalItems.shift()
          i++
        }
        i = numIntervalItems.length - 1
        while (i >= 0) {
          if ((numIntervalItems[i].toBeLoaded == null) || (numIntervalItems[i].toBeLoaded > 0)) {
            break
          }
          numIntervalItems.pop()
          i--
        }
      }
      numIntervals = numIntervalItems.length
    }
    this.model_.setAnimationTimes(numIntervalItems.reduce((animationTimes, intervalItem) => {
      animationTimes.push(intervalItem['endTime'])
      return animationTimes
    }, []))
    for (i = 0; i < numViews; i++) {
      this.views_[i].updateTimeLoaderVis(numIntervalItems)
    }
    this.updateTimeSlider()
    if (this.model_.isWaitingAutoStart()) {
      for (i = 0; i < numIntervals; i++) {
        if (![constants.LOADING_STATUS['ready'], constants.LOADING_STATUS['error']].includes(numIntervalItems[i]['status'])) {
          return
        }
      }
      this.play()
    }
  }

  /**
   * Gets the real-world creation time.
   * @returns {number} Real-world creation time.
   */
  getCreationTime () {
    return this.model_.getCreationTime()
  }

  /**
   * Gets current real-world time.
   * @returns {number} Current real-world time.
   */
  getCurrentTime () {
    return this.model_.getCurrentTime()
  }

  /**
   * Gets animation time.
   * @returns {number} Animation time.
   */
  getAnimationTime () {
    return this.model_.getAnimationTime()
  }

  /**
   * Gets animation begin time.
   * @returns {number} Animation begin time.
   */
  getAnimationBeginTime () {
    return this.model_.getAnimationBeginTime()
  }

  /**
   * Gets animation end time.
   * @returns {number} Gets animation end time.
   */
  getAnimationEndTime () {
    return this.model_.getAnimationEndTime()
  }

  /**
   * Gets animation resolution time.
   * @returns {number} Animation resolution time.
   */
  getAnimationResolutionTime () {
    return this.model_.getAnimationResolutionTime()
  }

  /**
   * Gets number of animation time intervals.
   * @returns {number} Number of animation time intervals.
   */
  getAnimationNumIntervals () {
    return this.model_.getAnimationNumIntervals()
  }

  /**
   * Refreshes current real-world time.
   * @param {Object=} callbacks Callback functions for time events.   */
  refreshTime (callbacks) {
    let timeShift
    const currentTime = Date.now()
    let resolutionTime = this.model_.getAnimationResolutionTime()
    const creationTime = this.model_.getCreationTime()
    let animationTimes
    this.model_.setDefaultTime(this.model_.getAnimationTime())
    if (resolutionTime == null) {
      animationTimes = this.model_.getAnimationTimes()
      if ((animationTimes != null) && (animationTimes.length > 0)) {
        resolutionTime = animationTimes[1] - animationTimes[0]
      }
    }
    timeShift = (resolutionTime != null) ? Math.floor(currentTime / resolutionTime) * resolutionTime - Math.floor(creationTime / resolutionTime) * resolutionTime : currentTime - creationTime
    this.model_.setAnimationLastRefreshed(currentTime)
    this.model_.setCurrentTime(currentTime)
    this.model_.moveAnimationTimeFrame(timeShift)
    if (callbacks != null) {
      this.views_.forEach(view => {
        view.setCallbacks(callbacks)
      })
    }
  }

  /**
   * Starts to play animation.
   */
  play () {
    this.model_.play()
    this.views_.forEach(view => {
      view.setAnimationPlay(true)
    })
  }

  /**
   * Pauses animation.
   */
  pause () {
    this.model_.pause()
    this.views_.forEach(view => {
      view.setAnimationPlay(false)
    })
  }

  /**
   * Stops (pauses and rewinds) animation.
   */
  stop () {
    this.model_.stop()
    this.views_.forEach(view => {
      view.setAnimationPlay(false)
    })
  }

  /**
   * Moves to previous time frame.
   */
  previous () {
    this.model_.previous()
  }

  /**
   * Moves to next time frame.
   */
  next () {
    this.model_.next()
  }

  /**
   * Moves to given time frame.
   * @param time {number} Timestamp of new animation time.
   */
  setAnimationTime (time) {
    this.model_.setAnimationTime(time)
    this.updateAnimationBackupTime()
  }

  /**
   * Sets animations frame rate.
   * @param {number} frameRate Frame rate.
   */
  setFrameRate (frameRate) {
    this.model_.setFrameRate(frameRate)
  }

  /**
   * Sets animation grid time.
   * @param {number} gridTime Animation grid time.
   */
  setGridTime (gridTime) {
    this.model_.setGridTime(gridTime)
  }

  /**
   * Sets animation begin time.
   * @param {number} beginTime Animation begin time.
   */
  setBeginTime (beginTime) {
    this.model_.setBeginTime(beginTime)
  }

  /**
   * Sets animation end time.
   * @param {number} endTime Animation end time.
   */
  setEndTime (endTime) {
    this.model_.setEndTime(endTime)
  }

  /**
   * Sets time limits forced.
   * @param {boolean} timeLimitsForced Time limits forced.
   */
  setTimeLimitsForced (timeLimitsForced) {
    this.model_.setTimeLimitsForced(timeLimitsForced)
  }

  /**
   * Sets animation time step.
   * @param timeStep Animation time step.
   */
  setTimeStep (timeStep) {
    this.model_.setResolutionTime(timeStep)
  }

  /**
   * Sets time zone.
   * @param {string} timeZone Time zone.
   */
  setTimeZone (timeZone) {
    this.views_.forEach(view => {
      view.setTimeZone(timeZone)
    })
  }

  /**
   * Sets time zone.
   * @param {string} timeZoneLabel Time zone.
   */
  setTimeZoneLabel (timeZoneLabel) {
    this.views_.forEach(view => {
      view.setTimeZoneLabel(timeZoneLabel)
    })
  }

  /**
   * Sets time grid offset from midnight.
   * @param gridTimeOffset {Number} Time grid offset.
   */
  setDayStartOffset (gridTimeOffset) {
    this.model_.setDayStartOffset(gridTimeOffset)
  }

  /**
   * Produces a new timer definition.
   */
  createTimer () {
    this.model_.createTimer()
  }

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
  }

  /**
   * Gets animation time moments.
   * @return {Array<number>} Time moments.
   */
  getAnimationTimes () {
    return this.model_.getAnimationTimes()
  }

  /**
   * Gets animation backup time.
   * @returns {number} Animation backup time.
   */
  getAnimationBackupTime () {
    return this.model_.getAnimationBackupTime()
  }

  /**
   * Updates animation backup time.
   * @param time {number} Timestamp of animation backup time.
   */
  updateAnimationBackupTime () {
    this.model_.updateAnimationBackupTime()
  }

  /**
   * Updates animation backup time.
   */
  resetAnimationBackupTime () {
    this.model_.resetAnimationBackupTime()
  }
}
