/**
 * @fileoverview Constant definitions for the animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

/**
 * DOM element class prefix for legend figures.
 * @type {string}
 * @const
 */
export const LEGEND_FIGURE_CLASS_PREFIX = 'legend';

/**
 * DOM element class for the legend container.
 * @type {string}
 * @const
 */
export const NO_SELECT_CLASS = 'noselect';

export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;

export const MAX_REFRESH_INTERVAL = 2147483647;

export const FRAME_HISTORY = 'history';
export const FRAME_FUTURE = 'future';

export const STATUS_WORKING = 'working';
export const STATUS_SUCCESS = 'success';
export const DEFAULT_DELAY = 1000;

export const PLAYING_CLASS = 'playing';
export const CLICKABLE_CLASS = 'fmi-metoclient-timeslider-clickable-container';
export const PRE_MARGIN_CLASS = 'fmi-metoclient-timeslider-pre-margin';
export const PRE_TOOLS_CLASS = 'fmi-metoclient-timeslider-pre-tools';
export const FRAMES_CONTAINER_CLASS =
  'fmi-metoclient-timeslider-frames-container';
export const PLAY_BUTTON_CLASS = 'fmi-metoclient-timeslider-play-button';
export const POST_TOOLS_CLASS = 'fmi-metoclient-timeslider-post-tools';
export const POST_BUTTON_CLASS = 'fmi-metoclient-timeslider-step-button';
export const POST_MARGIN_CLASS = 'fmi-metoclient-timeslider-post-margin';
export const TIMEZONE_LABEL_CLASS = 'fmi-metoclient-timeslider-timezone';
export const FRAME_TICK_CLASS = 'fmi-metoclient-timeslider-frame-tick';
export const FRAME_TEXT_WRAPPER_CLASS =
  'fmi-metoclient-timeslider-frame-text-wrapper';
export const FRAME_TEXT_CLASS = 'fmi-metoclient-timeslider-frame-text';
export const DRAG_LISTENER_CLASS = 'fmi-metoclient-timeslider-drag-listener';
export const INTERACTIONS_CLASS = 'fmi-metoclient-timeslider-interactions';
export const POINTER_CLASS = 'fmi-metoclient-timeslider-pointer';
export const POINTER_WRAPPER_CLASS =
  'fmi-metoclient-timeslider-pointer-wrapper';
export const POINTER_TEXT_CLASS = 'fmi-metoclient-timeslider-pointer-text';
export const POINTER_HANDLE_CLASS = 'fmi-metoclient-timeslider-handle';
export const POINTER_INFOTIP_CLASS =
  'fmi-metoclient-timeslider-pointer-infotip';
export const INDICATOR_CLASS = 'fmi-metoclient-timeslider-indicator';
export const HIDDEN_CLASS = 'fmi-metoclient-timeslider-hidden';
export const POINTER_DRAGGING = 'dragging';
export const DATA_STATUS_ATTRIBUTE = 'data-status';
export const DATA_STATUS_WORKING = 'working';
export const BACKWARDS = -1;
export const FORWARDS = 1;
export const KEYBOARD_ACCESSIBLE_CLASS =
  'fmi-metoclient-timeslider-keyboard-accessible';
export const BASE_TAB_INDEX = 100;

export const DEFAULT_REFRESH_INTERVAL = 15 * ONE_MINUTE;
export const LONG_CLICK_DELAY = 0.5 * ONE_SECOND;
export const LONG_TAP_DELAY = 0.5 * ONE_SECOND;
export const DOUBLE_PRESS_DELAY = 0.3 * ONE_SECOND;

export const GET_CAPABILITIES_QUERY = 'request=GetCapabilities';

export const DEFAULT_OPTIONS = {
  center: [0, 0],
  zoom: 4,
  sources: {},
  time: null, // Todo: from configuration
  timeZone: 'Europe/Helsinki',
  timeZoneLabel: '',
  container: 'map',
  resolutions: [2048, 1024, 512, 256, 128, 64],
  metadata: {
    refreshInterval: 'map'
  },
  delay: DEFAULT_DELAY,
  periodDelay: 2 * DEFAULT_DELAY,
  texts: {
    'Zoom In': 'Zoom In',
    'Zoom Out': 'Zoom Out',
    Legend: 'Legend'
  }
};

export const DEFAULT_TILESIZE = 1024;

export const PRESENT = 'present';

export const METOCLIENT_PREFIX = 'metoclient:';
export const TIME = 'metoclient:time';
export const PREVIOUS = 'metoclient:previous';
export const NEXT = 'metoclient:next';
export const OPACITY = 'metoclient:opacity';
export const ID = 'metoclient:id';
export const DEFAULT_LEGEND = 'metoclient:defaultLegend';

export const LAYER_SWITCHER_CONTAINER_ID =
  'fmi-metoclient-layer-switcher-container';
export const LEGEND_CHOOSER_CONTAINER_ID =
  'fmi-metoclient-legend-chooser-container';
export const LEGEND_CHOOSER_LABEL_ID = 'fmi-metoclient-legend-chooser-label';
export const LEGEND_CHOOSER_SELECT_ID = 'fmi-metoclient-legend-chooser-select';
export const LEGEND_CONTAINER_ID = 'fmi-metoclient-legend-container';
