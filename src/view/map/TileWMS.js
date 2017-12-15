import OlTilegridTileGrid from 'ol/tilegrid/tilegrid'
import OlSourceTileWMS from 'ol/source/tilewms'

export default class TileWMS extends OlSourceTileWMS {
  constructor (options) {
    if (options['tileGridOptions'] != null) {
      options['tileGrid'] = new OlTilegridTileGrid(options['tileGridOptions'])
    }
    super(options)
  }
}
