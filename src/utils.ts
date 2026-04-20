/**
 * Utils module.
 * @module utils
 */
import Url from 'domurl';
import { Duration, DateTime } from 'luxon';
import RRule from 'rrule/dist/es5/rrule';
import type { RRuleOptions } from 'rrule/dist/es5/rrule';
import * as constants from './constants';

/**
 * Floor time based on the given resolution.
 * @param {number} time Original timestamp (ms).
 * @param {number} resolution Flooring resolution (ms).
 * @returns {number} Floored timestamp (ms).
 */
export function floorTime(time: number, resolution: number): number {
  return Math.floor(time / resolution) * resolution;
}

/**
 * Validate date.
 * @param {Date} d The date to be validated.
 * @returns {boolean} Validation result.
 */
export function isValidDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/**
 * Check if a string value is numeric.
 * @param {unknown} str The value to check.
 * @returns {boolean} Whether the value is numeric.
 */
export function isNumeric(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  return !Number.isNaN(str as any) && !Number.isNaN(parseFloat(str));
}

/**
 * Update time array with time points of another array.
 * @param {Array} times Array of time points to be updated.
 * @param {Array} newTimes Array of new time points.
 * @returns {Array} Updated time array.
 */
export function addNewTimes(times: number[], newTimes: number[]): number[] {
  const updatedTimes: number[] = [...times];
  newTimes.forEach((newTime: number) => {
    if (!updatedTimes.includes(newTime)) {
      updatedTimes.push(newTime);
    }
  });
  return updatedTimes;
}

interface ParsedPart {
  value: any;
  type: string | null;
}

/**
 * Parse time item.
 * @param {string} timeInput Time input string to parse.
 * @returns {Array<number>} Parsed time points.
 */
function parseTimeList(timeInput: string): number[] {
  const DATE_TYPE = 'date';
  const DURATION_TYPE = 'period';
  const times: number[] = [];
  const parsedParts: ParsedPart[] = timeInput
    .split('/')
    .map((part: string): ParsedPart => {
      if (part.toLowerCase() === constants.PRESENT) {
        return {
          value: Date.now(),
          type: DATE_TYPE,
        };
      }
      const date = new Date(part);
      if (isValidDate(date)) {
        return {
          value: date.getTime(),
          type: DATE_TYPE,
        };
      }
      try {
        const duration = Duration.fromISO(part).toObject();
        return {
          value: duration,
          type: DURATION_TYPE,
        };
      } catch (e) {
        return {
          value: null,
          type: null,
        };
      }
    });
  // Todo: if (parsedParts.length === 2) {} else
  if (
    parsedParts.length === 3 &&
    parsedParts[0].type === DATE_TYPE &&
    parsedParts[1].type === DATE_TYPE &&
    parsedParts[2].type === DURATION_TYPE
  ) {
    const duration: number = Duration.fromObject(parsedParts[2].value).as(
      'milliseconds'
    );
    let i = 0;
    let moment: number = parsedParts[0].value;
    while (moment <= parsedParts[1].value) {
      times.push(moment);
      i += 1;
      moment = parsedParts[0].value + i * duration;
    }
  }
  return times;
}

/**
 * Parse time rule.
 * @param {string} timeInput Time rule input string to parse.
 * @param {string | null} timeOffset Time offset in ISO duration format.
 * @param {Array<number> | null} timeData Available time data points.
 * @returns {Array<number>} Parsed time points.
 */
