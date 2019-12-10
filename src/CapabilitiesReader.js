/**
 * @module CapabilitiesReader
 */
import WMSCapabilities from 'ol/format/WMSCapabilities';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';

/**
 * Class abstracting capabilities readers for different protocols.
 */
export default class CapabilitiesReader {
  /**
   * Create a WMS capabilities reader.
   *
   * @param {Document | Element | string} text The XML source.
   * @returns {null | object} Capabilities data.
   */
  static wms(text) {
    return new WMSCapabilities().read(text);
  }

  /**
   * Create a WMS capabilities reader.
   *
   * @param {Document | Element | string} text The XML source.
   * @returns {null | object} Capabilities data.
   */
  static wmts(text) {
    return new WMTSCapabilities().read(text);
  }
}
