/**
 * @module ol/metoclient/TimeSlider
 */
import listen from 'good-listener';
import elementResizeDetectorMaker from 'element-resize-detector';
import { unByKey } from 'ol/Observable';
import { EventsKey } from 'ol/events';
import { DateTime } from 'luxon';
import Control from 'ol/control/Control';
import TimeFrame from './TimeFrame';
import * as constants from './constants';

/** Handle returned by the good-listener `listen` function. */
interface ListenerHandle {
  destroy(): void;
}

/** Tick text result from getTickText. */
interface TickText {
  content: string;
  useDateFormat: boolean;
}

/** Options for creating a TimeSlider. */
export interface TimeSliderOptions {
  target?: string | HTMLElement;
  meteorologicalMode?: boolean;
  enableMouseWheel?: boolean;
  locale?: string;
  timeZone?: string;
  timeZoneLabel?: string;
  showTimeSlider?: boolean;
  buttonPlayText?: string;
  buttonPauseText?: string;
}

/** Timestep item used in updateTimeLoaderVis. */
interface TimeStepItem {
  active: boolean;
  endTime: number;
  status: string;
}

/**
 * Time slider control for animated weather maps.
 */
class TimeSlider extends Control {
  private container_: HTMLDivElement;
  private config_: TimeSliderOptions;
  private enableMouseWheel_: boolean | undefined;
  private interactions_: HTMLDivElement | null;
  private playButton_: HTMLButtonElement | null;
  private animationPlay_: boolean;
  private frames_: TimeFrame[];
  private locale_: string | undefined;
  private previousTickTextTop_: number | null;
  private previousTickTextRight_: number;
  private previousTickTextBottom_: number | null;
  private previousTickTextLeft_: number | null;
  private previousTickIndex_: number | null;
  private previousTickValue_: number | null;
  private mouseListeners_: ListenerHandle[];
  private dragging_: boolean;
  public resizeDetector: elementResizeDetectorMaker.Erd;
  private timeListener_: EventsKey | EventsKey[] | null;
  private playingListener_: EventsKey | EventsKey[] | null;
  private timeZoneListener_: EventsKey | EventsKey[] | null;
  private timeZoneLabelListener_: EventsKey | EventsKey[] | null;

  /**
   * Creates an instance of TimeSlider.
   *
   * @param {TimeSliderOptions} options Time slider options.
   */
  constructor(options: TimeSliderOptions = {}) {
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
    this.previousTickValue_ = null;
    this.mouseListeners_ = [];
    this.dragging_ = false;
    this.resizeDetector = elementResizeDetectorMaker();
    this.timeListener_ = null;
    this.playingListener_ = null;
    this.timeZoneListener_ = null;
    this.timeZoneLabelListener_ = null;
    this.set('timeZone', options.timeZone);
    this.set('timeZoneLabel', options.timeZoneLabel);
  }

  /**
   * Creates a new time slider.
   *
   * @param {number[]} moments Time values for the slider.
   */
  createTimeSlider(moments: number[]): void {
    this.dispatchEvent('render');
    this.clear();
    this.createContainers(moments);
    this.createFrames(moments);
    this.createIndicators();
    this.createTicks();
    this.createInteractions();
    const map = this.getMap();
    if (map != null && map.get('time') != null) {
      this.updatePointer(map.get('time'));
    }
    this.timeListener_ = map!.on('change:time' as any, (evt: any) => {
      this.setAnimationTime(evt.target.get('time'));
    });
    this.playingListener_ = map!.on('change:playing' as any, (evt: any) => {
      this.setAnimationPlay(evt.target.get('playing'));
    });
    this.timeZoneListener_ = this.on('change:timeZone' as any, () => {
      this.frames_.forEach((frame) => {
        const tickText = this.getTickText(frame.endTime);
        const textElement = frame.element.getElementsByClassName(
          constants.FRAME_TEXT_CLASS
        );
        if (textElement.length > 0) {
          textElement[0].textContent = tickText.content;
        }
      });
      const map = this.getMap();
      if (map != null && map.get('time') != null) {
        this.updatePointer(map.get('time'), true);
      }
    });
    this.timeZoneLabelListener_ = this.on('change:timeZoneLabel' as any, () => {
      Array.from(
        this.container_.getElementsByClassName(constants.TIMEZONE_LABEL_CLASS)
      ).forEach((timeZoneLabelElement) => {
        (timeZoneLabelElement as HTMLElement).innerHTML =
          this.get('timeZoneLabel');
      });
    });
    this.dispatchEvent('rendercomplete');
  }

