import OlGeomPoint from 'ol/geom/point'
import OlGeomMultiPoint from 'ol/geom/multipoint'
import OlGeomLineString from 'ol/geom/linestring'
import OlGeomMultiLineString from 'ol/geom/multilinestring'
import OlGeomPolygon from 'ol/geom/polygon'
import OlGeomMultiPolygon from 'ol/geom/multipolygon'
import OlFeature from 'ol/feature'
import OlStyleFill from 'ol/style/fill'
import OlStyleIcon from 'ol/style/icon'
import OlStyleStroke from 'ol/style/stroke'
import OlStyleStyle from 'ol/style/style'
import OlStyleText from 'ol/style/text'
import OlStyleCircle from 'ol/style/circle'
import * as constants from '../../constants'

/**
 * @fileoverview Map source factory.
 * @author Finnish Meteorological Institute
 * @license MIT
 */
export default class FeatureProducer {
  /**
   * Creates new features.
   * @param options Feature options.
   * @returns {Array} Features.
   */
  featureFactory (options) {
    let i
    let numStyles
    let featureCount
    let newFeature
    const features = []
    const z = {
      'value': 0
    }
    options.forEach(feature => {
      if (feature['type'] != null) {
        switch (feature['type'].toLowerCase()) {
          case 'point':
            feature['geometry'] = new OlGeomPoint(feature['geometry'])
            break
          case 'multipoint':
            feature['geometry'] = new OlGeomMultiPoint(feature['geometry'])
            break
          case 'linestring':
            feature['geometry'] = new OlGeomLineString(feature['geometry'])
            break
          case 'multilinestring':
            feature['geometry'] = new OlGeomMultiLineString(feature['geometry'])
            break
          case 'polygon':
            feature['geometry'] = new OlGeomPolygon(feature['geometry'])
            break
          case 'multipolygon':
            feature['geometry'] = new OlGeomMultiPolygon(feature['geometry'])
            break
          default:
            return
        }
        newFeature = new OlFeature(feature)
      } else {
        newFeature = feature
      }
      if (feature['style'] != null) {
        numStyles = feature['style'].length
        for (i = 0; i < numStyles; i++) {
          feature['style'][i] = this.styleFactory(feature['style'][i], z)
        }
        newFeature.setStyle(feature['style'], z)
      }
      newFeature['id'] = featureCount
      features.push(newFeature)
    })
    return features
  }

  /**
   * Creates a feature style.
   * @param options Style options.
   * @param z Z-index.
   * @returns {ol.style.Style} Feature style.
   */
  styleFactory (options, z) {
    const styleOptions = (options != null) ? options : {}
    if ((styleOptions['image'] !== undefined) && (styleOptions['image']['type'] !== undefined)) {
      if (styleOptions['image']['type'].toLowerCase() === 'icon') {
        styleOptions['image'] = new OlStyleIcon(/** @type {olx.style.IconOptions} */ (styleOptions['image']))
      } else if (styleOptions['image']['type'].toLowerCase() === 'circle') {
        if (styleOptions['image']['stroke'] !== undefined) {
          styleOptions['image']['stroke'] = new OlStyleStroke(styleOptions['image']['stroke'])
        }
        if (styleOptions['image']['fill'] !== undefined) {
          styleOptions['image']['fill'] = new OlStyleFill(styleOptions['image']['fill'])
        }
        styleOptions['image'] = new OlStyleCircle(/** @type {olx.style.CircleOptions} */ (styleOptions['image']))
      }
      z['value'] = z['value'] | 8
    }
    if (styleOptions['text'] !== undefined) {
      if (styleOptions['text']['fill'] !== undefined) {
        styleOptions['text']['fill'] = new OlStyleFill(styleOptions['text']['fill'])
      }
      if (styleOptions['text']['stroke'] !== undefined) {
        styleOptions['text']['stroke'] = new OlStyleStroke(styleOptions['text']['stroke'])
      }
      styleOptions['text'] = new OlStyleText(styleOptions['text'])
      z['value'] = z['value'] | 4
    }
    if (styleOptions['stroke'] !== undefined) {
      styleOptions['stroke'] = new OlStyleStroke((styleOptions['stroke']))
      z['value'] = z['value'] | 2
    }
    if (styleOptions['fill'] !== undefined) {
      styleOptions['fill'] = new OlStyleFill((styleOptions['fill']))
      z['value'] = z['value'] | 1
    }
    styleOptions['zIndex'] = ((styleOptions['zIndex'] !== undefined) ? styleOptions['zIndex'] : 0) + constants.zIndex.vector + z['value'] * 10
    return new OlStyleStyle(styleOptions)
  }
}
