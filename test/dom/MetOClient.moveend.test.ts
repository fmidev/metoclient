/**
 * Regression tests for a null map in MetOClient.
 *
 * The map is set to the MetOClient instance only in initMap_, after the vector
 * layers have been created asynchronously with ol-mapbox-style. The tests keep
 * that step pending, and so keep the map uninitialized, while the OpenLayers
 * map, which is already attached to the page, renders and moves.
 *
 * They also cover destroy() during that same window: before the map exists
 * at all, while a vector-layer load that would otherwise call initMap_ after
 * the fact is still pending, and reusing the instance via a second render()
 * call afterwards. A second render() call without destroy() must likewise
 * supersede the attempt still in flight.
 */

import MetOClient from '../../src/MetOClient';

// Variables used in the factories of jest.mock must start with "mock"
const mockMaps: any[] = [];
// One resolver per olms() call, in call order, so concurrent render()
// attempts (e.g. a stale one left over from before destroy()) can be
// finished independently of each other.
const mockVectorLayerResolvers: Array<(map: any) => void> = [];

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
      new Promise((resolve) => {
        mockVectorLayerResolvers.push(resolve);
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

const timeSliderElements = () =>
  document.querySelectorAll('#time-slider .fmi-metoclient-timeslider');

const config = (tags: string[] = []) => ({
  target: 'map',
  timeSliderContainerId: 'time-slider',
  projection: 'EPSG:3067',
  center: [400000, 7000000],
  zoom: 3,
  locale: 'en',
  metadata: { tags },
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

describe('MetOClient before the vector layers are ready', () => {
  let client: MetOClient;
  let rendering: Promise<unknown>;

  beforeEach(() => {
    mockMaps.length = 0;
    mockVectorLayerResolvers.length = 0;
    document.body.innerHTML =
      '<div id="map"></div><div id="time-slider"></div>';
    client = new MetOClient(config());
    rendering = client.render().catch(() => undefined);
  });

  afterEach(async () => {
    // Let every render attempt reach its (mocked) vector-layer load, then
    // finish all of them - resolving an already-settled promise is a no-op,
    // so this is safe even for attempts a test already resolved itself.
    await waitFor(() => mockVectorLayerResolvers.length >= mockMaps.length);
    mockVectorLayerResolvers.forEach((resolve, i) => resolve(mockMaps[i]));
    await rendering;
    // Always tear down, even if a test already destroyed the client itself;
    // destroy() is safe to call more than once.
    client.destroy();
  });

  it('does not fail when the map moves', async () => {
    await waitFor(() => mockMaps.length === 1);
    expect(client.get('map')).toBeNull();
    expect(() => mockMaps[0].dispatchEvent('moveend')).not.toThrow();
  });

  it('does not throw and does not resurrect the map when destroyed while vector layers are still loading', async () => {
    await waitFor(() => mockMaps.length === 1);
    expect(client.get('map')).toBeNull();

    expect(() => client.destroy()).not.toThrow();
    expect(client.get('map')).toBeNull();

    // Let the pending vector-layer load (and initMap_) finish after destroy().
    mockVectorLayerResolvers[0]?.(mockMaps[0]);
    await rendering;

    // The map must stay unregistered, not get resurrected by the initMap_
    // call that was already in flight when destroy() ran, and be properly
    // disposed rather than just detached (no leftover listeners).
    expect(client.get('map')).toBeNull();
    expect(mockMaps[0].disposed).toBe(true);
  });

  it('rebuilds a working map when render() is called again after destroy()', async () => {
    await waitFor(() => mockMaps.length === 1);
    client.destroy();

    // Reuse the same instance: render() must be able to build a fresh map,
    // not be permanently blocked by the earlier destroy().
    const rendering2 = client.render().catch(() => undefined);
    await waitFor(() => mockMaps.length === 2);

    // Finish the stale first attempt (left over from before destroy()) -
    // it must not register itself or leave its map undisposed.
    mockVectorLayerResolvers[0]?.(mockMaps[0]);
    await rendering;
    expect(client.get('map')).not.toBe(mockMaps[0]);
    expect(mockMaps[0].disposed).toBe(true);

    // Finish the fresh second attempt - it must register normally.
    mockVectorLayerResolvers[1]?.(mockMaps[1]);
    await rendering2;
    expect(client.get('map')).toBe(mockMaps[1]);
    expect(mockMaps[1].disposed).toBeFalsy();

    // So the shared afterEach awaits the attempt that is actually current.
    rendering = rendering2;
  });

  it('leaves only the time slider of the current attempt when render() is called again after destroy()', async () => {
    await waitFor(() => mockMaps.length === 1);
    client.destroy();

    const rendering2 = client.render().catch(() => undefined);
    await waitFor(() => mockMaps.length === 2);
    mockVectorLayerResolvers[0]?.(mockMaps[0]);
    await rendering;
    mockVectorLayerResolvers[1]?.(mockMaps[1]);
    await rendering2;

    // The stale attempt's time slider was a control of the disposed map;
    // it must not stay on the page next to the live one.
    expect(timeSliderElements()).toHaveLength(1);
    expect(mockMaps[0].getControls().getLength()).toBe(0);
    expect(mockMaps[1].getControls().getArray()).toContain(
      client.get('timeSlider')
    );

    rendering = rendering2;
  });

  it('supersedes an in-flight render() when render() is called again without destroy()', async () => {
    await waitFor(() => mockMaps.length === 1);

    const rendering2 = client.render().catch(() => undefined);
    await waitFor(() => mockMaps.length === 2);

    // Finish the first attempt - it has been superseded and must dispose its
    // map instead of registering it.
    mockVectorLayerResolvers[0]?.(mockMaps[0]);
    await rendering;
    expect(client.get('map')).toBeNull();
    expect(mockMaps[0].disposed).toBe(true);
    expect(mockMaps[0].getTarget()).toBeFalsy();

    // Finish the second attempt - it is the current one and wins.
    mockVectorLayerResolvers[1]?.(mockMaps[1]);
    await rendering2;
    expect(client.get('map')).toBe(mockMaps[1]);
    expect(mockMaps[1].disposed).toBeFalsy();
    expect(timeSliderElements()).toHaveLength(1);

    rendering = rendering2;
  });
});

describe('MetOClient with the autoplay tag', () => {
  // The autoplay tag is consumed by the render() attempt that triggers
  // play(). The options object shares its metadata with the instance, so
  // the consumption is visible through get('options').
  const tags = (client: MetOClient): string[] =>
    (client.get('options') as any).metadata.tags;

  let client: MetOClient;
  let play: jest.SpyInstance;

  beforeEach(() => {
    mockMaps.length = 0;
    mockVectorLayerResolvers.length = 0;
    document.body.innerHTML =
      '<div id="map"></div><div id="time-slider"></div>';
    client = new MetOClient(config(['autoplay']));
    play = jest.spyOn(client, 'play');
  });

  afterEach(() => {
    client.destroy();
  });

  it('triggers play() once rendered', async () => {
    const rendering = client.render().catch(() => undefined);
    await waitFor(() => mockMaps.length === 1);
    mockVectorLayerResolvers[0]?.(mockMaps[0]);
    await rendering;

    expect(client.get('map')).toBe(mockMaps[0]);
    expect(play).toHaveBeenCalledTimes(1);
    expect(tags(client)).not.toContain('autoplay');
  });

  it('still triggers play() when render() is called again after destroy() during the initial load', async () => {
    const rendering = client.render().catch(() => undefined);
    await waitFor(() => mockMaps.length === 1);
    client.destroy();

    const rendering2 = client.render().catch(() => undefined);
    await waitFor(() => mockMaps.length === 2);

    // The stale attempt must not consume the autoplay tag on the way out,
    // which would silently leave the rebuilt map paused.
    mockVectorLayerResolvers[0]?.(mockMaps[0]);
    await rendering;
    expect(play).not.toHaveBeenCalled();
    expect(tags(client)).toContain('autoplay');

    mockVectorLayerResolvers[1]?.(mockMaps[1]);
    await rendering2;
    expect(client.get('map')).toBe(mockMaps[1]);
    expect(play).toHaveBeenCalledTimes(1);
    expect(tags(client)).not.toContain('autoplay');
  });
});

describe('MetOClient destroy() before the map is created at all', () => {
  it('does not throw when destroyed before render() was ever called', () => {
    document.body.innerHTML =
      '<div id="map"></div><div id="time-slider"></div>';
    const client = new MetOClient(config());
    expect(() => client.destroy()).not.toThrow();
  });
});

describe('MetOClient destroyed before updateCapabilities_ resolves', () => {
  it('abandons the deferred render() attempt without building a map or a time slider', async () => {
    mockMaps.length = 0;
    mockVectorLayerResolvers.length = 0;
    document.body.innerHTML =
      '<div id="map"></div><div id="time-slider"></div>';
    const client = new MetOClient(config());

    const rendering = client.render().catch(() => undefined);
    // destroy() runs synchronously, before render()'s own .then() callback
    // (which eventually reaches updateMap_/createMap_) has had a chance to
    // run at all - the render generation must be captured at the very start
    // of render(), not later inside createMap_, or this attempt would wrongly
    // treat the post-destroy generation as its own.
    expect(() => client.destroy()).not.toThrow();

    await expect(rendering).resolves.toBeUndefined();

    // The attempt must stop before createMap_: no map on the page, and no
    // time slider registered on the instance or left in its container.
    expect(mockMaps).toHaveLength(0);
    expect(client.get('map')).toBeNull();
    expect(client.get('timeSlider')).toBeNull();
    expect(timeSliderElements()).toHaveLength(0);
    client.destroy();
  });
});
