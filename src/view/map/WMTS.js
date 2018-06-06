import OlTilegridWMTS from 'ol/tilegrid/wmts'
import OlSourceWMTS from 'ol/source/wmts'

export default class SourceWMTS extends OlSourceWMTS {
  constructor (options) {
    let tileMatrixLimits
    if ((options['matrixSet'] != null) && (typeof options['matrixSet'] === 'object')) {
      if (options['matrixSetLimits'] != null) {
        tileMatrixLimits = options['matrixSetLimits']['TileMatrixLimits']
      }
      options['tileGrid'] = OlTilegridWMTS.createFromCapabilitiesMatrixSet(options['matrixSet'], options['extent'], tileMatrixLimits)
    } else if (options['tileGridOptions'] != null) {
      options['tileGrid'] = new OlTilegridWMTS(options['tileGridOptions'])
    }
    super(options)
    let plainTileUrlFunction = this.getTileUrlFunction()
    if ((options['params'] != null) && (options['params']['TIME'] != null) && (options['params']['TIME'].length > 0)) {
      this.set('timeFormatted', options['params']['TIME'])
    }
    if (options['elevation'] != null) {
      this.set('elevation', options['elevation'])
    }
    this.set('sourceType', 'WMTS');
    this.setTileUrlFunction((tileCoord, pxlRatio, proj) => {
      let url = plainTileUrlFunction(tileCoord, pxlRatio, proj)
      let time = this.get('timeFormatted')
      if ((time != null) && (time.length > 0)) {
        url = `${url}&Time=${time}`
      }
      let elevation = this.get('elevation')
      if (elevation != null) {
        url = `${url}&Elevation=${elevation}`
      }
      return url
    })
  }
}
