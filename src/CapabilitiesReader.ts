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
   * Read WMS capabilities from an XML source.
   * @param {Document | Element | string} text The XML source.
   * @returns {null | object} Capabilities data.
   */
  static wms(text: Document | Element | string): Record<string, any> | null {
    return new WMSCapabilities().read(text);
  }

  /**
   * Read WMTS capabilities from an XML source.
   * @param {Document | Element | string} text The XML source.
   * @returns {null | object} Capabilities data.
   */
  static wmts(text: Document | Element | string): Record<string, any> | null {
    return new WMTSCapabilities().read(text);
  }
}
