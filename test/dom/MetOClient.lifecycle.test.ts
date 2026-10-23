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
  // The layer this olms() call added to the map
  layer: any;
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

// Like the real olms() with a style object: the layers are added to the map
// synchronously, while the returned promise settles when the test says so.
jest.mock('ol-mapbox-style', () => ({
  __esModule: true,
  default: jest.fn((map: any) => {
    const { default: VectorLayer } = jest.requireActual('ol/layer/Vector');
    const { default: VectorSource } = jest.requireActual('ol/source/Vector');
    const layer = new VectorLayer({ source: new VectorSource() });
    layer.set('mapbox-source', 'marker');
    map.addLayer(layer);
    return new Promise((resolve, reject) => {
      mockVectorLayers.push({ layer, resolve, reject });
    });
  }),
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

describe('MetOClient overlapping render() calls on a live map', () => {
  let client: MetOClient;

  const vectorLayersOf = (map: any) =>
    map
      .getLayers()
      .getArray()
      .filter((layer: any) => layer.get('mapbox-source') != null);

  beforeEach(async () => {
    client = new MetOClient(config());
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    mockVectorLayers[0].resolve(mockMaps[0]);
    await rendering;
    expect(client.get('map')).toBe(mockMaps[0]);
    mockVectorLayers.length = 0;
  });

  afterEach(() => {
    client.destroy();
  });

  /**
   * Start a render() that stays in the vector configuration step, then a
   * second one that gets as far as olms().
   * @returns {object} Both render() promises and the release for the first.
   */
  const overlapRenders = async () => {
    let release!: () => void;
    jest
      .spyOn(client as any, 'updateVectorConfig_')
      .mockImplementationOnce(
        (vectorConfig: any) =>
          new Promise((resolve) => {
            release = () => resolve(vectorConfig);
          })
      );
    const stale = client.render();
    await waitFor(() => (client as any).updateVectorConfig_.mock.calls.length);
    const current = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    return { stale, current, release };
  };

  /**
   * Start a render() that reaches olms(), then a second render() that is held
   * back in the capabilities step, so the first one is superseded while its
   * olms() is still loading and before the second one touches the map.
   * @returns {object} Both render() promises and the release for the second.
   */
  const supersedeDuringOlms = async () => {
    const stale = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    let release!: () => void;
    jest
      .spyOn(client as any, 'updateCapabilities_')
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          })
      );
    const current = client.render();
    return { stale, current, release };
  };

  it('skips olms() for an attempt superseded while fetching the vector configuration', async () => {
    const { stale, current, release } = await overlapRenders();

    release();
    await expect(stale).resolves.toBeUndefined();
    expect(mockVectorLayers).toHaveLength(1);

    mockVectorLayers[0].resolve(mockMaps[0]);
    await current;
    expect(vectorLayersOf(mockMaps[0])).toEqual([mockVectorLayers[0].layer]);
  });

  it('removes the vector layers of an attempt superseded while olms() loads', async () => {
    const { stale, current, release } = await supersedeDuringOlms();
    const [staleLoad] = mockVectorLayers;
    expect(vectorLayersOf(mockMaps[0])).toEqual([staleLoad.layer]);

    staleLoad.resolve(mockMaps[0]);
    await expect(stale).resolves.toBeUndefined();
    // Gone right away, not only when the newer attempt rebuilds the layers
    expect(vectorLayersOf(mockMaps[0])).toEqual([]);

    release();
    await waitFor(() => mockVectorLayers.length === 2);
    mockVectorLayers[1].resolve(mockMaps[0]);
    await expect(current).resolves.toBe(mockMaps[0]);
    expect(vectorLayersOf(mockMaps[0])).toEqual([mockVectorLayers[1].layer]);
  });

  it('removes the vector layers of a superseded attempt that rejects', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { stale, current, release } = await supersedeDuringOlms();

    mockVectorLayers[0].reject(new Error('Style load failed'));
    await stale;
    expect(vectorLayersOf(mockMaps[0])).toEqual([]);

    release();
    await waitFor(() => mockVectorLayers.length === 2);
    mockVectorLayers[1].resolve(mockMaps[0]);
    await current;
    expect(vectorLayersOf(mockMaps[0])).toEqual([mockVectorLayers[1].layer]);
    consoleError.mockRestore();
  });

  it('does not register listeners for the layers of a superseded attempt', async () => {
    const { stale, current, release } = await supersedeDuringOlms();
    // The listeners of the initial render, which clear_() has not dropped yet
    const listeners = (client as any).sourceListeners_.length;

    mockVectorLayers[0].resolve(mockMaps[0]);
    await stale;
    expect((client as any).sourceListeners_).toHaveLength(listeners);

    release();
    await waitFor(() => mockVectorLayers.length === 2);
    mockVectorLayers[1].resolve(mockMaps[0]);
    await current;
  });

  it('leaves a single set of vector layers when the attempt is not superseded', async () => {
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    mockVectorLayers[0].resolve(mockMaps[0]);
    await rendering;

    expect(vectorLayersOf(mockMaps[0])).toEqual([mockVectorLayers[0].layer]);
  });
});

