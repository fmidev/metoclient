/**
 * @module ol/metoclient/TimeSlider
 */

import empty from 'empty-element';
import listen from 'good-listener';
import elementResizeDetectorMaker from 'element-resize-detector';
import TimeFrame from './TimeFrame';
import * as constants from './constants';
import * as timeConstants from './timeConstants';
import {DateTime} from 'luxon';
import Control from 'ol/control/Control';
import {unByKey} from 'ol/Observable';

class TimeSlider extends Control {
  /**
   * Creates an instance of TimeSlider.
   */
  constructor(opt_options) {
    const options = opt_options || {};
    const element = document.createElement('div');
    element.className = 'ol-unselectable ol-control fmi-metoclient-timeslider';
    if (options.meteorologicalMode) {
      element.className += ` ${constants.METEOROLOGICAL_MODE}`
    }
    super({
      element: element,
      target: options.target
    });
    this.container_ = element;
    this.config_ = options;
    this.callbacks_ = options.callbacks;
    this.enableMouseWheel_ = options.enableMouseWheel;
    this.interactions_ = null;
    this.playButton_ = null;
    this.animationPlay_ = false;
    this.frames_ = [];
    this.locale_ = options['locale'];
    this.timeZone_ = options['timeZone'];
    this.timeZoneLabel_ = options['timeZoneLabel'];
    this.previousTickTextTop_ = Number.POSITIVE_INFINITY;
    this.previousTickTextRight_ = Number.NEGATIVE_INFINITY;
    this.previousTickTextBottom_ = Number.NEGATIVE_INFINITY;
    this.previousTickTextLeft_ = Number.POSITIVE_INFINITY;
    this.previousTickIndex_ = -1;
    this.mouseListeners_ = [];
    this.dragging_ = false;
    this.resizeDetector = elementResizeDetectorMaker();
    this.timeListener = null;
    this.playingListener = null;
  }

  /**
   * Creates a new time slider.
   * @param {Array} moments Time values for the slider.
   */
  createTimeSlider(moments) {
    this.dispatchEvent('render');
    this.clear();
    this.createContainers(moments);
    this.createFrames(moments);
    this.createIndicators();
    this.createTicks();
    this.createInteractions();
    if (this.getMap().get('time') != null) {
      this.updatePointer(this.getMap().get('time'));
    }
    if ((this.callbacks_ != null) && (typeof this.callbacks_['timeSliderCreated'] === 'function')) {
      this.callbacks_['timeSliderCreated'](moments);
    }
    this.timeListener = this.getMap().on('change:time', evt => {
      this.setAnimationTime(evt.target.get('time'));
    });
    this.playingListener = this.getMap().on('change:playing', evt => {
      this.setAnimationPlay(evt.target.get('playing'));
    });
    this.dispatchEvent('rendercomplete');
  }

  /**
   * Triggers a movement to the next or previous time moment
   * @param {number} direction Forward or backward direction
   */
  step(direction) {
    const map = this.getMap();
    map.set('playing', false);
    if (direction > 0) {
      map.dispatchEvent('next');
    } else if (direction < 0) {
      map.dispatchEvent('previous');
    }
  }

  /**
   * Creates container elements and appropriate listeners.
   * @param {Array} moments Time values for the slider.
   */
  createContainers(moments) {
    const self = this;
    const clickableContainer = document.createElement('div');
    clickableContainer.classList.add(constants.CLICKABLE_CLASS);

    if (moments.length > 0) {
      clickableContainer.appendChild(this.createPreMargin());
      clickableContainer.appendChild(this.createPreTools());
    }

    const momentsContainer = document.createElement('div');
    momentsContainer.classList.add(constants.FRAMES_CONTAINER_CLASS);
    if (this.enableMouseWheel_) {
      this.mouseListeners_.push(listen(momentsContainer, 'wheel', event => {
        event.preventDefault();
        self.step(event.deltaY);
      }));
    }
    clickableContainer.appendChild(momentsContainer);

    clickableContainer.appendChild(this.createPostTools(moments));

    const postMargin = document.createElement('div');
    postMargin.classList.add(constants.POST_MARGIN_CLASS);
    this.mouseListeners_.push(listen(postMargin, 'click', event => {
      self.step(constants.FORWARDS);
    }));
    clickableContainer.appendChild(postMargin);

    clickableContainer.appendChild(this.createTimeZoneLabel());

    this.container_.appendChild(clickableContainer);

    this.container_.classList.add('noselect');

    this.mouseListeners_.push(listen(this.container_, 'mouseup', event => {
      self.setDragging(false);
      document.activeElement.blur();
    }));
    this.mouseListeners_.push(listen(this.container_, 'touchend', event => {
      self.setDragging(false);
      document.activeElement.blur();
    }));

    this.resizeDetector.listenTo(this.container_.getElementsByClassName(constants.FRAMES_CONTAINER_CLASS)[0], element => {
      self.createTicks();
    });
  }

