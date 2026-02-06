/**
 * DOM tests for MetOClient configuration and constants.
 * Note: Full MetOClient instantiation requires extensive mocking of OpenLayers.
 * These tests focus on configuration validation and DOM setup.
 */

import * as constants from '../../src/constants';

describe('MetOClient Configuration', () => {
  describe('DEFAULT_OPTIONS', () => {
    it('should have required default options', () => {
      expect(constants.DEFAULT_OPTIONS.target).toBe('map');
      expect(constants.DEFAULT_OPTIONS.center).toEqual([0, 0]);
      expect(constants.DEFAULT_OPTIONS.zoom).toBe(4);
      expect(constants.DEFAULT_OPTIONS.projection).toBe('EPSG:4326');
    });

    it('should have default transition settings', () => {
      expect(constants.DEFAULT_OPTIONS.transition).toBeDefined();
      expect(constants.DEFAULT_OPTIONS.transition.delay).toBe(
        constants.DEFAULT_DELAY
      );
    });

    it('should have empty default sources and layers', () => {
      expect(constants.DEFAULT_OPTIONS.sources).toEqual({});
      expect(constants.DEFAULT_OPTIONS.layers).toEqual([]);
    });

    it('should have default locale', () => {
      expect(constants.DEFAULT_OPTIONS.locale).toBe('en-GB');
    });

    it('should have default timezone', () => {
      expect(constants.DEFAULT_OPTIONS.timeZone).toBe('Europe/Helsinki');
    });

    it('should have default timeout', () => {
      expect(constants.DEFAULT_OPTIONS.timeout).toBe(constants.DEFAULT_TIMEOUT);
    });

    it('should have default period delay', () => {
      expect(constants.DEFAULT_OPTIONS.periodDelay).toBe(
        2 * constants.DEFAULT_DELAY
      );
    });
  });

  describe('DEFAULT_OPTIONS texts', () => {
    it('should have zoom labels', () => {
      expect(constants.DEFAULT_OPTIONS.texts['Zoom In Label']).toBe('+');
      expect(constants.DEFAULT_OPTIONS.texts['Zoom Out Label']).toBe('-');
    });

    it('should have zoom tips', () => {
      expect(constants.DEFAULT_OPTIONS.texts['Zoom In']).toBe('Zoom In');
      expect(constants.DEFAULT_OPTIONS.texts['Zoom Out']).toBe('Zoom Out');
    });

    it('should have legend text', () => {
      expect(constants.DEFAULT_OPTIONS.texts['Legend']).toBe('Map legend');
    });

    it('should have layer switcher text', () => {
      expect(constants.DEFAULT_OPTIONS.texts['Layer Switcher']).toBe(
        'Layer Switcher'
      );
    });

    it('should have fullscreen labels', () => {
      expect(constants.DEFAULT_OPTIONS.texts['Fullscreen Label']).toBeDefined();
      expect(
        constants.DEFAULT_OPTIONS.texts['Fullscreen Label Active']
      ).toBeDefined();
    });
  });

  describe('DEFAULT_OPTIONS metadata', () => {
    it('should have empty tags array', () => {
      expect(constants.DEFAULT_OPTIONS.metadata.tags).toEqual([]);
    });

    it('should have refreshInterval set to map', () => {
      expect(constants.DEFAULT_OPTIONS.metadata.refreshInterval).toBe('map');
    });
  });
});

describe('MetOClient DOM Element IDs', () => {
  it('should have correct custom control container ID', () => {
    expect(constants.CUSTOM_CONTROL_CONTAINER_ID).toBe(
      'fmi-metoclient-custom-control-container'
    );
  });

  it('should have correct layer switcher container ID', () => {
    expect(constants.LAYER_SWITCHER_CONTAINER_ID).toBe(
      'fmi-metoclient-layer-switcher-container'
    );
  });

  it('should have correct legend container class', () => {
    expect(constants.LEGEND_CONTAINER_CLASS).toBe(
      'fmi-metoclient-legend-container'
    );
  });

  it('should have correct opacity control class', () => {
    expect(constants.OPACITY_CONTROL_CLASS).toBe(
      'fmi-metoclient-opacity-control'
    );
  });
});

describe('MetOClient tag constants', () => {
  it('should define all feature tags', () => {
    expect(constants.TAG_MOUSE_WHEEL_INTERACTIONS).toBe(
      'mouse wheel interactions'
    );
    expect(constants.TAG_NO_INTERACTIONS).toBe('no interactions');
    expect(constants.TAG_NO_LAYER_SWITCHER).toBe('no layer switcher');
    expect(constants.TAG_INSTANT_TIMESLIDER).toBe('instant time slider');
    expect(constants.TAG_DELAY_LOOP).toBe('delay loop');
    expect(constants.TAG_FULL_SCREEN_CONTROL).toBe('fullscreen control');
    expect(constants.TAG_RENDER_IMMEDIATELY).toBe('render immediately');
    expect(constants.TAG_OPACITY_CONTROL).toBe('opacity control');
    expect(constants.TAG_FIXED_EXTENT).toBe('fixed extent');
    expect(constants.TAG_AUTOPLAY).toBe('autoplay');
  });
});

describe('MetOClient DOM creation', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'map';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should be able to create a map container element', () => {
    const mapContainer = document.getElementById('map');
    expect(mapContainer).not.toBeNull();
    expect(mapContainer.id).toBe('map');
  });

  it('should be able to append child elements', () => {
    const controlContainer = document.createElement('div');
    controlContainer.id = constants.CUSTOM_CONTROL_CONTAINER_ID;
    container.appendChild(controlContainer);

    const found = document.getElementById(
      constants.CUSTOM_CONTROL_CONTAINER_ID
    );
    expect(found).not.toBeNull();
    expect(found.parentElement).toBe(container);
  });

  it('should support query selectors', () => {
    const inner = document.createElement('div');
    inner.className = 'test-class';
    container.appendChild(inner);

    const found = container.querySelector('.test-class');
    expect(found).not.toBeNull();
    expect(found.className).toBe('test-class');
  });
});
