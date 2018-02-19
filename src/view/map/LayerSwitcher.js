/**
 * @fileoverview OpenLayers 4 layer switcher based closely on
 * https://github.com/walkermatt/ol3-layerswitcher
 */
import _ol_ from 'ol/index'
import olControlControl from 'ol/control/control'
import * as constants from '../../constants'
import 'core-js/fn/array/from'
import 'core-js/fn/number/parse-int'

/**
 * OpenLayers 4 Layer Switcher Control.
 * Based on https://github.com/walkermatt/ol3-layerswitcher
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object} opt_options Control options, extends olx.control.ControlOptions adding:
 * **`tipLabel`** `String` - the button tooltip.
 */
export default class OlControlLayerSwitcher {
  constructor (optOptions) {
    const options = optOptions || {}

    const tipLabel = options['tipLabel']
      ? options['tipLabel'] : 'Layers'

    this.project = options['project'] ? options['project'] : ''
    this.showLegend = options['showLegend'] ? options['showLegend'] : false
    this.legendContainer = options['legendContainer'] ? options['legendContainer'] : 'legend'
    this.legendTitle = options['legendTitle'] ? options['legendTitle'] : 'Legend'
    this.noLegendText = options['noLegendText'] ? options['noLegendText'] : 'None'
    this.baseGroupName = options['baseGroupName']
    this.opacityTitle = options['opacityTitle']

    this.mapListeners = []

    this.hiddenClassName = 'ol-unselectable ol-control layer-switcher'
    this.shownClassName = `${this.hiddenClassName} shown`

    const element = document.createElement('div')
    element['className'] = this.hiddenClassName

    const button = document.createElement('button')
    button.setAttribute('title', tipLabel)
    button.setAttribute('id', options['elementId'])
    element.appendChild(button)

    this.panel = document.createElement('div')
    this.panel.className = 'panel'
    element.appendChild(this.panel)

    const this_ = this

    button.onclick = e => {
      if (this_.isVisible()) {
        this_.hidePanel()
      } else {
        this_.showPanel()
      }
      e.stopPropagation()
      e.preventDefault()
    }

    olControlControl.call(this, {
      'element': element,
      'target': options['target']
    })
  };
}

_ol_.inherits(OlControlLayerSwitcher, olControlControl)

/**
 * Show the layer panel.
 */
OlControlLayerSwitcher.prototype.showPanel = function () {
  if (this.element['className'] !== this.shownClassName) {
    this.element['className'] = this.shownClassName
    this.renderPanel()
    if (document.querySelectorAll('.layer-switcher > .panel > ul > li').length === 0) {
      this.element['className'] = this.hiddenClassName
    }
  }
}

/**
 * Hide the layer panel.
 */
OlControlLayerSwitcher.prototype.hidePanel = function () {
  if (this.element['className'] !== this.hiddenClassName) {
    this.element['className'] = this.hiddenClassName
  }
}

/**
 * Return visibility status.
 */
OlControlLayerSwitcher.prototype.isVisible = function () {
  return this.element['className'] !== this.hiddenClassName
}

/**
 * Re-draw the layer panel to represent the current state of the layers.
 */
OlControlLayerSwitcher.prototype.renderPanel = function () {
  this.ensureTopVisibleBaseLayerShown_()

  while (this.panel.firstChild) {
    this.panel.removeChild(this.panel.firstChild)
  }

  const ul = document.createElement('ul')
  ul.classList.add('groups')
  this.panel.appendChild(ul)
  const legendInfo = this.renderLayers_(this.getMap(), ul, true)

  if ((this.showLegend) && (legendInfo.length > 0)) {
    this.renderLegends_(legendInfo, ul)
  }
  if (document.querySelectorAll('div.layer-switcher span.opacity-editor').length > 0) {
    Array.from(document.querySelectorAll('div.layer-switcher label.opacity-title')).forEach((opacityTitle) => {
      opacityTitle.style.display = ''
    })
  }
}

/**
 * Create legend chooser and visualization functionality.
 * @private
 * @param legendInfo Layer-based legend information.
 * @param {Element} elm DOM element that children will be appended to.
 */
