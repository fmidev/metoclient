import WMSCapabilities from 'ol/format/WMSCapabilities';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';

/**
 *
 */
export default class CapabilitiesReader {
  /**
   *
   * @param text
   * @returns {*}
   */
  static wms(text) {
    return new WMSCapabilities().read(text);
  }

  /**
   *
   * @param text
   * @returns {*}
   */
  static wmts(text) {
    return new WMTSCapabilities().read(text);
  }
}
