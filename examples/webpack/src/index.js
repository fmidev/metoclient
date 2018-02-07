import { MetOClient } from 'metoclient'
import OlStyleStyle from 'ol/style/style'
import OlStyleIcon from 'ol/style/icon'

// API-KEY is required as part of the base URL that is used for the layers
// when FMI services are used.
// API-KEY is required as part of the base URL that is used for the layers
// when FMI services are used.
let API_KEY = 'insert-your-apikey-here'
if (!API_KEY) {
  alert('Check HTML source: proper API-KEY should be set.')
} else {
  // Initialize options objects for animation.
  let resolutionTime = 60 * 60 * 1000
  let currentDate = new Date()
  let currentTime = MetOClient.floorTime(currentDate.getTime(), resolutionTime)
  let beginTime = currentTime - 5 * resolutionTime
  let endTime = currentTime + 5 * resolutionTime
  let resolutions = [2048, 1024, 512, 256, 128, 64]
  let baseUrl = 'http://wms.fmi.fi/fmi-apikey/' + API_KEY + '/geoserver/'
  let wmsBaseUrl = baseUrl + 'wms'
  let origins1024 = [[-118331.36640836, 8432773.1670142], [-118331.36640836, 8432773.1670142], [-118331.36640836, 7907751.53726352], [-118331.36640836, 7907751.53726352], [-118331.36640836, 7907751.53726352], [-118331.36640836, 7907751.53726352]]
  let extent = [-1000000, 5000000, 5000000, 20000000]
  let imgPath = '../../dist/img/'
  // Create animation layers.
  // Animation specific configurations are located inside animation property.
  // Many of these values are given here to show them as an example.
  // Usually, default values may be enough.
  let config = {
    project: 'mymap',
    // Map view configurations
    // Layer configuration
    layers: {
      // ---------------------------------------------------------------
      'OpenStreetMap': {
        className: 'OSM',
        title: 'OpenStreetMap',
        visible: true,
        useSavedVisible: true,
        editOpacity: true,
        useSavedOpacity: true
      },
      // ---------------------------------------------------------------
      'Stamen': {
        className: 'Stamen',
        title: 'Water Color',
        visible: false,
        useSavedVisible: true,
        editOpacity: true,
        useSavedOpacity: true,
        source: {
          layer: 'watercolor'
        }
      },
      // ---------------------------------------------------------------
      'Rain radar': {
        className: 'TileWMS',
        title: 'Rain radar and humidity forecast',
        visible: true,
        useSavedVisible: true,
        editOpacity: true,
        useSavedOpacity: true,
        type: 'obs',
        source: {
          url: wmsBaseUrl,
          params: {
            'LAYERS': 'Radar:suomi_rr_eureffin',
            'TRANSPARENT': 'TRUE',
            'FORMAT': 'image/png'
          },
          projection: 'EPSG:3857',
          tileGridOptions: {
            origins: origins1024,
            extent: extent,
            resolutions: resolutions,
            tileSize: 1024
          }
        },
        animation: {
          beginTime: beginTime,
          resolutionTime: resolutionTime,
          hasLegend: false
        }
      },
      // ---------------------------------------------------------------
      'Humidity forecast': {
        className: 'TileWMS',
        title: 'Rain radar and humidity forecast',
        visible: true,
        useSavedVisible: true,
        editOpacity: true,
        useSavedOpacity: true,
        type: 'for',
        source: {
          url: wmsBaseUrl,
          params: {
            'LAYERS': 'Weather:precipitation-forecast',
            'TRANSPARENT': 'TRUE',
            'FORMAT': 'image/png'
          },
          projection: 'EPSG:3857',
          tileGridOptions: {
            origins: origins1024,
            extent: extent,
            resolutions: resolutions,
            tileSize: 1024
          }
        },
        animation: {
          endTime: endTime,
          resolutionTime: resolutionTime,
          hasLegend: false
        }
      },
      // ---------------------------------------------------------------
      'Cloudiness forecast': {
        className: 'TileWMS',
        title: 'Cloudiness forecast',
        visible: false,
        useSavedVisible: true,
        editOpacity: true,
        useSavedOpacity: true,
        type: 'for',
        source: {
          url: wmsBaseUrl,
          params: {
            'LAYERS': 'Weather:cloudiness-forecast',
            'TRANSPARENT': 'TRUE',
            'FORMAT': 'image/png'
          },
          projection: 'EPSG:3857',
          tileGridOptions: {
            origins: origins1024,
            extent: extent,
            resolutions: resolutions,
            tileSize: 1024
          }
        },
        animation: {
          beginTime: currentTime,
          endTime: endTime,
          resolutionTime: resolutionTime,
          hasLegend: true
        }
      },
      // ---------------------------------------------------------------
      'Temperature forecast': {
        className: 'TileWMS',
        title: 'Temperature forecast',
        visible: true,
        useSavedVisible: true,
        editOpacity: true,
        useSavedOpacity: true,
        type: 'for',
        source: {
          url: wmsBaseUrl,
          params: {
            'LAYERS': 'Weather:temperature-forecast-contour',
            'TRANSPARENT': 'TRUE',
            'FORMAT': 'image/png'
          },
          projection: 'EPSG:3857',
          tileGridOptions: {
            origins: origins1024,
            extent: extent,
            resolutions: resolutions,
            tileSize: 1024
          }
        },
        animation: {
          beginTime: currentTime,
          endTime: endTime,
          resolutionTime: resolutionTime,
          hasLegend: false
        }
      },
      // ---------------------------------------------------------------
      'Markers': {
        className: 'Vector',
        type: 'features',
        title: 'Markers',
        visible: false,
        useSavedVisible: true,
        editOpacity: true,
        useSavedOpacity: true,
        popup: true,
        source: {
          projection: 'EPSG:4326',
          features: [
            {
              type: 'Point',
              geometry: [25, 61],
              name: 'Point 1',
              population: 1000,
              text: 'Description A'
            },
            {
              type: 'Point',
              geometry: [26, 63],
              name: 'Point 2',
              population: 2000,
              text: 'Description B'
            }
          ]
        },
        style: [
          {
            image: {
              type: 'icon',
              anchor: [0.5, 0.5],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction',
              opacity: 0.75,
              rotation: 45,
              src: '../../img/icon.png'
            },
            text: {
              font: '12px helvetica,sans-serif',
              text: 'Kohde',
              rotation: 45,
              fill: {
                color: 'rgba(0, 255, 0, 1.0)'
              },
              stroke: {
                color: 'rgba(0, 0, 255, 1.0)',
                width: 2,
                lineCap: 'round',
                lineJoin: 'miter',
                lineDash: [1, 2],
                miterLimit: 7
              }
            }
          }
        ]
      }
    },
    container: 'fmi-metoclient',
    projection: 'EPSG:3857',
    extent: [-1000000, 5000000, 10000000, 20000000],
    resolutions: resolutions,
    defaultCenterLocation: [2750000, 8500000],
    defaultCenterProjection: 'EPSG:3857',
    defaultZoomLevel: 1,
    showLegend: true,
    showLayerSwitcher: true,
    showLoadProgress: true,
    markerImagePath: '../../img/marker.png',
    maxAsyncLoadCount: 5,
    // Disable panning and zooming
    staticControls: false,
    // Time configuration
    autoStart: false,
    waitUntilLoaded: false,
    autoReplay: true,
    refreshInterval: 15 * 60 * 1000,
    frameRate: 500,
    resolutionTime: resolutionTime,
    defaultAnimationTime: Date.now(),
    beginTime: beginTime,
    endTime: endTime,
    endTimeDelay: 1000,
    showTimeSlider: true,
    timeZone: 'Europe/Helsinki',

    // Localization
    localization: {
      locale: 'en',
      fi: {
        overlays: 'Sääaineistot',
        baseLayers: 'Taustakartat',
        features: 'Kohteet',
        legend: 'Selite',
        noLegend: 'Ei selitettä',
        zoomInTooltip: 'Lähennä',
        zoomOutTooltip: 'Loitonna',
        layersTooltip: 'Karttatasot',
        browserNotSupported: 'Tämä selain ei ole tuettu.'
      },
      en: {
        overlays: 'Overlays',
        baseLayers: 'Base layers',
        features: 'Features',
        legend: 'Legend',
        noLegend: 'None',
        zoomInTooltip: 'Zoom in',
        zoomOutTooltip: 'Zoom out',
        layersTooltip: 'Layers',
        browserNotSupported: 'This browser is not supported.'
      }
    }
  }
  let weatherVisualization = new MetOClient(config)
  // Simple case:
  // weatherVisualization.createAnimation();
  // Advanced case:
  weatherVisualization.createAnimation({
    loaded: function () {
      // Add a click handler to the map to render the popup.
      let map = weatherVisualization.getMap()

      map.on('singleclick', function (evt) {
        let clickedFeatures = weatherVisualization.getFeaturesAt('Markers', evt.coordinate[0], evt.coordinate[1], 30)
        if (clickedFeatures.length > 0) {
          let content = '<p><b>Name:</b><br>' +
            '<code>' + clickedFeatures[0].get('name') + '</code></p>' +
            '<p><b>Population:</b><br>' +
            '<code>' + clickedFeatures[0].get('population') + '</code></p>' +
            '<b>Clicked at:</b><br>' +
            '<code>' + evt.coordinate.join(', ') + '</code></p>'
          weatherVisualization.showPopup(content, evt.coordinate[0], evt.coordinate[1])
        }
      })

      // Update mouse cursor
      map.on('pointermove', function (evt) {
        let features = weatherVisualization.getFeaturesAt('Markers', evt.coordinate[0], evt.coordinate[1], 30)
        if (features.length > 0) {
          map.getTarget().style.cursor = 'pointer'
        } else {
          map.getTarget().style.cursor = ''
        }
      })

      // Custom control
      if (document.getElementsByClassName('custom-control').length === 0) {
        let customControl = document.createElement('div')
        customControl.appendChild(document.createElement('button'))
        customControl.classList.add('ol-unselectable', 'ol-control', 'custom-control')
        customControl.addEventListener('click', event => {
          let coord = weatherVisualization.getMap().getView().getCenter()
          weatherVisualization.showPopup('<p>Map center:</p><code>' + coord.join(', ') + '</code>', coord[0], coord[1])
        })
        let animator = document.getElementById('fmi-metoclient')
        animator.appendChild(customControl)
      }
      let features = weatherVisualization.getFeatures('Markers')
      let firstFeature = features[0]
      if (typeof firstFeature === 'undefined') {
        return
      }
      let geom = firstFeature.getGeometry()

      // Also OpenLayers functionality is available
      let featureStyle = new OlStyleStyle({
        'image': new OlStyleIcon({
          'anchor': [0.5, 0.5],
          'anchorXUnits': 'pixels',
          'anchorYUnits': 'pixels',
          'opacity': 0.75,
          'rotation': 0,
          'src': '../../img/marker.png'
        })
      })

      firstFeature.setStyle([featureStyle]);
      // Moving feature
      (function moveFeature (i) {
        setTimeout(function () {
          let coord = geom.getCoordinates()
          geom.setCoordinates([coord[0] + i * 1000, coord[1]])
          i--
          if (i > 0) {
            moveFeature(i)
          }
        }, 1000)
      })(25)
    }
  })
}