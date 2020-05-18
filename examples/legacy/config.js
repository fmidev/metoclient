var fmi = fmi || {};
fmi.config = fmi.config || {};

fmi.config.metoclient = {
  minZoom: 1,
  maxZoom: 10,
  center: [
    400000,
    6700000
  ],
  zoom: 2,
  target: 'map',
  projection: 'EPSG:3067',
  refreshInterval: 'PT15M',
  timeZone: 'Europe/Helsinki',
  metadata: {
    tags: [
      'mouse wheel interactions',
      'fullscreen control'
    ]
  },
  sources: {
    osm: {
      type: 'OSM'
    },
    openwms: {
      type: 'raster',
      tiles: [
        'https://openwms.fmi.fi/geoserver/wms'
      ],
      bounds: [
        -1214975,
        6518785,
        1179690,
        7850125
      ],
      tileSize: 1024
    },
  },
  layers: [
    {
      id: 'basic-map',
      source: 'osm',
      visibility: 'visible',
      metadata: {
        type: 'base',
        title: 'OpenStreetMap'
      }
    },
    {
      id: 'dbz-wms',
      type: 'raster',
      next: 'precipitation-wms',
      source: 'openwms',
      metadata: {
        title: 'Weather radar'
      },
      url: {
        service: 'WMS',
        layers: 'Radar:suomi_rr_eureffin',
        version: '1.3.0',
        request: 'GetMap',
        format: 'image/png',
        transparent: 'TRUE',
        crs: 'EPSG:3067',
        styles: '',
        width: '1024',
        height: '1024'
      },
      time: {
        range: 'every hour for 5 times history'
      }
    },
    {
      id: 'precipitation-wms',
      type: 'raster',
      previous: 'dbz-wms',
      source: 'openwms',
      metadata: {
        title: 'Precipitation forecast'
      },
      url: {
        service: 'WMS',
        layers: 'Weather:precipitation-forecast',
        version: '1.3.0',
        request: 'GetMap',
        format: 'image/png',
        transparent: 'TRUE',
        crs: 'EPSG:3067',
        styles: '',
        width: '1024',
        height: '1024'
      },
      time: {
        range: 'every hour for 2 times history AND every hour for 10 times'
      }
    }
  ]
};
