/**
 * Accessibility of the time slider: keyboard operation, focus handling and
 * the state exposed to assistive technology.
 *
 * The OpenLayers map is the real one, so that the slider is driven by the
 * same 'time' and 'playing' properties as in MetOClient.
 */

import Map from 'ol/Map';
import TimeSlider from '../../src/TimeSlider';

const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 11, 7, 0, 0);
const TIMES = [0, 1, 2, 3, 4].map((step) => START + step * HOUR);

describe('TimeSlider accessibility', () => {
  let map: Map;
  let slider: TimeSlider;

  const frameButtons = (): HTMLButtonElement[] =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        'button.fmi-metoclient-timeslider-keyboard-accessible'
      )
    );

  const playButton = (): HTMLButtonElement =>
    document.querySelector<HTMLButtonElement>(
      'button.fmi-metoclient-timeslider-play-button'
    )!;

  beforeEach(() => {
    document.body.innerHTML =
      '<div id="map"></div><div id="time-slider"></div>';
    slider = new TimeSlider({
      target: 'time-slider',
      locale: 'en-GB',
      timeZone: 'UTC',
      buttonPlayText: 'Play animation',
      buttonPauseText: 'Pause animation',
    });
    map = new Map({ target: 'map', controls: [slider] });
    map.set('time', TIMES[0]);
    slider.createTimeSlider(TIMES);
  });

  afterEach(() => {
    slider.destroy();
    map.dispose();
  });

  describe('keyboard operation', () => {
    it('has a named button for every time step', () => {
      const buttons = frameButtons();
      expect(buttons).toHaveLength(TIMES.length);
      expect(buttons[1].getAttribute('aria-label')).toBe(
        '11 November 2026 at 08:00 UTC'
      );
    });

    it('selects the time step when its button is activated', () => {
      // Enter and Space on a focused button dispatch a click
      frameButtons()[2].click();
      expect(map.get('time')).toBe(TIMES[2]);
    });

    it('stops the animation when a time step is selected', () => {
      map.set('playing', true);
      frameButtons()[3].click();
      expect(map.get('playing')).toBe(false);
      expect(map.get('time')).toBe(TIMES[3]);
    });

    it('does not submit a form of the host page', () => {
      expect(playButton().type).toBe('button');
      frameButtons().forEach((button) => {
        expect(button.type).toBe('button');
      });
    });
  });
});
