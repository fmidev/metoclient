/**
 * @module ol/metoclient/TimeSlider
 */
import listen from 'good-listener';
import elementResizeDetectorMaker from 'element-resize-detector';
import { unByKey } from 'ol/Observable';
import { DateTime } from 'luxon';
import Control from 'ol/control/Control';
import TimeFrame from './TimeFrame';
import * as constants from './constants';

/**
 *
 */
class TimeSlider extends Control {
  /**
   * Creates an instance of TimeSlider.
   *
   * @param options
   */
  constructor(options = {}) {
    const element = document.createElement('div');
    element.className = 'ol-unselectable ol-control fmi-metoclient-timeslider';
    if (options.meteorologicalMode) {
      element.className += ` ${constants.METEOROLOGICAL_MODE}`;
    }
    super({
      element,
      target: options.target,
    });
    this.container_ = element;
    this.config_ = options;
    this.enableMouseWheel_ = options.enableMouseWheel;
    this.interactions_ = null;
    this.playButton_ = null;
    this.animationPlay_ = false;
    this.frames_ = [];
    this.locale_ = options.locale;
    this.previousTickTextTop_ = Number.POSITIVE_INFINITY;
    this.previousTickTextRight_ = Number.NEGATIVE_INFINITY;
    this.previousTickTextBottom_ = Number.NEGATIVE_INFINITY;
    this.previousTickTextLeft_ = Number.POSITIVE_INFINITY;
    this.previousTickIndex_ = -1;
    this.mouseListeners_ = [];
    this.dragging_ = false;
    this.resizeDetector = elementResizeDetectorMaker();
    this.timeListener_ = null;
    this.playingListener_ = null;
    this.timeZoneListener = null;
    this.timeZoneLabelListener = null;
    this.set('timeZone', options.timeZone);
    this.set('timeZoneLabel', options.timeZoneLabel);
  }

  /**
   * Creates a new time slider.
   *
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
    this.timeListener_ = this.getMap().on('change:time', (evt) => {
      this.setAnimationTime(evt.target.get('time'));
    });
    this.playingListener_ = this.getMap().on('change:playing', (evt) => {
      this.setAnimationPlay(evt.target.get('playing'));
    });
    this.timeZoneListener_ = this.on('change:timeZone', () => {
      this.frames_.forEach((frame) => {
        const tickText = this.getTickText(frame.endTime);
        const textElement = frame.element.getElementsByClassName(
          constants.FRAME_TEXT_CLASS
        );
        if (textElement.length > 0) {
          textElement[0].textContent = tickText.content;
        }
      });
      if (this.getMap().get('time') != null) {
        this.updatePointer(this.getMap().get('time'), true);
      }
    });
    this.timeZoneLabelListener_ = this.on('change:timeZoneLabel', () => {
      Array.from(
        this.container_.getElementsByClassName(constants.TIMEZONE_LABEL_CLASS)
      ).forEach((timeZoneLabelElement) => {
        timeZoneLabelElement.innerHTML = this.get('timeZoneLabel');
      });
    });
    this.dispatchEvent('rendercomplete');
  }

  /**
   * Triggers a movement to the next or previous time moment
   *
   * @param {number} direction Forward or backward direction
   */
  step(direction) {
    const map = this.getMap();
    map.set('playing', false);
    if (direction > 0) {
      map.dispatchEvent({
        type: 'next',
        force: true,
      });
    } else if (direction < 0) {
      map.dispatchEvent('previous');
    }
  }