  /**
   * Creates functional margin area before the actual time slider.
   * @returns {HTMLElement} Margin element.
   */
  createPreMargin() {
    const self = this;
    const preMargin = document.createElement('div');
    preMargin.classList.add(constants.PRE_MARGIN_CLASS);
    this.mouseListeners_.push(listen(preMargin, 'click', () => {
      self.step(constants.BACKWARDS);
    }));
    return preMargin;
  }

  /**
   * Creates an element for UI tools located in the slider before the first time step
   * @returns {HTMLElement} An element for UI tools.
   */
  createPreTools() {
    let self = this;
    let preTools = document.createElement('div');
    preTools.classList.add(constants.PRE_TOOLS_CLASS);

    let playButton = document.createElement('button');
    playButton.classList.add(constants.PLAY_BUTTON_CLASS);
    playButton.tabIndex = constants.BASE_TAB_INDEX;
    if (this.animationPlay_) {
      playButton.classList.add(constants.PLAYING_CLASS);
    }
    this.mouseListeners_.push(listen(playButton, 'click', () => {
      event.preventDefault();
      let map = this.getMap();
      map.set('playing', !map.get('playing'));
    }));
    this.playButton_ = playButton;

    preTools.appendChild(playButton);
    return preTools;
  }

  /**
   * Creates an element for UI tools located in the slider after the last time step.
   * @param {Array} moments Time values for the slider.
   * @returns {HTMLElement} An element for UI tools.
   */
  createPostTools(moments) {
    const self = this;
    const postTools = document.createElement('div');
    postTools.classList.add(constants.POST_TOOLS_CLASS);

    const postButton = document.createElement('button');
    postButton.classList.add(constants.POST_BUTTON_CLASS);
    postButton.tabIndex = constants.BASE_TAB_INDEX + 10 + moments.length;
    postTools.appendChild(postButton);
    this.mouseListeners_.push(listen(postButton, 'click', () => {
      if (this.config_['showTimeSliderMenu']) {
      } else if ((self.callbacks_ != null) && (typeof self.callbacks_['toolClicked'] === 'function')) {
        this.callbacks_['toolClicked']('timeslider-right-button');
      }
    }));

    if (!this.config_['showTimeSliderMenu']) {
      return postTools;
    }

    return postTools;
  }

  /**
   * Creates an element for time zone label.
   * @returns {HTMLElement} Time zone label.
   */
  createTimeZoneLabel() {
    const timezoneLabel = document.createElement('div');
    timezoneLabel.innerHTML = this.timeZoneLabel_;
    timezoneLabel.classList.add(constants.TIMEZONE_LABEL_CLASS);
    return timezoneLabel;
  }

