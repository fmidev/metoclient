import FeatureProducer from './FeatureProducer'
import OlSourceVector from 'ol/source/vector'
import OlCollection from 'ol/collection'
import OlLoadingstrategy from 'ol/loadingstrategy'
import OlFormatGeoJSON from 'ol/format/geojson'
import OlFormatGML from 'ol/format/gml'
import OlFormatWFS from 'ol/format/wfs'

export default class Vector extends OlSourceVector {
  constructor (options, projection) {
    let features
    let featureProducer = new FeatureProducer()
    let baseUrl
    let useJSON
    if (options['features'] !== undefined) {
      if (Array.isArray(options['features'])) {
        features = featureProducer.featureFactory(options['features'])
      }
      options['features'] = features
      if (typeof options['format'] === 'string') {
        switch (options['format'].toLowerCase()) {
          case 'gml':
            options['format'] = new OlFormatGML()
            break
          case 'wfs':
            options['format'] = new OlFormatWFS()
            break
          case 'geojson':
            options['format'] = new OlFormatGeoJSON()
            break
        }
      }
      if ((options['features'] != null) && (Array.isArray(options['features']))) {
        options['features'] = new OlCollection(options['features'])
      }
      // Projection
      if ((options['projection'] != null) && (options['projection'] !== projection) && (options['features'] != null)) {
        options['features'].forEach(feature => {
          feature.getGeometry().transform(options['projection'], projection)
        })
      }
    } else if (options['url'] != null) {
      if (options['format'] == null) {
        options['format'] = new OlFormatGeoJSON()
        useJSON = true
      }
      if (options['strategy'] == null) {
        options['strategy'] = OlLoadingstrategy['all']
      }
      if ((true) && (typeof options['url'] === 'string')) {
        baseUrl = options['url']
        if (useJSON) {
          baseUrl += '&outputFormat=application%2Fjson'
        }
        options['url'] = function (extent) {
          return baseUrl + '&srsname=' + projection
        }
      }
    }
    super(options)
  }
}
