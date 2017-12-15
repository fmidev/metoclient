/**
 * @fileoverview Map source factory.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import OlLayerTile from 'ol/layer/tile'
import TileWMS from './TileWMS'
import ImageWMS from './ImageWMS'
import WMTS from './WMTS'
import Vector from './Vector'
import Stamen from './Stamen'
import OSM from './OSM'
import FeatureProducer from './FeatureProducer'
import * as constants from '../../constants'
import OlLayerImage from 'ol/layer/image'
import OlLayerVector from 'ol/layer/vector'
import OlStyleStyle from 'ol/style/style'

export default class MapProducer {
  /**
   * Creates a new layer source object.
   * @param {string} type Source type.
   * @param options Source options.
   * @param projection {string} Projection.
   * @returns {Array} Source.
   */
  sourceFactory (type, options, projection) {
    if (options == null) {
      options = {}
    }
    let typeLwr = type.toLowerCase()
    switch (typeLwr) {
      case 'tilewms':
        return new TileWMS(options)
      case 'imagewms':
        return new ImageWMS(options)
      case 'wmts':
        return new WMTS(options)
      case 'vector':
        return new Vector(options, projection)
      case 'stamen':
        return new Stamen(options)
      case 'osm':
        return new OSM(options)
    }
  }

  /**
   * Creates a new layer.
   * @param options Layer options.
   * @param {Array} extent Extent of layer to be loaded.
   * @param projection {string} Projection.
   * @returns {Array} Layer.
   */
  layerFactory (options, extent, projection) {
    let numStyles
    let i
    let z
    let featureProducer
    let typeLwr = options['className'].toLowerCase()
    let source
    let sourceKey = 'source'
    if (options['sourceOptions'] !== undefined) {
      sourceKey += 'Options'
    }
    source = this.sourceFactory(typeLwr, options[sourceKey], projection)
    switch (typeLwr) {
      case 'tilewms':
      case 'wmts':
      case 'stamen':
      case 'osm':
        return new OlLayerTile({
          'extent': extent,
          'type': options['type'],
          'title': options['title'],
          'visible': options['visible'],
          'animation': options['animation'],
          'opacity': options['opacity'],
          'editOpacity': options['editOpacity'],
          'zIndex': options['zIndex'],
          'source': source
        })
      case 'imagewms':
        return new OlLayerImage({
          'extent': extent,
          'type': options['type'],
          'title': options['title'],
          'visible': options['visible'],
          'animation': options['animation'],
          'opacity': options['opacity'],
          'editOpacity': options['editOpacity'],
          'zIndex': options['zIndex'],
          'source': source
        })
      case 'vector':
        z = {
          'value': 0
        }
        options['source'] = source
        featureProducer = new FeatureProducer()
        if (Array.isArray(options['style'])) {
          numStyles = options['style'].length
          for (i = 0; i < numStyles; i++) {
            if (!(options['style'][i] instanceof OlStyleStyle)) {
              options['style'][i] = featureProducer.styleFactory(options['style'][i], z)
            }
          }
        }
        options['zIndex'] = constants.zIndex.vector + z['value']
        let layer = new OlLayerVector(options)
        layer.setZIndex(options['zIndex'])
        return layer
    }
  }
}
