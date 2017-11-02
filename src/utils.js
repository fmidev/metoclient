/**
 * @fileoverview Common utility functions for working with animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import { tz } from 'moment-timezone'
import moment from 'moment-timezone'
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
        const currTime = new Date().getTime()
        const timeToCall = Math.max(0, 16 - (currTime - lastTime))
        const id = window.setTimeout(() => {
            callback(currTime + timeToCall)
          },
          timeToCall)
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

  // https://tc39.github.io/ecma262/#sec-array.prototype.includes
  if (!Array.prototype.includes) {
    Object.defineProperty(Array.prototype, 'includes', {
      value: function (searchElement, fromIndex) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined')
        }

        var o = Object(this)

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0

        // 3. If len is 0, return false.
        if (len === 0) {
          return false
        }

        // 4. Let n be ? ToInteger(fromIndex).
        //    (If fromIndex is undefined, this step produces the value 0.)
        var n = fromIndex | 0

        // 5. If n ≥ 0, then
        //  a. Let k be n.
        // 6. Else n < 0,
        //  a. Let k be len + n.
        //  b. If k < 0, let k be 0.
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0)

        function sameValueZero (x, y) {
          return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y))
        }

        // 7. Repeat, while k < len
        while (k < len) {
          // a. Let elementK be the result of ? Get(O, ! ToString(k)).
          // b. If SameValueZero(searchElement, elementK) is true, return true.
          // c. Increase k by 1.
          if (sameValueZero(o[k], searchElement)) {
            return true
          }
          k++
        }

        // 8. Return false
        return false
      }
    })
  }
}

/**
 * Generate text presentation of the given time.
 * @param {number} tickTime Time value.
 * @param {number} beginTime First available time value.
 * @param {number} resolutionTime Time resolution.
 * @parame {string} timeZone Current timezone.
 * @parame {string} locale Locale for output text.
 * @param {number|null=} prevTime Previous time value.
 * @returns {string} Generated text presentation.
 */
export const getTickText = (tickTime, beginTime, resolutionTime, timeZone, locale, prevTime) => {
  let zTime
  let zPrevTime
  let day
  let year
  let currentMoment
  let format = 'HH:mm'
  const dateFormat = 'dd D.M.'
  if (beginTime == null) {
    return ''
  }
  if (tickTime < beginTime) {
    tickTime = beginTime
  }
  moment.locale(locale)
  zTime = moment(beginTime + Math.ceil((tickTime - beginTime) / resolutionTime) * resolutionTime).tz(timeZone)
  day = zTime.dayOfYear()
  year = zTime.year()
  currentMoment = moment()
  if (prevTime != null) {
    zPrevTime = moment(prevTime).tz(timeZone)
    if ((day !== zPrevTime.dayOfYear()) || (year !== zPrevTime.year())) {
      format = dateFormat
    }
  } else if ((typeof prevTime !== 'undefined') && ((day !== currentMoment.dayOfYear()) || (year !== currentMoment.year()))) {
    format = dateFormat
  }
  return zTime.format(format)
}

