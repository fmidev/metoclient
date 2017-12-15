import OlSourceImageWMS from 'ol/source/imagewms'

export default class ImageWMS extends OlSourceImageWMS {
  constructor (options) {
    if ((options['url'] == null) && (options['urls'] != null) && (options['urls'].length > 0)) {
      options['url'] = options['urls'][Math.floor(Math.random() * options['urls'].length)]
    }
    super(options)
  }
}
