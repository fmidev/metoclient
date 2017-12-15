/**
 * @fileoverview Time model for animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import * as utils from '../utils'
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
    this.defaultTime_ = this.config_['defaultAnimationTime']
    this.endTimeDelay_ = this.config_['endTimeDelay']
    this.frameRate_ = this.config_['frameRate']
    this.refreshInterval_ = this.config_['refreshInterval']
    this.currentTime_ = Date.now()
    this.timeCreatedAt_ = this.currentTime_
    this.animationTime_ = null
    this.animationBeginTime_ = this.config_['beginTime']
    this.animationEndTime_ = this.config_['endTime']
    this.animationInitBeginTime_ = 0
    this.animationInitEndTime_ = 0
    this.animationNumIntervals_ = 0
    this.animationResolutionTime_ = this.config_['resolutionTime']
    this.animationTimes_ = []
    this.animationTimeIndex_ = 0
    this.animationGridTime_ = this.config_['gridTime']
    this.animationGridTimeOffset_ = this.config_['gridTimeOffset']
    this.play_ = false
    this.waitUntilLoaded_ = (this.config_['waitUntilLoaded'] != null) ? this.config_['waitUntilLoaded'] : false
  };

  /**
   * Defines a new timer.
   */
  createTimer () {
    let offsetTime
    let animationTimeIndex = 0
    let i

    if (this.config_['gridTime'] != null) {
      // Round initial animation time to previous tick
      this.animationBeginTime_ = utils.floorTime(this.beginTime_, this.animationGridTime_)
      // Time grid offset
      if (this.animationGridTimeOffset_ > 0) {
        offsetTime = this.animationBeginTime_ + this.animationGridTimeOffset_
        if (offsetTime - this.animationGridTime_ > this.defaultTime_) {
          offsetTime -= this.animationGridTime_
        }
        this.animationBeginTime_ = offsetTime
      }
    }

    if (this.animationResolutionTime_ != null) {
      this.animationNumIntervals_ = Math.floor((this.endTime_ - this.animationBeginTime_) / this.animationResolutionTime_) + 1
      this.animationEndTime_ = this.animationBeginTime_ + (this.animationNumIntervals_ - 1) * this.animationResolutionTime_
      this.defaultTime_ = Math.max(this.animationBeginTime_, this.defaultTime_)
      this.defaultTime_ = Math.min(this.animationEndTime_, this.defaultTime_)
      this.animationTimeIndex_ = 0
      for (i = 0; i < this.animationNumIntervals_; i++) {
        this.animationTimes_.push(this.animationBeginTime_ + i * this.animationResolutionTime_)
        if (this.animationTimes_[i] <= this.defaultTime_) {
          animationTimeIndex = i
        }
      }
      this.setAnimationTime(this.animationTimes_[animationTimeIndex])
    }
    if (this.animationInitBeginTime_ === 0) {
      this.animationInitBeginTime_ = this.animationBeginTime_
    }
    if (this.animationInitEndTime_ === 0) {
      this.animationInitEndTime_ = this.animationEndTime_
    }
    this.setAnimationLastRefreshed(Date.now())
    if ((this.config_['autoStart']) && (!this.config_['waitUntilLoaded'])) {
      this.actionEvents.emitEvent('play')
    }
  };

  /**
   * Starts animation timer.
   */
  startTimer () {
    const self = this
    setTimeout(function run () {
      const currentTime = Date.now()
      let timeDelay
      let animationTimeIndex = 1
      if ((currentTime - self.animationLastRefreshed_ > self.refreshInterval_) && (currentTime - self.timeCreatedAt_ > 0.5 * self.refreshInterval_)) {
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
        setTimeout(run, timeDelay)
      } else if (self.animationTime_ < self.animationBeginTime_) {
        self.setAnimationTime(self.animationBeginTime_)
      }
    }, 0)
  };

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
    for (i = 1; i < this.animationTimes_.length; i++) {
      if (newTime === this.animationTimes_[i]) {
        animationTimeIndex = i
        break
      } else if (newTime < this.animationTimes_[i]) {
        animationTimeIndex = i - 1
        break
      }
    }
    this.animationTime_ = this.animationTimes_[animationTimeIndex]
    this.animationTimeIndex_ = animationTimeIndex
    this.variableEvents.emitEvent('animationTime', [this.getAnimationTime()])
  };

  /**
   * Gets animation time.
   * @returns {number} Animation time.
   */
  getAnimationTime () {
    return Math.min(this.animationTime_, this.animationEndTime_)
  };

  /**
   * Gets animation begin time.
   * @returns {number} Animation begin time.
   */
  getAnimationBeginTime () {
    return this.animationBeginTime_
  };

  /**
   * Gets animation end time.
   * @returns {number} Animation end time.
   */
  getAnimationEndTime () {
    return this.animationEndTime_
  };

  /**
   * Sets the last animation refresh time.
   * @param newTime Last animation refresh time.
   */
  setAnimationLastRefreshed (newTime) {
    // Todo: from configuration
    const waitTimeForNewImages = 5 * 60 * 1000
    this.animationLastRefreshed_ = newTime - newTime % this.refreshInterval_
    if (this.refreshInterval_ > waitTimeForNewImages) {
      this.animationLastRefreshed_ += waitTimeForNewImages
    }
  };

  /**
   * Gets animation resolution time.
   * @returns {number} Animation resolution time.
   */
  getAnimationResolutionTime () {
    return this.animationResolutionTime_
  };

  /**
   * Checks if autostart is currently waiting loading to be finished.
   * @returns {boolean} Waiting autostart.
   */
  isWaitingAutoStart () {
    return this.config_['autoStart'] && this.waitUntilLoaded_
  };

  /**
   * Gets the number of animation intervals.
   * @returns {number} The number of animation intervals.
   */
  getAnimationNumIntervals () {
    return this.animationNumIntervals_
  };

  /**
   * Gets the real-world creation time.
   * @returns {number} Real-world creation time.
   */
  getCreationTime () {
    return this.timeCreatedAt_
  };

  /**
   * Gets the current real-world time.
   * @returns {number} Current real-world time.
   */
  getCurrentTime () {
    return this.currentTime_
  };

  /**
   * Gets refresh interval.
   * @returns {number} Refresh interval.
   */
  getRefreshInterval () {
    return this.refreshInterval_
  };

  /**
   * Sets the current real-world time.
   * @param currentTime Current real-world time.
   */
  setCurrentTime (currentTime) {
    this.currentTime_ = currentTime
  };

  /**
   * Starts to play animation.
   */
  play () {
    this.play_ = true
    this.waitUntilLoaded_ = false
    this.startTimer()
  };

  /**
   * Pauses animation.
   */
  pause () {
    this.play_ = false
  };

  /**
   * Stops (pauses and rewinds) animation.
   */
  stop () {
    this.play_ = false
    this.setAnimationTime(this.animationBeginTime_)
  };

  /**
   * Moves to previous time frame.
   */
  previous () {
    let newTime
    let animationTimeIndex = this.animationTimeIndex_
    if (animationTimeIndex > 1) {
      newTime = this.animationTimes_[animationTimeIndex - 1]
    } else {
      newTime = this.animationTimes_[this.animationTimes_.length - 1]
    }
    this.setAnimationTime(newTime)
  };

  /**
   * Moves to next time frame.
   */
  next () {
    let newTime
    let animationTimeIndex = this.animationTimeIndex_
    if (animationTimeIndex < this.animationTimes_.length - 1) {
      newTime = this.animationTimes_[animationTimeIndex + 1]
    } else {
      newTime = this.animationTimes_[0]
    }
    this.setAnimationTime(newTime)
  };

  /**
   * Changes animation time.
   * @param {number} delta Time change.
   */
  moveAnimationTimeFrame (delta) {
    this.animationBeginTime_ = this.animationInitBeginTime_ + delta
    this.animationEndTime_ = this.animationInitEndTime_ + delta
    if (this.animationTime_ < this.animationBeginTime_) {
      this.setAnimationTime(this.animationBeginTime_)
    }
  };

  /**
   * Sets animations frame rate.
   * @param {number} frameRate Frame rate.
   */
  setFrameRate (frameRate) {
    this.frameRate_ = frameRate
    this.play_ = false
  };

  /**
   * Sets animation begin time.
   * @param {number} beginTime Animation begin time.
   */
  setBeginTime (beginTime) {
    this.beginTime_ = beginTime
    this.animationInitBeginTime_ = 0
    this.createTimer()
  };

  /**
   * Sets animation end time.
   * @param {number} endTime Animation end time.
   */
  setEndTime (endTime) {
    this.endTime_ = endTime
    this.animationInitEndTime_ = 0
    this.createTimer()
  };

  /**
   * Sets animation resolution time.
   * @param resolutionTime Resolution time.
   */
  setResolutionTime (resolutionTime) {
    this.animationResolutionTime_ = resolutionTime
    this.createTimer()
  };

  /**
   * Sets time grid offset from midnight.
   * @param gridTimeOffset {Number} Time grid offset.
   */
  setDayStartOffset (gridTimeOffset) {
    this.animationGridTimeOffset_ = gridTimeOffset
    this.createTimer()
  };

  /**
   * Sets animation time moments.
   * @param animationTimes {array} Animation time moments.
   */
  setAnimationTimes (animationTimes) {
    let i
    let numAnimationTimes = animationTimes.length
    let updateNeeded = (numAnimationTimes !== this.animationTimes_.length)
    if (!updateNeeded) {
      for (i = 0; i < numAnimationTimes; i++) {
        if (this.animationTimes_[i] !== animationTimes[i]) {
          updateNeeded = true
          break
        }
      }
    }
    if (updateNeeded) {
      this.animationTimes_ = animationTimes
      this.setAnimationTime(isNumeric(this.animationTime_) ? this.animationTime_ : this.defaultTime_)
    }
  }

  /**
   * Destroys current timer.
   */
  destroyTimer () {
    this.play_ = false
    this.variableEvents.removeAllListeners()
    this.actionEvents.removeAllListeners()
  };
}
