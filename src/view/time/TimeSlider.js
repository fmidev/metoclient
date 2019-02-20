/**
 * @fileoverview Implementation of time view.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import EventEmitter from 'wolfy87-eventemitter'
import empty from 'empty-element'
import listen from 'good-listener'
import 'core-js/fn/array/from'
import 'core-js/fn/number/parse-int'
import elementResizeDetectorMaker from 'element-resize-detector'
import TimeFrame from './TimeFrame'
import * as constants from '../../constants'
import * as utils from '../../utils'
import moment from 'moment-timezone'
import fi from 'moment/locale/fi'
import sv from 'moment/locale/sv'
import uk from 'moment/locale/uk'

export default class TimeSlider {
  /**
   * Creates an instance of TimeSlider.
   * @param {any} config
   * @param {any} container
   * @param {Object=} callbacks Callback functions for time events.
   *
   * @memberOf TimeSlider
   */
  constructor (config, container, callbacks) {
    this.container_ = container
    this.config_ = config
    this.callbacks_ = callbacks
    this.paper_ = null
    this.visualPointer_ = null
    this.frameWidth_ = 0
    this.playButton_ = null
    this.frameStatusRects_ = []
    this.animationTime_ = null
    this.animationPlay_ = false
    this.beginTime_ = config['beginTime']
    this.endTime_ = config['endTime']
    this.resolutionTime_ = config['resolutionTime']
    this.frames_ = []
    this.locale_ = config['locale']
    this.timeZone_ = config['timeZone']
    this.timeZoneLabel_ = config['timeZoneLabel']
    this.useLayerMoments_ = config['useLayerMoments']
    this.previousTickTextTop_ = Number.POSITIVE_INFINITY
    this.previousTickTextRight_ = Number.NEGATIVE_INFINITY
    this.previousTickTextBottom_ = Number.NEGATIVE_INFINITY
    this.previousTickTextLeft_ = Number.POSITIVE_INFINITY
    this.previousTickValue_ = null
    this.previousTickIndex_ = -1
    this.mouseListeners_ = []
    this.dragging_ = false
    this.actionEvents = new EventEmitter()
    this.variableEvents = new EventEmitter()
    this.resizeDetector = elementResizeDetectorMaker()
  }

  /**
   * Creates a new time slider.
   * @param {Array} moments Time values for the slider.
   */
  createTimeSlider (moments) {
    if ((moments == null) || (moments.length === 0)) {
      this.clear()
      return
    }
    this.clear()
    this.createContainers()
    this.createFrames(moments)
    this.createIndicators()
    this.createTicks()
    this.createPointer()
    if (this.animationTime_ != null) {
      this.updatePointer(this.animationTime_)
    }
    if ((this.callbacks_ != null) && (typeof this.callbacks_['timeSliderCreated'] === 'function')) {
      this.callbacks_['timeSliderCreated'](moments)
    }
  }

  /**
   *
   *
   * @param {any} direction
   *
   * @memberOf TimeSlider
   */
  step (direction) {
    if (direction > 0) {
      this.actionEvents.emitEvent('next')
    } else if (direction < 0) {
      this.actionEvents.emitEvent('previous')
    }
  }

  /**
   *
   *
   *
   * @memberOf TimeSlider
   */
  createContainers () {
    let self = this
    let clickableContainer = document.createElement('div')
    clickableContainer.classList.add(TimeSlider.CLICKABLE_CLASS)

    clickableContainer.appendChild(this.createPreMargin())
    clickableContainer.appendChild(this.createPreTools())

    let momentsContainer = document.createElement('div')
    momentsContainer.classList.add(TimeSlider.FRAMES_CONTAINER_CLASS)
    if (this.config_['mouseWheelTimeStep']) {
      this.mouseListeners_.push(listen(momentsContainer, 'wheel', event => {
        self.step(event.deltaY)
        event.preventDefault()
      }))
    }
    clickableContainer.appendChild(momentsContainer)

    clickableContainer.appendChild(this.createPostTools())

    let postMargin = document.createElement('div')
    postMargin.classList.add(TimeSlider.POST_MARGIN_CLASS)
    this.mouseListeners_.push(listen(postMargin, 'click', event => {
      self.step(TimeSlider.FORWARDS)
    }))
    clickableContainer.appendChild(postMargin)

    clickableContainer.appendChild(this.createTimeZoneLabel())

    this.container_.appendChild(clickableContainer)

    this.container_.classList.add('noselect')

    this.mouseListeners_.push(listen(this.container_, 'mouseup', event => {
      self.setDragging(false)
    }))
    this.mouseListeners_.push(listen(this.container_, 'touchend', event => {
      self.setDragging(false)
    }))

    this.resizeDetector.listenTo(this.container_, function (element) {
      self.createTicks()
    })
  }

  /**
   *
   *
   * @returns
   *
   * @memberOf TimeSlider
   */
  createPreMargin () {
    let self = this
    let preMargin = document.createElement('div')
    preMargin.classList.add(TimeSlider.PRE_MARGIN_CLASS)
    this.mouseListeners_.push(listen(preMargin, 'click', () => {
      self.step(TimeSlider.BACKWARDS)
    }))
    return preMargin
  }

  /**
   *
   *
   * @returns
   *
   * @memberOf TimeSlider
   */
  createPreTools () {
    let self = this
    let preTools = document.createElement('div')
    preTools.classList.add(TimeSlider.PRE_TOOLS_CLASS)

    let playButton = document.createElement('div')
    playButton.classList.add(TimeSlider.PLAY_BUTTON_CLASS)
    if (this.animationPlay_) {
      playButton.classList.add(TimeSlider.PLAYING_CLASS)
    }
    this.mouseListeners_.push(listen(playButton, 'click', () => {
      self.animationPlay_ = !self.animationPlay_
      self.variableEvents.emitEvent('animationPlay', [self.animationPlay_])
    }))
    this.playButton_ = playButton

    preTools.appendChild(playButton)
    return preTools
  }

  /**
   *
   *
   * @returns
   *
   * @memberOf TimeSlider
   */
  createPostTools () {
    let self = this
    let postTools = document.createElement('div')
    postTools.classList.add(TimeSlider.POST_TOOLS_CLASS)

    let postButton = document.createElement('div')
    postButton.classList.add(TimeSlider.POST_BUTTON_CLASS)
    postTools.appendChild(postButton)

    this.mouseListeners_.push(listen(postButton, 'click', () => {
      if (this.config_['showTimeSliderMenu']) {
        timeStepMenu.classList.toggle('visible-menu')
      } else if ((self.callbacks_ != null) && (typeof self.callbacks_['toolClicked'] === 'function')) {
        this.callbacks_['toolClicked']('timeslider-right-button')
      }
    }))

    if (!this.config_['showTimeSliderMenu']) {
      return postTools
    }

    const timeStepMenu = utils['createTimeMenu']({
      id: TimeSlider.MENU_CLASS,
      items: [{
        title: this.config_.timeStepText,
        id: TimeSlider.TIMESTEP_CLASS,
        resolutionTime: this.config_.modifiedResolutionTime,
        beginPlace: ((this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.resolutionTime_) - ((this.config_.lastDataPointTime - this.beginTime_) / this.resolutionTime_),
        endPlace: (this.endTime_ - this.config_.firstDataPointTime) / this.resolutionTime_,
        type: 'stepButtons',
        callback: (e) => {
          let step = e.target.innerHTML
          switch (step) {
            case '5min':
              step = 0
              break
            case '15min':
              step = 1
              break
            case '30min':
              step = 2
              break
            case '1h':
              step = 3
              break
            case '3h':
              step = 4
              break
            case '6h':
              step = 5
              break
            case '12h':
              step = 6
              break
            case '24h':
              step = 7
          }

          e.target.classList.add(TimeSlider.TIMESTEP_BUTTON_CLASS)
          const value = this.container_.getElementsByClassName(TimeSlider.BEGIN_TIME_CLASS)[0].value
          this.config_.modifiedResolutionTime = constants.AVAILABLE_TIMESTEPS[step]
          this.variableEvents.emitEvent('timeStep', [this.config_.modifiedResolutionTime])
          if ((this.config_.firstDataPointTime % this.config_.modifiedResolutionTime) % this.resolutionTime_ === 0) {
            if (this.config_.modifiedResolutionTime > constants.AVAILABLE_TIMESTEPS[3]) {
              this.beginTime_ = Math.ceil((this.config_.firstDataPointTime + (this.resolutionTime_ * value)) / constants.AVAILABLE_TIMESTEPS[3]) * constants.AVAILABLE_TIMESTEPS[3]
              this.variableEvents.emitEvent('beginTime', [this.beginTime_])
            }
            this.beginTime_ = Math.ceil((this.config_.firstDataPointTime + (this.resolutionTime_ * value)) / this.config_.modifiedResolutionTime) * this.config_.modifiedResolutionTime
            this.variableEvents.emitEvent('beginTime', [this.beginTime_])
          } else {
            this.beginTime_ = this.config_.firstDataPointTime + (this.resolutionTime_ * value)
            this.variableEvents.emitEvent('beginTime', [this.beginTime_])
          }
        }
      }, {
        title: this.config_.beginTimeText,
        id: TimeSlider.BEGIN_TIME_CLASS,
        size: (this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.resolutionTime_,
        resolutionTime: this.config_.modifiedResolutionTime,
        beginPlace: ((this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.resolutionTime_) - ((this.config_.lastDataPointTime - this.beginTime_) / this.resolutionTime_),
        endPlace: (this.endTime_ - this.config_.firstDataPointTime) / this.resolutionTime_,
        type: 'range',
        callback: () => {
          const value = this.container_.getElementsByClassName(TimeSlider.BEGIN_TIME_CLASS)[0].value
          this.variableEvents.emitEvent('timeStep', [this.config_.modifiedResolutionTime])
          if ((this.config_.firstDataPointTime % this.config_.modifiedResolutionTime) % this.resolutionTime_ === 0) {
            if (this.config_.modifiedResolutionTime > constants.AVAILABLE_TIMESTEPS[3]) {
              this.beginTime_ = Math.ceil((this.config_.firstDataPointTime + (this.resolutionTime_ * value)) / constants.AVAILABLE_TIMESTEPS[3]) * constants.AVAILABLE_TIMESTEPS[3]
              this.variableEvents.emitEvent('beginTime', [this.beginTime_])
            }
            this.beginTime_ = Math.ceil((this.config_.firstDataPointTime + (this.resolutionTime_ * value)) / this.config_.modifiedResolutionTime) * this.config_.modifiedResolutionTime
            this.variableEvents.emitEvent('beginTime', [this.beginTime_])
          } else {
            this.beginTime_ = this.config_.firstDataPointTime + (this.resolutionTime_ * value)
            this.variableEvents.emitEvent('beginTime', [this.beginTime_])
          }
        }
      }, {
        title: this.config_.endTimeText,
        id: TimeSlider.END_TIME_CLASS,
        size: (this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.resolutionTime_,
        resolutionTime: this.config_.modifiedResolutionTime,
        beginPlace: ((this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.resolutionTime_) - ((this.config_.lastDataPointTime - this.beginTime_) / this.resolutionTime_),
        endPlace: (this.endTime_ - this.config_.firstDataPointTime) / this.resolutionTime_,
        type: 'range',
        callback: () => {
          const value = this.container_.getElementsByClassName(TimeSlider.END_TIME_CLASS)[0].value
          this.variableEvents.emitEvent('timeStep', [this.config_.modifiedResolutionTime])
          if ((this.config_.firstDataPointTime % this.config_.modifiedResolutionTime) % this.resolutionTime_ === 0) {
            if (this.config_.modifiedResolutionTime > constants.AVAILABLE_TIMESTEPS[3]) {
              this.endTime_ = Math.ceil((this.config_.firstDataPointTime + (this.resolutionTime_ * value)) / constants.AVAILABLE_TIMESTEPS[3]) * constants.AVAILABLE_TIMESTEPS[3]
              this.variableEvents.emitEvent('endTime', [this.endTime_])
            }
            this.endTime_ = Math.ceil((this.config_.firstDataPointTime + (this.resolutionTime_ * value)) / this.config_.modifiedResolutionTime) * this.config_.modifiedResolutionTime
            this.variableEvents.emitEvent('endTime', [this.endTime_])
          } else {
            this.endTime_ = this.config_.firstDataPointTime + (this.resolutionTime_ * value)
            this.variableEvents.emitEvent('endTime', [this.endTime_])
          }
        }
      }]
    })
    postButton.appendChild(timeStepMenu)

    function modifyOffset () {
      let newPoint, newPlace, siblings, k, width, sibling, outputTag, timestamp, hours, minutes, day, month
      if (this.offsetWidth === 0) {
        width = 466
      } else {
        width = (this.offsetWidth - 16)
      }
      newPoint = (this.value - this.getAttribute('min')) / (this.getAttribute('max') - this.getAttribute('min'))
      newPlace = width * newPoint - 56
      siblings = this.parentNode.childNodes
      for (var i = 0; i < siblings.length; i++) {
        sibling = siblings[i]
        if (sibling.id === this.id) {
          k = true
        }
        if ((k) && (sibling.nodeName === 'OUTPUT')) {
          outputTag = sibling
        }
      }
      timestamp = new Date(self.config_.firstDataPointTime + (self.resolutionTime_ * this.value))
      day = timestamp.getDate()
      month = timestamp.getMonth() + 1
      hours = '0' + timestamp.getHours()
      hours = hours.substr(-2)
      minutes = '0' + timestamp.getMinutes()
      minutes = minutes.substr(-2)
      outputTag.style.left = newPlace + 'px'
      outputTag.innerHTML = day + '.' + month + '. ' + hours + ':' + minutes
    }

    function modifyInputs () {
      let inputs = timeStepMenu.getElementsByTagName('input')
      for (let i = 0; i < inputs.length; i++) {
        if (inputs[i].getAttribute('type') === 'range') {
          inputs[i].onchange = modifyOffset
          inputs[i].oninput = modifyOffset
          if ('fireEvent' in inputs[i]) {
            inputs[i].fireEvent('oninput')
          } else {
            var evt = document.createEvent('HTMLEvents')
            evt.initEvent('change', false, true)
            inputs[i].dispatchEvent(evt)
          }
        }
      }
    }
    modifyInputs()
    return postTools
  }

  /**
   *
   *
   * @returns
   *
   * @memberOf TimeSlider
   */
  createTimeZoneLabel () {
    let timezoneLabel = document.createElement('div')
    timezoneLabel.innerHTML = this.timeZoneLabel_
    timezoneLabel.classList.add(TimeSlider.TIMEZONE_LABEL_CLASS)
    return timezoneLabel
  }

  /**
   *
   *
   * @param {any} moments
   *
   * @memberOf TimeSlider
   */
  createFrames (moments) {
    let i
    let timePeriod
    const numMoments = moments.length
    const currentTime = Date.now()
    let beginTime
    let endTime
    let type
    let weight
    let timeFrame
    let framesContainer = this.container_.getElementsByClassName(TimeSlider.FRAMES_CONTAINER_CLASS)[0]
    empty(framesContainer)
    if (numMoments < 2) {
      return
    }
    timePeriod = moments[numMoments - 1] - moments[0]

    for (i = 0; i < numMoments; i++) {
      beginTime = (i === 0) ? 2 * moments[0] - moments[1] : moments[i - 1]
      endTime = moments[i]
      type = (moments[i] <= currentTime) ? TimeFrame.HISTORY : TimeFrame.FUTURE
      weight = 100 * (endTime - beginTime) / timePeriod
      timeFrame = this.createFrame(beginTime, endTime, type, weight)
      framesContainer.appendChild(timeFrame['element'])
      this.frames_.push(timeFrame)
    }
  }

  /**
   *
   *
   * @param {any} beginTime
   * @param {any} endTime
   * @param {any} type
   * @param {any} weight
   * @returns
   *
   * @memberOf TimeSlider
   */
  createFrame (beginTime, endTime, type, weight) {
    let self = this
    let timeFrame = new TimeFrame({
      'beginTime': beginTime,
      'endTime': endTime,
      'type': type,
      'weight': weight
    })
    this.mouseListeners_.push(listen(timeFrame.element, 'click', (event) => {
      self.step(timeFrame['endTime'] - self.animationTime_)
    }))
    this.mouseListeners_.push(listen(timeFrame.dragListenerElement, 'mousemove', event => {
      if (!self.dragging_) {
        return
      }
      self.variableEvents.emitEvent('animationTime', [timeFrame['endTime']])
    }))

    return timeFrame
  }

  /**
   *
   *
   *
   * @memberOf TimeSlider
   */
  createIndicators () {
    this.frames_.forEach((frame, index, array) => {
      let indicator = document.createElement('div')
      indicator.classList.add(TimeSlider.INDICATOR_CLASS)
      if (index === 0) {
        indicator.classList.add('first')
      } else if (index === array.length - 1) {
        indicator.classList.add('last')
      }
      frame.element.appendChild(indicator)
    })
  }

  /**
   *
   *
   *
   * @memberOf TimeSlider
   */
  createTicks () {
    let self = this
    let tick
    let maxTextWidth = 0
    let newTextWidth
    let useTimeStep = false
    let timeStep
    let framesContainer
    this.previousTickTextRight_ = Number.NEGATIVE_INFINITY

    let clearFrame = (frame) => {
      let removeChildrenByClass = (className) => {
        Array.from(frame.element.getElementsByClassName(className)).forEach(element => {
          element.parentElement.removeChild(element)
        })
      }
      removeChildrenByClass(TimeSlider.FRAME_TEXT_WRAPPER_CLASS)
      removeChildrenByClass(TimeSlider.FRAME_TICK_CLASS)
    }

    this.frames_.forEach((frame, index, frames) => {
      let tickText
      let textWrapperElement
      let textElement

      clearFrame(frame)

      textWrapperElement = document.createElement('div')
      textWrapperElement.classList.add(TimeSlider.FRAME_TEXT_WRAPPER_CLASS)

      textElement = document.createElement('span')
      textElement.classList.add(TimeSlider.FRAME_TEXT_CLASS)
      textElement.classList.add(constants.NO_SELECT_CLASS)
      tickText = this.getTickText(frame['endTime'])
      textElement.textContent = tickText['content']
      frame['useDateFormat'] = tickText['useDateFormat']

      textWrapperElement.appendChild(textElement)

      frame.element.appendChild(textWrapperElement)
      frame.element.style.display = 'none'
    })

    // Separate loops to prevent accessing textElement width before it is available
    this.frames_.forEach((frame, index, frames) => {
      let clientRect
      let localTimeStep
      let textElement
      let nextIndex = index + 1
      frame.element.style.display = ''
      if (nextIndex === frames.length) {
        return
      }
      textElement = frame.element.querySelector('span.' + TimeSlider.FRAME_TEXT_CLASS)
      clientRect = textElement.getBoundingClientRect()
      if (maxTextWidth < clientRect['width']) {
        maxTextWidth = clientRect['width']
      }

      localTimeStep = frames[nextIndex]['endTime'] - frame['endTime']
      if (timeStep == null) {
        useTimeStep = true
        timeStep = localTimeStep
      } else if ((useTimeStep) && (localTimeStep !== timeStep)) {
        useTimeStep = false
      }
    })
    // Prevent common tick asynchrony
    if (useTimeStep) {
      timeStep *= 2
    }

    newTextWidth = Math.round(maxTextWidth) + 'px'
    Array.from(document.getElementsByClassName(TimeSlider.FRAME_TEXT_WRAPPER_CLASS)).forEach(element => {
      element.style.width = newTextWidth
    })

    let createTick = (frame, index, rect, endTime) => {
      self.previousTickTextTop_ = rect.top
      self.previousTickTextRight_ = rect.right
      self.previousTickTextBottom_ = rect.bottom
      self.previousTickTextLeft_ = rect.left
      self.previousTickValue_ = endTime
      self.previousTickIndex_ = index
      tick = document.createElement('div')
      tick.classList.add(TimeSlider.FRAME_TICK_CLASS)
      tick.classList.add(TimeSlider.HIDDEN_CLASS)
      frame.element.appendChild(tick)
    }

    framesContainer = Array.from(document.getElementsByClassName(TimeSlider.FRAMES_CONTAINER_CLASS))
    if (framesContainer.length > 0) {
      framesContainer = framesContainer[0].getBoundingClientRect()
    }

    this.frames_.forEach((frame, index, frames) => {
      let textWrapper
      let clientRect
      let textElementArray = Array.from(frame.element.getElementsByClassName(TimeSlider.FRAME_TEXT_WRAPPER_CLASS))
      if (textElementArray.length === 0) {
        return
      }
      textWrapper = textElementArray.shift()
      clientRect = textWrapper.getBoundingClientRect()

      // Prevent text overlapping, favor full hours
      if ((framesContainer.length === 0) || (framesContainer.left <= clientRect.left &&
          framesContainer.right >= clientRect.right &&
          framesContainer.top <= clientRect.top &&
          framesContainer.bottom >= clientRect.bottom)) {
        if (self.previousTickTextRight_ < clientRect.left ||
          self.previousTickTextLeft_ > clientRect.right ||
          self.previousTickTextBottom_ < clientRect.top ||
          self.previousTickTextTop_ > clientRect.bottom) {
          createTick(frame, index, clientRect, frame['endTime'])
        } else if ((index > 0) && (self.previousTickIndex_ >= 0) && (((frames[self.previousTickIndex_] != null) && (((frame['endTime'] % (constants.ONE_HOUR) === 0) && (frames[self.previousTickIndex_]['endTime'] % (constants.ONE_HOUR) !== 0)) || ((useTimeStep) && ((frame['endTime'] % (constants.ONE_HOUR)) % timeStep === 0) && ((frames[self.previousTickIndex_]['endTime'] % (constants.ONE_HOUR)) % timeStep !== 0)) || ((frame['endTime'] % (constants.ONE_HOUR) === 0) && (frames[self.previousTickIndex_]['endTime'] % (constants.ONE_HOUR) === 0) && (moment(frame['endTime']).tz(self.timeZone_).hour() % 2 === 0) && (moment(frames[self.previousTickIndex_]['endTime']).tz(self.timeZone_).hour() % 2 !== 0))) && (!frames[self.previousTickIndex_]['useDateFormat'])) || (frame['useDateFormat']))) {
          clearFrame(frames[self.previousTickIndex_])
          createTick(frame, index, clientRect, frame['endTime'])
        } else {
          frame.element.removeChild(textWrapper)
        }
      } else {
        frame.element.removeChild(textWrapper)
      }
    })

    Array.from(document.getElementsByClassName(TimeSlider.FRAME_TICK_CLASS)).forEach(element => {
      element.classList.remove(TimeSlider.HIDDEN_CLASS)
    })
  }

  /**
   *
   *
   *
   * @memberOf TimeSlider
   */
  createPointer () {
    let self = this
    let pointer = document.createElement('div')
    pointer.classList.add(TimeSlider.POINTER_CLASS)

    let textContainer = document.createElement('div')
    textContainer.classList.add(TimeSlider.POINTER_WRAPPER_CLASS)

    let textItem = document.createElement('span')
    textItem.classList.add(TimeSlider.POINTER_TEXT_CLASS)
    textItem.classList.add('noselect')
    textItem.innerHTML = ''

    textContainer.appendChild(textItem)
    pointer.appendChild(textContainer)

    let handle = document.createElement('div')
    handle.classList.add(TimeSlider.POINTER_HANDLE_CLASS)
    pointer.appendChild(handle)
    this.mouseListeners_.push(listen(pointer, 'mousedown', e => {
      self.setDragging(true)
    }))
    this.mouseListeners_.push(listen(pointer, 'touchstart', e => {
      self.setDragging(true)
    }))
    this.visualPointer_ = pointer
  }

  /**
   * Sets an animation time.
   * @param {string} animationTime Animation time.
   */
  setAnimationTime (animationTime) {
    this.animationTime_ = animationTime
    this.updatePointer(animationTime)
  }

  /**
   * Updates pointer text and location on the time slider.
   * @param animationTime Time value.
   */
  updatePointer (animationTime) {
    if (this.visualPointer_ == null) {
      return
    }
    let numFrames = this.frames_.length
    let i
    let index
    let needsUpdate
    for (i = 0; i < numFrames; i++) {
      if (animationTime <= this.frames_[i]['endTime']) {
        index = i
        break
      }
    }
    if (index != null) {
      if (this.visualPointer_.parentElement == null) {
        needsUpdate = true
      } else if (Number.parseInt(this.visualPointer_.parentElement.dataset['time']) !== animationTime) {
        this.visualPointer_.parentElement.removeChild(this.visualPointer_)
        needsUpdate = true
      }
      if (needsUpdate) {
        this.frames_[index].element.appendChild(this.visualPointer_)
        Array.from(this.visualPointer_.getElementsByClassName(TimeSlider.POINTER_TEXT_CLASS)).forEach(textElement => {
          textElement.innerHTML = this.getTickText(this.frames_[index]['endTime'], false)['content']
        })
      }
    }
  }

  /**
   * Updates loading state visualization
   * @param {Object} numIntervalItems Loader counter information for intervals.
   */
  updateTimeLoaderVis (numIntervalItems) {
    if (!this.config_['showTimeSlider']) {
      return
    }
    let numIntervals = numIntervalItems.length
    let creationNeeded = (numIntervals !== this.frames_.length)
    let i
    let moments = []
    if (!creationNeeded) {
      for (i = 0; i < numIntervals; i++) {
        if (numIntervalItems[i]['endTime'] !== this.frames_[i]['endTime']) {
          creationNeeded = true
          break
        }
      }
    }
    if (creationNeeded) {
      for (i = 0; i < numIntervals; i++) {
        moments.push(numIntervalItems[i]['endTime'])
      }
      this.createTimeSlider(moments)
    }
    this.frames_.forEach((frame, index) => {
      Array.from(frame.element.getElementsByClassName(TimeSlider.INDICATOR_CLASS)).forEach(indicatorElement => {
        let numIntervals
        let i
        let time
        let elementTime
        let endTime
        if ((indicatorElement.parentElement != null) && (indicatorElement.parentElement.dataset != null)) {
          elementTime = indicatorElement.parentElement.dataset.time
        }
        if (elementTime == null) {
          return
        }
        time = parseInt(elementTime)
        if (time != null) {
          numIntervals = numIntervalItems.length
          for (i = 0; i < numIntervals; i++) {
            endTime = numIntervalItems[i].endTime
            if ((endTime != null) && (endTime === time)) {
              indicatorElement.setAttribute('data-status', numIntervalItems[i].status)
              break
            }
          }
        }
      })
    })
  }

  /**
   * Enables or disables pointer dragging.
   * @param {boolean} dragging True if pointer dragging is enabled.
   */
  setDragging (dragging) {
    this.dragging_ = dragging
    let pointerEvents = dragging ? 'auto' : 'none'
    Array.from(document.getElementsByClassName(TimeSlider.DRAG_LISTENER_CLASS)).forEach(element => {
      element.style.pointerEvents = pointerEvents
    })
  }

  /**
   * Turns animation play on or off.
   * @param {boolean} animationPlay True if play is turned on.
   */
  setAnimationPlay (animationPlay) {
    this.animationPlay_ = animationPlay
    if (this.animationPlay_) {
      this.playButton_.classList.add(TimeSlider.PLAYING_CLASS)
    } else {
      this.playButton_.classList.remove(TimeSlider.PLAYING_CLASS)
    }
  }

  /**
   * Sets a time zone.
   * @param {string} timeZone Time zone.
   */
  setTimeZone (timeZone) {
    let self = this
    this.timeZone_ = timeZone
    this.frames_.forEach(frame => {
      let tickText = self.getTickText(frame['endTime'])
      let textElement = frame.element.getElementsByClassName(TimeSlider.FRAME_TEXT_CLASS)
      if (textElement.length > 0) {
        textElement[0].textContent = tickText['content']
      }
    })
  }

  /**
   * Sets a time zone.
   * @param {string} timeZoneLabel Time zone label.
   */
  setTimeZoneLabel (timeZoneLabel) {
    let self = this
    this.timeZoneLabel_ = timeZoneLabel
    Array.from(this.container_.getElementsByClassName(TimeSlider.TIMEZONE_LABEL_CLASS)).forEach(timeZoneLabelElement => {
      timeZoneLabelElement.innerHTML = self.timeZoneLabel_
    })
  }

  /**
   * Sets callbacks.
   * @param {Object=} callbacks Callback functions for time events.
   */
  setCallbacks (callbacks) {
    this.callbacks_ = callbacks
  }

  /**
   * Generate text presentation of the given time.
   * @param {number} tickTime Time value.
   * @param {boolean} showDate Show date information.
   * @return {string} Generated text presentation.
   */
  getTickText (tickTime, showDate = true) {
    let zTime
    let numFrames
    let i
    let frameTime
    let prevTime
    let zPrevTime
    let day
    let year
    let currentMoment
    let format = 'HH:mm'
    const dateFormat = 'dd D.M.'
    let useDateFormat = false
    let beginTime = (this.frames_.length > 0) ? this.frames_[0]['endTime'] : Number.NEGATIVE_INFINITY
    if (beginTime == null) {
      return ''
    }
    if (tickTime < beginTime) {
      tickTime = beginTime
    }
    moment.locale(this.locale_)
    zTime = moment(tickTime).tz(this.timeZone_)
    day = zTime.dayOfYear()
    year = zTime.year()
    if (showDate) {
      numFrames = this.frames_.length
      for (i = 0; i < numFrames; i++) {
        frameTime = this.frames_[i]['endTime']
        if (frameTime >= tickTime) {
          break
        }
        if (Array.from(this.frames_[i].element.getElementsByClassName(TimeSlider.FRAME_TEXT_WRAPPER_CLASS)).length > 0) {
          prevTime = frameTime
        }
      }
      currentMoment = moment().tz(this.timeZone_)
      if (prevTime != null) {
        zPrevTime = moment(prevTime).tz(this.timeZone_)
        if ((day !== zPrevTime.dayOfYear()) || (year !== zPrevTime.year())) {
          useDateFormat = true
        }
      } else if ((tickTime === beginTime) && ((day !== currentMoment.tz(this.timeZone_).dayOfYear()) || (year !== currentMoment.tz(this.timeZone_).year()))) {
        useDateFormat = true
      }
    }
    return {
      content: zTime.format(useDateFormat ? dateFormat : format),
      useDateFormat: useDateFormat
    }
  }

  /**
   *
   *
   *
   * @memberOf TimeSlider
   */
  clear () {
    this.mouseListeners_.forEach(mouseListener => {
      mouseListener.destroy()
    })
    this.resizeDetector.removeAllListeners(this.container_)
    empty(this.container_)
    this.frames_ = []
  }

  /**
   * Destroys current time slider.
   */
  destroyTimeSlider () {
    this.clear()
    this.actionEvents.removeAllListeners()
    this.variableEvents.removeAllListeners()
  }
}

TimeSlider.PLAYING_CLASS = 'playing'
TimeSlider.CLICKABLE_CLASS = 'fmi-metoclient-timeslider-clickable-container'
TimeSlider.PRE_MARGIN_CLASS = 'fmi-metoclient-timeslider-pre-margin'
TimeSlider.PRE_TOOLS_CLASS = 'fmi-metoclient-timeslider-pre-tools'
TimeSlider.FRAMES_CONTAINER_CLASS = 'fmi-metoclient-timeslider-frames-container'
TimeSlider.PLAY_BUTTON_CLASS = 'fmi-metoclient-timeslider-play-button'
TimeSlider.POST_TOOLS_CLASS = 'fmi-metoclient-timeslider-post-tools'
TimeSlider.POST_BUTTON_CLASS = 'fmi-metoclient-timeslider-step-button'
TimeSlider.POST_MARGIN_CLASS = 'fmi-metoclient-timeslider-post-margin'
TimeSlider.TIMEZONE_LABEL_CLASS = 'fmi-metoclient-timeslider-timezone'
TimeSlider.FRAME_TICK_CLASS = 'fmi-metoclient-timeslider-frame-tick'
TimeSlider.FRAME_TEXT_WRAPPER_CLASS = 'fmi-metoclient-timeslider-frame-text-wrapper'
TimeSlider.FRAME_TEXT_CLASS = 'fmi-metoclient-timeslider-frame-text'
TimeSlider.DRAG_LISTENER_CLASS = 'fmi-metoclient-timeslider-drag-listener'
TimeSlider.POINTER_CLASS = 'fmi-metoclient-timeslider-pointer'
TimeSlider.POINTER_WRAPPER_CLASS = 'fmi-metoclient-timeslider-pointer-wrapper'
TimeSlider.POINTER_TEXT_CLASS = 'fmi-metoclient-timeslider-pointer-text'
TimeSlider.POINTER_HANDLE_CLASS = 'fmi-metoclient-timeslider-pointer-handle'
TimeSlider.INDICATOR_CLASS = 'fmi-metoclient-timeslider-indicator'
TimeSlider.HIDDEN_CLASS = 'fmi-metoclient-timeslider-hidden'
TimeSlider.MENU_CLASS = 'fmi-metoclient-timeslider-menu'
TimeSlider.BEGIN_TIME_CLASS = 'fmi-metoclient-timeslider-begintime'
TimeSlider.END_TIME_CLASS = 'fmi-metoclient-timeslider-endtime'
TimeSlider.TIMESTEP_CLASS = 'fmi-metoclient-timeslider-timestep'
TimeSlider.TIMESTEP_BUTTON_CLASS = 'fmi-metoclient-timeslider-timestep-button'
TimeSlider.TIMESTEP_BUTTON_ACTIVE_CLASS = 'fmi-metoclient-timeslider-timestep-active-button'
TimeSlider.BACKWARDS = -1
TimeSlider.FORWARDS = 1
