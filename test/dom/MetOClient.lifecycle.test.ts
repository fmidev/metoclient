/**
 * Regression tests for the render/refresh/destroy lifecycle of MetOClient,
 * following the review of the render generation counter.
 *
 * The OpenLayers map is the real one; the vector-layer load of
 * ol-mapbox-style is mocked so that each test decides when (and whether) it
 * resolves or rejects.
 */

import MetOClient from '../../src/MetOClient';

// Variables used in the factories of jest.mock must start with "mock"
const mockMaps: any[] = [];
const mockVectorLayers: Array<{
  resolve: (map: any) => void;
  reject: (error: Error) => void;
}> = [];

jest.mock('ol/Map', () => {
  const { default: OlMap } = jest.requireActual('ol/Map');
  return {
    __esModule: true,
    default: class extends OlMap {
      constructor(options: any) {
        super(options);
        mockMaps.push(this);
      }
    },
  };
});

jest.mock('ol-mapbox-style', () => ({
  __esModule: true,
  default: jest.fn(
    () =>
      new Promise((resolve, reject) => {
        mockVectorLayers.push({ resolve, reject });
      })
  ),
}));

const waitFor = async (condition: () => boolean, timeout = 2000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timed out waiting for the condition');
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const config = () => ({
  target: 'map',
  timeSliderContainerId: 'time-slider',
  projection: 'EPSG:3067',
  center: [400000, 7000000],
  zoom: 3,
  locale: 'en',
  metadata: { tags: [] as string[] },
  // A marker layer without a URL is a vector layer
  sources: {
    marker: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [25.5, 60.0] },
          },
        ],
      },
    },
  },
  layers: [
    {
      source: 'marker',
      type: 'symbol',
      id: 'marker',
      visibility: 'visible',
      metadata: { title: 'Marker', legendVisible: false },
    },
  ],
});

beforeEach(() => {
  mockMaps.length = 0;
  mockVectorLayers.length = 0;
  document.body.innerHTML = '<div id="map"></div><div id="time-slider"></div>';
});

describe('MetOClient refresh_()', () => {
  let client: MetOClient;

  beforeEach(() => {
    client = new MetOClient(config());
  });

  afterEach(() => {
    client.destroy();
  });

  /**
   * Run refresh_() with a render() that resolves with the given value, and
   * return the promise chain refresh_() attached to it.
   * @param {unknown} rendered Value the render() promise resolves with.
   * @returns {Promise<unknown>} The promise returned by the chained then().
   */
  const refreshWith = (rendered: unknown): Promise<unknown> => {
    const rendering = Promise.resolve(rendered);
    const then = jest.spyOn(rendering, 'then');
    jest.spyOn(client, 'render').mockReturnValue(rendering as Promise<any>);
    (client as any).refresh_();
    return then.mock.results[0].value;
  };

  it('does not reject when refreshed before any map is registered', async () => {
    expect(client.get('map')).toBeNull();
    await expect(refreshWith(undefined)).resolves.toBeUndefined();
  });

  it('renders the map the render resolved with', async () => {
    const rendered = { renderSync: jest.fn() };
    await expect(refreshWith(rendered)).resolves.toBeUndefined();
    expect(rendered.renderSync).toHaveBeenCalledTimes(1);
  });
});

describe('MetOClient when the vector-layer load rejects', () => {
  let client: MetOClient;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    client = new MetOClient(config());
  });

  afterEach(() => {
    client.destroy();
    consoleError.mockRestore();
  });

  it('disposes the map and its time slider instead of leaving them on the page', async () => {
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    mockVectorLayers[0].reject(new Error('Style load failed'));
    await expect(rendering).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(expect.any(Error));
    expect(client.get('map')).toBeNull();
    expect(client.get('timeSlider')).toBeNull();
    expect(mockMaps[0].disposed).toBe(true);
    expect(mockMaps[0].getTarget()).toBeFalsy();
    expect(document.querySelectorAll('#map .ol-viewport')).toHaveLength(0);
    expect(
      document.querySelectorAll('#time-slider .fmi-metoclient-timeslider')
    ).toHaveLength(0);
  });

  it('does not stack a second map on the target when rendered again', async () => {
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    mockVectorLayers[0].reject(new Error('Sprite load failed'));
    await rendering;

    const rendering2 = client.render();
    await waitFor(() => mockVectorLayers.length === 2);
    mockVectorLayers[1].resolve(mockMaps[1]);
    await rendering2;

    expect(client.get('map')).toBe(mockMaps[1]);
    expect(document.querySelectorAll('#map .ol-viewport')).toHaveLength(1);
    expect(
      document.querySelectorAll('#time-slider .fmi-metoclient-timeslider')
    ).toHaveLength(1);
  });
});

describe('MetOClient playing with an empty time list', () => {
  let client: MetOClient;
  let next: jest.SpyInstance;
  let delay: number;

  beforeEach(async () => {
    client = new MetOClient(config());
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    mockVectorLayers[0].resolve(mockMaps[0]);
    await rendering;
    expect(client.get('map')).toBe(mockMaps[0]);

    // The marker layer has no times; give the client some to play with
    (client as any).times_ = [1000, 2000];
    (client as any).config_.time = 1000;
    delay = (client as any).delay_;
    next = jest.spyOn(client, 'next').mockImplementation(() => undefined);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    client.destroy();
  });

  it('keeps the animation loop polling and resumes it once times return', () => {
    client.play();
    expect(next).toHaveBeenCalledTimes(1);

    // A refresh whose capabilities yield no times
    (client as any).times_ = [];
    jest.advanceTimersByTime(delay);
    expect(next).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(delay);
    expect(next).toHaveBeenCalledTimes(3);

    // Times return: the loop carries on without a pause() and play() pair
    (client as any).times_ = [1000, 2000];
    jest.advanceTimersByTime(delay);
    expect(next).toHaveBeenCalledTimes(4);
    expect(client.get('map').get('playing')).toBe(true);
  });

  it('can pause while the time list is empty', () => {
    client.play();
    (client as any).times_ = [];

    client.pause();
    expect(client.get('map').get('playing')).toBe(false);

    // The loop stops: no further frames are requested
    next.mockClear();
    jest.advanceTimersByTime(delay * 3);
    expect(next).not.toHaveBeenCalled();
  });

  it('still ignores play(), next() and previous() without any times', () => {
    next.mockRestore();
    (client as any).times_ = [];
    client.play();
    expect(client.get('map').get('playing')).toBeFalsy();
    expect(() => {
      client.next();
      client.previous();
    }).not.toThrow();
  });
});