  /**
   * Creates time frames and provides the frames container with frame elements.
   * @param {Array} moments Time values for the slider.
   */
  createFrames(moments) {
    let i;
    const numMoments = moments.length;
    const currentTime = Date.now();
    let beginTime;
    let endTime;
    let type;
    let weight;
    let timeFrame;
    const framesContainer = this.container_.getElementsByClassName(constants.FRAMES_CONTAINER_CLASS)[0];
    empty(framesContainer);
    if (numMoments < 2) {
      return;
    }
    const timePeriod = moments[numMoments - 1] - moments[0];

    for (i = 0; i < numMoments; i++) {
      beginTime = (i === 0) ? 2 * moments[0] - moments[1] : moments[i - 1];
      endTime = moments[i];
      type = (moments[i] <= currentTime) ? constants.FRAME_HISTORY : constants.FRAME_FUTURE;
      weight = 100 * (endTime - beginTime) / timePeriod;
      timeFrame = this.createFrame(beginTime, endTime, type, weight);
      timeFrame['element'].getElementsByClassName(constants.KEYBOARD_ACCESSIBLE_CLASS)[0].tabIndex = constants.BASE_TAB_INDEX + i;
      framesContainer.appendChild(timeFrame['element']);
      this.frames_.push(timeFrame);
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
  createFrame(beginTime, endTime, type, weight) {
    const self = this;
    const map = this.getMap();
    const timeFrame = new TimeFrame({
      'beginTime': beginTime,
      'endTime': endTime,
      'type': type,
      'weight': weight
    });
    let longClick;
    let longTap;
    let clickCount = 0;
    let singleClickTimer = 0;
    this.mouseListeners_.push(listen(timeFrame.element, 'mousedown', () => {
      if (this.isMeteorologicalMode()) {
        longClick = setTimeout(() => {
          clearTimeout(singleClickTimer);
          longClick = null;
          map.set('playing', false);
          map.set('time', timeFrame['endTime']);
        }, constants.LONG_CLICK_DELAY);
      } else {
        map.set('playing', false);
        map.set('time', timeFrame['endTime']);
      }
    }));
    this.mouseListeners_.push(listen(timeFrame.element, 'mouseup', () => {
      if ((longClick != null) && (!self.dragging_)) {
        clearTimeout(longClick);
        clickCount++;
        if (clickCount === 1) {
          singleClickTimer = setTimeout(() => {
            clearTimeout(longClick);
            clickCount = 0;
            if (timeFrame['endTime'] === map.get('time')) {
              map.set('playing', false);
              map.set('time', timeFrame['beginTime']);
            } else {
              self.step(timeFrame['endTime'] - map.get('time'));
            }
          }, constants.DOUBLE_PRESS_DELAY);
        } else if (clickCount === 2) {
          clearTimeout(singleClickTimer);
          clickCount = 0;
          map.set('playing', false);
          map.set('time', timeFrame['endTime']);
        }
      }
    }));
    this.mouseListeners_.push(listen(timeFrame.element, 'mouseout', () => {
      if (longClick != null) {
        clearTimeout(longClick);
      }
    }));
    this.mouseListeners_.push(listen(timeFrame.element, 'touchstart', () => {
      if (this.isMeteorologicalMode()) {
        longTap = setTimeout(() => {
          longTap = null;
          map.set('playing', false);
          map.set('time', timeFrame['endTime']);
        }, constants.LONG_TAP_DELAY);
      } else {
        map.set('playing', false);
        map.set('time', timeFrame['endTime']);
      }
    }));
    this.mouseListeners_.push(listen(timeFrame.element, 'touchend', () => {
      if (longTap != null) {
        clearTimeout(longTap);
      }
    }));
    this.mouseListeners_.push(listen(timeFrame.element, 'touchcancel', () => {
      if (longTap != null) {
        clearTimeout(longTap);
      }
    }));
    this.mouseListeners_.push(listen(timeFrame.dragListenerElement, 'mousemove', event => {
      if (!self.dragging_) {
        return;
      }
      document.activeElement.blur();
      map.set('playing', false);
      map.set('time', timeFrame['endTime']);
    }));
    this.mouseListeners_.push(listen(timeFrame.element, 'touchmove', event => {
      if ((!self.dragging_) || (event.changedTouches[0] === undefined)) {
        return;
      }
      let currentTimeFrame;
      const touchX = event.changedTouches[0].clientX;
      const numFrames = this.frames_.length;
      let rect;
      for (let i = 0; i < numFrames; i++) {
        rect = this.frames_[i].element.getBoundingClientRect();
        if ((rect.left <= touchX) && (touchX <= rect.right)) {
          currentTimeFrame = this.frames_[i];
          break;
        }
      }
      document.activeElement.blur();
      if ((currentTimeFrame != null) && (currentTimeFrame['endTime'] !== map.get('time'))) {
        clearTimeout(longTap);
        map.set('playing', false);
        map.set('time', currentTimeFrame['endTime']);
      }
    }));

    return timeFrame;
  }

  /**
   * Creates elements for status visualizations of data loading.
   */
  createIndicators() {
    this.frames_.forEach((frame, index, array) => {
      const indicator = document.createElement('div');
      indicator.classList.add(constants.INDICATOR_CLASS);
      if (index === 0) {
        indicator.classList.add('first');
      } else if (index === array.length - 1) {
        indicator.classList.add('last');
      }
      frame.element.appendChild(indicator);
    });
  }

  /**
   * Creates a visually reasonable tick distribution.
   */
  createTicks() {
    let step;
    let stepStart;
    const discreteSteps = [
      timeConstants.MINUTE,
      2 * timeConstants.MINUTE,
      5 * timeConstants.MINUTE,
      10 * timeConstants.MINUTE,
      15 * timeConstants.MINUTE,
      20 * timeConstants.MINUTE,
      30 * timeConstants.MINUTE,
      timeConstants.HOUR,
      2 * timeConstants.HOUR,
      3 * timeConstants.HOUR,
      4 * timeConstants.HOUR,
      6 * timeConstants.HOUR,
      8 * timeConstants.HOUR,
      12 * timeConstants.HOUR,
      timeConstants.DAY
    ];
    const numDiscreteSteps = discreteSteps.length;
    let minStep;
    let nextStep = 0;
    let i;
    let j = 0;
    const maxIter = 10;
    let timeStepsUsed = true;
    do {
      if (j > maxIter) {
        this.configureTicks();
        break;
      }
      minStep = nextStep;
      timeStepsUsed = this.configureTicks(minStep);
      step = 0;
      stepStart = -1;
      nextStep = (j > 0) ? minStep : Number.POSITIVE_INFINITY;
      this.frames_.forEach((frame, index, frames) => {
        if (frame.element.getElementsByClassName(constants.FRAME_TICK_CLASS).length > 0) {
          if (stepStart >= 0) {
            step = frame['endTime'] - frames[stepStart]['endTime'];
            if (((j === 0) && (step < nextStep)) || ((j !== 0) && (step > nextStep))) {
              nextStep = step;
            }
          }
          stepStart = index;
        }
      });
      if ((nextStep !== minStep) && (((nextStep < timeConstants.HOUR) && (timeConstants.HOUR % nextStep !== 0)) || ((nextStep > timeConstants.HOUR) && (nextStep % timeConstants.HOUR !== 0)) || ((nextStep < timeConstants.DAY) && (timeConstants.DAY % nextStep !== 0)))) {
        for (i = 0; i < numDiscreteSteps; i++) {
          if (nextStep < discreteSteps[i]) {
            nextStep = discreteSteps[i];
            break;
          }
        }
      }
      j++;
    } while ((timeStepsUsed) && (nextStep !== minStep));
    this.showTicks();
  }

  /**
   * Performs a new iteration for tick distribution optimization.
   * @param {number=} minStep Minimum allowed time step.
   * @returns {boolean} Information if using default time step is suitable for the current data.
   */
  configureTicks(minStep = 0) {
    const self = this;
    let tick;
    let maxTextWidth = 0;
    let newTextWidth;
    let useTimeStep = false;
    let timeStep;
    let framesContainer;
    let divisibleDays = false;
    let containsDST = false;
    let containsNonDST = false;
    this.previousTickTextTop_ = null;
    this.previousTickTextRight_ = Number.NEGATIVE_INFINITY;
    this.previousTickTextBottom_ = null;
    this.previousTickTextLeft_ = null;
    this.previousTickValue_ = null;
    this.previousTickIndex_ = null;

    const clearFrame = (frame) => {
      const removeChildrenByClass = (className) => {
        Array.from(frame.element.getElementsByClassName(className)).forEach(element => {
          element.parentElement.removeChild(element);
        });
      };
      removeChildrenByClass(constants.FRAME_TEXT_WRAPPER_CLASS);
      removeChildrenByClass(constants.FRAME_TICK_CLASS);
    };

    this.frames_.forEach((frame, index, frames) => {
      clearFrame(frame);

      const textWrapperElement = document.createElement('div');
      textWrapperElement.classList.add(constants.FRAME_TEXT_WRAPPER_CLASS);

      const textElement = document.createElement('span');
      textElement.classList.add(constants.FRAME_TEXT_CLASS);
      textElement.classList.add(constants.NO_SELECT_CLASS);
      const tickText = this.getTickText(frame['endTime']);
      textElement.textContent = tickText['content'];
      frame['useDateFormat'] = tickText['useDateFormat'];

      textWrapperElement.appendChild(textElement);

      frame.element.appendChild(textWrapperElement);
      frame.element.style.display = 'none';
    });

    // Separate loops to prevent accessing textElement width before it is available
    this.frames_.forEach((frame, index, frames) => {
      let localTimeStep;
      const nextIndex = index + 1;
      frame.element.style.display = '';

      if (DateTime.fromMillis(frame['endTime']).setZone(self.timeZone_).startOf('day').valueOf() === frame['endTime']) {
        divisibleDays = true;
      }
      if (nextIndex === frames.length) {
        return;
      }
      const textElement = frame.element.querySelector('span.' + constants.FRAME_TEXT_CLASS);
      const clientRect = textElement.getBoundingClientRect();
      if (maxTextWidth < clientRect['width']) {
        maxTextWidth = clientRect['width'];
      }
      localTimeStep = frames[nextIndex]['endTime'] - frame['endTime'];
      if ((DateTime.fromMillis(frame['endTime']).setZone(self.timeZone_).isInDST) && (localTimeStep < timeConstants.DAY)) {
        containsDST = true;
      } else {
        containsNonDST = true;
      }
      if (timeStep == null) {
        useTimeStep = true;
        timeStep = localTimeStep;
      } else if ((useTimeStep) && (localTimeStep !== timeStep)) {
        useTimeStep = false;
      }
    });
    if ((containsDST) && (containsNonDST)) {
      useTimeStep = false;
    }
    // Prevent common tick asynchrony
    if (useTimeStep) {
      timeStep *= 2;
    }

    newTextWidth = Math.round(maxTextWidth) + 'px';
    Array.from(this.container_.getElementsByClassName(constants.FRAME_TEXT_WRAPPER_CLASS)).forEach(element => {
      element.style.width = newTextWidth;
    });

    const createTick = (frame, index, rect, endTime) => {
      self.previousTickTextTop_ = rect.top;
      self.previousTickTextRight_ = rect.right;
      self.previousTickTextBottom_ = rect.bottom;
      self.previousTickTextLeft_ = rect.left;
      self.previousTickValue_ = endTime;
      self.previousTickIndex_ = index;
      tick = document.createElement('div');
      tick.classList.add(constants.FRAME_TICK_CLASS);
      tick.classList.add(constants.HIDDEN_CLASS);
      frame.element.appendChild(tick);
    };

    framesContainer = Array.from(this.container_.getElementsByClassName(constants.FRAMES_CONTAINER_CLASS));
    if (framesContainer.length > 0) {
      framesContainer = framesContainer[0].getBoundingClientRect();
    }

    this.frames_.forEach((frame, index, frames) => {
      let textWrapper;
      let clientRect;
      const textElementArray = Array.from(frame.element.getElementsByClassName(constants.FRAME_TEXT_WRAPPER_CLASS));
      if (textElementArray.length === 0) {
        return;
      }
      textWrapper = textElementArray.shift();
      clientRect = textWrapper.getBoundingClientRect();

      // Prevent text overlapping, favor full hours
      if ((framesContainer.length === 0) || (framesContainer.left <= clientRect.left &&
        framesContainer.right >= clientRect.right &&
        framesContainer.top <= clientRect.top &&
        framesContainer.bottom >= clientRect.bottom)) {
        if ((self.previousTickTextRight_ < clientRect.left ||
          self.previousTickTextLeft_ > clientRect.right ||
          self.previousTickTextBottom_ < clientRect.top ||
          self.previousTickTextTop_ > clientRect.bottom) && ((self.previousTickIndex_ == null) || (frame['endTime'] - frames[self.previousTickIndex_]['endTime'] >= minStep))) {
          createTick(frame, index, clientRect, frame['endTime']);
        } else if ((index > 0) && (self.previousTickIndex_ >= 0) && (frames[self.previousTickIndex_] != null) && (((((minStep === 0) && (((frame['endTime'] % (timeConstants.HOUR) === 0) && (frames[self.previousTickIndex_]['endTime'] % (timeConstants.HOUR) !== 0)) || ((useTimeStep) && ((frame['endTime'] % (timeConstants.HOUR)) % timeStep === 0) && ((frames[self.previousTickIndex_]['endTime'] % (constants.ONE_HOUR)) % timeStep !== 0)) || ((frame['endTime'] % (constants.ONE_HOUR) === 0) && (frames[self.previousTickIndex_]['endTime'] % (constants.ONE_HOUR) === 0) && (DateTime.fromMillis(frame['endTime']).setZone(self.timeZone_).hour % 2 === 0) && (DateTime.fromMillis(frames[self.previousTickIndex_]['endTime']).setZone(self.timeZone_).hour % 2 !== 0))) && (!frames[self.previousTickIndex_]['useDateFormat'])) || (frame['useDateFormat']))) || ((minStep > 0) && (((minStep >= constants.ONE_HOUR) && (frames[self.previousTickIndex_]['endTime'] % timeConstants.HOUR !== 0)) || ((frames[self.previousTickIndex_]['endTime'] % timeConstants.HOUR) % minStep !== 0) || ((divisibleDays) && (DateTime.fromMillis(frames[self.previousTickIndex_]['endTime']).setZone(self.timeZone_).hour % (minStep / timeConstants.HOUR) !== 0)))))) {
          clearFrame(frames[self.previousTickIndex_]);
          createTick(frame, index, clientRect, frame['endTime']);
        } else {
          frame.element.removeChild(textWrapper);
        }
      } else {
        frame.element.removeChild(textWrapper);
      }
    });
    return useTimeStep;
  }

  /**
   * Shows currently visible slider ticks.
   */
  showTicks() {
    Array.from(this.container_.getElementsByClassName(constants.FRAME_TICK_CLASS)).forEach(element => {
      element.classList.remove(constants.HIDDEN_CLASS);
    });
  }

  /**
   * Creates a pointer for indicating current time in the slider.
   */
  createInteractions() {
    const self = this;

    const interactionContainer = document.createElement('div');
    interactionContainer.classList.add(constants.INTERACTIONS_CLASS);

    const pointer = document.createElement('div');
    pointer.classList.add(constants.POINTER_CLASS);

    const textContainer = document.createElement('div');
    textContainer.classList.add(constants.POINTER_WRAPPER_CLASS);

    const textItem = document.createElement('span');
    textItem.classList.add(constants.POINTER_TEXT_CLASS);
    textItem.classList.add('noselect');
    textItem.innerHTML = '';

    textContainer.appendChild(textItem);
    pointer.appendChild(textContainer);

    let infotip = document.createElement('div');
    infotip.classList.add(constants.POINTER_INFOTIP_CLASS);
    infotip.style.display = 'none';
    pointer.appendChild(infotip);

    interactionContainer.appendChild(pointer);

    const handle = document.createElement('div');
    handle.classList.add(constants.POINTER_HANDLE_CLASS);
    interactionContainer.appendChild(handle);

    this.mouseListeners_.push(listen(interactionContainer, 'mousedown', e => {
      self.setDragging(true);
    }));
    this.mouseListeners_.push(listen(interactionContainer, 'touchstart', e => {
      self.setDragging(true);
    }));

    this.interactions_ = interactionContainer;
  }

  /**
   * Sets an animation time.
   * @param {number} animationTime Animation time.
   */
  setAnimationTime(animationTime) {
    if (animationTime === this.getMap().get('time')) {
      this.updatePointer(animationTime);
      return;
    }
    const numFrames = this.frames_.length;
    let i;
    let currentIndex;
    let nextIndex;
    let updateAllowed = true;
    if (this.animationPlay_) {
      for (i = 0; i < numFrames; i++) {
        if (this.getMap().get('time') <= this.frames_[i]['endTime']) {
          currentIndex = i;
          break;
        }
      }
      if (currentIndex == null) {
        currentIndex = numFrames - 1;
      }
      nextIndex = (currentIndex + 1) % numFrames;
      Array.from(this.frames_[currentIndex].element.getElementsByClassName(constants.INDICATOR_CLASS)).forEach(indicatorElement => {
        if (indicatorElement.getAttribute('data-status') === constants.DATA_STATUS_WORKING) {
          updateAllowed = false;
        }
      });
      if (updateAllowed) {
        Array.from(this.frames_[nextIndex].element.getElementsByClassName(constants.INDICATOR_CLASS)).forEach(indicatorElement => {
          if (indicatorElement.getAttribute('data-status') === constants.DATA_STATUS_WORKING) {
            updateAllowed = false;
          }
        });
      }
    }
    if (updateAllowed) {
      this.getMap().set('time', animationTime);
      this.updatePointer(animationTime);
    }
  }

  /**
   * Updates pointer text and location on the time slider.
   * @param {number} animationTime Time value.
   */
  updatePointer(animationTime) {
    if (this.interactions_ == null) {
      return;
    }
    const numFrames = this.frames_.length;
    let i;
    let index;
    let needsUpdate;
    let tickText;
    for (i = 0; i < numFrames; i++) {
      if (animationTime <= this.frames_[i]['endTime']) {
        index = i;
        break;
      }
    }
    if (index != null) {
      if (this.interactions_.parentElement == null) {
        needsUpdate = true;
      } else if (Number.parseInt(this.interactions_.parentElement.dataset['time']) !== animationTime) {
        this.interactions_.parentElement.removeChild(this.interactions_);
        needsUpdate = true;
      }
      if (needsUpdate) {
        this.frames_[index].element.appendChild(this.interactions_);
        tickText = this.getTickText(this.frames_[index]['endTime'], false)['content'];
        Array.from(this.interactions_.getElementsByClassName(constants.POINTER_TEXT_CLASS)).forEach(textElement => {
          textElement.innerHTML = tickText;
        });
        Array.from(this.container_.getElementsByClassName(constants.POINTER_INFOTIP_CLASS)).forEach(infotip => {
          infotip.innerHTML = tickText;
        });
      }
    }
  }

  /**
   * Updates loading state visualization
   * @param {Object} timeSteps Loader counter information for intervals.
   */
  updateTimeLoaderVis(timeSteps) {
    let numIntervalItems = timeSteps.reduce((activeTimeSteps, timeStep) => {
      if (timeStep.active) {
        activeTimeSteps.push(timeStep);
      }
      return activeTimeSteps;
    }, []);
    if (!this.config_['showTimeSlider']) {
      return;
    }
    const numIntervals = numIntervalItems.length;
    let creationNeeded = (numIntervals !== this.frames_.length);
    let i;
    let moments = [];
    if (!creationNeeded) {
      for (i = 0; i < numIntervals; i++) {
        if (numIntervalItems[i]['endTime'] !== this.frames_[i]['endTime']) {
          creationNeeded = true;
          break;
        }
      }
    }
    if (creationNeeded) {
      for (i = 0; i < numIntervals; i++) {
        moments.push(numIntervalItems[i]['endTime']);
      }
      this.createTimeSlider(moments);
    }
    this.frames_.forEach((frame, index) => {
      Array.from(frame.element.getElementsByClassName(constants.INDICATOR_CLASS)).forEach(indicatorElement => {
        let numIntervals;
        let i;
        let time;
        let elementTime;
        let endTime;
        if ((indicatorElement.parentElement != null) && (indicatorElement.parentElement.dataset != null)) {
          elementTime = indicatorElement.parentElement.dataset.time;
        }
        if (elementTime == null) {
          return;
        }
        time = parseInt(elementTime);
        if (time != null) {
          numIntervals = numIntervalItems.length;
          for (i = 0; i < numIntervals; i++) {
            endTime = numIntervalItems[i].endTime;
            if ((endTime != null) && (endTime === time)) {
              indicatorElement.setAttribute('data-status', numIntervalItems[i].status);
              break;
            }
          }
        }
      });
    });
  }

  /**
   * Enables or disables pointer dragging.
   * @param {boolean} dragging True if pointer dragging is enabled.
   */
  setDragging(dragging) {
    this.dragging_ = dragging;
    if (this.dragging_) {
      this.getMap().set('playing', false);
    }
    const pointerEvents = dragging ? 'auto' : 'none';
    Array.from(this.container_.getElementsByClassName(constants.DRAG_LISTENER_CLASS))
      .forEach(element => {
        element.style.pointerEvents = pointerEvents;
      });
    Array.from(this.container_.getElementsByClassName(constants.POINTER_CLASS)).forEach(element => {
      if (dragging) {
        element.classList.add(constants.POINTER_DRAGGING);
      } else {
        element.classList.remove(constants.POINTER_DRAGGING);
      }
    });
    let display = dragging ? 'block' : 'none';
    Array.from(this.container_.getElementsByClassName(constants.POINTER_INFOTIP_CLASS))
      .forEach(element => {
        element.style.display = display;
      });
  }

  /**
   * Turns animation play on or off.
   * @param {boolean} animationPlay True if play is turned on.
   */
  setAnimationPlay(animationPlay) {
    this.animationPlay_ = animationPlay;
    if (this.animationPlay_) {
      this.playButton_.classList.add(constants.PLAYING_CLASS);
    } else {
      this.playButton_.classList.remove(constants.PLAYING_CLASS);
    }
  }

  /**
   * Sets a time zone.
   * @param {string} timeZone Time zone.
   */
  setTimeZone(timeZone) {
    const self = this;
    this.timeZone_ = timeZone;
    this.frames_.forEach(frame => {
      const tickText = self.getTickText(frame['endTime']);
      const textElement = frame.element.getElementsByClassName(constants.FRAME_TEXT_CLASS);
      if (textElement.length > 0) {
        textElement[0].textContent = tickText['content'];
      }
    });
  }

  /**
   * Sets a time zone.
   * @param {string} timeZoneLabel Time zone label.
   */
  setTimeZoneLabel(timeZoneLabel) {
    const self = this;
    this.timeZoneLabel_ = timeZoneLabel;
    Array.from(this.container_.getElementsByClassName(constants.TIMEZONE_LABEL_CLASS)).forEach(timeZoneLabelElement => {
      timeZoneLabelElement.innerHTML = self.timeZoneLabel_;
    });
  }

  /**
   * Sets callbacks.
   * @param {Object=} callbacks Callback functions for time events.
   */
  setCallbacks(callbacks) {
    this.callbacks_ = callbacks;
  }

  /**
   * Return information if meteorological optimizations are enabled.
   * @returns {boolean} Meteorological mode status.
   */
  isMeteorologicalMode() {
    return this.container_.classList.contains(constants.METEOROLOGICAL_MODE);
  }

  /**
   * Generate text presentation of the given time.
   * @param {number} tickTime Time value.
   * @param {boolean} showDate Show date information.
   * @returns {Object} Generated text presentation.
   */
  getTickText(tickTime, showDate = true) {
    let zTime;
    let numFrames;
    let i;
    let frameTime;
    let prevTime;
    let zPrevTime;
    let currentMoment;
    const format = 'HH:mm';
    const dateFormat = ' d.M.';
    let useDateFormat = false;
    const beginTime = (this.frames_.length > 0) ? this.frames_[0]['endTime'] : Number.NEGATIVE_INFINITY;
    if (beginTime == null) {
      return '';
    }
    if (tickTime < beginTime) {
      tickTime = beginTime;
    }
    zTime = DateTime
      .fromMillis(tickTime)
      .setZone(this.timeZone_)
      .setLocale(this.locale_);
    const day = zTime.ordinal;
    const year = zTime.year;
    if (showDate) {
      numFrames = this.frames_.length;
      for (i = 0; i < numFrames; i++) {
        frameTime = this.frames_[i]['endTime'];
        if (frameTime >= tickTime) {
          break;
        }
        if (Array.from(this.frames_[i].element.getElementsByClassName(constants.FRAME_TEXT_WRAPPER_CLASS)).length > 0) {
          prevTime = frameTime;
        }
      }
      currentMoment = DateTime.local().setZone(this.timeZone_);
      if (prevTime != null) {
        zPrevTime = DateTime.fromMillis(prevTime).setZone(this.timeZone_);
        if ((day !== zPrevTime.ordinal) || (year !== zPrevTime.year)) {
          useDateFormat = true;
        }
      } else if ((tickTime === beginTime) && ((day !== currentMoment.ordinal) || (year !== currentMoment.year))) {
        useDateFormat = true;
      }
    }
    return {
      content: useDateFormat ? zTime.weekdayShort + zTime.toFormat(dateFormat) : zTime.toFormat(format),
      useDateFormat: useDateFormat
    };
  }

  /**
   * Clears time slider configurations.
   */
  clear() {
    if (this.timeListener != null) {
      unByKey(this.timeListener);
    }
    if (this.playingListener != null) {
      unByKey(this.playingListener);
    }
    this.mouseListeners_.forEach(mouseListener => {
      mouseListener.destroy();
    });
    this.resizeDetector.removeAllListeners(this.container_);
    empty(this.container_);
    this.frames_ = [];
  }

  /**
   * Destroys current time slider.
   */
  destroy() {
    this.clear();
  }
}

export default TimeSlider;
