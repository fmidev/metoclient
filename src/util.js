/**
 * @module ol/metoclient/util
 */
import Url from 'domurl';
import { Duration, DateTime } from 'luxon';
import { default as RRule } from 'rrule/dist/es5/rrule';

/**
 * Floors time based on the given resolution.
 * @param {number} time Original timestamp (ms).
 * @param {number} resolution Flooring resolution (ms).
 * @return {number} Floored timestamp (ms).
 * @api
 */
export function floorTime (time, resolution) {
  return Math.floor(time / resolution) * resolution;
}

/**
 * isValidDate
 * @param {Date} d Date
 * @returns {boolean}
 * @api
 */
export function isValidDate (d) {
  return d instanceof Date && !isNaN(d);
}

// Todo: refactor long function
export function parseTimes (timeInput, timeOffset) {
  const DATE_TYPE = 'date';
  const DURATION_TYPE = 'period';
  const PRESENT = 'present';

  let times = [];

  if (timeInput == null) {
    times = [];
  } else if (Array.isArray(timeInput)) {
    times = timeInput.map(date => new Date(date).getTime());
  } else if (typeof timeInput === 'object') {
    const rule = new RRule(timeInput);
    let ruleTimes = rule.all().map(date =>
      DateTime.fromJSDate(date)
        .toUTC()
        .valueOf()
    );
    ruleTimes.forEach(ruleTime => {
      if (!times.includes(ruleTime)) {
        times.push(ruleTime);
      }
    });
  } else if (timeInput.includes(',')) {
    const dates = timeInput.split(',');
    times = dates.map(date => new Date(date).getTime());
  } else if (timeInput.includes('/')) {
    const parsedParts = timeInput.split('/').map(part => {
      if (part.toLowerCase() === PRESENT) {
        return {
          value: Date.now(),
          type: DATE_TYPE
        };
      }
      const date = new Date(part);
      if (isValidDate(date)) {
        return {
          value: date.getTime(),
          type: DATE_TYPE
        };
      }
      try {
        const duration = Duration.fromISO(part).toObject();
        return {
          value: duration,
          type: DURATION_TYPE
        };
      } catch (e) {
        return {
          value: null,
          type: null
        };
      }
    });
    if (parsedParts.length === 2) {

    } else if (parsedParts.length === 3) {
      if ((parsedParts[0].type === DATE_TYPE) && (parsedParts[1].type === DATE_TYPE) && (parsedParts[2].type === DURATION_TYPE)) {
        const duration = Duration.fromObject(parsedParts[2].value).as('milliseconds');
        let i = 0;
        let moment = parsedParts[0].value;
        while (moment <= parsedParts[1].value) {
          times.push(moment);
          i++;
          moment = parsedParts[0].value + i * duration;
        }
      }
    }
  } else {
    let texts = timeInput.toLowerCase().split(' and ');
    texts.forEach(text => {
      let rule;
      const parts = text.split(' ');
      if (parts.length >= 2) {
        const numTimes = Number(parts[0]);
        if ((!isNaN(numTimes)) && (parts[1].trim() === 'times')) {
          times = times.concat(Array(numTimes).fill(((parts.length >= 3) && (parts[2] === 'history')) ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY));
          return;
        }
      }
      try {
        rule = RRule.fromText(text);
      } catch (err) {
        return [];
      }
      if (rule.options.freq === RRule.HOURLY) {
        rule.options.byhour = Array.from(Array(24).keys()).filter(hour => hour % rule.options.interval === 0);
        rule.options.byminute = [0];
        rule.options.bysecond = [0];
        rule.options.interval = 1;
      } else if (rule.options.freq === RRule.MINUTELY) {
        rule.options.byminute = Array.from(Array(60).keys()).filter(minute => minute % rule.options.interval === 0);
        rule.options.bysecond = [0];
        rule.options.interval = 1;
      }
      if (timeOffset != null) {
        let start = DateTime.fromJSDate(rule.options.dtstart);
        if (start != null) {
          let offset = Duration.fromISO(timeOffset);
          if (offset != null) {
            start = start.plus(offset);
            if (start != null) {
              rule.options.dtstart = start.toJSDate();
            }
          }
        }
      }
      let ruleTimes = rule.all().map(date =>
        DateTime.fromJSDate(date)
          .toUTC()
          .valueOf()
      );
      let offset;
      if (text.toLowerCase().includes(' history')) {
        let numTimeSteps = ruleTimes.length - 1;
        if (numTimeSteps === 0) {
          let tmpOptions = {...rule.options};
          tmpOptions.count = 2;
          let tmpRule = new RRule(tmpOptions);
          let tmpRuleTimes = tmpRule.all();
          offset = tmpRuleTimes[1] - tmpRuleTimes[0];
        } else {
          offset = (numTimeSteps + 1) * (ruleTimes[numTimeSteps] - ruleTimes[0]) / numTimeSteps;
        }
        ruleTimes = ruleTimes.map(time => time - offset);
      }
      ruleTimes.forEach(ruleTime => {
        if (!times.includes(ruleTime)) {
          times.push(ruleTime);
        }
      });
    });
  }
  times.sort();
  return times;
}

/**
 *
 * @param newTime
 */
export function updateSourceTime (tiles, newTime) {
  return tiles.map(tile => {
    const url = new Url(tile);
    let timeKey = 'time';
    for (let p in url.query) {
      if ((url.query.hasOwnProperty(p)) && (p.toLocaleLowerCase() === 'time')) {
        timeKey = p;
      }
    }
    if (newTime != null) {
      url.query[timeKey] = typeof newTime === 'number' ? (new Date(newTime)).toISOString() : newTime;
    } else {
      delete url.query[p];
    }
    return url.toString();
  });
}

/**
 * Url
 * @param {string} baseUrl baseUrl
 * @param {string} params params
 * @returns {string} url
 * @api
 */
export function stringifyUrl (baseUrl, params) {
  return Object.keys(params).reduce((joined, paramKey, index) => joined + ((index > 0) ? '&' : '') + paramKey + '=' + (((typeof params[paramKey] === 'string') && (params[paramKey].match(/\{([^}]+)\}/g) === null)) ? encodeURIComponent(params[paramKey]) : params[paramKey]), baseUrl.trim() + '?');
}

/**
 * createInterval
 * @param {string} start start
 * @param {string} end end
 * @param {string} period period
 * @api
 */
export function createInterval (start, end, period) {
  return start + '/' + end + '/' + period;
}

export function getBaseUrl (url) {
  return url.split(/[?#]/)[0];
}