import FeatureProducer from './FeatureProducer'
import OlSourceVector from 'ol/source/vector'
import OlCollection from 'ol/collection'
import OlLoadingstrategy from 'ol/loadingstrategy'
import OlFormatGeoJSON from 'ol/format/geojson'
import OlFormatGML from 'ol/format/gml3'
import OlFormatWFS from 'ol/format/wfs'
import { tz } from 'moment-timezone'
import moment from 'moment-timezone'
import fi from 'moment/locale/fi'
import sv from 'moment/locale/sv'
import uk from 'moment/locale/uk'

export default class Vector extends OlSourceVector {
  constructor (options, projection, beginTime, endTime) {
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
          let url = baseUrl + '&srsname=' + projection
          let beginTimeMoment
          if (beginTime != null) {
            beginTimeMoment = moment(beginTime).format('YYYY-MM-DD HH:mm:ss')
            if (beginTimeMoment.length > 0) {
              url += '&filter=%3CPropertyIsGreaterThanOrEqualTo%3E%3CPropertyName%3Etime%3C/PropertyName%3E%3CFunction%20name=%22dateParse%22%3E%3CLiteral%3Eyyyy-MM-dd HH:mm:ss%3C/Literal%3E%3CLiteral%3E' + beginTimeMoment + '%3C/Literal%3E%3C/Function%3E%3C/PropertyIsGreaterThanOrEqualTo%3E'
            }
          }
          return url
        }
      }
    }
    super(options)
  }
}
