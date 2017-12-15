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

/**
 * Default layer z-indexes.
 * @type {Object}
 * @const
 */
export const zIndex = {
  vector: 1000
}
