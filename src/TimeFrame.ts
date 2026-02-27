/**
 * @module ol/metoclient/TimeFrame
 */
import { DateTime } from 'luxon';

/** Options for creating a TimeFrame. */
export interface TimeFrameOptions {
  beginTime: number;
  endTime: number;
  weight: string;
  type: string;
  locale: string;
  timeZone: string;
}

/**
 * Class representing a single time frame in a time slider.
 */
export default class TimeFrame {
  public beginTime: number;

  public endTime: number;

  public useDateFormat: boolean;

  public element: HTMLDivElement;

  public dragListenerElement: HTMLDivElement;

  public keyboardAccessibleElement: HTMLButtonElement;

  /**
   * Create a time frame.
   * @param {TimeFrameOptions} options Time frame options.
   */
  constructor(options: TimeFrameOptions) {
    this.beginTime = options.beginTime;
    this.endTime = options.endTime;
    this.useDateFormat = false;
    this.element = document.createElement('div');
    this.element.style['flex-grow' as any] = options.weight;
    this.element.classList.add('fmi-metoclient-timeslider-frame');
    this.element.classList.add(options.type);
    this.element.dataset.time = String(this.endTime);
    this.dragListenerElement = document.createElement('div');
    this.dragListenerElement.classList.add(
      'fmi-metoclient-timeslider-drag-listener'
    );
    this.dragListenerElement.style.pointerEvents = 'none';
    this.element.appendChild(this.dragListenerElement);
    this.keyboardAccessibleElement = document.createElement('button');
    this.keyboardAccessibleElement.classList.add(
      'fmi-metoclient-timeslider-keyboard-accessible'
    );
    this.keyboardAccessibleElement.style.pointerEvents = 'none';
    const ariaDateTime = DateTime.fromMillis(this.endTime)
      .setZone(options.timeZone)
      .setLocale(options.locale);
    this.keyboardAccessibleElement.setAttribute(
      'aria-label',
      ariaDateTime.toLocaleString(DateTime.DATETIME_FULL)
    );
    this.element.appendChild(this.keyboardAccessibleElement);
  }
}
