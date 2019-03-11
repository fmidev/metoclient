/**
 * @fileoverview Constant definitions for the animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

/**
 * Maximum timestamp value.
 * @type {number}
 * @const
 */
export const MAX_TIMESTAMP = 8640000000000000

/**
 * DOM element class prefix for legend figures.
 * @type {string}
 * @const
 */
export const LEGEND_FIGURE_CLASS_PREFIX = 'legend'

/**
 * DOM element class for the legend container.
 * @type {string}
 * @const
 */
export const LEGEND_CONTAINER_CLASS = 'fmi-metoclient-legend'

export const NO_SELECT_CLASS = 'noselect'

/**
 * Loading status identifiers.
 * @type {Object}
 * @const
 */
export const LOADING_STATUS = {
  'loading': 'working',
  'ready': 'success',
  'error': 'error'
}

export const AVAILABLE_TIMESTEPS = [
  300000,
  900000,
  1800000,
  3600000,
  10800000,
  21600000,
  43200000,
  86400000
]

/**
 * Default layer z-indexes.
 * @type {Object}
 * @const
 */
export const ZINDEX = {
  vector: 10000,
  overlay: 1000
}

export const DEFAULT_GRID_TIME = 60 * 60 * 1000

export const ONE_SECOND = 1000
export const ONE_MINUTE = 60 * ONE_SECOND
export const ONE_HOUR = 60 * ONE_MINUTE
export const ONE_DAY = 24 * ONE_HOUR

export const MAX_REFRESH_INTERVAL = 2147483647