  /**
   * Triggers a movement to the next or previous time moment.
   *
   * @param {number} direction Forward or backward direction.
   */
  step(direction: number): void {
    const map = this.getMap()!;
    map.set('playing', false);
    if (direction > 0) {
      map.dispatchEvent({
        type: 'next',
        force: true,
      } as any);
    } else if (direction < 0) {
      map.dispatchEvent('previous');
    }
  }

  /**
   * Creates container elements and appropriate listeners.
   *
   * @param {number[]} moments Time values for the slider.
   */
  createContainers(moments: number[]): void {
    const self = this;
    const clickableContainer = document.createElement('div');
    clickableContainer.classList.add(constants.CLICKABLE_CLASS);

    clickableContainer.appendChild(this.createPreMargin());
    clickableContainer.appendChild(this.createPreTools());

    const momentsContainer = document.createElement('div');
    momentsContainer.classList.add(constants.FRAMES_CONTAINER_CLASS);
    if (this.enableMouseWheel_) {
      this.mouseListeners_.push(
        listen(momentsContainer, 'wheel', (event: Event) => {
          event.preventDefault();
          self.step((event as WheelEvent).deltaY);
        })
      );
    }
    clickableContainer.appendChild(momentsContainer);

    clickableContainer.appendChild(this.createPostTools(moments));

    const postMargin = document.createElement('div');
    postMargin.classList.add(constants.POST_MARGIN_CLASS);
    this.mouseListeners_.push(
      listen(postMargin, 'click', (_event: Event) => {
        self.step(constants.FORWARDS);
      })
    );
    clickableContainer.appendChild(postMargin);

    clickableContainer.appendChild(this.createTimeZoneLabel());

    this.container_.appendChild(clickableContainer);

    this.container_.classList.add('noselect');

    this.mouseListeners_.push(
      listen(this.container_, 'mouseup', (_event: Event) => {
        self.setDragging(false);
        (document.activeElement as HTMLElement | null)?.blur();
      })
    );
    this.mouseListeners_.push(
      listen(this.container_, 'touchend', (_event: Event) => {
        self.setDragging(false);
        (document.activeElement as HTMLElement | null)?.blur();
      })
    );

    this.resizeDetector.listenTo(
      this.container_.getElementsByClassName(
        constants.FRAMES_CONTAINER_CLASS
      )[0] as HTMLElement,
      (_element: HTMLElement) => {
        self.createTicks();
      }
    );
  }

