/**
 * Mock WMS/WMTS capabilities data for tests.
 */

/**
 * Sample WMS GetCapabilities response data.
 */
export const wmsCapabilities = {
  version: '1.3.0',
  Service: {
    Name: 'WMS',
    Title: 'Test WMS Service',
  },
  Capability: {
    Layer: {
      Title: 'Root Layer',
      Layer: [
        {
          Name: 'radar',
          Title: 'Weather Radar',
          Style: [
            {
              Name: 'default',
              Title: 'Default Style',
              LegendURL: [
                {
                  Format: 'image/png',
                  OnlineResource: 'https://example.com/legend/radar.png',
                  size: [100, 200],
                },
              ],
            },
            {
              Name: 'grayscale',
              Title: 'Grayscale Style',
              LegendURL: [
                {
                  Format: 'image/png',
                  OnlineResource: 'https://example.com/legend/radar-gray.png',
                  size: [100, 200],
                },
              ],
            },
          ],
        },
        {
          Name: 'temperature',
          Title: 'Temperature',
          Style: [
            {
              Name: 'default',
              Title: 'Default Style',
              LegendURL: [
                {
                  Format: 'image/png',
                  OnlineResource: 'https://example.com/legend/temperature.png',
                  size: [100, 200],
                },
              ],
            },
          ],
        },
        {
          Name: 'no-legend-layer',
          Title: 'Layer Without Legend',
          Style: [],
        },
      ],
    },
  },
};

/**
 * Sample WMTS GetCapabilities response data.
 */
export const wmtsCapabilities = {
  version: '1.0.0',
  ServiceIdentification: {
    Title: 'Test WMTS Service',
    ServiceType: 'OGC WMTS',
  },
  Contents: {
    Layer: [
      {
        Identifier: 'radar',
        Title: 'Weather Radar',
        Format: ['image/png'],
        TileMatrixSetLink: [
          {
            TileMatrixSet: 'EPSG:3067',
          },
        ],
        Style: [
          {
            Identifier: 'default',
            isDefault: true,
            LegendURL: [
              {
                href: 'https://example.com/legend/radar.png',
              },
            ],
          },
        ],
      },
    ],
    TileMatrixSet: [
      {
        Identifier: 'EPSG:3067',
        SupportedCRS: 'urn:ogc:def:crs:EPSG::3067',
        TileMatrix: [
          {
            Identifier: '0',
            ScaleDenominator: 14285714.285714287,
            TopLeftCorner: [-548576, 8388608],
            TileWidth: 256,
            TileHeight: 256,
            MatrixWidth: 1,
            MatrixHeight: 1,
          },
        ],
      },
    ],
  },
};

/**
 * Sample WMS GetCapabilities XML string.
 */
export const wmsCapabilitiesXml = `<?xml version="1.0" encoding="UTF-8"?>
<WMS_Capabilities version="1.3.0" xmlns="http://www.opengis.net/wms">
  <Service>
    <Name>WMS</Name>
    <Title>Test WMS Service</Title>
  </Service>
  <Capability>
    <Layer>
      <Title>Root Layer</Title>
      <Layer queryable="1">
        <Name>radar</Name>
        <Title>Weather Radar</Title>
        <Style>
          <Name>default</Name>
          <Title>Default Style</Title>
          <LegendURL width="100" height="200">
            <Format>image/png</Format>
            <OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="https://example.com/legend/radar.png"/>
          </LegendURL>
        </Style>
      </Layer>
    </Layer>
  </Capability>
</WMS_Capabilities>`;

/**
 * Sample WMTS GetCapabilities XML string.
 */
export const wmtsCapabilitiesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0" version="1.0.0">
  <ServiceIdentification>
    <Title>Test WMTS Service</Title>
    <ServiceType>OGC WMTS</ServiceType>
  </ServiceIdentification>
  <Contents>
    <Layer>
      <ows:Identifier xmlns:ows="http://www.opengis.net/ows/1.1">radar</ows:Identifier>
      <ows:Title xmlns:ows="http://www.opengis.net/ows/1.1">Weather Radar</ows:Title>
      <Format>image/png</Format>
      <TileMatrixSetLink>
        <TileMatrixSet>EPSG:3067</TileMatrixSet>
      </TileMatrixSetLink>
    </Layer>
  </Contents>
</Capabilities>`;
