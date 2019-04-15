/**
 * @fileoverview Time model for animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import * as utils from '../utils'
import * as constants from '../constants'
import EventEmitter from 'wolfy87-eventemitter'
import isNumeric from 'fast-isnumeric'

export default class Time {
  /**
   *  Constructs a new time model.
   *  @param {Object} config User configuration.
   *  @constructor
   */
  constructor (config) {
    this.config_ = config
    this.variableEvents = new EventEmitter()
    this.actionEvents = new EventEmitter()
    this.animationLastRefreshed_ = 0
    this.beginTime_ = this.config_['beginTime']
    this.endTime_ = this.config_['endTime']
    this.firstDataPointTime_ = this.config_['firstDataPointTime']
    this.lastDataPointTime_ = this.config_['lastDataPointTime']
    this.timeLimitsForced_ = this.config_['timeLimitsForced']
    this.defaultTime_ = this.config_['defaultAnimationTime']
    this.endTimeDelay_ = this.config_['endTimeDelay']
    this.frameRate_ = this.config_['frameRate']
    this.refreshInterval_ = this.config_['refreshInterval']
    this.currentTime_ = Date.now()
    this.timeCreatedAt_ = this.currentTime_
    this.animationTime_ = null
    this.animationBeginTime_ = this.config_['beginTime']
    this.animationEndTime_ = this.config_['endTime']
    this.initBeginTime_ = 0
    this.initEndTime_ = 0
    this.animationNumIntervals_ = 0
    this.animationResolutionTime_ = this.config_['resolutionTime']
    this.animationTimes_ = []
    this.animationTimeIndex_ = 0
    this.animationGridTime_ = this.config_['gridTime']
    this.animationGridTimeOffset_ = this.config_['gridTimeOffset']
    this.play_ = false
    this.waitUntilLoaded_ = (this.config_['waitUntilLoaded'] != null) ? this.config_['waitUntilLoaded'] : false
    this.refreshStarted_ = false
    this.continuePlay_ = false
    this.animationBackupTime_ = null
  }

  /**
   * Defines a new timer.
   */
  createTimer () {
    let offsetTime
    let animationTimeIndex = 0
    let defaultTime = this.defaultTime_
    let timeDifference
    let i
    let gridTimes
    let gridTime
    this.animationTimes_ = []
    this.animationNumIntervals_ = 0
    if (this.animationGridTime_ != null) {
      gridTimes = (Array.isArray(this.animationGridTime_)) ? this.animationGridTime_ : [this.animationGridTime_, this.animationGridTime_]
      // Round initial animation time to previous tick
      this.animationBeginTime_ = utils.floorTime(this.beginTime_, gridTimes[0])
      if (this.endTime_ != null) {
        gridTime = (this.animationResolutionTime_ != null) ? this.animationResolutionTime_ : gridTimes[1]
        this.animationEndTime_ = utils.floorTime(this.endTime_, gridTime)
        timeDifference = this.animationEndTime_ - this.animationBeginTime_
      }
      // Time grid offset
      if (this.animationGridTimeOffset_ > 0) {
        offsetTime = this.animationBeginTime_ + this.animationGridTimeOffset_
        if (offsetTime - gridTimes[0] > this.defaultTime_) {
          offsetTime -= gridTimes[0]
        }
        this.animationBeginTime_ = offsetTime
        if (timeDifference != null) {
          this.animationEndTime_ = this.animationBeginTime_ + timeDifference
        }
      }
    } else {
      this.animationBeginTime_ = this.beginTime_
    }
    if (this.animationBeginTime_ != null) {
      defaultTime = Math.max(this.animationBeginTime_, defaultTime)
    }
    if (this.animationEndTime_ != null) {
      defaultTime = Math.min(this.animationEndTime_, defaultTime)
    }
    this.animationTimeIndex_ = 0
    if (this.animationResolutionTime_) {
      this.animationNumIntervals_ = Math.floor((this.animationEndTime_ - this.animationBeginTime_) / this.animationResolutionTime_) + 1
      for (i = 0; i < this.animationNumIntervals_; i++) {
        this.animationTimes_.push(this.animationBeginTime_ + i * this.animationResolutionTime_)
        if (this.animationTimes_[i] <= defaultTime) {
          animationTimeIndex = i
        }
      }
    } else {
      this.animationTimes_ = [this.animationBeginTime_, this.animationEndTime_]
    }
    this.setAnimationTime(this.animationTimes_[animationTimeIndex])
    if (this.initBeginTime_ === 0) {
      this.initBeginTime_ = this.beginTime_
    }
    if (this.initEndTime_ === 0) {
      this.initEndTime_ = this.endTime_
    }
    this.setAnimationLastRefreshed(Date.now())
    if ((this.continuePlay_) || ((this.config_['autoStart']) && (!this.config_['waitUntilLoaded']))) {
      this.continuePlay_ = false
      this.actionEvents.emitEvent('play')
    }
    if (!this.refreshStarted_) {
      this.refreshStarted_ = true
      this.handleRefresh_()
    }
  }

  /**
   * Performs periodic refreshing.
   */
  handleRefresh_ () {
    let self = this
    let refreshInterval = this.refreshInterval_
    if (!self.play_) {
      this.handleTimer_()
    }
    if (!this.isValidRefreshInterval()) {
      return
    }
    setTimeout(() => {
      self.handleRefresh_()
    }, refreshInterval)
  }

  /**
   * Handles animation timer.
   */
  handleTimer_ () {
    const self = this
    setTimeout(function run () {
      const currentTime = Date.now()
      let timeDelay
      let animationTimeIndex = 0
      if ((self.isValidRefreshInterval()) && ((currentTime - self.animationLastRefreshed_ > self.refreshInterval_) && (currentTime - self.timeCreatedAt_ > 0.5 * self.refreshInterval_))) {
        if (self.play_) {
          self.updateAnimationBackupTime()
          self.pause()
          self.continuePlay_ = true
        }
        self.actionEvents.emitEvent('refresh')
      } else if (self.play_) {
        timeDelay = self.frameRate_
        if (self.animationTimeIndex_ === self.animationTimes_.length - 2) {
          timeDelay += self.endTimeDelay_
        }
        if (self.animationTimeIndex_ < self.animationTimes_.length - 1) {
          animationTimeIndex = self.animationTimeIndex_ + 1
        }
        self.setAnimationTime(self.animationTimes_[animationTimeIndex])
        self.updateAnimationBackupTime()
        setTimeout(run, timeDelay)
      } else if (self.animationTime_ < self.animationBeginTime_) {
        self.setAnimationTime(self.animationBeginTime_)
      }
    }, 0)
  }

  /**
   * Sets animation time.
   * @param {number=} animationTime Animation time.
   */
  setAnimationTime (animationTime) {
    let i
    let animationTimeIndex = 0
    let newTime = (animationTime != null) ? animationTime : this.animationTime_
    // Check if animation is initialized correctly
    if (this.animationBeginTime_ > this.animationEndTime_) {
      return
    }
    for (i = 0; i < this.animationTimes_.length; i++) {
      if (newTime <= this.animationTimes_[i]) {
        animationTimeIndex = i
        break
      }
    }
    if (this.animationTimes_.length - 1 >= animationTimeIndex) {
      this.animationTime_ = this.animationTimes_[animationTimeIndex]
      this.animationTimeIndex_ = animationTimeIndex
      this.variableEvents.emitEvent('animationTime', [this.getAnimationTime()])
    }
  }

  /**
   * Gets animation time.
   * @returns {number} Animation time.
   */
  getAnimationTime () {
    return Math.min(this.animationTime_, this.animationEndTime_)
  }

  /**
   * Gets animation begin time.
   * @returns {number} Animation begin time.
   */
  getAnimationBeginTime () {
    return this.animationBeginTime_
  }

  /**
   * Gets animation end time.
   * @returns {number} Animation end time.
   */
  getAnimationEndTime () {
    return this.animationEndTime_
  }

  /**
   * Sets the last animation refresh time.
   * @param newTime Last animation refresh time.
   */
  setAnimationLastRefreshed (newTime) {
    // Todo: from configuration
    const waitTimeForNewImages = 5 * 60 * 1000
    this.animationLastRefreshed_ = newTime
    if (this.isValidRefreshInterval()) {
      this.animationLastRefreshed_ -= newTime % this.refreshInterval_
      if (this.refreshInterval_ > waitTimeForNewImages) {
        this.animationLastRefreshed_ += waitTimeForNewImages
      }
    }
  }

  /**
   * Gets animation resolution time.
   * @returns {number} Animation resolution time.
   */
  getAnimationResolutionTime () {
    return this.animationResolutionTime_
  }

  /**
   * Checks if autostart is currently waiting loading to be finished.
   * @returns {boolean} Waiting autostart.
   */
  isWaitingAutoStart () {
    return this.config_['autoStart'] && this.waitUntilLoaded_
  }

  /**
   * Gets the number of animation intervals.
   * @returns {number} The number of animation intervals.
   */
  getAnimationNumIntervals () {
    return this.animationNumIntervals_
  }

  /**
   * Gets the real-world creation time.
   * @returns {number} Real-world creation time.
   */
  getCreationTime () {
    return this.timeCreatedAt_
  }

  /**
   * Gets the current real-world time.
   * @returns {number} Current real-world time.
   */
  getCurrentTime () {
    return this.currentTime_
  }

  /**
   * Gets refresh interval.
   * @returns {number} Refresh interval.
   */
  getRefreshInterval () {
    return this.refreshInterval_
  }

  /**
   * Sets the current real-world time.
   * @param currentTime Current real-world time.
   */
  setCurrentTime (currentTime) {
    this.currentTime_ = currentTime
  }

  /**
   * Starts to play animation.
   */
  play () {
    this.waitUntilLoaded_ = false
    if (!this.play_) {
      this.play_ = true
      this.handleTimer_()
    }
  }

  /**
   * Pauses animation.
   */
  pause () {
    this.play_ = false
  }

  /**
   * Stops (pauses and rewinds) animation.
   */
  stop () {
    this.play_ = false
    this.setAnimationTime(this.animationBeginTime_)
  }

  /**
   * Moves to previous time frame.
   */
  previous () {
    let newTime
    let animationTimeIndex = this.animationTimeIndex_
    if (this.animationTimes_.length < 2) {
      return
    }
    if (animationTimeIndex > 0) {
      newTime = this.animationTimes_[animationTimeIndex - 1]
    } else {
      newTime = this.animationTimes_[this.animationTimes_.length - 1]
    }
    this.setAnimationTime(newTime)
    this.updateAnimationBackupTime()
  }

  /**
   * Moves to next time frame.
   */
  next () {
    let newTime
    let animationTimeIndex = this.animationTimeIndex_
    if (this.animationTimes_.length < 2) {
      return
    }
    if (animationTimeIndex < this.animationTimes_.length - 1) {
      newTime = this.animationTimes_[animationTimeIndex + 1]
    } else {
      newTime = this.animationTimes_[0]
    }
    this.setAnimationTime(newTime)
    this.updateAnimationBackupTime()
  }

  /**
   * Changes animation time.
   * @param {number} delta Time change.
   */
  moveAnimationTimeFrame (delta) {
    this.beginTime_ = this.initBeginTime_ + delta
    this.endTime_ = this.initEndTime_ + delta
    if (this.animationTime_ < this.animationBeginTime_) {
      this.setAnimationTime(this.animationBeginTime_)
    }
    this.createTimer()
  }

  /**
   * Sets animations frame rate.
   * @param {number} frameRate Frame rate.
   */
  setFrameRate (frameRate) {
    this.frameRate_ = frameRate
    this.play_ = false
  }

  /**
   * Sets animation grid time.
   * @param {number} gridTime Animation grid time.
   */
  setGridTime (gridTime) {
    this.animationGridTime_ = gridTime
    this.createTimer()
  }

  /**
   * Sets animation begin time.
   * @param {number} beginTime Animation begin time.
   */
  setBeginTime (beginTime) {
    this.beginTime_ = beginTime
    this.initBeginTime_ = 0
    this.createTimer()
  }

  /**
   * Sets animation end time.
   * @param {number} endTime Animation end time.
   */
  setEndTime (endTime) {
    this.endTime_ = endTime
    this.initEndTime_ = 0
    this.createTimer()
  }

  /**
   * Sets the time of first available datapoint
   * @param {number} firstDataPointTime first available datapoint time
   */
  setFirstDataPointTime (firstDataPointTime) {
    this.firstDataPointTime_ = firstDataPointTime
    this.createTimer()
  }

  /**
   * Sets the time of last available datapoint
   * @param {number} lastDataPointTime last available datapoint time
   */
  setLastDataPointTime (lastDataPointTime) {
    this.lastDataPointTime_ = lastDataPointTime
    this.createTimer()
  }
  /**
   * Sets time limits forced.
   * @param {boolean} timeLimitsForced Time limits forced.
   */
  setTimeLimitsForced (timeLimitsForced) {
    this.timeLimitsForced_ = timeLimitsForced
    this.createTimer()
  }

  /**
   * Gets time limits forced.
   * @returns {boolean} Time limits forced.
   */
  getTimeLimitsForced () {
    return this.timeLimitsForced_
  }

  /**
   * Sets animation resolution time.
   * @param resolutionTime Resolution time.
   */
  setResolutionTime (resolutionTime) {
    this.animationResolutionTime_ = resolutionTime
    this.createTimer()
  }

  /**
   * Sets animation default time.
   * @param defaultTime Default time.
   */
  setDefaultTime (defaultTime) {
    this.defaultTime_ = defaultTime
  }

  /**
   * Sets time grid offset from midnight.
   * @param gridTimeOffset {Number} Time grid offset.
   */
  setDayStartOffset (gridTimeOffset) {
    this.animationGridTimeOffset_ = gridTimeOffset
    this.createTimer()
  }

  /**
   * Sets animation time moments.
   * @param animationTimes {array} Animation time moments.
   */
  setAnimationTimes (animationTimes) {
    let i
    let numAnimationTimes = animationTimes.length
    let updateNeeded = (numAnimationTimes !== this.animationTimes_.length)
    let maxAnimationTime
    if (!updateNeeded) {
      for (i = 0; i < numAnimationTimes; i++) {
        if (this.animationTimes_[i] !== animationTimes[i]) {
          updateNeeded = true
          break
        }
      }
    }
    if (this.defaultTime_ < this.animationTimes_[0]) {
      this.defaultTime_ = this.animationTimes_[0]
    }
    maxAnimationTime = this.animationTimes_[numAnimationTimes - 1]
    if (this.defaultTime_ > maxAnimationTime) {
      this.defaultTime_ = maxAnimationTime
    }
    if (this.defaultTime_ < this.animationTimes_[0]) {
      this.defaultTime_ = this.animationTimes_[0]
    }
    maxAnimationTime = this.animationTimes_[numAnimationTimes - 1]
    if (this.defaultTime_ > maxAnimationTime) {
      this.defaultTime_ = maxAnimationTime
    }
    if (updateNeeded) {
      this.animationTimes_ = animationTimes
      this.setAnimationTime(isNumeric(this.animationTime_) ? this.animationTime_ : this.defaultTime_)
    }
  }

  /**
   * Gets animation times as an array.
   * @returns {Array|*} Animation times.
   */
  getAnimationTimes () {
    return this.animationTimes_
  }

  /**
   * Gets Time Configuration from Time model
   * @returns Array of time parameters.
   */
  getTimeConfiguration () {
    let config = {}
    config.beginTime = this.beginTime_
    config.endTime = this.endTime_
    config.firstDataPointTime = this.firstDataPointTime_
    config.lastDataPointTime = this.lastDataPointTime_
    config.resolutionTime = this.animationResolutionTime_
    return config
  }

  /**
   * Gets animation backup time.
   * @returns {number} Animation backup time.
   */
  getAnimationBackupTime () {
    return this.animationBackupTime_
  }

  /**
   * Updates animation backup time.
   * @param time {number} Timestamp of animation backup time.
   */
  updateAnimationBackupTime () {
    this.animationBackupTime_ = this.getAnimationTime()
  }

  /**
   * Check the refresh interval validity.
   */
  isValidRefreshInterval () {
    let refreshInterval = this.refreshInterval_
    return ((refreshInterval != null) && (typeof refreshInterval === 'number') && (refreshInterval > 0) && (refreshInterval <= constants.MAX_REFRESH_INTERVAL))
  }

  /**
   * Updates animation backup time.
   */
  resetAnimationBackupTime () {
    this.animationBackupTime_ = null
  }

  /**
   * Destroys current timer.
   */
  destroyTimer () {
    this.play_ = false
    this.variableEvents.removeAllListeners()
    this.actionEvents.removeAllListeners()
  }
}