function parseRRule(
  timeInput: string,
  timeOffset: string | null,
  timeData: number[] | null = null
): number[] {
  let times: number[] = [];
  const currentTime: number = Date.now();
  const texts: string[] = timeInput.toLowerCase().split(' and ');
  texts
    .map((text: string) => text.trim())
    .forEach((text: string) => {
      let ruleText = text;
      const dataSteps = ruleText.startsWith('data');
      if (dataSteps) {
        ruleText = ruleText.replace('data', 'every');
      }
      let rule: RRule;
      const parts: string[] = ruleText.split(' ');
      if (parts.length >= 2) {
        const numTimes = Number(parts[0]);
        if (!Number.isNaN(numTimes) && parts[1].trim() === 'times') {
          times = times.concat(
            Array(numTimes).fill(
              parts.length >= 3 && parts[2] === 'history'
                ? Number.NEGATIVE_INFINITY
                : Number.POSITIVE_INFINITY
            )
          );
          return;
        }
      }
      const history = ruleText.includes(' history');
      ruleText = ruleText.replace(' history', '');
      if (dataSteps) {
        ruleText += ' for 2 times';
      }
      try {
        rule = RRule.fromText(ruleText);
      } catch (err) {
        return;
      }
      if (!dataSteps) {
        if (rule.options.freq === RRule.HOURLY) {
          rule.options.byhour = Array.from(Array(24).keys()).filter(
            (hour: number) => hour % (rule.options.interval ?? 1) === 0
          );
          rule.options.byminute = [0];
          rule.options.bysecond = [0];
          rule.options.interval = 1;
        } else if (rule.options.freq === RRule.MINUTELY) {
          rule.options.byminute = Array.from(Array(60).keys()).filter(
            (minute: number) => minute % (rule.options.interval ?? 1) === 0
          );
          rule.options.bysecond = [0];
          rule.options.interval = 1;
        }
      }
      if (timeOffset != null) {
        const start = DateTime.fromJSDate(rule.options.dtstart as Date);
        if (start != null) {
          const offsetDuration = Duration.fromISO(timeOffset);
          rule.options.bysecond = [(offsetDuration as any).values.seconds ?? 0];
          rule.options.byminute = [(offsetDuration as any).values.minutes ?? 0];
          rule.options.byhour = [(offsetDuration as any).values.hours ?? 0];
        }
      }
      let ruleTimes: number[] = rule
        .all()
        .map((date: Date) => DateTime.fromJSDate(date).toUTC().valueOf());
      let offset: number;
      if (history) {
        const lastTimeStepIndex: number = ruleTimes.length - 1;
        if (lastTimeStepIndex === 0) {
          const tmpOptions: RRuleOptions = { ...rule.options };
          tmpOptions.count = 2;
          const tmpRule = new RRule(tmpOptions);
          const tmpRuleTimes: Date[] = tmpRule.all();
          offset = tmpRuleTimes[1].getTime() - tmpRuleTimes[0].getTime();
        } else {
          offset =
            ((lastTimeStepIndex + 1) *
              (ruleTimes[lastTimeStepIndex] - ruleTimes[0])) /
            lastTimeStepIndex;
        }
        ruleTimes = ruleTimes.map((time: number) => time - offset);
      }
      if (dataSteps) {
        (timeData as number[]).forEach((dataTime: number) => {
          if (
            (history && dataTime >= ruleTimes[1] && dataTime <= currentTime) ||
            (!history && dataTime <= ruleTimes[1] && dataTime >= currentTime)
          ) {
            times.push(dataTime);
          }
        });
      } else {
        times = addNewTimes(times, ruleTimes);
      }
    });
  return times;
}

/**
 * Parse time point input.
 * @param {string | Array | object} timeInput Time input to parse.
 * @param {string | null} timeOffset Time offset in ISO duration format.
 * @param {Array<number> | null} timeData Available time data points.
 * @returns {Array<number>} Parsed time points.
 */
export function parseTimes(
  timeInput: any,
  timeOffset: string | null,
  timeData: number[] | null = null
): number[] {
  let times: number[] = [];
  if (timeInput == null) {
    times = [];
  } else if (Array.isArray(timeInput)) {
    times = timeInput.map((date: any) => new Date(date).getTime());
  } else if (typeof timeInput === 'object') {
    const rule = new RRule(timeInput as RRuleOptions);
    const ruleTimes: number[] = rule
      .all()
      .map((date: Date) => DateTime.fromJSDate(date).toUTC().valueOf());
    times = addNewTimes(times, ruleTimes);
  } else if (timeInput.includes(',') || timeInput.includes('/')) {
    const dates: string[] = timeInput
      .split(',')
      .map((date: string) => date.trim());
    times = dates.reduce((accTimes: number[], date: string) => {
      if (date.includes('/')) {
        // eslint-disable-next-line no-param-reassign
        accTimes = accTimes.concat(parseTimeList(date));
      } else {
        const newDate = new Date(date);
        if (isValidDate(newDate)) {
          accTimes.push(new Date(date).getTime());
        }
      }
      return accTimes;
    }, []);
  } else if (isValidDate(new Date(timeInput))) {
    times.push(new Date(timeInput).getTime());
  } else {
    times = parseRRule(timeInput, timeOffset, timeData);
  }
  times.sort();
  return times;
}

