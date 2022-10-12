/**
 * Constants module.
 *
 * @module constants
 */
export const DEFAULT_DELAY = 1000;
export const DEFAULT_OPTIONS = {
  center: [0, 0],
  zoom: 4,
  minZoom: 0,
  maxZoom: 28,
  minExtent: [0, 0],
  projection: 'EPSG:4326',
  metadata: {
    refreshInterval: 'map',
    tags: [],
  },
  transition: {
    delay: DEFAULT_DELAY,
  },
  sources: {},
  layers: [],
  time: null,
  timeZone: 'Europe/Helsinki',
  timeZoneLabel: '',
  target: 'map',
  periodDelay: 2 * DEFAULT_DELAY,
  locale: 'en-GB',
  texts: {
    'Zoom In Label': '+',
    'Zoom Out Label': '-',
    'Zoom In': 'Zoom In',
    'Zoom Out': 'Zoom Out',
    'Layer Switcher': 'Layer Switcher',
    Legend: 'Legend',
    'Fullscreen Label': '⤢',
    'Fullscreen Label Active': '×',
    'Fullscreen Tip Label': 'Fullscreen',
  },
};
export const PROJECTION_RESOLUTIONS = {
  'EPSG:3067': [4096, 2048, 1024, 512, 256, 128, 64],
};
export const NO_SELECT_CLASS = 'noselect';
export const MILLISECONDS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const SECOND = MILLISECONDS_PER_SECOND;
export const MINUTE = SECOND * SECONDS_PER_MINUTE;
export const HOUR = MINUTE * MINUTES_PER_HOUR;
export const DAY = HOUR * HOURS_PER_DAY;
export const MAX_REFRESH_INTERVAL = 2147483647;
export const discreteSteps = [
  MINUTE,
  2 * MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  20 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  3 * HOUR,
  4 * HOUR,
  6 * HOUR,
  8 * HOUR,
  12 * HOUR,
  DAY,
];
export const FRAME_HISTORY = 'history';
export const FRAME_FUTURE = 'future';
export const STATUS_WORKING = 'working';
export const STATUS_SUCCESS = 'success';
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
export const DEFAULT_REFRESH_INTERVAL = 15 * MINUTE;
export const LONG_CLICK_DELAY = 0.5 * MILLISECONDS_PER_SECOND;
export const LONG_TAP_DELAY = 0.5 * MILLISECONDS_PER_SECOND;
export const DOUBLE_PRESS_DELAY = 0.3 * MILLISECONDS_PER_SECOND;
export const GET_CAPABILITIES_QUERY = 'request=GetCapabilities';
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
export const LEGEND_CONTAINER_CLASS = 'fmi-metoclient-legend-container';
export const OPACITY_CONTROL_CLASS = 'fmi-metoclient-opacity-control';
export const OPACITY_CONTAINER_CLASS = 'fmi-metoclient-opacity-container';
export const CUSTOM_CONTROL_CONTAINER_ID = 'fmi-metoclient-custom-control-container';
export const METEOROLOGICAL_MODE = 'meteorological';
export const SMARTMET_SERVER = 'smartmet server';
export const TAG_MOUSE_WHEEL_INTERACTIONS = 'mouse wheel interactions';
export const TAG_NO_INTERACTIONS = 'no interactions';
export const TAG_NO_LAYER_SWITCHER = 'no layer switcher';
export const TAG_INSTANT_TIMESLIDER = 'instant time slider';
export const TAG_DELAY_LOOP = 'delay loop';
export const TAG_FULL_SCREEN_CONTROL = 'fullscreen control';
export const TAG_RENDER_IMMEDIATELY = 'render immediately';
export const TAG_OPACITY_CONTROL = 'opacity control';
export const TAG_FIXED_EXTENT = 'fixed extent';
export const TAG_AUTOPLAY = 'autoplay';
export const BASE_MAP = 'base';
export const VISIBLE = 'visible';
export const NOT_VISIBLE = 'none';
export const ROTATED = 'rotated';
export const HORIZONTAL = 'horizontal';
export const VERTICAL = 'vertical';