  /**
   * Creates container elements and appropriate listeners.
   *
   * @param {Array} moments Time values for the slider.
   */
  createContainers(moments) {
    const self = this;
    const clickableContainer = document.createElement('div');
    clickableContainer.classList.add(constants.CLICKABLE_CLASS);

    clickableContainer.appendChild(this.createPreMargin());
    clickableContainer.appendChild(this.createPreTools());

    const momentsContainer = document.createElement('div');
    momentsContainer.classList.add(constants.FRAMES_CONTAINER_CLASS);
    if (this.enableMouseWheel_) {
      this.mouseListeners_.push(
        listen(momentsContainer, 'wheel', (event) => {
          event.preventDefault();
          self.step(event.deltaY);
        })
      );
    }
    clickableContainer.appendChild(momentsContainer);

    clickableContainer.appendChild(this.createPostTools(moments));

    const postMargin = document.createElement('div');
    postMargin.classList.add(constants.POST_MARGIN_CLASS);
    this.mouseListeners_.push(
      listen(postMargin, 'click', (event) => {
        self.step(constants.FORWARDS);
      })
    );
    clickableContainer.appendChild(postMargin);

    clickableContainer.appendChild(this.createTimeZoneLabel());

    this.container_.appendChild(clickableContainer);

    this.container_.classList.add('noselect');

    this.mouseListeners_.push(
      listen(this.container_, 'mouseup', (event) => {
        self.setDragging(false);
        document.activeElement.blur();
      })
    );
    this.mouseListeners_.push(
      listen(this.container_, 'touchend', (event) => {
        self.setDragging(false);
        document.activeElement.blur();
      })
    );

    this.resizeDetector.listenTo(
      this.container_.getElementsByClassName(
        constants.FRAMES_CONTAINER_CLASS
      )[0],
      (element) => {
        self.createTicks();
      }
    );
  }

  /**
   * Creates functional margin area before the actual time slider.
   *
   * @returns {HTMLElement} Margin element.
   */
  createPreMargin() {
    const self = this;
    const preMargin = document.createElement('div');
    preMargin.classList.add(constants.PRE_MARGIN_CLASS);
    this.mouseListeners_.push(
      listen(preMargin, 'click', () => {
        self.step(constants.BACKWARDS);
      })
    );
    return preMargin;
  }

  /**
   * Creates an element for UI tools located in the slider before the first time step
   *
   * @returns {HTMLElement} An element for UI tools.
   */
  createPreTools() {
    const preTools = document.createElement('div');
    preTools.classList.add(constants.PRE_TOOLS_CLASS);

    const playButton = document.createElement('button');
    playButton.classList.add(constants.PLAY_BUTTON_CLASS);
    playButton.tabIndex = constants.BASE_TAB_INDEX;
    if (this.animationPlay_) {
      playButton.classList.add(constants.PLAYING_CLASS);
    }
    this.mouseListeners_.push(
      listen(playButton, 'click', (event) => {
        event.preventDefault();
        const map = this.getMap();
        map.set('playing', !map.get('playing'));
      })
    );
    this.playButton_ = playButton;

    preTools.appendChild(playButton);
    return preTools;
  }

  /**
   * Creates an element for UI tools located in the slider after the last time step.
   *
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
    return postTools;
  }

  /**
   * Creates an element for time zone label.
   *
   * @returns {HTMLElement} Time zone label.
   */
  createTimeZoneLabel() {
    const timezoneLabel = document.createElement('div');
    timezoneLabel.innerHTML = this.get('timeZoneLabel');
    timezoneLabel.classList.add(constants.TIMEZONE_LABEL_CLASS);
    return timezoneLabel;
  }