/**
 * Update time parameter in source tile URLs.
 * @param {Array<string>} tiles Array of tile URLs.
 * @param {number | string | null} newTime New time value to set.
 * @returns {Array<string>} Updated tile URLs.
 */
export function updateSourceTime(
  tiles: string[],
  newTime: number | string | null
): string[] {
  return tiles.map((tile: string) => {
    const url = new Url(tile);
    let timeKey = 'time';
    Object.keys(url.query).forEach((key: string) => {
      if (key.toLocaleLowerCase() === 'time') {
        timeKey = key;
      }
    });
    if (newTime != null) {
      url.query[timeKey] =
        typeof newTime === 'number' ? new Date(newTime).toISOString() : newTime;
    } else {
      delete url.query[timeKey];
    }
    return url.toString();
  });
}

/**
 * Construct a URL string from a base URL and query parameters.
 * @param {string} baseUrl Base URL without query parameters.
 * @param {string} params Query parameters to append.
 * @returns {string} Constructed URL string.
 */
export function stringifyUrl(
  baseUrl: string,
  params: Record<string, any>
): string {
  return Object.keys(params).reduce(
    (joined: string, paramKey: string, index: number) =>
      `${joined + (index > 0 ? '&' : '') + paramKey}=${
        typeof params[paramKey] === 'string' &&
        params[paramKey].match(/{([^}]+)}/g) === null
          ? encodeURIComponent(params[paramKey])
          : params[paramKey]
      }`,
    `${baseUrl.trim()}?`
  );
}

/**
 * Create a time interval string from start, end, and period components.
 * @param {string} start Start time string.
 * @param {string} end End time string.
 * @param {string} period Duration period string.
 * @returns {string} Interval string.
 */
export function createInterval(
  start: string,
  end: string,
  period: string
): string {
  return `${start}/${end}/${period}`;
}

/**
 * Extract base URL without query parameters.
 * @param {string} url The full URL.
 * @returns {string} Base URL.
 */