OlControlLayerSwitcher.prototype.renderLegends_ = function (legendInfo, elm) {
  const liLegend = document.createElement('li')
  elm.appendChild(liLegend)
  const label = document.createElement('label')
  label['innerHTML'] = this.legendTitle
  liLegend.appendChild(label)
  const ulSelect = document.createElement('ul')
  liLegend.appendChild(ulSelect)
  const liSelect = document.createElement('li')
  ulSelect.appendChild(liSelect)
  const selectList = document.createElement('select')
  selectList['className'] = 'legendSelector'
  selectList.setAttribute('id', 'ol-layer-legend-selector')
  liSelect.appendChild(selectList)
  const emptyOption = document.createElement('option')
  emptyOption['value'] = -1
  emptyOption['text'] = this.noLegendText
  selectList.appendChild(emptyOption)
  // Visible legend
  if (legendInfo.length > 0) {
    const legends = document.querySelectorAll(`div.${this.legendContainer} > figure`)
    const numLegends = legends.length
    let visibleLegend = ''
    for (let i = 0; i < numLegends; i++) {
      if (legends[i].style.display !== 'none') {
        visibleLegend = legends[i].className
        break
      }
    }
    for (let i = 0; i < legendInfo.length; i++) {
      const option = document.createElement('option')
      option['value'] = legendInfo[i]['id']
      option['text'] = legendInfo[i]['title']
      selectList.appendChild(option)
      if (constants.LEGEND_FIGURE_CLASS_PREFIX + legendInfo[i]['id'] === visibleLegend) {
        selectList['selectedIndex'] = selectList.length - 1
      }
    }
  }

  const this_ = this
  selectList.onchange = ({target}) => {
    const newValue = target['value']
    const figures = document.querySelectorAll(`div.${this_.legendContainer} > figure`)
    figures.forEach((figure) => {
      figure.style.display = 'none'
    })
    if (parseInt(newValue, 10) < 0) {
      return
    }
    figures.forEach((figure) => {
      if (figure.classList.contains(`${constants.LEGEND_FIGURE_CLASS_PREFIX}${newValue}`)) {
        figure.style.display = ''
      }
    })
  }
}

/**
 * Set the map instance the control is associated with.
 * @param {ol.Map} map The map instance.
 */
OlControlLayerSwitcher.prototype.setMap = function (map) {
  // Clean up listeners associated with the previous map
  for (let i = 0; i < this.mapListeners.length; i++) {
    this.getMap().un('pointerdown', this.mapListeners[i])
  }
  this.mapListeners.length = 0
  // Wire up listeners etc. and store reference to new map
  olControlControl.prototype.setMap.call(this, map)
  if (map) {
    const this_ = this
    this.mapListeners.push(map.on('pointerdown', () => {
      this_.hidePanel()
    }))
    this.renderPanel()
  }
}

/**
 * Ensure only the top-most base layer is visible if more than one is visible.
 * @private
 */
OlControlLayerSwitcher.prototype.ensureTopVisibleBaseLayerShown_ = function () {
  let lastVisibleBaseLyr
  OlControlLayerSwitcher.forEachRecursive(this.getMap(), (l, idx, a) => {
    if (l.get('type') === 'map' && l.getVisible()) {
      lastVisibleBaseLyr = l
    }
  })
  if (lastVisibleBaseLyr) this.setVisible_(lastVisibleBaseLyr, true)
}

/**
 * Toggle the visible state of a layer.
 * Takes care of hiding other layers in the same exclusive group if the layer
 * is toggled to visible.
 * @private
 * @param {ol.layer.Group|ol.layer.Layer} lyr The layer whose visibility will be toggled.
 * @param visible
 */
OlControlLayerSwitcher.prototype.setVisible_ = function (lyr, visible) {
  const this_ = this
  const map = this.getMap()
  const layerVisibility = map.get('layerVisibility')
  layerVisibility[lyr.get('title')] = visible
  try {
    if (typeof window['localStorage'] !== 'undefined') {
      window['localStorage'].setItem(this_.project + '-' + lyr.get('title') + '-visible', visible)
    }
  } catch (e) {
    console.log('Local storage is not supported. ' + e)
  }
  if (lyr.get('type') === 'map') {
    lyr.setVisible(visible)
    if (visible) {
      // Hide all other base layers regardless of grouping
      OlControlLayerSwitcher.forEachRecursive(map, (l, idx, a) => {
        if (l !== lyr && l.get('type') === 'map') {
          l.setVisible(false)
          layerVisibility[l.get('title')] = false
          try {
            if (typeof window['localStorage'] !== 'undefined') {
              window['localStorage'].setItem(this_.project + '-' + l.get('title') + '-visible', false)
            }
          } catch (e) {
            console.log('Local storage is not supported. ' + e)
          }
        }
      })
    }
    return
  }
  map.dispatchEvent('moveend')
}

/**
 * Render all layers that are children of a group.
 * @private
 * @param {ol.layer.Group} lyr Layer to be rendered (should have a title property).
 * @param {number} idx Position in parent group list.
 */
