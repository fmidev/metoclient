import OlSourceImageWMS from 'ol/source/imagewms'

export default class ImageWMS extends OlSourceImageWMS {
  constructor (options) {
    if ((options['url'] == null) && (options['urls'] != null) && (options['urls'].length > 0)) {
      options['url'] = options['urls'][Math.floor(Math.random() * options['urls'].length)]
    }
    if (options['params'] == null) {
      options['params'] = {}
    }
    if ((options['params']['VERSION'] == null) && (options['params']['version'] == null) && (options['params']['Version'] == null)) {
      options['params']['VERSION'] = '1.3.0'
    }
    if (options['projection'] != null) {
      if ((options['params']['VERSION'] === '1.3.0') || (options['params']['version'] === '1.3.0') || (options['params']['Version'] === '1.3.0')) {
        if ((options['params']['CRS'] == null) && (options['params']['crs'] == null) && (options['params']['Crs'] == null)) {
          options['params']['CRS'] = options['projection']
        }
      } else {
        if ((options['params']['SRS'] == null) && (options['params']['srs'] == null) && (options['params']['Srs'] == null)) {
          options['params']['SRS'] = options['projection']
        }
      }
    }
    super(options)
  }
}
