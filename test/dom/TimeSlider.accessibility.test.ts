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

  describe('focus', () => {
    it('leaves the tab order to the document order', () => {
      // A positive tabindex would take the focus before everything else on
      // the host page
      const focusable = [playButton(), ...frameButtons()];
      focusable.forEach((button) => {
        expect(button.hasAttribute('tabindex')).toBe(false);
        expect(button.tabIndex).toBe(0);
      });
      const inDocumentOrder = Array.from(
        document.querySelectorAll('#time-slider button')
      ).filter((button) => focusable.includes(button as HTMLButtonElement));
      expect(inDocumentOrder).toEqual(focusable);
    });

    it.each(['mouseup', 'touchend'])(
      'keeps the focus where it is on %s',
      (type) => {
        const button = playButton();
        button.focus();
        expect(document.activeElement).toBe(button);

        button.dispatchEvent(new Event(type, { bubbles: true }));
        expect(document.activeElement).toBe(button);
      }
    );

    it('keeps the focus of the host page while a time step is dragged over', () => {
      const outside = document.createElement('button');
      document.body.append(outside);
      outside.focus();

      slider.setDragging(true);
      document
        .querySelectorAll('.fmi-metoclient-timeslider-drag-listener')[2]
        .dispatchEvent(new MouseEvent('mousemove', { buttons: 1 }));
      expect(map.get('time')).toBe(TIMES[2]);
      expect(document.activeElement).toBe(outside);
    });
  });

  describe('state for assistive technology', () => {
    const status = (): HTMLElement =>
      document.querySelector<HTMLElement>(
        '#time-slider .fmi-metoclient-timeslider-status'
      )!;

    const currentButtons = (): HTMLButtonElement[] =>
      frameButtons().filter(
        (button) => button.getAttribute('aria-current') === 'true'
      );

    it('names the play button by the playing state, whatever changed it', () => {
      expect(playButton().getAttribute('aria-label')).toBe('Play animation');

      playButton().click();
      expect(map.get('playing')).toBe(true);
      expect(playButton().getAttribute('aria-label')).toBe('Pause animation');

      // Like MetOClient pause() and play()
      map.set('playing', false);
      expect(playButton().getAttribute('aria-label')).toBe('Play animation');
      map.set('playing', true);
      expect(playButton().getAttribute('aria-label')).toBe('Pause animation');

      // Selecting a time step stops the animation
      frameButtons()[1].click();
      expect(playButton().getAttribute('aria-label')).toBe('Play animation');
    });

    it('marks the button of the current time step', () => {
      expect(currentButtons()).toEqual([frameButtons()[0]]);

      map.set('time', TIMES[3]);
      expect(currentButtons()).toEqual([frameButtons()[3]]);
    });

    it('keeps the current time step marked when the frames are rebuilt', () => {
      map.set('time', TIMES[2]);
      slider.updateTimeLoaderVis(
        TIMES.map((time) => ({ endTime: time, status: '', active: true })),
        true
      );
      expect(currentButtons()).toEqual([frameButtons()[2]]);
    });

    it('tells the selected time in a polite status element', () => {
      expect(status().getAttribute('role')).toBe('status');
      expect(status().getAttribute('aria-live')).toBe('polite');
      expect(status().textContent).toBe('11 November 2026 at 07:00 UTC');

      frameButtons()[4].click();
      expect(status().textContent).toBe('11 November 2026 at 11:00 UTC');
    });

    it('silences the status element while the animation is playing', () => {
      map.set('playing', true);
      expect(status().getAttribute('aria-live')).toBe('off');
      map.set('time', TIMES[1]);
      expect(status().textContent).toBe('11 November 2026 at 08:00 UTC');

      map.set('playing', false);
      expect(status().getAttribute('aria-live')).toBe('polite');
    });
  });
});
