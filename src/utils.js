/**
 * @fileoverview Common utility functions for working with animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import { default as proj4 } from 'proj4'
import { tz } from 'moment-timezone'
import moment from 'moment-timezone'
import { AVAILABLE_TIMESTEPS } from './constants'
import fi from 'moment/locale/fi'
import sv from 'moment/locale/sv'
import uk from 'moment/locale/uk'

/**
 * Floors time based on the given resolution.
 * @param {number} time Original time (ms).
 * @param {number} resolution Flooring resolution (ms).
 * @param {string=} userTimeZone Time zone.
 * @return {number} Floored time (ms).
 * @export
 */
export const floorTime = (time, resolution, userTimeZone) => {
  let date,
    hours,
    minutes,
    seconds,
    milliseconds,
    timeZone
  timeZone = (userTimeZone == null) ? 'UTC' : userTimeZone
  date = tz(time, timeZone)
  if (resolution < 1000) {
    milliseconds = date.milliseconds()
    date.milliseconds(milliseconds - milliseconds % resolution)
  } else if (resolution < 60 * 1000) {
    seconds = date.seconds()
    date.seconds(seconds - seconds % (resolution / 1000))
    date.milliseconds(0)
  } else if (resolution < 60 * 60 * 1000) {
    minutes = date.minutes()
    date.minutes(minutes - minutes % (resolution / (60 * 1000)))
    date.seconds(0)
    date.milliseconds(0)
  } else if (resolution < 24 * 60 * 60 * 1000) {
    hours = date.hours()
    date.hours(hours - hours % (resolution / (60 * 60 * 1000)))
    date.minutes(0)
    date.seconds(0)
    date.milliseconds(0)
  } else if (resolution < 7 * 24 * 60 * 60 * 1000) {
    date.hours(0)
    date.minutes(0)
    date.seconds(0)
    date.milliseconds(0)
  }
  return date.valueOf()
}

/**
 * Adds compatibility definitions for older browsers.
 */
export const supportOldBrowsers = () => {
  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
  // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
  // MIT license
  ((() => {
    let lastTime = 0
    const vendors = ['ms', 'moz', 'webkit', 'o']
    for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[`${vendors[x]}RequestAnimationFrame`]
      window.cancelAnimationFrame = window[`${vendors[x]}CancelAnimationFrame`] ||
        window[`${vendors[x]}CancelRequestAnimationFrame`]
    }

    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (callback, element) => {
        const currTime = Date.now()
        const timeToCall = Math.max(0, 16 - (currTime - lastTime))
        const id = window.setTimeout(() => {
          callback(currTime + timeToCall)
        }, timeToCall)
        lastTime = currTime + timeToCall
        return id
      }
    }

    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = id => {
        clearTimeout(id)
      }
    }
  })())
}

/**
 * Generate an HTML list representing a dropdown menu.
 * @param {Object} options Menu data.
 * @return {HTMLElement} Unordered list of menu items.
 */
export const createMenu = (options) => {
  let ul = document.createElement('ul')
  let li
  let a
  ul.classList.add('metoclient-menu')
  if (options.id != null) {
    ul.setAttribute('id', 'window-menu-dots-' + options.id)
  }
  if (options.items != null) {
    options.items.forEach((item) => {
      li = document.createElement('li')
      a = document.createElement('a')
      a.href = '#'
      a.innerHTML = item.title
      li.appendChild(a)
      if (typeof item.callback === 'function') {
        li.addEventListener('click', item.callback)
      }
      ul.appendChild(li)
    })
  }
  return ul
}

/**
 * Generate an HTML list containing ranges to control timeslider.
 * @param {Object} options Menu data.
 * @return {HTMLElement} Unordered list of menu items.
 */
export const createTimeMenu = (options) => {
  let ul = document.createElement('ul')
  let form
  let li
  let a
  let title
  let output
  ul.classList.add('metoclient-menu')
  if (options.id != null) {
    ul.classList.add(options.id)
  }
  let exit = document.createElement('button')
  exit.id = 'fmi-metoclient-timeslider-menu-exit'
  exit.addEventListener('click', () => {
    ul.classList.remove('visible-menu')
  })
  ul.appendChild(exit)
  if (options.items != null) {
    options.items.forEach((item) => {
      if (item.type === 'button') {
        li = document.createElement('li')
        a = document.createElement('a')
        a.href = '#'
        a.innerHTML = item.title
        li.appendChild(a)
        if (typeof item.callback === 'function') {
          li.addEventListener('click', item.callback)
        }
        ul.appendChild(li)
      } else if (item.type === 'range') {
        li = document.createElement('li')
        form = document.createElement('form')
        title = document.createElement('a')
        title.innerHTML = item.title
        a = document.createElement('input')
        a.setAttribute('type', 'range')
        a.setAttribute('min', '0')
        a.setAttribute('max', item.size - 1)
        output = document.createElement('output')
        if (item.id === 'fmi-metoclient-timeslider-begintime') {
          output.setAttribute('for', 'begin')
          output.setAttribute('onforminput', 'value = begin.valueAsNumber;')
          a.setAttribute('value', Math.floor(item.beginPlace))
          a.setAttribute('name', 'begin')
          form.setAttribute('id', 'beginForm')
        } else if (item.id === 'fmi-metoclient-timeslider-endtime') {
          output.setAttribute('for', 'end')
          output.setAttribute('onforminput', 'value = end.valueAsNumber;')
          a.setAttribute('value', Math.ceil(item.endPlace))
          a.setAttribute('name', 'end')
          form.setAttribute('id', 'endForm')
        }
        a.classList.add(item.id)
        a.href = '#'
        li.appendChild(title)
        li.appendChild(form)
        form.appendChild(a)
        form.appendChild(output)
        if (typeof item.callback === 'function') {
          li.addEventListener('click', item.callback)
        }
        ul.appendChild(li)
      } else if (item.type === 'stepButtons') {
        li = document.createElement('li')
        title = document.createElement('a')
        title.innerHTML = item.title
        li.appendChild(title)
        for (let i = 0; i < AVAILABLE_TIMESTEPS.length; i++) {
          let button = document.createElement('button')
          if (i > 2) {
            button.innerHTML = (AVAILABLE_TIMESTEPS[i] / 3600000) + 'h'
          } else {
            button.innerHTML = (AVAILABLE_TIMESTEPS[i] / 60000) + 'min'
          }
          button.classList.add('fmi-metoclient-timeslider-timestep-button')
          if (item.resolutionTime === AVAILABLE_TIMESTEPS[i]) {
            button.classList.add('fmi-metoclient-timeslider-timestep-active-button')
          }
          button.addEventListener('click', item.callback)
          li.appendChild(button)
        }
        ul.appendChild(li)
      } else {
        console.log('Unsupported')
      }
    })
  }
  return ul
}

/**
 * Transforms coordinates between projections.
 * @param fromProjection {string} Source projection.
 * @param toProjection {string} Target projection.
 * @param coordinates {number[]} Coordinates to be transformed.
 * @return {number[]} Transformed coordinates.
 */
export const transformCoordinates = (fromProjection, toProjection, coordinates) => {
  return proj4(fromProjection, toProjection, coordinates)
}
