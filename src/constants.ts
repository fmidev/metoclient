/**
 * Constants module.
 *
 * @module constants
 */
export const DEFAULT_DELAY: number = 1000;
export const DEFAULT_TIMEOUT: number = 5000;
export const DEFAULT_OPTIONS = {
  center: [0, 0],
  zoom: 4,
  minZoom: 0,
  maxZoom: 28,
  minExtent: [0, 0],
  projection: 'EPSG:4326',
  metadata: {
    refreshInterval: 'map',
    tags: [] as string[],
  },
  transition: {
    delay: DEFAULT_DELAY,
  },
  sources: {} as Record<string, unknown>,
  layers: [] as unknown[],
  time: null as number | null,
  timeZone: 'Europe/Helsinki',
  timeZoneLabel: '',
  timeout: DEFAULT_TIMEOUT,
  target: 'map',
  periodDelay: 2 * DEFAULT_DELAY,
  locale: 'en-GB',
  texts: {
    'Fullscreen Label Active': '×',
    'Fullscreen Label': '⤢',
    'Fullscreen Tip Label': 'Fullscreen',
    'Layer Switcher': 'Layer Switcher',
    'Legend Selector': 'Legend',
    Legend: 'Map legend',
    Pause: 'Pause animation',
    Play: 'Play animation',
    'Zoom In Label': '+',
    'Zoom In': 'Zoom In',
    'Zoom Out Label': '-',
    'Zoom Out': 'Zoom Out',
  },
} as const;
export const PROJECTION_RESOLUTIONS = {
  'EPSG:3067': [4096, 2048, 1024, 512, 256, 128, 64],
} as const;
export const NO_SELECT_CLASS: string = 'noselect';
export const MILLISECONDS_PER_SECOND: number = 1000;
export const SECONDS_PER_MINUTE: number = 60;
export const MINUTES_PER_HOUR: number = 60;
export const HOURS_PER_DAY: number = 24;
export const SECOND: number = MILLISECONDS_PER_SECOND;
export const MINUTE: number = SECOND * SECONDS_PER_MINUTE;
export const HOUR: number = MINUTE * MINUTES_PER_HOUR;
export const DAY: number = HOUR * HOURS_PER_DAY;
export const MAX_REFRESH_INTERVAL: number = 2147483647;
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
] as const;
export const FRAME_HISTORY: string = 'history';
export const FRAME_FUTURE: string = 'future';
export const STATUS_WORKING: string = 'working';
export const STATUS_SUCCESS: string = 'success';
export const STATUS_ERROR: string = 'error';
export const PLAYING_CLASS: string = 'playing';
export const CLICKABLE_CLASS: string =
  'fmi-metoclient-timeslider-clickable-container';
export const PRE_MARGIN_CLASS: string = 'fmi-metoclient-timeslider-pre-margin';
export const PRE_TOOLS_CLASS: string = 'fmi-metoclient-timeslider-pre-tools';
export const FRAMES_CONTAINER_CLASS: string =
  'fmi-metoclient-timeslider-frames-container';
export const PLAY_BUTTON_CLASS: string =
  'fmi-metoclient-timeslider-play-button';
export const POST_TOOLS_CLASS: string = 'fmi-metoclient-timeslider-post-tools';
export const POST_BUTTON_CLASS: string =
  'fmi-metoclient-timeslider-step-button';
export const POST_MARGIN_CLASS: string =
  'fmi-metoclient-timeslider-post-margin';
export const TIMEZONE_LABEL_CLASS: string =
  'fmi-metoclient-timeslider-timezone';
export const FRAME_TICK_CLASS: string = 'fmi-metoclient-timeslider-frame-tick';
export const FRAME_TEXT_WRAPPER_CLASS: string =
  'fmi-metoclient-timeslider-frame-text-wrapper';
export const FRAME_TEXT_CLASS: string = 'fmi-metoclient-timeslider-frame-text';
export const DRAG_LISTENER_CLASS: string =
  'fmi-metoclient-timeslider-drag-listener';
export const INTERACTIONS_CLASS: string =
  'fmi-metoclient-timeslider-interactions';
export const POINTER_CLASS: string = 'fmi-metoclient-timeslider-pointer';
export const POINTER_WRAPPER_CLASS: string =
  'fmi-metoclient-timeslider-pointer-wrapper';
