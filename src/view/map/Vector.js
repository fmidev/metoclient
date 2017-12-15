import FeatureProducer from './FeatureProducer'
import OlSourceVector from 'ol/source/vector'
import OlCollection from 'ol/collection'
import OlFormatGeoJSON from 'ol/format/geojson'
import OlFormatGML from 'ol/format/gml'
import OlFormatWFS from 'ol/format/wfs'

export default class Vector extends OlSourceVector {
  constructor (options, projection) {
    let features
    let featureProducer = new FeatureProducer()
    let type = options['type']
    if ((options['features'] !== undefined) || (options['type'] !== undefined)) {
      if (options['features'] !== undefined) {
        features = featureProducer.featureFactory(options['features'])
      }
      options['features'] = features
      if (type != null) {
        switch (type.toLowerCase()) {
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
    }
    super(options)
  }
}
