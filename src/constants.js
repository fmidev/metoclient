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
export const LEGEND_CONTAINER_CLASS = 'fmi-animator-legend'

/**
 * DOM element id for the map layer switcher.
 * @type {string}
 * @const
 */
export const MAP_LAYER_SWITCHER_ID = 'fmi-map-layer-switcher'

/**
 * Loading status identifiers.
 * @type {Object}
 * @const
 */
export const LOADING_STATUS = {
  'loading': 'Loading',
  'ready': 'Ready',
  'error': 'Error'
}

/**
 * Default layer z-indexes.
 * @type {Object}
 * @const
 */
export const zIndex = {
  vector: 1000
}
