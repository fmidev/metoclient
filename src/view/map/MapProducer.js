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
import { loadFunction } from './LayerLoader'

export default class MapProducer {
  /**
   * Creates a new layer source object.
   * @param {string} type Source type.
   * @param options Source options.
   * @param cacheTime Layer cache time.
   * @param projection {string} Projection.
   * @param beginTime {number} Begin time.
   * @param endTime {number} End time.
   * @returns {Array} Source.
   */
  sourceFactory (type, options, cacheTime, projection, beginTime, endTime) {
    this.cacheTime = cacheTime
    if (options == null) {
      options = {}
    }
    if ((options['projection'] == null) && (projection != null)) {
      options['projection'] = projection
    }
    let typeLwr = type.toLowerCase()
    switch (typeLwr) {
      case 'tilewms':
        if (options['useStorage']) {
          options['tileLoadFunction'] = loadFunction.bind(this)
        }
        return new TileWMS(options)
      case 'imagewms':
        if (options['useStorage']) {
          options['imageLoadFunction'] = loadFunction.bind(this)
        }
        return new ImageWMS(options)
      case 'wmts':
        if (options['useStorage']) {
          options['tileLoadFunction'] = loadFunction.bind(this)
        }
        return new WMTS(options)
      case 'vector':
        return new Vector(options, projection, beginTime, endTime)
      case 'stamen':
        if (options['useStorage']) {
          options['tileLoadFunction'] = loadFunction.bind(this)
        }
        return new Stamen(options)
      case 'osm':
        if (options['useStorage']) {
          options['tileLoadFunction'] = loadFunction.bind(this)
        }
        return new OSM(options)
    }
  }

  /**
   * Creates a new layer.
   * @param options Layer options.
   * @param cacheTime Layer cache time.
   * @param {Array} extent Extent of layer to be loaded.
   * @param projection {string} Projection.
   * @returns {Array} Layer.
   */
  layerFactory (options, cacheTime, extent, projection, beginTime, endTime) {
    let style
    let extraStyles = {
      'styleHover': {
        'data': null
      },
      'styleSelected': {
        'data': null
      }
    }
    let i
    let z
    let featureProducer
    let typeLwr = options['className'].toLowerCase()
    let source
    let sourceKey = 'source'
    let animation
    let layerBeginTime = beginTime
    let layerEndTime = endTime
    let timePropertyName
    if (options['sourceOptions'] !== undefined) {
      sourceKey += 'Options'
    }
    if (options[sourceKey] != null) {
      options[sourceKey]['useStorage'] = options['useStorage']
    } else {
      options[sourceKey] = {
        'useStorage': options['useStorage']
      }
    }
    if (!((options[sourceKey] != null) && (options[sourceKey]['addFeature'] != null))) {
      animation = options['animation']
      if (animation != null) {
        if (animation['beginTime'] != null) {
          layerBeginTime = animation['beginTime']
        }
        if (animation['endTime'] != null) {
          layerEndTime = animation['endTime']
        }
      } else {
        layerBeginTime = undefined
        layerEndTime = undefined
      }
      source = this.sourceFactory(typeLwr, options[sourceKey], cacheTime, projection, layerBeginTime, layerEndTime)
    } else {
      source = options[sourceKey]
    }
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
          'popupDataFMI': options['popupDataFMI'],
          'className': typeLwr,
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
          'popupDataFMI': options['popupDataFMI'],
          'className': typeLwr,
          'source': source
        })
      case 'vector':
        z = {
          'value': 0
        }
        timePropertyName = options['source']['time']
        options['source'] = source
        source.set('timePropertyName', timePropertyName)
        featureProducer = new FeatureProducer()
        if (Array.isArray(options['style'])) {
          if (!(options['style'] instanceof OlStyleStyle)) {
            options['style'] = featureProducer.styleFactory(options['style'], z)
          }
        }
        Object.keys(extraStyles).forEach((styleName) => {
          if ((Array.isArray(options[styleName])) && (!(options[styleName][i] instanceof OlStyleStyle))) {
            style = featureProducer.styleFactory(options[styleName], z)
            if (style != null) {
              extraStyles[styleName]['data'] = style
            }
          }
        })
        if (options['zIndex'] === undefined) {
          options['zIndex'] = constants.ZINDEX['vector'] + z['value']
        }
        let layer = new OlLayerVector(options)
        layer.setZIndex(options['zIndex'])
        layer.set('extraStyles', extraStyles)
        return layer
    }
  }
}
