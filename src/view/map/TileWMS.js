import OlTilegridTileGrid from 'ol/tilegrid/tilegrid'
import OlSourceTileWMS from 'ol/source/tilewms'

export default class TileWMS extends OlSourceTileWMS {
  constructor (options) {
    if (options['tileGridOptions'] != null) {
      options['tileGrid'] = new OlTilegridTileGrid(options['tileGridOptions'])
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