export function getBaseUrl(url: string): string {
  return url.split(/[?#]/)[0];
}

/**
 * Get the adjacent layer in a given direction.
 * @param {string} direction Direction ('previous' or 'next').
 * @param {object} layer Current layer configuration.
 * @param {Array} layers Array of layer configurations.
 * @returns {string | null} Adjacent layer id or null.
 */
export function getAdjacentLayer(
  direction: string,
  layer: any,
  layers: any[]
): string | null {
  const directions: string[] = ['previous', 'next'];
  const directionIndex: number = directions.indexOf(direction);
  if (directionIndex < 0) {
    return null;
  }
  if (layer[direction] != null) {
    return layer[direction];
  }
  const opposite: string = directions[(directionIndex + 1) % 2];
  const adjacentLayer = layers.find((l: any) => l[opposite] === layer.id);
  if (adjacentLayer == null) {
    return null;
  }
  return adjacentLayer.id;
}

/**
 * Get the capabilities URL for a given source.
 * @param {object} source Source configuration object.
 * @returns {string | null} Capabilities URL or null.
 */
export function getSourceCapabilitiesUrl(source: any): string | null {
  let url = '';
  if (source.capabilities != null && source.capabilities.length > 0) {
    url = source.capabilities;
  } else {
    if (source.tiles == null || source.tiles.length === 0) {
      return null;
    }
    // Todo: Handle other indexes
    [url] = source.tiles[0].split('?');
  }
  if (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  return url;
}

/**
 * Get the legend URL from capabilities for a given layer.
 * @param {string | null} layerName Layer name.
 * @param {string | null} layerStyles Layer styles.
 * @param {object} capabilities Capabilities data.
 * @returns {string | null} Legend URL or null.
 */
export function getLegendUrl(
  layerName: string | null,
  layerStyles: string | null,
  capabilities: any
): string | null {
  if (
    layerName == null ||
    layerName.length === 0 ||
    capabilities == null ||
    capabilities.data == null ||
    capabilities.data.Capability == null ||
    capabilities.data.Capability.Layer == null ||
    capabilities.data.Capability.Layer.Layer == null
  ) {
    return null;
  }
  const layerCapabilities = capabilities.data.Capability.Layer.Layer.find(
    (layer: any) => layer.Name === layerName
  );
  if (layerCapabilities == null || layerCapabilities.Style == null) {
    return null;
  }
  let layerStyle = layerCapabilities.Style[0];
  if (layerStyles != null && layerStyles.length > 0) {
    const styles: string[] = layerStyles.split(',');
    layerStyle = layerCapabilities.Style.find((style: any) =>
      styles.includes(style.Name)
    );
  }
  if (
    layerStyle == null ||
    layerStyle.LegendURL == null ||
    layerStyle.LegendURL.length === 0
  ) {
    return null;
  }
  return layerStyle.LegendURL[0].OnlineResource;
}

/**
 * Parse query parameters.
 * @param {object} layer Layer configuration.
 * @param {string} url Source URL.
 * @param {number} time Time value.
 * @returns {Record<string, string>} Parsed query parameters.
 */
export function getQueryParams(
  layer: any,
  url: string,
  time: number
): Record<string, string> {
  const queryUrl = new Url(url);
  const params: Record<string, string> = Object.keys(queryUrl.query).reduce(
    (upperCased: Record<string, string>, key: string) => {
      upperCased[typeof key === 'string' ? key.toUpperCase() : key] =
        queryUrl.query[key];
      return upperCased;
    },
    {}
  );
  Object.keys(layer.url).forEach((key: string) => {
    params[key.toUpperCase()] = layer.url[key].toString();
  });
  const timeDefined: boolean =
    layer.time != null &&
    layer.time.data != null &&
    layer.time.data.includes(time);
  if (timeDefined) {
    params.TIME = new Date(time).toISOString();
  }
  return params;
}

/**
 * Default image load function with timeout and error handling.
 * @param {object} image Image tile to load.
 * @param {string} src Source URL.
 * @param {object} source OpenLayers source object.
 * @param {string | null} time Time parameter value.
 * @param {number} timeout Request timeout in milliseconds.
 */
export function defaultLoadFunction(
  image: any,
  src: string,
  source: any,
  time: string | null,
  timeout: number = constants.DEFAULT_TIMEOUT
): void {
  let url: string = src;
  if (time != null) {
    url += `&Time=${time}`;
  }
  const emptyImage =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAAtJREFUGFdjYAACAAAFAAGq1chRAAAAAElFTkSuQmCC';
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'blob';
  xhr.timeout = timeout;
  xhr.onloadstart = (_ev: ProgressEvent): void => {
    xhr.responseType = 'blob';
  };
  xhr.onload = (): void => {
    URL.revokeObjectURL(src);
    if (
      xhr.status === 200 &&
      (xhr.response as Blob)?.type?.toLowerCase()?.startsWith('image')
    ) {
      image.getImage().src = URL.createObjectURL(xhr.response);
      source.set(constants.LOADING_ERROR, false);
    } else {
      image.getImage().src = emptyImage;
      image.load();
      source.set(constants.LOADING_ERROR, true);
    }
  };
  xhr.onerror = (): void => {
    image.getImage().src = emptyImage;
    image.load();
    source.set(constants.LOADING_ERROR, true);
  };
  xhr.ontimeout = (): void => {
    image.getImage().src = emptyImage;
    image.load();
    source.set(constants.LOADING_ERROR, true);
  };
  xhr.send();
}
