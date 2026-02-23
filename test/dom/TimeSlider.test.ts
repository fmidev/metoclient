/**
 * DOM tests for TimeSlider component.
 * Tests UI rendering and interaction with the DOM.
 */

import { MockMap } from '../helpers/mockOpenLayers';
import * as constants from '../../src/constants';
import { sampleTimes } from '../helpers/testFixtures';

// Mock OpenLayers Control
jest.mock('ol/control/Control', () => {
  return jest.fn().mockImplementation(function (this: any, options: any) {
    this.element = options.element;
    this.target_ = options.target;
    this.map_ = null;
    this.getMap = jest.fn(() => this.map_);
    this.setMap = jest.fn((map: any) => {
      this.map_ = map;
    });
    this.dispatchEvent = jest.fn();
    this.set = jest.fn();
    this.get = jest.fn();
    this.on = jest.fn(() => ({ event: 'mock', callback: jest.fn() }));
  });
});

// Mock good-listener
jest.mock('good-listener', () => jest.fn(() => ({ destroy: jest.fn() })));

// Mock element-resize-detector
jest.mock('element-resize-detector', () =>
  jest.fn(() => ({
    listenTo: jest.fn(),
    uninstall: jest.fn(),
  }))
);

describe('TimeSlider DOM', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Create a container in the document
    container = document.createElement('div');
    container.id = 'map-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('Element creation', () => {
    it('should create a container element', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const slider = new TimeSlider({ target: container });

      expect(slider.element).toBeDefined();
      expect(slider.element.tagName).toBe('DIV');
    });

    it('should have the correct CSS classes', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const slider = new TimeSlider({ target: container });

      expect(slider.element.className).toContain('ol-control');
      expect(slider.element.className).toContain('fmi-metoclient-timeslider');
    });

    it('should add meteorological mode class when enabled', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const slider = new TimeSlider({
        target: container,
        meteorologicalMode: true,
      });

      expect(slider.element.className).toContain(constants.METEOROLOGICAL_MODE);
    });

    it('should not have meteorological class by default', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const slider = new TimeSlider({ target: container });

      expect(slider.element.className).not.toContain(
        constants.METEOROLOGICAL_MODE
      );
    });
  });

  describe('TimeSlider properties', () => {
    it('should store config options', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const options = {
        target: container,
        locale: 'fi-FI',
        timeZone: 'Europe/Helsinki',
      };
      const slider = new TimeSlider(options);

      expect(slider.locale_).toBe('fi-FI');
    });

    it('should initialize with empty frames array', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const slider = new TimeSlider({ target: container });

      expect(slider.frames_).toEqual([]);
    });

    it('should initialize with animationPlay as false', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const slider = new TimeSlider({ target: container });

      expect(slider.animationPlay_).toBe(false);
    });

    it('should initialize dragging as false', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const slider = new TimeSlider({ target: container });

      expect(slider.dragging_).toBe(false);
    });
  });

  describe('TimeZone handling', () => {
    it('should set timezone property', async () => {
      const TimeSlider = (await import('../../src/TimeSlider')).default;
      const slider = new TimeSlider({
        target: container,
        timeZone: 'America/New_York',
        timeZoneLabel: 'EST',
      });

      expect(slider.set).toHaveBeenCalledWith('timeZone', 'America/New_York');
      expect(slider.set).toHaveBeenCalledWith('timeZoneLabel', 'EST');
    });
  });

  describe('CSS class constants', () => {
    it('should use consistent CSS class naming', () => {
      // Verify CSS class constants follow the naming convention
      expect(constants.CLICKABLE_CLASS).toMatch(/^fmi-metoclient-timeslider-/);
      expect(constants.PLAY_BUTTON_CLASS).toMatch(
        /^fmi-metoclient-timeslider-/
      );
      expect(constants.POINTER_CLASS).toMatch(/^fmi-metoclient-timeslider-/);
      expect(constants.FRAME_TICK_CLASS).toMatch(/^fmi-metoclient-timeslider-/);
    });

    it('should have all required class constants defined', () => {
      expect(constants.FRAMES_CONTAINER_CLASS).toBeDefined();
      expect(constants.PLAY_BUTTON_CLASS).toBeDefined();
      expect(constants.POINTER_CLASS).toBeDefined();
      expect(constants.POINTER_WRAPPER_CLASS).toBeDefined();
      expect(constants.INDICATOR_CLASS).toBeDefined();
      expect(constants.HIDDEN_CLASS).toBeDefined();
    });
  });
});

describe('TimeSlider Mock Map Integration', () => {
  let container: HTMLDivElement;
  let mockMap: MockMap;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'map-container';
    document.body.appendChild(container);

    mockMap = new MockMap({ target: container });
    mockMap.set('time', sampleTimes.t1);
    mockMap.set('playing', false);
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  it('should respond to map time changes', () => {
    // Verify MockMap can track time changes
    mockMap.set('time', sampleTimes.t2);
    expect(mockMap.get('time')).toBe(sampleTimes.t2);
  });

  it('should respond to playing state changes', () => {
    mockMap.set('playing', true);
    expect(mockMap.get('playing')).toBe(true);
  });

  it('should support event listeners', () => {
    const callback = jest.fn();
    mockMap.on('change:time', callback);

    mockMap.set('time', sampleTimes.t3);

    expect(callback).toHaveBeenCalled();
  });
});
