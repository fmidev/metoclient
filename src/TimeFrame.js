/**
 * @module ol/metoclient/TimeFrame
 */

/**
 * Class representing a single time frame in a time slider.
 */
export default class TimeFrame {
  /**
   * Create a time frame.
   *
   * @param {object} options Time frame options.
   */
  constructor(options) {
    this.beginTime = options.beginTime;
    this.endTime = options.endTime;
    this.useDateFormat = false;
    this.element = document.createElement('div');
    this.element.style['flex-grow'] = options.weight;
    this.element.classList.add('fmi-metoclient-timeslider-frame');
    this.element.classList.add(options.type);
    this.element.dataset.time = this.endTime;
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
    this.element.appendChild(this.keyboardAccessibleElement);
  }
}
