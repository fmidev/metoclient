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
    this.setTileUrlFunction((tileCoord, pxlRatio, proj) => {
      let url = plainTileUrlFunction(tileCoord, pxlRatio, proj)
      if ((options['params'] != null) && (options['params']['TIME'] != null)) {
        url = `${url}&Time=${options['params']['TIME']}`
      }
      if (options['elevation'] != null) {
        url = `${url}&Elevation=${options['elevation']}`
      }
      return url
    })
  }
}
