/**
 * Common test fixtures and data.
 */

/**
 * Sample layer configuration.
 */
export const sampleLayer: any = {
  id: 'radar-layer',
  source: 'radar-source',
  visibility: 'visible',
  metadata: {
    title: 'Weather Radar',
    type: 'overlay',
  },
  url: {
    service: 'WMS',
    layers: 'radar',
    styles: 'default',
  },
  time: {
    data: [
      1704067200000, // 2024-01-01T00:00:00Z
      1704070800000, // 2024-01-01T01:00:00Z
      1704074400000, // 2024-01-01T02:00:00Z
    ],
  },
  legendTitle: 'Radar',
  legendUrl: null,
  timeout: 5000,
};

/**
 * Sample source configuration.
 */
export const sampleSource: any = {
  type: 'wms',
  tiles: ['https://example.com/wms?service=WMS&version=1.3.0&request=GetMap'],
  bounds: [-180, -90, 180, 90],
  tileSize: 256,
  times: [
    1704067200000, // 2024-01-01T00:00:00Z
    1704070800000, // 2024-01-01T01:00:00Z
    1704074400000, // 2024-01-01T02:00:00Z
  ],
};

/**
 * Sample MetOClient options.
 */
export const sampleOptions: any = {
  target: 'map',
  center: [25.0, 60.0],
  zoom: 5,
  projection: 'EPSG:4326',
  time: 1704067200000,
  resolutions: [4096, 2048, 1024, 512, 256, 128, 64],
  sources: {
    'radar-source': sampleSource,
  },
  layers: [sampleLayer],
  metadata: {
    tags: [],
  },
};

/**
 * Sample time values for testing.
 */
export const sampleTimes = {
  // Fixed timestamps for consistent testing
  t1: 1704067200000, // 2024-01-01T00:00:00Z
  t2: 1704070800000, // 2024-01-01T01:00:00Z
  t3: 1704074400000, // 2024-01-01T02:00:00Z
  t4: 1704078000000, // 2024-01-01T03:00:00Z
  t5: 1704081600000, // 2024-01-01T04:00:00Z

  // ISO strings
  iso1: '2024-01-01T00:00:00Z',
  iso2: '2024-01-01T01:00:00Z',
  iso3: '2024-01-01T02:00:00Z',

  // Intervals
  hourlyInterval: '2024-01-01T00:00:00Z/2024-01-01T03:00:00Z/PT1H',
  fifteenMinInterval: '2024-01-01T00:00:00Z/2024-01-01T01:00:00Z/PT15M',
};

/**
 * Sample URLs for testing.
 */
export const sampleUrls = {
  wms: 'https://example.com/wms?service=WMS&version=1.3.0&request=GetMap&layers=radar&time=2024-01-01T00:00:00Z',
  wmsNoTime:
    'https://example.com/wms?service=WMS&version=1.3.0&request=GetMap&layers=radar',
  wmts: 'https://example.com/wmts?service=WMTS&version=1.0.0&request=GetTile&layer=radar',
  capabilities: 'https://example.com/wms?service=WMS&request=GetCapabilities',
  baseOnly: 'https://example.com/wms',
  withHash: 'https://example.com/wms?param=value#section',
};

/**
 * Create a sample layer with custom overrides.
 *
 * @param {object} overrides - Properties to override.
 * @returns {object} Layer configuration.
 */
export function createLayer(overrides: any = {}): any {
  return {
    ...sampleLayer,
    ...overrides,
    metadata: {
      ...sampleLayer.metadata,
      ...(overrides.metadata || {}),
    },
    url: {
      ...sampleLayer.url,
      ...(overrides.url || {}),
    },
    time: {
      ...sampleLayer.time,
      ...(overrides.time || {}),
    },
  };
}

/**
 * Create a sample source with custom overrides.
 *
 * @param {object} overrides - Properties to override.
 * @returns {object} Source configuration.
 */
export function createSource(overrides: any = {}): any {
  return {
    ...sampleSource,
    ...overrides,
  };
}

/**
 * Create sample options with custom overrides.
 *
 * @param {object} overrides - Properties to override.
 * @returns {object} Options configuration.
 */
export function createOptions(overrides: any = {}): any {
  return {
    ...sampleOptions,
    ...overrides,
    sources: {
      ...sampleOptions.sources,
      ...(overrides.sources || {}),
    },
    layers: overrides.layers || sampleOptions.layers,
    metadata: {
      ...sampleOptions.metadata,
      ...(overrides.metadata || {}),
    },
  };
}
