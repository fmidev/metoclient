var fmi = fmi || {};
fmi.config = fmi.config || {};

fmi.config.metoclient = {
  minZoom: 1,
  maxZoom: 10,
  center: [
    400000,
    6700000
  ],
  extent: [144000, 6508000, 656000, 6892000],
  smoothExtentConstraint: false,
  zoom: 2,
  target: 'map',
  projection: 'EPSG:3067',
  refreshInterval: 'PT15M',
  timeZone: 'Europe/Helsinki',
  transition: {
    delay: 1000
  },
  tags: [
    'mouse wheel interactions',
    'fullscreen control',
    'fixed extent'
  ],
  locale: 'en-GB',
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
      source: 'openwms',
      metadata: {
        title: 'Weather radar',
        legendVisible: true
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
    }
  ]
};