  /**
   * Creates time frames and provides the frames container with frame elements.
   *
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
    const framesContainer = this.container_.getElementsByClassName(
      constants.FRAMES_CONTAINER_CLASS
    )[0];
    let node;
    while ((node = framesContainer.lastChild)) {
      framesContainer.removeChild(node);
    }
    this.frames_ = [];
    if (numMoments < 2) {
      return;
    }
    const timePeriod = moments[numMoments - 1] - moments[0];

    for (i = 0; i < numMoments; i += 1) {
      beginTime = i === 0 ? 2 * moments[0] - moments[1] : moments[i - 1];
      endTime = moments[i];
      type =
        moments[i] <= currentTime
          ? constants.FRAME_HISTORY
          : constants.FRAME_FUTURE;
      weight = (100 * (endTime - beginTime)) / timePeriod;
      timeFrame = this.createFrame(beginTime, endTime, type, weight);
      timeFrame.element.getElementsByClassName(
        constants.KEYBOARD_ACCESSIBLE_CLASS
      )[0].tabIndex = constants.BASE_TAB_INDEX + i;
      framesContainer.appendChild(timeFrame.element);
      this.frames_.push(timeFrame);
    }
  }

  /**
   * Creates a single time frame and corresponding element listeners.
   *
   * @param {number} beginTime Begin time.
   * @param {number} endTime End time.
   * @param {string} type Frame type for observation or forecast.
   * @param {number} weight Weight corresponding time frame length.
   * @returns {object} Time frame.
   */
  createFrame(beginTime, endTime, type, weight) {
    const self = this;
    const map = this.getMap();
    const timeFrame = new TimeFrame({
      beginTime,
      endTime,
      type,
      weight,
    });
    let longClick;
    let longTap;
    let clickCount = 0;
    let singleClickTimer = 0;
    this.mouseListeners_.push(
      listen(timeFrame.element, 'mousedown', () => {
        if (this.isMeteorologicalMode()) {
          longClick = setTimeout(() => {
            clearTimeout(singleClickTimer);
            longClick = null;
            map.set('playing', false);
            map.set('time', timeFrame.endTime);
          }, constants.LONG_CLICK_DELAY);
        } else {
          map.set('playing', false);
          map.set('time', timeFrame.endTime);
        }
      })
    );
    this.mouseListeners_.push(
      listen(timeFrame.element, 'mouseup', () => {
        if (longClick != null && !self.dragging_) {
          clearTimeout(longClick);
          clickCount += 1;
          if (clickCount === 1) {
            singleClickTimer = setTimeout(() => {
              clearTimeout(longClick);
              clickCount = 0;
              if (timeFrame.endTime === map.get('time')) {
                map.set('playing', false);
                map.set('time', timeFrame.beginTime);
              } else {
                self.step(timeFrame.endTime - map.get('time'));
              }
            }, constants.DOUBLE_PRESS_DELAY);
          } else if (clickCount === 2) {
            clearTimeout(singleClickTimer);
            clickCount = 0;
            map.set('playing', false);
            map.set('time', timeFrame.endTime);
          }
        }
      })
    );
    this.mouseListeners_.push(
      listen(timeFrame.element, 'mouseout', () => {
        if (longClick != null) {
          clearTimeout(longClick);
        }
      })
    );
    this.mouseListeners_.push(
      listen(timeFrame.element, 'touchstart', () => {
        if (this.isMeteorologicalMode()) {
          longTap = setTimeout(() => {
            longTap = null;
            map.set('playing', false);
            map.set('time', timeFrame.endTime);
          }, constants.LONG_TAP_DELAY);
        } else {
          map.set('playing', false);
          map.set('time', timeFrame.endTime);
        }
      })
    );
    const stopTouch = () => {
      if (longTap != null) {
        clearTimeout(longTap);
      }
    };
    this.mouseListeners_.push(listen(timeFrame.element, 'touchend', stopTouch));
    this.mouseListeners_.push(
      listen(timeFrame.element, 'touchcancel', stopTouch)
    );
    this.mouseListeners_.push(
      listen(timeFrame.dragListenerElement, 'mousemove', (event) => {
        if (self.dragging_ && event?.buttons === 0) {
          this.setDragging(false);
        }
        if (!self.dragging_) {
          return;
        }
        document.activeElement.blur();
        map.set('playing', false);
        map.set('time', timeFrame.endTime);
      })
    );
    this.mouseListeners_.push(
      listen(timeFrame.element, 'touchmove', (event) => {
        if (!self.dragging_ || event.changedTouches[0] === undefined) {
          return;
        }
        let currentTimeFrame;
        const numFrames = this.frames_.length;
        let rect;
        const orientation = !this.container_.classList.contains(
          constants.ROTATED
        )
          ? constants.HORIZONTAL
          : constants.VERTICAL;
        const geom = {
          [constants.HORIZONTAL]: {
            coord: 'clientX',
            min: 'left',
            max: 'right',
          },
          [constants.VERTICAL]: {
            coord: 'clientY',
            min: 'top',
            max: 'bottom',
          },
        };
        const touchCoord = event.changedTouches[0][geom[orientation].coord];
        for (let i = 0; i < numFrames; i += 1) {
          rect = this.frames_[i].element.getBoundingClientRect();
          if (
            rect[geom[orientation].min] <= touchCoord &&
            touchCoord <= rect[geom[orientation].max]
          ) {
            currentTimeFrame = this.frames_[i];
            break;
          }
        }
        document.activeElement.blur();
        if (
          currentTimeFrame != null &&
          currentTimeFrame.endTime !== map.get('time')
        ) {
          clearTimeout(longTap);
          map.set('playing', false);
          map.set('time', currentTimeFrame.endTime);
        }
      })
    );

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
    const numDiscreteSteps = constants.discreteSteps.length;
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
      nextStep = j > 0 ? minStep : Number.POSITIVE_INFINITY;
      this.frames_.forEach((frame, index, frames) => {
        if (
          frame.element.getElementsByClassName(constants.FRAME_TICK_CLASS)
            .length > 0
        ) {
          if (stepStart >= 0) {
            step = frame.endTime - frames[stepStart].endTime;
            if ((j === 0 && step < nextStep) || (j !== 0 && step > nextStep)) {
              nextStep = step;
            }
          }
          stepStart = index;
        }
      });
      if (
        nextStep !== minStep &&
        ((nextStep < constants.HOUR && constants.HOUR % nextStep !== 0) ||
          (nextStep > constants.HOUR && nextStep % constants.HOUR !== 0) ||
          (nextStep < constants.DAY && constants.DAY % nextStep !== 0))
      ) {
        for (i = 0; i < numDiscreteSteps; i += 1) {
          if (nextStep < constants.discreteSteps[i]) {
            nextStep = constants.discreteSteps[i];
            break;
          }
        }
      }
      j += 1;
    } while (
      timeStepsUsed &&
      nextStep !== minStep &&
      nextStep < constants.DAY / 2
    );
    this.optimizeTicks()
    this.showTicks();
  }

  optimizeTicks() {
    const self = this;
    const textFrames = this.frames_.filter((frame) => {
      if (frame?.element?.children != null) {
        const childElements = Array.from(frame.element.children);
        const numChildElements = childElements.length;
        for (let i = 0; i < numChildElements; i++) {
          if (childElements[i].classList.contains(constants.FRAME_TEXT_WRAPPER_CLASS)) {
            return true
          }
        }
      }
      return false;
    })
    if (textFrames.length !== 1) {
      return
    }
    const framesContainer = this.getFramesContainer()
    const hourSteps = [24, 12, 8, 6, 4, 3, 2, 1]
    const numHourSteps = hourSteps.length;
    loopHourSteps:
    for (let i = 0; i < numHourSteps; i++) {
      const numFrames = this.frames_.length;
      for (let  j = 0; j < numFrames; j++) {
        if (this.frames_[j].endTime >= textFrames[0].endTime) {
          break;
        }
        if (DateTime.fromMillis(this.frames_[j].endTime).setZone(self.get('timeZone')).hour % hourSteps[i] === 0) {
          this.addTextToFrame(this.frames_[j])
          const clientRects = [this.frames_[j], textFrames[0]].map((frame) =>
            Array.from(
              frame.element.getElementsByClassName(constants.FRAME_TEXT_WRAPPER_CLASS)
            ).shift().getBoundingClientRect());
          if (framesContainer.length === 0 ||
            (framesContainer.left <= clientRects[0].left &&
              framesContainer.right >= clientRects[0].right &&
              framesContainer.top <= clientRects[0].top &&
              framesContainer.bottom >= clientRects[0].bottom &&
              clientRects[0].right < clientRects[1].left
            )) {
            const tick = document.createElement('div');
            tick.classList.add(constants.FRAME_TICK_CLASS);
            tick.classList.add(constants.HIDDEN_CLASS);
            this.frames_[j].element.appendChild(tick);
            break loopHourSteps;
          } else {
            this.clearFrame(this.frames_[j]);
          }
        }        
      }
    }
  }

  clearFrame(frame) {
    const removeChildrenByClass = (className) => {
      Array.from(frame.element.getElementsByClassName(className)).forEach(
        (element) => {
          element.parentElement.removeChild(element);
        }
      );
    };
    removeChildrenByClass(constants.FRAME_TEXT_WRAPPER_CLASS);
    removeChildrenByClass(constants.FRAME_TICK_CLASS);
  }

  addTextToFrame(frame) {
    this.clearFrame(frame);

    const textWrapperElement = document.createElement('div');
    textWrapperElement.classList.add(constants.FRAME_TEXT_WRAPPER_CLASS);

    const textElement = document.createElement('span');
    textElement.classList.add(constants.FRAME_TEXT_CLASS);
    textElement.classList.add(constants.NO_SELECT_CLASS);
    const tickText = this.getTickText(frame.endTime);
    textElement.textContent = tickText.content;
    frame.useDateFormat = tickText.useDateFormat;

    textWrapperElement.appendChild(textElement);

    frame.element.appendChild(textWrapperElement);
  }

  /**
   * 
   * @returns 
   */
  getFramesContainer() {
    let framesContainer = Array.from(
      this.container_.getElementsByClassName(constants.FRAMES_CONTAINER_CLASS)
    );
    if (framesContainer.length > 0) {
      framesContainer = framesContainer[0].getBoundingClientRect();
    }
    return framesContainer;
  }

  /**
   * Performs a new iteration for tick distribution optimization.
   *
   * @param {number=} minStep Minimum allowed time step.
   * @returns {boolean} Information if using default time step is suitable for the current data.
   */
  configureTicks(minStep = 0) {
    const self = this;
    let tick;
    let maxTextWidth = 0;
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

    this.frames_.forEach((frame) => {
      this.addTextToFrame(frame)
    });

    const hourFormatExists = this.frames_.some((frame) => !frame.useDateFormat);

    // Separate loops to prevent accessing textElement width before it is available
    this.frames_.forEach((frame, index, frames) => {
      const nextIndex = index + 1;
      frame.element.style.display = '';

      if (
        DateTime.fromMillis(frame.endTime)
          .setZone(self.get('timeZone'))
          .startOf('day')
          .valueOf() === frame.endTime
      ) {
        divisibleDays = true;
      }
      if (nextIndex === frames.length) {
        return;
      }
      const textElement = frame.element.querySelector(
        `span.${constants.FRAME_TEXT_CLASS}`
      );
      const clientRect = textElement.getBoundingClientRect();
      if (maxTextWidth < clientRect.width) {
        maxTextWidth = clientRect.width;
      }
      const localTimeStep = frames[nextIndex].endTime - frame.endTime;
      if (
        DateTime.fromMillis(frame.endTime).setZone(self.get('timeZone'))
          .isInDST &&
        localTimeStep < constants.DAY
      ) {
        containsDST = true;
      } else {
        containsNonDST = true;
      }
      if (timeStep == null) {
        useTimeStep = true;
        timeStep = localTimeStep;
      } else if (useTimeStep && localTimeStep !== timeStep) {
        useTimeStep = false;
      }
    });
    if (containsDST && containsNonDST) {
      useTimeStep = false;
    }
    // Prevent common tick asynchrony
    if (useTimeStep) {
      timeStep *= 2;
    }

    const newTextWidth = `${Math.round(maxTextWidth)}px`;
    Array.from(
      this.container_.getElementsByClassName(constants.FRAME_TEXT_WRAPPER_CLASS)
    ).forEach((element) => {
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

    framesContainer = this.getFramesContainer();

    this.frames_.forEach((frame, index, frames) => {
      const textElementArray = Array.from(
        frame.element.getElementsByClassName(constants.FRAME_TEXT_WRAPPER_CLASS)
      );
      if (textElementArray.length === 0) {
        return;
      }
      const textWrapper = textElementArray.shift();
      const clientRect = textWrapper.getBoundingClientRect();

      // Prevent text overlapping, favor full hours
      if (
        framesContainer.length === 0 ||
        (framesContainer.left <= clientRect.left &&
          framesContainer.right >= clientRect.right &&
          framesContainer.top <= clientRect.top &&
          framesContainer.bottom >= clientRect.bottom)
      ) {
        if (
          (self.previousTickTextRight_ < clientRect.left ||
            self.previousTickTextLeft_ > clientRect.right ||
            self.previousTickTextBottom_ < clientRect.top ||
            self.previousTickTextTop_ > clientRect.bottom) &&
          (self.previousTickIndex_ == null ||
            frame.endTime - frames[self.previousTickIndex_].endTime >= minStep)
        ) {
          createTick(frame, index, clientRect, frame.endTime);
        } else if (
          index > 0 &&
          self.previousTickIndex_ >= 0 &&
          frames[self.previousTickIndex_] != null &&
          ((minStep === 0 &&
            ((frame.endTime % constants.HOUR === 0 &&
              frames[self.previousTickIndex_].endTime % constants.HOUR !== 0) ||
              (useTimeStep &&
                (frame.endTime % constants.HOUR) % timeStep === 0 &&
                (frames[self.previousTickIndex_].endTime % constants.HOUR) %
                  timeStep !==
                  0) ||
              (frame.endTime % constants.HOUR === 0 &&
                frames[self.previousTickIndex_].endTime % constants.HOUR ===
                  0 &&
                DateTime.fromMillis(frame.endTime).setZone(self.get('timeZone'))
                  .hour %
                  2 ===
                  0 &&
                DateTime.fromMillis(
                  frames[self.previousTickIndex_].endTime
                ).setZone(self.get('timeZone')).hour %
                  2 !==
                  0)) &&
            hourFormatExists &&
            !frames[self.previousTickIndex_].useDateFormat) ||
            (hourFormatExists && frame.useDateFormat) ||
            (minStep > 0 &&
              ((minStep >= constants.HOUR &&
                frames[self.previousTickIndex_].endTime % constants.HOUR !==
                  0) ||
                (frames[self.previousTickIndex_].endTime % constants.HOUR) %
                  minStep !==
                  0 ||
                (divisibleDays &&
                  DateTime.fromMillis(
                    frames[self.previousTickIndex_].endTime
                  ).setZone(self.get('timeZone')).hour %
                    (minStep / constants.HOUR) !==
                    0))))
        ) {
          this.clearFrame(frames[self.previousTickIndex_]);
          createTick(frame, index, clientRect, frame.endTime);
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
    Array.from(
      this.container_.getElementsByClassName(constants.FRAME_TICK_CLASS)
    ).forEach((element) => {
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

    const infotip = document.createElement('div');
    infotip.classList.add(constants.POINTER_INFOTIP_CLASS);
    infotip.style.display = 'none';
    pointer.appendChild(infotip);

    interactionContainer.appendChild(pointer);

    const handle = document.createElement('div');
    handle.classList.add(constants.POINTER_HANDLE_CLASS);
    interactionContainer.appendChild(handle);

    this.mouseListeners_.push(
      listen(interactionContainer, 'mousedown', () => {
        self.setDragging(true);
      })
    );
    this.mouseListeners_.push(
      listen(interactionContainer, 'touchstart', () => {
        self.setDragging(true);
      })
    );

    this.interactions_ = interactionContainer;
  }

  /**
   * Sets an animation time.
   *
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
      for (i = 0; i < numFrames; i += 1) {
        if (this.getMap().get('time') <= this.frames_[i].endTime) {
          currentIndex = i;
          break;
        }
      }
      if (currentIndex == null) {
        currentIndex = numFrames - 1;
      }
      nextIndex = (currentIndex + 1) % numFrames;
      Array.from(
        this.frames_[currentIndex].element.getElementsByClassName(
          constants.INDICATOR_CLASS
        )
      ).forEach((indicatorElement) => {
        if (
          indicatorElement.getAttribute(constants.DATA_STATUS_ATTRIBUTE) ===
          constants.DATA_STATUS_WORKING
        ) {
          updateAllowed = false;
        }
      });
      if (updateAllowed) {
        Array.from(
          this.frames_[nextIndex].element.getElementsByClassName(
            constants.INDICATOR_CLASS
          )
        ).forEach((indicatorElement) => {
          if (
            indicatorElement.getAttribute(constants.DATA_STATUS_ATTRIBUTE) ===
            constants.DATA_STATUS_WORKING
          ) {
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
   *
   * @param {number} animationTime Time value.
   * @param {boolean=} forceUpdate Forces an update.
   */
  updatePointer(animationTime, forceUpdate = false) {
    if (this.interactions_ == null) {
      return;
    }
    const numFrames = this.frames_.length;
    let i;
    let index;
    let needsUpdate;
    let tickText;
    for (i = 0; i < numFrames; i += 1) {
      if (animationTime <= this.frames_[i].endTime) {
        index = i;
        break;
      }
    }
    if (index != null) {
      if (forceUpdate) {
        needsUpdate = true;
      } else if (this.interactions_.parentElement == null) {
        needsUpdate = true;
      } else if (
        Number.parseInt(this.interactions_.parentElement.dataset.time, 10) !==
        animationTime
      ) {
        this.interactions_.parentElement.removeChild(this.interactions_);
        needsUpdate = true;
      }
      if (needsUpdate) {
        this.frames_[index].element.appendChild(this.interactions_);
        tickText = this.getTickText(this.frames_[index].endTime, false).content;
        Array.from(
          this.interactions_.getElementsByClassName(
            constants.POINTER_TEXT_CLASS
          )
        ).forEach((textElement) => {
          textElement.innerHTML = tickText;
        });
        Array.from(
          this.container_.getElementsByClassName(
            constants.POINTER_INFOTIP_CLASS
          )
        ).forEach((infotip) => {
          infotip.innerHTML = tickText;
        });
      }
    }
  }

  /**
   * Updates loading state visualization
   *
   * @param {object} timeSteps Loader counter information for intervals.
   */
  updateTimeLoaderVis(timeSteps, forceUpdate = false) {
    const numIntervalItems = timeSteps.reduce((activeTimeSteps, timeStep) => {
      if (timeStep.active) {
        activeTimeSteps.push(timeStep);
      }
      return activeTimeSteps;
    }, []);
    if (!this.config_.showTimeSlider) {
      return;
    }
    const numIntervals = numIntervalItems.length;
    let creationNeeded = numIntervals !== this.frames_.length || forceUpdate;
    let i;
    const moments = [];
    if (!creationNeeded) {
      for (i = 0; i < numIntervals; i += 1) {
        if (numIntervalItems[i].endTime !== this.frames_[i].endTime) {
          creationNeeded = true;
          break;
        }
      }
    }
    this.container_.style.display = numIntervals > 0 ? 'block' : 'none';
    if (creationNeeded) {
      for (i = 0; i < numIntervals; i += 1) {
        moments.push(numIntervalItems[i].endTime);
      }
      this.createFrames(moments);
      this.createIndicators();
      this.createTicks();
      if (this.getMap().get('time') != null) {
        this.updatePointer(this.getMap().get('time'), true);
      }
    }
    this.frames_.forEach((frame) => {
      Array.from(
        frame.element.getElementsByClassName(constants.INDICATOR_CLASS)
      ).forEach((indicatorElement) => {
        let numIntervals;
        let time;
        let elementTime;
        let endTime;
        if (
          indicatorElement.parentElement != null &&
          indicatorElement.parentElement.dataset != null
        ) {
          elementTime = indicatorElement.parentElement.dataset.time;
        }
        if (elementTime == null) {
          return;
        }
        time = parseInt(elementTime, 10);
        if (time != null) {
          numIntervals = numIntervalItems.length;
          for (let j = 0; j < numIntervals; j += 1) {
            endTime = numIntervalItems[j].endTime;
            if (endTime != null && endTime === time) {
              indicatorElement.setAttribute(
                'data-status',
                numIntervalItems[j].status
              );
              break;
            }
          }
        }
      });
    });
  }

  /**
   * Enables or disables pointer dragging.
   *
   * @param {boolean} dragging True if pointer dragging is enabled.
   */
  setDragging(dragging) {
    this.dragging_ = dragging;
    if (this.dragging_) {
      this.getMap().set('playing', false);
    }
    const pointerEvents = dragging ? 'auto' : 'none';
    Array.from(
      this.container_.getElementsByClassName(constants.DRAG_LISTENER_CLASS)
    ).forEach((element) => {
      element.style.pointerEvents = pointerEvents;
    });
    Array.from(
      this.container_.getElementsByClassName(constants.POINTER_CLASS)
    ).forEach((element) => {
      if (dragging) {
        element.classList.add(constants.POINTER_DRAGGING);
      } else {
        element.classList.remove(constants.POINTER_DRAGGING);
      }
    });
    const display = dragging ? 'block' : 'none';
    Array.from(
      this.container_.getElementsByClassName(constants.POINTER_INFOTIP_CLASS)
    ).forEach((element) => {
      element.style.display = display;
    });
  }

  /**
   * Turns animation play on or off.
   *
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
   * Return information if meteorological optimizations are enabled.
   *
   * @returns {boolean} Meteorological mode status.
   */
  isMeteorologicalMode() {
    return this.container_.classList.contains(constants.METEOROLOGICAL_MODE);
  }

  /**
   * Generate text presentation of the given time.
   *
   * @param {number} tickTime Time value.
   * @param {boolean} showDate Show date information.
   * @returns {object} Generated text presentation.
   */
  getTickText(tickTime, showDate = true) {
    let numFrames;
    let i;
    let frameTime;
    let prevTime;
    let zPrevTime;
    let currentMoment;
    const format = 'HH:mm';
    const dateFormat = `${String.fromCharCode(160)}d.M.`;
    let useDateFormat = false;
    const beginTime =
      this.frames_.length > 0
        ? this.frames_[0].endTime
        : Number.NEGATIVE_INFINITY;
    if (beginTime == null) {
      return '';
    }
    if (tickTime < beginTime) {
      tickTime = beginTime;
    }
    const zTime = DateTime.fromMillis(tickTime)
      .setZone(this.get('timeZone'))
      .setLocale(this.locale_);
    const day = zTime.ordinal;
    const { year } = zTime;
    if (showDate) {
      numFrames = this.frames_.length;
      for (i = 0; i < numFrames; i += 1) {
        frameTime = this.frames_[i].endTime;
        if (frameTime >= tickTime) {
          break;
        }
        if (
          Array.from(
            this.frames_[i].element.getElementsByClassName(
              constants.FRAME_TEXT_WRAPPER_CLASS
            )
          ).length > 0
        ) {
          prevTime = frameTime;
        }
      }
      currentMoment = DateTime.local().setZone(this.get('timeZone'));
      if (prevTime != null) {
        zPrevTime = DateTime.fromMillis(prevTime).setZone(this.get('timeZone'));
        if (day !== zPrevTime.ordinal || year !== zPrevTime.year) {
          useDateFormat = true;
        }
      } else if (
        tickTime === beginTime &&
        (day !== currentMoment.ordinal || year !== currentMoment.year)
      ) {
        useDateFormat = true;
      }
    }
    return {
      content: useDateFormat
        ? zTime.weekdayShort.charAt(0).toUpperCase() + zTime.weekdayShort.slice(1)
        + zTime.toFormat(dateFormat) : zTime.toFormat(format),
      useDateFormat,
    };
  }

  getClock() {
    return this.getTickText(this.getMap().get('time'), false).content;
  }

  /**
   * Clears time slider configurations.
   */
  clear() {
    if (this.timeListener_ != null) {
      unByKey(this.timeListener_);
    }
    if (this.playingListener_ != null) {
      unByKey(this.playingListener_);
    }
    if (this.timeZoneListener != null) {
      unByKey(this.timeZoneListener);
    }
    if (this.timeZoneLabelListener != null) {
      unByKey(this.timeZoneLabelListener);
    }
    this.mouseListeners_.forEach((mouseListener) => {
      mouseListener.destroy();
    });
    this.resizeDetector.removeAllListeners(this.container_);
    if (this.container_ != null && this.container_.lastChild != null) {
      this.container_.removeChild(this.container_.lastChild);
    }
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