OlControlLayerSwitcher.prototype.renderLayer_ = function (lyr, idx) {
  const this_ = this
  let legendInfo = []
  const li = document.createElement('li')
  const lyrTitle = lyr.get('title')
  const lyrId = `${lyr.get('title').replace(' ', '-')}_${idx}`
  const labelContainer = document.createElement('span')
  labelContainer.classList.add('group-label')
  const label = document.createElement('label')

  if ((lyr.getLayers) && (lyr.get('nested'))) {
    // Todo: käytä config['baseGroupName']
    if ((lyr.get('title') === this_.baseGroupName) && (lyr.getLayers().getLength() < 2)) {
      return null
    }
    li['className'] = 'group'
    label['innerHTML'] = lyrTitle
    labelContainer.appendChild(label)
    if (document.querySelectorAll('div.layer-switcher label.opacity-title').length === 0) {
      const opacityLabel = document.createElement('label')
      opacityLabel['innerHTML'] = this_.opacityTitle
      opacityLabel['classList'].add('opacity-title')
      opacityLabel.style.display = 'none'
      labelContainer.appendChild(opacityLabel)
    }
    li.appendChild(labelContainer)
    const ul = document.createElement('ul')
    li.appendChild(ul)
    legendInfo = legendInfo.concat(this.renderLayers_(lyr, ul))
  } else {
    const input = document.createElement('input')
    if (lyr.get('type') === 'map') {
      input['type'] = 'radio'
      input['name'] = 'map'
    } else if (lyr.get('type') === '') {
      return null
    } else {
      input['type'] = 'checkbox'
      const legends = lyr.get('legends')
      if (typeof legends !== 'undefined') {
        for (let i = 0; i < legends.length; i++) {
          legendInfo.push(legends[i])
        }
      }
    }
    input['id'] = lyrId
    input['checked'] = lyr.get('visible')
    input.onchange = ({target}) => {
      this_.setVisible_(lyr, target['checked'])
    }
    li.appendChild(input)

    label['htmlFor'] = lyrId
    label['innerHTML'] = lyrTitle
    li.appendChild(label)

    if (lyr.get('editOpacity')) {
      let layerType = /** @type {string} */(lyr.get('type'))
      if (layerType != null) {
        layerType = layerType.toLowerCase()
      }
      const opacity = /** @type {number} */ (lyr.get('opacity'))
      const opacityEditor = document.createElement('span')
      opacityEditor['classList'].add('opacity-editor')
      const opacityValue = document.createElement('input')
      opacityValue['classList'].add('opacity-value')
      opacityValue.setAttribute('type', 'number')
      opacityValue.setAttribute('min', '0')
      opacityValue.setAttribute('max', '100')
      opacityValue.setAttribute('step', '1')
      opacityValue.setAttribute('value', Math.round(100 * opacity))
      opacityValue.onchange = function (e) {
        let value = Math.round(this.value)
        value = Math.max(value, 0)
        value = Math.min(value, 100)
        this['value'] = parseFloat(value).toFixed(0)
        value /= 100
        lyr.set('opacity', value)
        lyr.set('defaultOpacity', value)
        try {
          if (typeof window['localStorage'] !== 'undefined') {
            window['localStorage'].setItem(this_.project + '-' + lyr.get('title') + '-opacity', value)
          }
        } catch (e) {
          console.log('Local storage is not supported. ' + e)
        }
      }
      opacityEditor.appendChild(opacityValue)
      const percentText = document.createElement('span')
      percentText['classList'].add('percent-text')
      percentText.appendChild(document.createTextNode('%'))
      opacityEditor.appendChild(percentText)
      li.appendChild(opacityEditor)
    }
  }
  return {
    'li': li,
    'legendInfo': legendInfo
  }
}

/**
 * Render all layers that are children of a group.
 * @private
 * @param {ol.Map|ol.layer.Group} lyr Group layer whos children will be rendered.
 * @param {Element} elm DOM element that children will be appended to.
 * @param {boolean=} reverse Flag to indicate reversed array.
 */
OlControlLayerSwitcher.prototype.renderLayers_ = function (lyr, elm, reverse) {
  let legendInfo = []
  const lyrs = lyr.getLayers().getArray().slice()
  /** @type {number} */
  let i
  let l
  if ((typeof reverse !== 'undefined') && (reverse)) {
    lyrs.reverse()
  }
  for (i = 0; i < lyrs.length; i++) {
    l = /** @type {ol.layer.Group} */ (lyrs[i])
    if (l.get('title')) {
      if ((l.get('nested')) && (l.getLayers) && (l.getLayers().getLength() === 0)) {
        continue
      }
      const layerData = this.renderLayer_(l, i)
      if (layerData != null) {
        elm.appendChild(layerData['li'])
        legendInfo = legendInfo.concat(layerData['legendInfo'])
      }
    }
  }
  legendInfo.sort((a, b) => {
    if (a['title'] > b['title']) {
      return 1
    }
    if (a['title'] < b['title']) {
      return -1
    }
    return 0
  })
  return legendInfo
}

/**
 * **Static** Call the supplied function for each layer in the passed layer group
 * recursing nested groups.
 * @param {ol.Map|ol.layer.Base} lyr The layer group to start iterating from.
 * @param {Function} fn Callback which will be called for each `ol.layer.Group|ol.layer.Layer`
 * found under `lyr`. The signature for `fn` is the same as `ol.Collection#forEach`
 */
OlControlLayerSwitcher.forEachRecursive = (lyr, fn) => {
  lyr.getLayers().forEach((lyr, idx, a) => {
    fn(lyr, idx, a)
    if (typeof lyr.get('layers') !== 'undefined') {
      OlControlLayerSwitcher.forEachRecursive(lyr, fn)
    }
  })
}