  /**
   * Creates functional margin area before the actual time slider.
   *
   * @returns {HTMLDivElement} Margin element.
   */
  createPreMargin(): HTMLDivElement {
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
   * Creates an element for UI tools located in the slider before the first time step.
   *
   * @returns {HTMLDivElement} An element for UI tools.
   */
  createPreTools(): HTMLDivElement {
    const preTools = document.createElement('div');
    preTools.classList.add(constants.PRE_TOOLS_CLASS);

    const playButton = document.createElement('button');
    playButton.classList.add(constants.PLAY_BUTTON_CLASS);
    playButton.tabIndex = constants.BASE_TAB_INDEX;
    if (this.animationPlay_) {
      playButton.classList.add(constants.PLAYING_CLASS);
      playButton.setAttribute('aria-label', this.config_.buttonPauseText ?? '');
    } else {
      playButton.setAttribute('aria-label', this.config_.buttonPlayText ?? '');
    }
    this.mouseListeners_.push(
      listen(playButton, 'click', (event: Event) => {
        event.preventDefault();
        const map = this.getMap()!;
        map.set('playing', !map.get('playing'));
        playButton.setAttribute(
          'aria-label',
          map.get('playing')
            ? this.config_.buttonPauseText ?? ''
            : this.config_.buttonPlayText ?? ''
        );
      })
    );
    this.playButton_ = playButton;

    preTools.appendChild(playButton);
    return preTools;
  }

  /**
   * Creates an element for UI tools located in the slider after the last time step.
   *
   * @param {number[]} moments Time values for the slider.
   * @returns {HTMLDivElement} An element for UI tools.
   */
  createPostTools(moments: number[]): HTMLDivElement {
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
   * @returns {HTMLDivElement} Time zone label.
   */
  createTimeZoneLabel(): HTMLDivElement {
    const timezoneLabel = document.createElement('div');
    timezoneLabel.innerHTML = this.get('timeZoneLabel') ?? '';
    timezoneLabel.classList.add(constants.TIMEZONE_LABEL_CLASS);
    return timezoneLabel;
  }

  /**
   * Creates time frames and provides the frames container with frame elements.
   *
   * @param {number[]} moments Time values for the slider.
   */
  createFrames(moments: number[]): void {
    let i: number;
    const numMoments = moments.length;
    const currentTime = Date.now();
    let beginTime: number;
    let endTime: number;
    let type: string;
    let weight: number;
    let timeFrame: TimeFrame;
    const framesContainer = this.container_.getElementsByClassName(
      constants.FRAMES_CONTAINER_CLASS
    )[0];
    let node: ChildNode | null;
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
      (
        timeFrame.element.getElementsByClassName(
          constants.KEYBOARD_ACCESSIBLE_CLASS
        )[0] as HTMLElement
      ).tabIndex = constants.BASE_TAB_INDEX + i;
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
   * @returns {TimeFrame} Time frame.
   */
  createFrame(
    beginTime: number,
    endTime: number,
    type: string,
    weight: number
  ): TimeFrame {
    const self = this;
    const map = this.getMap()!;
    const timeFrame = new TimeFrame({
      beginTime,
      endTime,
      type,
      weight: String(weight),
    });
    let longClick: ReturnType<typeof setTimeout> | null;
    let longTap: ReturnType<typeof setTimeout> | null;
    let clickCount = 0;
    let singleClickTimer: ReturnType<typeof setTimeout> | number = 0;
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
              clearTimeout(longClick!);
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
    const stopTouch = (): void => {
      if (longTap != null) {
        clearTimeout(longTap);
      }
    };
    this.mouseListeners_.push(listen(timeFrame.element, 'touchend', stopTouch));
    this.mouseListeners_.push(
      listen(timeFrame.element, 'touchcancel', stopTouch)
    );
    this.mouseListeners_.push(
      listen(timeFrame.dragListenerElement, 'mousemove', (event: Event) => {
        const mouseEvent = event as MouseEvent;
        if (self.dragging_ && mouseEvent?.buttons === 0) {
          this.setDragging(false);
        }
        if (!self.dragging_) {
          return;
        }
        (document.activeElement as HTMLElement | null)?.blur();
        map.set('playing', false);
        map.set('time', timeFrame.endTime);
      })
    );
    this.mouseListeners_.push(
      listen(timeFrame.element, 'touchmove', (event: Event) => {
        const touchEvent = event as TouchEvent;
        if (!self.dragging_ || touchEvent.changedTouches[0] === undefined) {
          return;
        }
        let currentTimeFrame: TimeFrame | undefined;
        const numFrames = this.frames_.length;
        let rect: DOMRect;
        const orientation = !this.container_.classList.contains(
          constants.ROTATED
        )
          ? constants.HORIZONTAL
          : constants.VERTICAL;
        const geom: Record<
          string,
          { coord: 'clientX' | 'clientY'; min: string; max: string }
        > = {
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
        const touchCoord =
          touchEvent.changedTouches[0][geom[orientation].coord];
        for (let i = 0; i < numFrames; i += 1) {
          rect = this.frames_[i].element.getBoundingClientRect();
          if (
            (rect as any)[geom[orientation].min] <= touchCoord &&
            touchCoord <= (rect as any)[geom[orientation].max]
          ) {
            currentTimeFrame = this.frames_[i];
            break;
          }
        }
        (document.activeElement as HTMLElement | null)?.blur();
        if (
          currentTimeFrame != null &&
          currentTimeFrame.endTime !== map.get('time')
        ) {
          clearTimeout(longTap!);
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
  createIndicators(): void {
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
  createTicks(): void {
    let step: number;
    let stepStart: number;
    const numDiscreteSteps = constants.discreteSteps.length;
    let minStep: number;
    let nextStep = 0;
    let i: number;
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
    this.optimizeTicks();
    this.showTicks();
  }

  /**
   * Optimizes tick distribution when only one text frame exists.
   */
  optimizeTicks(): void {
    const self = this;
    const textFrames = this.frames_.filter((frame) => {
      if (frame?.element?.children != null) {
        const childElements = Array.from(frame.element.children);
        const numChildElements = childElements.length;
        for (let i = 0; i < numChildElements; i++) {
          if (
            childElements[i].classList.contains(
              constants.FRAME_TEXT_WRAPPER_CLASS
            )
          ) {
            return true;
          }
        }
      }
      return false;
    });
    if (textFrames.length !== 1) {
      return;
    }
    const framesContainer = this.getFramesContainer();
    const hourSteps = [24, 12, 8, 6, 4, 3, 2, 1];
    const numHourSteps = hourSteps.length;
    loopHourSteps: for (let i = 0; i < numHourSteps; i++) {
      const numFrames = this.frames_.length;
      for (let j = 0; j < numFrames; j++) {
        if (this.frames_[j].endTime >= textFrames[0].endTime) {
          break;
        }
        if (
          DateTime.fromMillis(this.frames_[j].endTime).setZone(
            self.get('timeZone')
          ).hour %
            hourSteps[i] ===
          0
        ) {
          this.addTextToFrame(this.frames_[j]);
          const clientRects = [this.frames_[j], textFrames[0]].map((frame) =>
            (
              Array.from(
                frame.element.getElementsByClassName(
                  constants.FRAME_TEXT_WRAPPER_CLASS
                )
              ).shift() as HTMLElement
            ).getBoundingClientRect()
          );
          if (
            (framesContainer as any).length === 0 ||
            ((framesContainer as DOMRect).left <= clientRects[0].left &&
              (framesContainer as DOMRect).right >= clientRects[0].right &&
              (framesContainer as DOMRect).top <= clientRects[0].top &&
              (framesContainer as DOMRect).bottom >= clientRects[0].bottom &&
              clientRects[0].right < clientRects[1].left)
          ) {
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

  /**
   * Clears tick and text elements from a frame.
   *
   * @param {TimeFrame} frame The frame to clear.
   */
  clearFrame(frame: TimeFrame): void {
    const removeChildrenByClass = (className: string): void => {
      Array.from(frame.element.getElementsByClassName(className)).forEach(
        (element) => {
          element.parentElement?.removeChild(element);
        }
      );
    };
    removeChildrenByClass(constants.FRAME_TEXT_WRAPPER_CLASS);
    removeChildrenByClass(constants.FRAME_TICK_CLASS);
  }

  /**
   * Adds text label to a frame.
   *
   * @param {TimeFrame} frame The frame to add text to.
   */
  addTextToFrame(frame: TimeFrame): void {
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
   * Gets the bounding rect of the frames container, or the element array if empty.
   *
   * @returns {DOMRect | Element[]} Frames container rect or empty array.
   */
  getFramesContainer(): DOMRect | Element[] {
    const framesContainerElements = Array.from(
      this.container_.getElementsByClassName(constants.FRAMES_CONTAINER_CLASS)
    );
    if (framesContainerElements.length > 0) {
      return framesContainerElements[0].getBoundingClientRect();
    }
    return framesContainerElements;
  }

  /**
   * Performs a new iteration for tick distribution optimization.
   *
   * @param {number} minStep Minimum allowed time step.
   * @returns {boolean} Information if using default time step is suitable for the current data.
   */
  configureTicks(minStep: number = 0): boolean {
    const self = this;
    let tick: HTMLDivElement;
    let maxTextWidth = 0;
    let useTimeStep = false;
    let timeStep: number | undefined;
    let framesContainer: DOMRect | Element[];
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
      this.addTextToFrame(frame);
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
      ) as HTMLSpanElement | null;
      if (textElement == null) {
        return;
      }
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
    if (useTimeStep && timeStep != null) {
      timeStep *= 2;
    }

    const newTextWidth = `${Math.round(maxTextWidth)}px`;
    Array.from(
      this.container_.getElementsByClassName(constants.FRAME_TEXT_WRAPPER_CLASS)
    ).forEach((element) => {
      (element as HTMLElement).style.width = newTextWidth;
    });

    const createTick = (
      frame: TimeFrame,
      index: number,
      rect: DOMRect,
      endTime: number
    ): void => {
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
      const textWrapper = textElementArray.shift() as HTMLElement;
      const clientRect = textWrapper.getBoundingClientRect();

      // Prevent text overlapping, favor full hours
      if (
        (framesContainer as any).length === 0 ||
        ((framesContainer as DOMRect).left <= clientRect.left &&
          (framesContainer as DOMRect).right >= clientRect.right &&
          (framesContainer as DOMRect).top <= clientRect.top &&
          (framesContainer as DOMRect).bottom >= clientRect.bottom)
      ) {
        if (
          (self.previousTickTextRight_! < clientRect.left ||
            self.previousTickTextLeft_! > clientRect.right ||
            self.previousTickTextBottom_! < clientRect.top ||
            self.previousTickTextTop_! > clientRect.bottom) &&
          (self.previousTickIndex_ == null ||
            frame.endTime - frames[self.previousTickIndex_].endTime >= minStep)
        ) {
          createTick(frame, index, clientRect, frame.endTime);
        } else if (
          index > 0 &&
          self.previousTickIndex_ != null &&
          self.previousTickIndex_ >= 0 &&
          frames[self.previousTickIndex_] != null &&
          ((minStep === 0 &&
            ((frame.endTime % constants.HOUR === 0 &&
              frames[self.previousTickIndex_].endTime % constants.HOUR !== 0) ||
              (useTimeStep &&
                timeStep != null &&
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
  showTicks(): void {
    Array.from(
      this.container_.getElementsByClassName(constants.FRAME_TICK_CLASS)
    ).forEach((element) => {
      element.classList.remove(constants.HIDDEN_CLASS);
    });
  }

  /**
   * Creates a pointer for indicating current time in the slider.
   */
  createInteractions(): void {
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
  setAnimationTime(animationTime: number): void {
    const map = this.getMap()!;
    if (animationTime === map.get('time')) {
      this.updatePointer(animationTime);
      return;
    }
    const numFrames = this.frames_.length;
    let i: number;
    let currentIndex: number | undefined;
    let nextIndex: number;
    let updateAllowed = true;
    if (this.animationPlay_) {
      for (i = 0; i < numFrames; i += 1) {
        if (map.get('time') <= this.frames_[i].endTime) {
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
      map.set('time', animationTime);
      this.updatePointer(animationTime);
    }
  }

  /**
   * Updates pointer text and location on the time slider.
   *
   * @param {number} animationTime Time value.
   * @param {boolean} forceUpdate Forces an update.
   */
  updatePointer(animationTime: number, forceUpdate: boolean = false): void {
    if (this.interactions_ == null) {
      return;
    }
    const numFrames = this.frames_.length;
    let i: number;
    let index: number | undefined;
    let needsUpdate: boolean | undefined;
    let tickText: string;
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
        Number.parseInt(
          this.interactions_.parentElement.dataset.time ?? '',
          10
        ) !== animationTime
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
          (textElement as HTMLElement).innerHTML = tickText;
        });
        Array.from(
          this.container_.getElementsByClassName(
            constants.POINTER_INFOTIP_CLASS
          )
        ).forEach((infotip) => {
          (infotip as HTMLElement).innerHTML = tickText;
        });
      }
    }
  }

  /**
   * Updates loading state visualization.
   *
   * @param {TimeStepItem[]} timeSteps Loader counter information for intervals.
   * @param {boolean} forceUpdate Whether to force a full update.
   */
  updateTimeLoaderVis(
    timeSteps: TimeStepItem[],
    forceUpdate: boolean = false
  ): void {
    const numIntervalItems = timeSteps.reduce<TimeStepItem[]>(
      (activeTimeSteps, timeStep) => {
        if (timeStep.active) {
          activeTimeSteps.push(timeStep);
        }
        return activeTimeSteps;
      },
      []
    );
    if (!this.config_.showTimeSlider) {
      return;
    }
    const numIntervals = numIntervalItems.length;
    let creationNeeded = numIntervals !== this.frames_.length || forceUpdate;
    let i: number;
    const moments: number[] = [];
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
      const map = this.getMap();
      if (map != null && map.get('time') != null) {
        this.updatePointer(map.get('time'), true);
      }
    }
    this.frames_.forEach((frame) => {
      Array.from(
        frame.element.getElementsByClassName(constants.INDICATOR_CLASS)
      ).forEach((indicatorElement) => {
        let time: number;
        let elementTime: string | undefined;
        let endTime: number;
        if (
          indicatorElement.parentElement != null &&
          (indicatorElement.parentElement as HTMLElement).dataset != null
        ) {
          elementTime = (indicatorElement.parentElement as HTMLElement).dataset
            .time;
        }
        if (elementTime == null) {
          return;
        }
        time = parseInt(elementTime, 10);
        if (!isNaN(time)) {
          const numItems = numIntervalItems.length;
          for (let j = 0; j < numItems; j += 1) {
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
  setDragging(dragging: boolean): void {
    this.dragging_ = dragging;
    if (this.dragging_) {
      this.getMap()!.set('playing', false);
    }
    const pointerEvents = dragging ? 'auto' : 'none';
    Array.from(
      this.container_.getElementsByClassName(constants.DRAG_LISTENER_CLASS)
    ).forEach((element) => {
      (element as HTMLElement).style.pointerEvents = pointerEvents;
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
      (element as HTMLElement).style.display = display;
    });
  }

  /**
   * Turns animation play on or off.
   *
   * @param {boolean} animationPlay True if play is turned on.
   */
  setAnimationPlay(animationPlay: boolean): void {
    this.animationPlay_ = animationPlay;
    if (this.animationPlay_) {
      this.playButton_?.classList.add(constants.PLAYING_CLASS);
    } else {
      this.playButton_?.classList.remove(constants.PLAYING_CLASS);
    }
  }

  /**
   * Return information if meteorological optimizations are enabled.
   *
   * @returns {boolean} Meteorological mode status.
   */
  isMeteorologicalMode(): boolean {
    return this.container_.classList.contains(constants.METEOROLOGICAL_MODE);
  }

  /**
   * Generate text presentation of the given time.
   *
   * @param {number} tickTime Time value.
   * @param {boolean} showDate Show date information.
   * @returns {TickText} Generated text presentation.
   */
  getTickText(tickTime: number, showDate: boolean = true): TickText {
    let numFrames: number;
    let i: number;
    let frameTime: number;
    let prevTime: number | undefined;
    let zPrevTime: DateTime;
    let currentMoment: DateTime;
    const format = 'HH:mm';
    const dateFormat = `${String.fromCharCode(160)}d.M.`;
    let useDateFormat = false;
    const beginTime =
      this.frames_.length > 0
        ? this.frames_[0].endTime
        : Number.NEGATIVE_INFINITY;
    if (beginTime == null) {
      return { content: '', useDateFormat: false };
    }
    if (tickTime < beginTime) {
      tickTime = beginTime;
    }
    const zTime = DateTime.fromMillis(tickTime)
      .setZone(this.get('timeZone'))
      .setLocale(this.locale_ ?? 'en-GB');
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
        ? zTime.weekdayShort!.charAt(0).toUpperCase() +
          zTime.weekdayShort!.slice(1) +
          zTime.toFormat(dateFormat)
        : zTime.toFormat(format),
      useDateFormat,
    };
  }

  /**
   * Gets the current clock text.
   *
   * @returns {string} Clock text.
   */
  getClock(): string {
    return this.getTickText(this.getMap()!.get('time'), false).content;
  }

  /**
   * Clears time slider configurations.
   */
  clear(): void {
    if (this.timeListener_ != null) {
      unByKey(this.timeListener_ as EventsKey);
    }
    if (this.playingListener_ != null) {
      unByKey(this.playingListener_ as EventsKey);
    }
    if (this.timeZoneListener_ != null) {
      unByKey(this.timeZoneListener_ as EventsKey);
    }
    if (this.timeZoneLabelListener_ != null) {
      unByKey(this.timeZoneLabelListener_ as EventsKey);
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
  destroy(): void {
    this.clear();
  }
}

export default TimeSlider;
