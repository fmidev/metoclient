/**
 * @fileoverview Map model for animator.
 * @author Finnish Meteorological Institute
 * @license MIT
 */

import 'core-js/fn/promise'

export default class Map {
  /**
   * Constructs a new map model.
   * @param {Object} config User configuration.
   * @param {number} referenceTime World creation time.
   * @constructor
   */
  constructor (config, referenceTime) {
    let numLayers = 0
    let i
    this.config_ = config
    this.referenceTime_ = referenceTime
    this.capabilities_ = {}
    this.setLayers(config['layers'])
    if (this.layers_ != null) {
      numLayers = this.layers_.length
    }
    for (i = 0; i < numLayers; i++) {
      if (this.layers_[i]['animation'] != null) {
        this.layers_[i]['animation']['referenceTime'] = this.referenceTime_
        if (this.layers_[i]['animation']['beginTime'] != null) {
          this.layers_[i]['animation']['originalBeginTime'] = this.layers_[i]['animation']['beginTime']
        }
        if (this.layers_[i]['animation']['endTime'] != null) {
          this.layers_[i]['animation']['originalEndTime'] = this.layers_[i]['animation']['endTime']
        }
      }
      if (this.layers_[i]['className'].toLowerCase() === 'vector') {
        this.layers_[i]['type'] = 'features'
      }
    }
  };

  /**
   * Gets map layers.
   * @returns {Array} Map layers.
   */
  getLayers () {
    return this.layers_
  };

  /**
   * Sets map layers.
   * @param layers Map layers.
   */
  setLayers (layers) {
    this.layers_ = []
    let layerKeys = Object.keys(layers)
    layerKeys.forEach(layerKey => {
      if (((layers[layerKey]['type'] === 'obs') || (layers[layerKey]['type'] === 'for')) && (layers[layerKey]['animation'] == null)) {
        layers[layerKey]['animation'] = {}
      } else if (layers[layerKey]['className'].toLowerCase() === 'vector') {
        layers[layerKey]['type'] = 'features'
      }
      this.layers_.push(layers[layerKey])
    })
  };

  /**
   * Refreshes layer models.
   * @param {number} currentTime Current real-world time.
   * @param {number} animationResolutionTime Animation resolution time.
   */
  refreshLayers (currentTime, animationResolutionTime) {
    let numLayers,
      timeDiff,
      i
    if (this.layers_ != null) {
      timeDiff = Math.floor(currentTime / animationResolutionTime) * animationResolutionTime - Math.floor(this.referenceTime_ / animationResolutionTime) * animationResolutionTime
      numLayers = this.layers_.length
      for (i = 0; i < numLayers; i++) {
        if (this.layers_[i]['animation'] != null) {
          this.layers_[i]['animation']['beginTime'] = (this.layers_[i]['animation']['originalBeginTime'] == null) ? undefined : this.layers_[i]['animation']['originalBeginTime'] + timeDiff
          this.layers_[i]['animation']['endTime'] = (this.layers_[i]['animation']['originalEndTime'] == null) ? undefined : this.layers_[i]['animation']['originalEndTime'] + timeDiff
        }
      }
    }
  };

  /**
   * Loads capability data from given urls.
   * @param {Object} capabilities Loaded capability data.
   * @returns {Array} Loader promises.
   */
  loadCapabilities (capabilities) {
    let numLayers
    const promises = []
    let i
    let j
    const urls = []
    let numUrls
    let layer
    const self = this
    if (this.layers_ == null) {
      return promises
    }
    numLayers = this.layers_.length
    // Collect urls
    for (i = 0; i < numLayers; i++) {
      layer = this.layers_[i]
      if ((layer['timeCapabilitiesInit'] == null) && (layer['timeCapabilities'] !== undefined) && (!urls.includes(layer['timeCapabilities']))) {
        urls.push(layer['timeCapabilities'])
      }
      if ((layer['tileCapabilities'] !== undefined) && (!urls.includes(layer['tileCapabilities']))) {
        urls.push(layer['tileCapabilities'])
      }
    }
    numUrls = urls.length
    // Load capabilities
    for (j = 0; j < numUrls; j++) {
      ((url => {
        if (self.capabilities_[url] != null) {
          capabilities[url] = self.capabilities_[url]
          self.capabilities_[url] = null
        } else {
          promises.push(new Promise(function (resolve, reject) {
            let req = new XMLHttpRequest()
            req.timeout = 20000
            req.open('GET', url)
            req.onload = function () {
              if (req.status === 200) {
                capabilities[url] = req.response
                resolve(req.response)
              } else {
                reject(new Error(req.statusText))
              }
            }
            req.onerror = function () {
              reject(new Error('Network error'))
            }
            req.send()
          }))
        }
      }))(urls[j])
    }
    return promises
  };

  /**
   * Sets the capabilities data.
   * @param {Object} capabilities Capabilities data.
   */
  setCapabilities (capabilities) {
    const self = this
    capabilities.forEach(capability => {
      if (capability['url'] != null) {
        if (Array.isArray(capability['url'])) {
          capability['url'].forEach(url => {
            // Todo: optimize memory use
            self.capabilities_[url] = capability['data']
          })
        }
      } else {
        self.capabilities_[capability['url']] = capabilities['data']
      }
    })
  };

  /**
   * Gets the capabilities data.
   * @returns {Object} Capabilities data.
   */
  getCapabilities () {
    return this.capabilities_
  };
}
