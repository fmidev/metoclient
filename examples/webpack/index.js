import { MetOClient } from 'metoclient'
import jQuery from 'jquery'
import OlStyleStyle from 'ol/style/style'
import OlStyleIcon from 'ol/style/icon'

// API-KEY is required as part of the base URL that is used for the layers
// when FMI services are used.
let API_KEY = '' // Insert-your-apikey-here
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
  let extent = [-118331.366408356, 6335621.16701424, 875567.731906565, 7907751.53726352]
  let imgPath = '../../dist/img/'
  // Create animation layers.
  // Animation specific configurations are located inside animation property.
  // Many of these values are given here to show them as an example.
  // Usually, default values may be enough.
  let config = {
    project: 'mymap',
    // Map view configurations
    map: {
      model: {
        // Layer configuration
        layers: [
          // ---------------------------------------------------------------
          {
            className: 'OSM',
            title: 'OpenStreetMap',
            visible: true,
            useSavedVisible: true,
            editOpacity: true,
            useSavedOpacity: true
          },
          // ---------------------------------------------------------------
          {
            className: 'Stamen',
            title: 'Water Color',
            visible: false,
            useSavedVisible: true,
            editOpacity: true,
            useSavedOpacity: true,
            sourceOptions: {
              layer: 'watercolor'
            }
          },
          // ---------------------------------------------------------------
          {
            className: 'TileWMS',
            title: 'Rain radar and humidity forecast',
            visible: true,
            useSavedVisible: true,
            editOpacity: true,
            useSavedOpacity: true,
            type: 'obs',
            sourceOptions: {
              url: wmsBaseUrl,
              params: {
                'LAYERS': 'Radar:suomi_rr_eureffin',
                'TRANSPARENT': 'TRUE',
                'FORMAT': 'image/png'
              },
              projection: 'EPSG:3067',
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
          {
            className: 'TileWMS',
            title: 'Rain radar and humidity forecast',
            visible: true,
            useSavedVisible: true,
            editOpacity: true,
            useSavedOpacity: true,
            type: 'for',
            sourceOptions: {
              url: wmsBaseUrl,
              params: {
                'LAYERS': 'Weather:precipitation-forecast',
                'TRANSPARENT': 'TRUE',
                'FORMAT': 'image/png'
              },
              projection: 'EPSG:3067',
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
          {
            className: 'TileWMS',
            title: 'Cloudiness forecast',
            visible: false,
            useSavedVisible: true,
            editOpacity: true,
            useSavedOpacity: true,
            type: 'for',
            sourceOptions: {
              url: wmsBaseUrl,
              params: {
                'LAYERS': 'Weather:cloudiness-forecast',
                'TRANSPARENT': 'TRUE',
                'FORMAT': 'image/png'
              },
              projection: 'EPSG:3067',
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
          {
            className: 'TileWMS',
            title: 'Temperature forecast',
            visible: true,
            useSavedVisible: true,
            editOpacity: true,
            useSavedOpacity: true,
            type: 'for',
            sourceOptions: {
              url: wmsBaseUrl,
              params: {
                'LAYERS': 'Weather:temperature-forecast-contour',
                'TRANSPARENT': 'TRUE',
                'FORMAT': 'image/png'
              },
              projection: 'EPSG:3067',
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
          {
            className: 'Vector',
            type: 'features',
            title: 'Markers',
            visible: true,
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
        ]
      },
      view: {
        container: 'fmi-animator',
        projection: 'EPSG:3857',
        extent: [-500000, 5000000, 5000000, 20000000],
        resolutions: resolutions,
        defaultCenterLocation: [2750000, 9000000],
        defaultCenterProjection: 'EPSG:3857',
        defaultZoomLevel: 0,
        showLegend: true,
        legendTitle: 'Legend',
        noLegendText: 'None',
        showLayerSwitcher: true,
        showLoadProgress: true,
        markerImagePath: '../../img/marker.png',
        ignoreObsOffset: 5 * 60 * 1000,
        maxAsyncLoadCount: 5,
        // Disable panning and zooming
        staticControls: false
      }
    },
    // Time configuration
    time: {
      model: {
        autoStart: false,
        waitUntilLoaded: false,
        autoReplay: true,
        refreshInterval: 15 * 60 * 1000,
        frameRate: 500,
        resolutionTime: resolutionTime,
        defaultAnimationTime: (new Date()).getTime(),
        beginTime: beginTime,
        endTime: endTime,
        endTimeDelay: 1000
      },
      view: {
        showTimeSlider: true,
        timeZone: 'Europe/Helsinki',
        height: 90,
        imageWidth: 55,
        imageHeight: 55,
        imageBackgroundColor: '#585858',
        sliderYOffset: 0,
        sliderHeight: 55,
        statusHeight: 12,
        tickTextColor: '#000000',
        pastColor: '#B2D8EA',
        futureColor: '#D7B13E',
        tickColor: '#FFFFFF',
        notLoadedColor: '#585858',
        loadingColor: '#B2D8EA',
        loadedColor: '#94BF77',
        loadingErrorColor: '#9A2500',
        tickHeight: 24,
        tickTextYOffset: 18,
        tickTextSize: 12,
        pointerHeight: 30,
        pointerTextYOffset: 30,
        pointerColor: '#585858',
        pointerTextColor: '#D7B13E',
        pointerTextSize: 12,
        playImagePath: imgPath + 'play.png',
        pauseImagePath: imgPath + 'pause.png',
        logoPath: imgPath + 'fmi-logo.png'
      }
    },
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
          jQuery(map.getTarget()).css('cursor', 'pointer')
        } else {
          jQuery(map.getTarget()).css('cursor', '')
        }
      })

      // Custom control
      jQuery('.custom-control').remove()
      jQuery('<div><button></button></div>').addClass('ol-unselectable ol-control custom-control').click(function () {
        let coord = weatherVisualization.getMap().getView().getCenter()
        weatherVisualization.showPopup('<p>Map center:</p><code>' + coord.join(', ') + '</code>', coord[0], coord[1])
      }).appendTo('.fmi-animator')

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
