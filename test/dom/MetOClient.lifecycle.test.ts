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