describe('MetOClient resize listener', () => {
  let client: MetOClient;
  let listenTo: jest.SpyInstance;

  beforeEach(() => {
    client = new MetOClient(config());
    listenTo = jest.spyOn((client as any).resizeDetector_, 'listenTo');
  });

  afterEach(() => {
    client.destroy();
  });

  it('is registered once for the attempt that registers its map, not for a superseded one', async () => {
    const stale = client.render();
    await waitFor(() => mockMaps.length === 1);
    const current = client.render();
    await waitFor(() => mockMaps.length === 2);

    mockVectorLayers[0].resolve(mockMaps[0]);
    await stale;
    expect(listenTo).not.toHaveBeenCalled();

    mockVectorLayers[1].resolve(mockMaps[1]);
    await current;
    expect(listenTo).toHaveBeenCalledTimes(1);
    expect(listenTo.mock.calls[0][0]).toBe(document.getElementById('map'));
  });

  it('is not registered when the vector-layer load rejects', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    mockVectorLayers[0].reject(new Error('Style load failed'));
    await rendering;

    expect(listenTo).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('refits the current view of a fixed extent map after render() replaced it', async () => {
    (client as any).config_.metadata.tags.push('fixed extent');
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    mockVectorLayers[0].resolve(mockMaps[0]);
    await rendering;
    const [, onResize] = listenTo.mock.calls[0];
    const firstView = mockMaps[0].getView();

    const rendering2 = client.render();
    await waitFor(() => mockVectorLayers.length === 2);
    mockVectorLayers[1].resolve(mockMaps[0]);
    await rendering2;
    const currentView = mockMaps[0].getView();
    expect(currentView).not.toBe(firstView);

    const fitFirst = jest.spyOn(firstView, 'fit');
    const fitCurrent = jest.spyOn(currentView, 'fit');
    onResize();
    expect(fitCurrent).toHaveBeenCalledTimes(1);
    expect(fitFirst).not.toHaveBeenCalled();
  });
});

describe('MetOClient destroy()', () => {
  it('releases the time slider together with the map, and tolerates a second call', async () => {
    const client = new MetOClient(config());
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    mockVectorLayers[0].resolve(mockMaps[0]);
    await rendering;
    const timeSlider = client.get('timeSlider');
    expect(timeSlider).not.toBeNull();
    const destroySlider = jest.spyOn(timeSlider, 'destroy');

    client.destroy();
    expect(client.get('map')).toBeNull();
    expect(client.get('timeSlider')).toBeNull();
    expect(destroySlider).toHaveBeenCalledTimes(1);

    expect(() => client.destroy()).not.toThrow();
    expect(destroySlider).toHaveBeenCalledTimes(1);
  });

  it('releases a time slider whose map was never registered', async () => {
    const client = new MetOClient(config());
    const rendering = client.render();
    await waitFor(() => mockVectorLayers.length === 1);
    expect(client.get('timeSlider')).not.toBeNull();

    client.destroy();
    expect(client.get('timeSlider')).toBeNull();

    mockVectorLayers[0].resolve(mockMaps[0]);
    await rendering;
    expect(client.get('timeSlider')).toBeNull();
  });
});
