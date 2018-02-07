export default class TimeFrame {
  
  /**
   * Creates an instance of TimeFrame.
   * @param {any} options 
   * 
   * @memberOf TimeFrame
   */
  constructor (options) {
    this['beginTime'] = options['beginTime']
    this['endTime'] = options['endTime']
    this.element = document.createElement('div')
    this.element.style['flex-grow'] = options['weight']
    this.element.classList.add('fmi-metoclient-timeslider-frame', options['type'])
    this.element.dataset.time = this['endTime']
    this.dragListenerElement = document.createElement('div')
    this.dragListenerElement.classList.add('fmi-metoclient-timeslider-drag-listener')
    this.element.appendChild(this.dragListenerElement)
  }
}

TimeFrame.HISTORY = 'history'
TimeFrame.FUTURE = 'future'