export const POINTER_TEXT_CLASS: string =
  'fmi-metoclient-timeslider-pointer-text';
export const POINTER_HANDLE_CLASS: string = 'fmi-metoclient-timeslider-handle';
export const POINTER_INFOTIP_CLASS: string =
  'fmi-metoclient-timeslider-pointer-infotip';
export const INDICATOR_CLASS: string = 'fmi-metoclient-timeslider-indicator';
export const HIDDEN_CLASS: string = 'fmi-metoclient-timeslider-hidden';
export const POINTER_DRAGGING: string = 'dragging';
export const DATA_STATUS_ATTRIBUTE: string = 'data-status';
export const DATA_STATUS_WORKING: string = 'working';
export const BACKWARDS: number = -1;
export const FORWARDS: number = 1;
export const KEYBOARD_ACCESSIBLE_CLASS: string =
  'fmi-metoclient-timeslider-keyboard-accessible';
export const BASE_TAB_INDEX: number = 100;
export const DEFAULT_REFRESH_INTERVAL: number = 15 * MINUTE;
export const LONG_CLICK_DELAY: number = 0.5 * MILLISECONDS_PER_SECOND;
export const LONG_TAP_DELAY: number = 0.5 * MILLISECONDS_PER_SECOND;
export const DOUBLE_PRESS_DELAY: number = 0.3 * MILLISECONDS_PER_SECOND;
export const GET_CAPABILITIES_QUERY: string = 'request=GetCapabilities';
export const DEFAULT_TILESIZE: number = 1024;
export const PRESENT: string = 'present';
export const METOCLIENT_PREFIX: string = 'metoclient:';
export const TIME: string = 'metoclient:time';
export const PREVIOUS: string = 'metoclient:previous';
export const NEXT: string = 'metoclient:next';
export const OPACITY: string = 'metoclient:opacity';
export const ID: string = 'metoclient:id';
export const DEFAULT_LEGEND: string = 'metoclient:defaultLegend';
export const OL_CLASS_NAME: string = 'metoclient:olClassName';
export const TIMEOUT: string = 'metoclient:timeout';
export const LOADING_ERROR: string = 'metoclient:loadingError';
export const LAYER_SWITCHER_CONTAINER_ID: string =
  'fmi-metoclient-layer-switcher-container';
export const LEGEND_CHOOSER_CONTAINER_ID: string =
  'fmi-metoclient-legend-chooser-container';
export const LEGEND_CHOOSER_LABEL_ID: string =
  'fmi-metoclient-legend-chooser-label';
export const LEGEND_CHOOSER_SELECT_ID: string =
  'fmi-metoclient-legend-chooser-select';
export const LEGEND_CONTAINER_CLASS: string = 'fmi-metoclient-legend-container';
export const OPACITY_CONTROL_CLASS: string = 'fmi-metoclient-opacity-control';
export const OPACITY_CONTAINER_CLASS: string =
  'fmi-metoclient-opacity-container';
export const CUSTOM_CONTROL_CONTAINER_ID: string =
  'fmi-metoclient-custom-control-container';
export const METEOROLOGICAL_MODE: string = 'meteorological';
export const SMARTMET_SERVER: string = 'smartmet server';
export const TAG_MOUSE_WHEEL_INTERACTIONS: string = 'mouse wheel interactions';
export const TAG_NO_INTERACTIONS: string = 'no interactions';
export const TAG_NO_LAYER_SWITCHER: string = 'no layer switcher';
export const TAG_INSTANT_TIMESLIDER: string = 'instant time slider';
export const TAG_DELAY_LOOP: string = 'delay loop';
export const TAG_FULL_SCREEN_CONTROL: string = 'fullscreen control';
export const TAG_RENDER_IMMEDIATELY: string = 'render immediately';
export const TAG_OPACITY_CONTROL: string = 'opacity control';
export const TAG_FIXED_EXTENT: string = 'fixed extent';
export const TAG_AUTOPLAY: string = 'autoplay';
export const BASE_MAP: string = 'base';
export const VISIBLE: string = 'visible';
export const NOT_VISIBLE: string = 'none';
export const ROTATED: string = 'rotated';
export const HORIZONTAL: string = 'horizontal';
export const VERTICAL: string = 'vertical';
