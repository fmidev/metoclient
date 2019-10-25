/**
 * @module ol/metoclient/timeConstants
 */

// https://github.com/jimhigson/time-constants

/**
 * @api
 */
export const MILLISECONDS_PER_SECOND = 1000;

/**
 * @api
 */
export const SECONDS_PER_MINUTE = 60;

/**
 * @api
 */
export const MINUTES_PER_HOUR = 60;

/**
 * @api
 */
export const HOURS_PER_DAY = 24;

/**
 * @api
 */
export const DAYS_PER_WEEK = 7;

/**
 * @api
 */
export const MONTHS_PER_YEAR = 12;

/**
 * @api
 */
export const SECOND = MILLISECONDS_PER_SECOND;
/**
 * @api
 */
export const MINUTE = SECOND * SECONDS_PER_MINUTE;

/**
 * @api
 */
export const HOUR = MINUTE * MINUTES_PER_HOUR;

/**
 * @api
 */
export const DAY = HOUR * HOURS_PER_DAY;

/**
 * @api
 */
export const WEEK = DAY * DAYS_PER_WEEK;

/**
 * @api
 */
export const YEAR = DAY * 365.24;

/**
 * @api
 */
export const NORMAL_YEAR = DAY * 365;

/**
 * @api
 */
export const LEAP_YEAR = DAY * 366;

/**
 * @api
 */
export const DECADE = 10 * YEAR;

/**
 * @api
 */
export const HALF_YEAR = YEAR / 2;

/**
 * @api
 */
export const AVERAGE_MONTH = YEAR / 12;

// ±100,000,000 days, the min and max dates allowed in ECMA Script.
// See: http://ecma-international.org/ecma-262/5.1/#sec-15.9.1.1
/**
 * @api
 */
export const MIN_DATE = new Date(-8.64E15);

/**
 * @api
 */
export const MAX_DATE = new Date(8.64E15);
