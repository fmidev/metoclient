/**
 * Unit tests for constants.js module.
 * Validates that constants have correct values and structure.
 */

import * as constants from '../../src/constants';

describe('constants.js', () => {
  describe('time constants', () => {
    it('should have correct MILLISECONDS_PER_SECOND', () => {
      expect(constants.MILLISECONDS_PER_SECOND).toBe(1000);
    });

    it('should have correct SECONDS_PER_MINUTE', () => {
      expect(constants.SECONDS_PER_MINUTE).toBe(60);
    });

    it('should have correct MINUTES_PER_HOUR', () => {
      expect(constants.MINUTES_PER_HOUR).toBe(60);
    });

    it('should have correct HOURS_PER_DAY', () => {
      expect(constants.HOURS_PER_DAY).toBe(24);
    });

    it('should have correct SECOND constant', () => {
      expect(constants.SECOND).toBe(1000);
    });

    it('should have correct MINUTE constant', () => {
      expect(constants.MINUTE).toBe(60 * 1000);
    });

    it('should have correct HOUR constant', () => {
      expect(constants.HOUR).toBe(60 * 60 * 1000);
    });

    it('should have correct DAY constant', () => {
      expect(constants.DAY).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('discreteSteps', () => {
    it('should be an array', () => {
      expect(Array.isArray(constants.discreteSteps)).toBe(true);
    });

    it('should be sorted in ascending order', () => {
      for (let i = 1; i < constants.discreteSteps.length; i++) {
        expect(constants.discreteSteps[i]).toBeGreaterThan(
          constants.discreteSteps[i - 1],
        );
      }
    });

    it('should start with MINUTE', () => {
      expect(constants.discreteSteps[0]).toBe(constants.MINUTE);
    });

    it('should end with DAY', () => {
      expect(constants.discreteSteps[constants.discreteSteps.length - 1]).toBe(
        constants.DAY,
      );
    });

    it('should contain common intervals', () => {
      expect(constants.discreteSteps).toContain(5 * constants.MINUTE);
      expect(constants.discreteSteps).toContain(15 * constants.MINUTE);
      expect(constants.discreteSteps).toContain(30 * constants.MINUTE);
      expect(constants.discreteSteps).toContain(constants.HOUR);
      expect(constants.discreteSteps).toContain(3 * constants.HOUR);
      expect(constants.discreteSteps).toContain(6 * constants.HOUR);
      expect(constants.discreteSteps).toContain(12 * constants.HOUR);
    });
  });

  describe('DEFAULT_OPTIONS', () => {
    it('should have required properties', () => {
      expect(constants.DEFAULT_OPTIONS).toHaveProperty('center');
      expect(constants.DEFAULT_OPTIONS).toHaveProperty('zoom');
      expect(constants.DEFAULT_OPTIONS).toHaveProperty('projection');
      expect(constants.DEFAULT_OPTIONS).toHaveProperty('target');
      expect(constants.DEFAULT_OPTIONS).toHaveProperty('sources');
      expect(constants.DEFAULT_OPTIONS).toHaveProperty('layers');
    });

    it('should have valid center coordinates', () => {
      expect(constants.DEFAULT_OPTIONS.center).toHaveLength(2);
      expect(typeof constants.DEFAULT_OPTIONS.center[0]).toBe('number');
      expect(typeof constants.DEFAULT_OPTIONS.center[1]).toBe('number');
    });

    it('should have valid zoom levels', () => {
      expect(constants.DEFAULT_OPTIONS.zoom).toBeGreaterThanOrEqual(0);
      expect(constants.DEFAULT_OPTIONS.minZoom).toBeGreaterThanOrEqual(0);
      expect(constants.DEFAULT_OPTIONS.maxZoom).toBeGreaterThan(
        constants.DEFAULT_OPTIONS.minZoom,
      );
    });

    it('should have default projection', () => {
      expect(constants.DEFAULT_OPTIONS.projection).toBe('EPSG:4326');
    });

    it('should have metadata with tags array', () => {
      expect(constants.DEFAULT_OPTIONS.metadata).toHaveProperty('tags');
      expect(Array.isArray(constants.DEFAULT_OPTIONS.metadata.tags)).toBe(true);
    });

    it('should have transition settings', () => {
      expect(constants.DEFAULT_OPTIONS.transition).toHaveProperty('delay');
      expect(constants.DEFAULT_OPTIONS.transition.delay).toBe(
        constants.DEFAULT_DELAY,
      );
    });

    it('should have texts for UI labels', () => {
      expect(constants.DEFAULT_OPTIONS.texts).toHaveProperty('Zoom In');
      expect(constants.DEFAULT_OPTIONS.texts).toHaveProperty('Zoom Out');
      expect(constants.DEFAULT_OPTIONS.texts).toHaveProperty('Legend');
    });

    it('should match snapshot', () => {
      expect(constants.DEFAULT_OPTIONS).toMatchSnapshot();
    });
  });

  describe('delay constants', () => {
    it('should have DEFAULT_DELAY', () => {
      expect(constants.DEFAULT_DELAY).toBe(1000);
    });

    it('should have DEFAULT_TIMEOUT', () => {
      expect(constants.DEFAULT_TIMEOUT).toBe(5000);
    });

    it('should have MAX_REFRESH_INTERVAL', () => {
      // Max 32-bit signed integer for setTimeout
      expect(constants.MAX_REFRESH_INTERVAL).toBe(2147483647);
    });

    it('should have DEFAULT_REFRESH_INTERVAL', () => {
      expect(constants.DEFAULT_REFRESH_INTERVAL).toBe(15 * constants.MINUTE);
    });

    it('should have interaction delay constants', () => {
      expect(constants.LONG_CLICK_DELAY).toBe(
        0.5 * constants.MILLISECONDS_PER_SECOND,
      );
      expect(constants.LONG_TAP_DELAY).toBe(
        0.5 * constants.MILLISECONDS_PER_SECOND,
      );
      expect(constants.DOUBLE_PRESS_DELAY).toBe(
        0.3 * constants.MILLISECONDS_PER_SECOND,
      );
    });
  });

  describe('CSS class constants', () => {
    it('should have consistent fmi-metoclient prefix', () => {
      const cssClasses = [
        constants.CLICKABLE_CLASS,
        constants.PRE_MARGIN_CLASS,
        constants.FRAMES_CONTAINER_CLASS,
        constants.PLAY_BUTTON_CLASS,
        constants.FRAME_TICK_CLASS,
        constants.POINTER_CLASS,
      ];

      cssClasses.forEach((cssClass) => {
        expect(cssClass).toMatch(/^fmi-metoclient-/);
      });
    });

    it('should use kebab-case', () => {
      const cssClasses = [
        constants.CLICKABLE_CLASS,
        constants.FRAMES_CONTAINER_CLASS,
        constants.POINTER_WRAPPER_CLASS,
      ];

      cssClasses.forEach((cssClass) => {
        // Should not contain uppercase letters or underscores
        expect(cssClass).not.toMatch(/[A-Z_]/);
      });
    });
  });

  describe('status constants', () => {
    it('should have STATUS_WORKING', () => {
      expect(constants.STATUS_WORKING).toBe('working');
    });

    it('should have STATUS_SUCCESS', () => {
      expect(constants.STATUS_SUCCESS).toBe('success');
    });

    it('should have STATUS_ERROR', () => {
      expect(constants.STATUS_ERROR).toBe('error');
    });
  });

  describe('frame constants', () => {
    it('should have FRAME_HISTORY', () => {
      expect(constants.FRAME_HISTORY).toBe('history');
    });

    it('should have FRAME_FUTURE', () => {
      expect(constants.FRAME_FUTURE).toBe('future');
    });

    it('should have direction constants', () => {
      expect(constants.BACKWARDS).toBe(-1);
      expect(constants.FORWARDS).toBe(1);
    });
  });

  describe('tag constants', () => {
    it('should have feature tags', () => {
      expect(constants.TAG_MOUSE_WHEEL_INTERACTIONS).toBeDefined();
      expect(constants.TAG_NO_INTERACTIONS).toBeDefined();
      expect(constants.TAG_NO_LAYER_SWITCHER).toBeDefined();
      expect(constants.TAG_FULL_SCREEN_CONTROL).toBeDefined();
      expect(constants.TAG_AUTOPLAY).toBeDefined();
    });

    it('should have string values for tags', () => {
      expect(typeof constants.TAG_AUTOPLAY).toBe('string');
      expect(typeof constants.TAG_DELAY_LOOP).toBe('string');
      expect(typeof constants.TAG_RENDER_IMMEDIATELY).toBe('string');
    });
  });

  describe('metoclient prefix constants', () => {
    it('should have consistent metoclient: prefix', () => {
      expect(constants.METOCLIENT_PREFIX).toBe('metoclient:');
      expect(constants.TIME).toBe('metoclient:time');
      expect(constants.PREVIOUS).toBe('metoclient:previous');
      expect(constants.NEXT).toBe('metoclient:next');
      expect(constants.OPACITY).toBe('metoclient:opacity');
      expect(constants.ID).toBe('metoclient:id');
    });
  });

  describe('visibility constants', () => {
    it('should have VISIBLE and NOT_VISIBLE', () => {
      expect(constants.VISIBLE).toBe('visible');
      expect(constants.NOT_VISIBLE).toBe('none');
    });
  });

  describe('orientation constants', () => {
    it('should have orientation values', () => {
      expect(constants.HORIZONTAL).toBe('horizontal');
      expect(constants.VERTICAL).toBe('vertical');
      expect(constants.ROTATED).toBe('rotated');
    });
  });

  describe('DEFAULT_TILESIZE', () => {
    it('should be a power of 2', () => {
      const tileSize = constants.DEFAULT_TILESIZE;
      expect(Math.log2(tileSize) % 1).toBe(0);
    });

    it('should be 1024', () => {
      expect(constants.DEFAULT_TILESIZE).toBe(1024);
    });
  });

  describe('PROJECTION_RESOLUTIONS', () => {
    it('should have EPSG:3067 resolutions', () => {
      expect(constants.PROJECTION_RESOLUTIONS['EPSG:3067']).toBeDefined();
      expect(Array.isArray(constants.PROJECTION_RESOLUTIONS['EPSG:3067'])).toBe(
        true,
      );
    });

    it('should have descending resolution values', () => {
      const resolutions = constants.PROJECTION_RESOLUTIONS['EPSG:3067'];
      for (let i = 1; i < resolutions.length; i++) {
        expect(resolutions[i]).toBeLessThan(resolutions[i - 1]);
      }
    });
  });
});
