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
   */
  constructor (config, container, callbacks) {
    this.container_ = container
    this.config_ = config
    this.callbacks_ = callbacks
    this.visualPointer_ = null
    this.frameWidth_ = 0
    this.playButton_ = null
    this.frameStatusRects_ = []
    this.animationTime_ = null
    this.animationPlay_ = false
    this.beginTime_ = config['beginTime']
    this.endTime_ = config['endTime']
    this.resolutionTime_ = config['resolutionTime']
    this.modifiedResolutionTime_ = config['resolutionTime']
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
   * @param (Object) containing time parameters for Time slider menu.
   */
  createTimeSlider (moments, timeConfig) {
    if (timeConfig !== null) {
      this.beginTime_ = timeConfig.beginTime
      this.endTime_ = timeConfig.endTime
      this.config_.firstDataPointTime = timeConfig.firstDataPointTime
      this.config_.lastDataPointTime = timeConfig.lastDataPointTime
      this.modifiedResolutionTime_ = timeConfig.resolutionTime
    }
    if ((moments == null) || (moments.length === 0)) {
      this.clear()
      return
    }
    this.clear()
    this.createContainers(moments)
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
   * Triggers a movement to the next or previous time moment
   * @param {number} direction Forward or backward direction
   */
  step (direction) {
    if (direction > 0) {
      this.actionEvents.emitEvent('next')
    } else if (direction < 0) {
      this.actionEvents.emitEvent('previous')
    }
  }

  /**
   * Creates container elements and appropriate listeners.
   * @param {Array} moments Time values for the slider.
   */
  createContainers (moments) {
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

    clickableContainer.appendChild(this.createPostTools(moments))

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
      document.activeElement.blur()
    }))
    this.mouseListeners_.push(listen(this.container_, 'touchend', event => {
      self.setDragging(false)
      document.activeElement.blur()
    }))

    this.resizeDetector.listenTo(this.container_.getElementsByClassName(TimeSlider.FRAMES_CONTAINER_CLASS)[0], function (element) {
      self.createTicks()
    })
  }

  /**
   * Creates functional margin area before the actual time slider.
   * @returns {HTMLElement} Margin element.
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
   * Creates an element for UI tools located in the slider before the first time step
   * @returns {HTMLElement} An element for UI tools.
   */
  createPreTools () {
    let self = this
    let preTools = document.createElement('div')
    preTools.classList.add(TimeSlider.PRE_TOOLS_CLASS)

    let playButton = document.createElement('button')
    playButton.classList.add(TimeSlider.PLAY_BUTTON_CLASS)
    playButton.tabIndex = TimeSlider.BASE_TAB_INDEX
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
   * Creates an element for UI tools located in the slider after the last time step.
   * @param {Array} moments Time values for the slider.
   * @returns {HTMLElement} An element for UI tools.
   */
  createPostTools (moments) {
    let self = this
    let postTools = document.createElement('div')
    postTools.classList.add(TimeSlider.POST_TOOLS_CLASS)

    let postButton = document.createElement('button')
    postButton.classList.add(TimeSlider.POST_BUTTON_CLASS)
    postButton.tabIndex = TimeSlider.BASE_TAB_INDEX + 10 + moments.length
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
    const menuTimeSteps = this.config_['menuTimeSteps']
    const timeStepMenu = utils['createTimeMenu'](menuTimeSteps, {
      id: TimeSlider.MENU_CLASS,
      items: [{
        title: this.config_.timeStepText,
        id: TimeSlider.TIMESTEP_CLASS,
        resolutionTime: this.modifiedResolutionTime_,
        beginPlace: ((this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.modifiedResolutionTime_) - ((this.config_.lastDataPointTime - this.beginTime_) / this.modifiedResolutionTime_),
        endPlace: (this.endTime_ - this.config_.firstDataPointTime) / this.modifiedResolutionTime_,
        type: 'stepButtons',
        callback: (e) => {
          let step = e.target.innerHTML
          menuTimeSteps.forEach(function(timeStep) {
            if (timeStep[0] == step) {
              step = timeStep[1]
            }
          })
          e.target.classList.add(TimeSlider.TIMESTEP_BUTTON_CLASS)
          const value = this.container_.getElementsByClassName(TimeSlider.BEGIN_TIME_CLASS)[0].value
          this.modifiedResolutionTime_ = step
          this.variableEvents.emitEvent('timeStep', [this.modifiedResolutionTime_])
        }
      }, {
        title: this.config_.beginTimeText,
        id: TimeSlider.BEGIN_TIME_CLASS,
        size: (this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.modifiedResolutionTime_,
        resolutionTime: this.modifiedResolutionTime_,
        beginPlace: ((this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.modifiedResolutionTime_) - ((this.config_.lastDataPointTime - this.beginTime_) / this.modifiedResolutionTime_),
        endPlace: (this.endTime_ - this.config_.firstDataPointTime) / this.modifiedResolutionTime_,
        type: 'range',
        callback: () => {
          const value = this.container_.getElementsByClassName(TimeSlider.BEGIN_TIME_CLASS)[0].value
          if ((this.config_.firstDataPointTime % this.modifiedResolutionTime_) % this.resolutionTime_ === 0) {
            if (this.modifiedResolutionTime_ >= constants.ONE_HOUR) {
              this.beginTime_ = Math.ceil((this.config_.firstDataPointTime + (this.modifiedResolutionTime_ * value)) / constants.ONE_HOUR) * constants.ONE_HOUR
              this.variableEvents.emitEvent('beginTime', [this.beginTime_])
            }else {
              this.beginTime_ = Math.ceil((this.config_.firstDataPointTime + (this.modifiedResolutionTime_ * value)) / this.modifiedResolutionTime_) * this.modifiedResolutionTime_
              this.variableEvents.emitEvent('beginTime', [this.beginTime_])
            }
          } else {
            this.beginTime_ = this.config_.firstDataPointTime + (this.modifiedResolutionTime_ * value)
            this.variableEvents.emitEvent('beginTime', [this.beginTime_])
          }
        }
      }, {
        title: this.config_.endTimeText,
        id: TimeSlider.END_TIME_CLASS,
        size: (this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.modifiedResolutionTime_,
        resolutionTime: this.modifiedResolutionTime_,
        beginPlace: ((this.config_.lastDataPointTime - this.config_.firstDataPointTime) / this.modifiedResolutionTime_) - ((this.config_.lastDataPointTime - this.beginTime_) / this.modifiedResolutionTime_),
        endPlace: (this.endTime_ - this.config_.firstDataPointTime) / this.modifiedResolutionTime_,
        type: 'range',
        callback: () => {
          const value = this.container_.getElementsByClassName(TimeSlider.END_TIME_CLASS)[0].value
          if ((this.config_.firstDataPointTime % this.modifiedResolutionTime_) % this.resolutionTime_ === 0) {
            if (this.modifiedResolutionTime_ >= constants.ONE_HOUR) {
              this.endTime_ = Math.ceil((this.config_.firstDataPointTime + (this.modifiedResolutionTime_ * value)) / constants.ONE_HOUR) * constants.ONE_HOUR
              this.variableEvents.emitEvent('endTime', [this.endTime_])
            } else {
              this.endTime_ = Math.ceil((this.config_.firstDataPointTime + (this.modifiedResolutionTime_ * value)) / this.modifiedResolutionTime_) * this.modifiedResolutionTime_
              this.variableEvents.emitEvent('endTime', [this.endTime_])
            }
          } else {
            this.endTime_ = this.config_.firstDataPointTime + (this.modifiedResolutionTime_ * value)
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
      for (let i = 0; i < siblings.length; i++) {
        sibling = siblings[i]
        if (sibling.id === this.id) {
          k = true
        }
        if ((k) && (sibling.nodeName === 'OUTPUT')) {
          outputTag = sibling
        }
      }
      timestamp = new Date(self.config_.firstDataPointTime + (self.modifiedResolutionTime_ * this.value))
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
            let evt = document.createEvent('HTMLEvents')
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
   * Creates an element for time zone label.
   * @returns {HTMLElement} Time zone label.
   */
  createTimeZoneLabel () {
    let timezoneLabel = document.createElement('div')
    timezoneLabel.innerHTML = this.timeZoneLabel_
    timezoneLabel.classList.add(TimeSlider.TIMEZONE_LABEL_CLASS)
    return timezoneLabel
  }

  /**
   * Creates time frames and provides the frames container with frame elements.
   * @param {Array} moments Time values for the slider.
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
      timeFrame['element'].getElementsByClassName(TimeSlider.KEYBOARD_ACCESSIBLE_CLASS)[0].tabIndex = TimeSlider.BASE_TAB_INDEX + i
      framesContainer.appendChild(timeFrame['element'])
      this.frames_.push(timeFrame)
    }
  }

  /**
   * Creates a single time frame and corresponding element listeners.
   * @param {number} beginTime Begin time.
   * @param {number} endTime End time.
   * @param {string} type Frame type for observation or forecast.
   * @param {number} weight Weight corresponding time frame length.
   * @returns {Object} Time frame.
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
      document.activeElement.blur()
      self.variableEvents.emitEvent('animationTime', [timeFrame['endTime']])
    }))
    this.mouseListeners_.push(listen(timeFrame.element, 'touchmove', event => {
      if ((!self.dragging_) || (event.changedTouches[0] === undefined)) {
        return
      }
      let currentTimeFrame
      const touchX = event.changedTouches[0].clientX
      const numFrames = this.frames_.length
      let rect
      for (let i = 0; i < numFrames; i++) {
        rect = this.frames_[i].element.getBoundingClientRect()
        if ((rect.left <= touchX) && (touchX <= rect.right)) {
          currentTimeFrame = this.frames_[i]
          break;
        }
      }
      document.activeElement.blur()
      self.variableEvents.emitEvent('animationTime', [currentTimeFrame['endTime']])
    }))

    return timeFrame
  }

  /**
   * Creates elements for status visualizations of data loading.
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
   * Creates a visually reasonable tick distribution.
   */
  createTicks () {
    let step
    let stepStart
    let discreteSteps = [
      constants.ONE_MINUTE,
      2 * constants.ONE_MINUTE,
      5 * constants.ONE_MINUTE,
      10 * constants.ONE_MINUTE,
      15 * constants.ONE_MINUTE,
      20 * constants.ONE_MINUTE,
      30 * constants.ONE_MINUTE,
      constants.ONE_HOUR,
      2 * constants.ONE_HOUR,
      3 * constants.ONE_HOUR,
      4 * constants.ONE_HOUR,
      6 * constants.ONE_HOUR,
      8 * constants.ONE_HOUR,
      12 * constants.ONE_HOUR,
      constants.ONE_DAY
    ]
    let numDiscreteSteps = discreteSteps.length
    let minStep
    let nextStep = 0
    let i
    let j = 0
    let maxIter = 10
    let timeStepsUsed = true
    do {
      if (j > maxIter) {
        this.configureTicks()
        break
      }
      minStep = nextStep
      timeStepsUsed = this.configureTicks(minStep)
      step = 0
      stepStart = -1
      nextStep = (j > 0) ? minStep : Number.POSITIVE_INFINITY
      this.frames_.forEach((frame, index, frames) => {
        if (frame.element.getElementsByClassName(TimeSlider.FRAME_TICK_CLASS).length > 0) {
          if (stepStart >= 0) {
            step = frame['endTime'] - frames[stepStart]['endTime']
            if (((j === 0) && (step < nextStep)) || ((j !== 0) && (step > nextStep))) {
              nextStep = step
            }
          }
          stepStart = index
        }
      })
      if ((nextStep !== minStep) && (((nextStep < constants.ONE_HOUR) && (constants.ONE_HOUR % nextStep !== 0)) || ((nextStep > constants.ONE_HOUR) && (nextStep % constants.ONE_HOUR !== 0)) || ((nextStep < constants.ONE_DAY) && (constants.ONE_DAY % nextStep !== 0)))) {
        for (i = 0; i < numDiscreteSteps; i++) {
          if (nextStep < discreteSteps[i]) {
            nextStep = discreteSteps[i]
            break
          }
        }
      }
      j++
    } while ((timeStepsUsed) && (nextStep !== minStep))
    this.showTicks()
  }

  /**
   * Performs a new iteration for tick distribution optimization.
   * @param {number=} minStep Minimum allowed time step.
   * @returns {boolean} Information if using default time step is suitable for the current data.
   */
  configureTicks (minStep = 0) {
    let self = this
    let tick
    let maxTextWidth = 0
    let newTextWidth
    let useTimeStep = false
    let timeStep
    let framesContainer
    let divisibleDays = false
    let containsDST = false
    let containsNonDST = false
    this.previousTickTextTop_ = null
    this.previousTickTextRight_ = Number.NEGATIVE_INFINITY
    this.previousTickTextBottom_ = null
    this.previousTickTextLeft_ = null
    this.previousTickValue_ = null
    this.previousTickIndex_ = null

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
      if (moment(frame['endTime']).tz(self.timeZone_).startOf('day').valueOf() === frame['endTime']) {
        divisibleDays = true
      }
      if (nextIndex === frames.length) {
        return
      }
      textElement = frame.element.querySelector('span.' + TimeSlider.FRAME_TEXT_CLASS)
      clientRect = textElement.getBoundingClientRect()
      if (maxTextWidth < clientRect['width']) {
        maxTextWidth = clientRect['width']
      }

      localTimeStep = frames[nextIndex]['endTime'] - frame['endTime']
      if ((moment(frame['endTime']).tz(self.timeZone_).isDST()) && (localTimeStep < constants.ONE_DAY)) {
        containsDST = true
      } else {
        containsNonDST = true
      }
      if (timeStep == null) {
        useTimeStep = true
        timeStep = localTimeStep
      } else if ((useTimeStep) && (localTimeStep !== timeStep)) {
        useTimeStep = false
      }
    })
    if ((containsDST) && (containsNonDST)) {
      useTimeStep = false
    }
    // Prevent common tick asynchrony
    if (useTimeStep) {
      timeStep *= 2
    }

    newTextWidth = Math.round(maxTextWidth) + 'px'
    Array.from(this.container_.getElementsByClassName(TimeSlider.FRAME_TEXT_WRAPPER_CLASS)).forEach(element => {
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

    framesContainer = Array.from(this.container_.getElementsByClassName(TimeSlider.FRAMES_CONTAINER_CLASS))
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
        if ((self.previousTickTextRight_ < clientRect.left ||
          self.previousTickTextLeft_ > clientRect.right ||
          self.previousTickTextBottom_ < clientRect.top ||
          self.previousTickTextTop_ > clientRect.bottom) && ((self.previousTickIndex_ == null) || (frame['endTime'] - frames[self.previousTickIndex_]['endTime'] >= minStep))) {
          createTick(frame, index, clientRect, frame['endTime'])
        } else if ((index > 0) && (self.previousTickIndex_ >= 0) && (frames[self.previousTickIndex_] != null) && (((((minStep === 0) && (((frame['endTime'] % (constants.ONE_HOUR) === 0) && (frames[self.previousTickIndex_]['endTime'] % (constants.ONE_HOUR) !== 0)) || ((useTimeStep) && ((frame['endTime'] % (constants.ONE_HOUR)) % timeStep === 0) && ((frames[self.previousTickIndex_]['endTime'] % (constants.ONE_HOUR)) % timeStep !== 0)) || ((frame['endTime'] % (constants.ONE_HOUR) === 0) && (frames[self.previousTickIndex_]['endTime'] % (constants.ONE_HOUR) === 0) && (moment(frame['endTime']).tz(self.timeZone_).hour() % 2 === 0) && (moment(frames[self.previousTickIndex_]['endTime']).tz(self.timeZone_).hour() % 2 !== 0))) && (!frames[self.previousTickIndex_]['useDateFormat'])) || (frame['useDateFormat']))) || ((minStep > 0) && (((minStep >= constants.ONE_HOUR) && (moment(frames[self.previousTickIndex_]['endTime']) % constants.ONE_HOUR !== 0)) || ((moment(frames[self.previousTickIndex_]['endTime']) % constants.ONE_HOUR) % minStep !== 0) || ((divisibleDays) && (moment(frames[self.previousTickIndex_]['endTime']).tz(self.timeZone_).hour() % (minStep / constants.ONE_HOUR) !== 0)))))) {
          clearFrame(frames[self.previousTickIndex_])
          createTick(frame, index, clientRect, frame['endTime'])
        } else {
          frame.element.removeChild(textWrapper)
        }
      } else {
        frame.element.removeChild(textWrapper)
      }
    })
    return useTimeStep
  }

  /**
   * Shows currently visible slider ticks.
   */
  showTicks () {
    Array.from(this.container_.getElementsByClassName(TimeSlider.FRAME_TICK_CLASS)).forEach(element => {
      element.classList.remove(TimeSlider.HIDDEN_CLASS)
    })
  }

  /**
   * Creates a pointer for indicating current time in the slider.
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
   * @param {number} animationTime Animation time.
   */
  setAnimationTime (animationTime) {
    if (animationTime === this.animationTime_) {
      this.updatePointer(animationTime)
      return
    }
    let numFrames = this.frames_.length
    let i
    let currentIndex
    let nextIndex
    let updateAllowed = true
    if (this.animationPlay_) {
      for (i = 0; i < numFrames; i++) {
        if (this.animationTime_ <= this.frames_[i]['endTime']) {
          currentIndex = i
          break
        }
      }
      if (currentIndex == null) {
        currentIndex = numFrames - 1
      }
      nextIndex = (currentIndex + 1) % numFrames
      Array.from(this.frames_[currentIndex].element.getElementsByClassName(TimeSlider.INDICATOR_CLASS)).forEach(indicatorElement => {
        if (indicatorElement.getAttribute('data-status') === TimeSlider.DATA_STATUS_WORKING) {
          updateAllowed = false
        }
      })
      if (updateAllowed) {
        Array.from(this.frames_[nextIndex].element.getElementsByClassName(TimeSlider.INDICATOR_CLASS)).forEach(indicatorElement => {
          if (indicatorElement.getAttribute('data-status') === TimeSlider.DATA_STATUS_WORKING) {
            updateAllowed = false
          }
        })
      }
    }
    if (updateAllowed) {
      this.animationTime_ = animationTime
      this.updatePointer(animationTime)
    } else {
      this.variableEvents.emitEvent('animationTime', [this.animationTime_])
    }
  }

  /**
   * Updates pointer text and location on the time slider.
   * @param {number} animationTime Time value.
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
      this.createTimeSlider(moments, null)
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
    Array.from(this.container_.getElementsByClassName(TimeSlider.DRAG_LISTENER_CLASS)).forEach(element => {
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
   * Clears time slider configurations.
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
TimeSlider.KEYBOARD_ACCESSIBLE_CLASS = 'fmi-metoclient-timeslider-keyboard-accessible'
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
TimeSlider.DATA_STATUS_WORKING = 'working'
TimeSlider.BACKWARDS = -1
TimeSlider.FORWARDS = 1
TimeSlider.BASE_TAB_INDEX = 100
