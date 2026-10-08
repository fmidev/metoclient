/**
 * Regression tests for a null map in MetOClient.
 *
 * The map is set to the MetOClient instance only in initMap_, after the vector
 * layers have been created asynchronously with ol-mapbox-style. The tests keep
 * that step pending, and so keep the map uninitialized, while the OpenLayers
 * map, which is already attached to the page, renders and moves.
 */

import MetOClient from '../../src/MetOClient';

// Variables used in the factories of jest.mock must start with "mock"
const mockMaps: any[] = [];
let mockFinishVectorLayers: ((map: any) => void) | undefined;

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
        mockFinishVectorLayers = resolve;
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
    mockFinishVectorLayers = undefined;
    document.body.innerHTML =
      '<div id="map"></div><div id="time-slider"></div>';
    client = new MetOClient(config());
    rendering = client.render().catch(() => undefined);
  });

  afterEach(async () => {
    // Let the rendering end
    await waitFor(() => mockFinishVectorLayers !== undefined);
    mockFinishVectorLayers?.(mockMaps[0]);
    await rendering;
  });

  it('does not fail when the map moves', async () => {
    await waitFor(() => mockMaps.length === 1);
    expect(client.get('map')).toBeNull();
    expect(() => mockMaps[0].dispatchEvent('moveend')).not.toThrow();
  });

  it('does not fail when the time changes', async () => {
    await waitFor(() => mockMaps.length === 1);
    expect(client.get('map')).toBeNull();
    expect(() => (client as any).timeUpdated_()).not.toThrow();
  });
});
