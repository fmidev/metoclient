/**
 * Unit tests for CapabilitiesReader.js module.
 */

import CapabilitiesReader from '../../src/CapabilitiesReader';
import {
  wmsCapabilitiesXml,
  wmtsCapabilitiesXml,
} from '../helpers/mockCapabilities';

describe('CapabilitiesReader', () => {
  describe('wms', () => {
    it('should parse valid WMS capabilities XML', () => {
      const result = CapabilitiesReader.wms(wmsCapabilitiesXml);
      expect(result).not.toBeNull();
      expect(result.version).toBe('1.3.0');
    });

    it('should return Service information', () => {
      const result = CapabilitiesReader.wms(wmsCapabilitiesXml);
      expect(result.Service).toBeDefined();
      expect(result.Service.Name).toBe('WMS');
      expect(result.Service.Title).toBe('Test WMS Service');
    });

    it('should parse layer information', () => {
      const result = CapabilitiesReader.wms(wmsCapabilitiesXml);
      expect(result.Capability).toBeDefined();
      expect(result.Capability.Layer).toBeDefined();
      expect(result.Capability.Layer.Layer).toBeDefined();
      expect(result.Capability.Layer.Layer.length).toBeGreaterThan(0);
    });

    it('should parse layer styles with legend URL', () => {
      const result = CapabilitiesReader.wms(wmsCapabilitiesXml);
      const radarLayer = result.Capability.Layer.Layer.find(
        (l: any) => l.Name === 'radar'
      );
      expect(radarLayer).toBeDefined();
      expect(radarLayer.Style).toBeDefined();
      expect(radarLayer.Style.length).toBeGreaterThan(0);
    });

    it('should return null for empty string', () => {
      const result = CapabilitiesReader.wms('');
      expect(result).toBeNull();
    });

    it('should throw on malformed XML', () => {
      // OpenLayers WMSCapabilities throws on invalid/incomplete XML
      // This documents the actual behavior
      expect(() => {
        CapabilitiesReader.wms('<WMS_Capabilities></WMS_Capabilities>');
      }).toThrow();
    });
  });

  describe('wmts', () => {
    it('should parse valid WMTS capabilities XML', () => {
      const result = CapabilitiesReader.wmts(wmtsCapabilitiesXml);
      expect(result).not.toBeNull();
      expect(result.version).toBe('1.0.0');
    });

    it('should return parsed result', () => {
      const result = CapabilitiesReader.wmts(wmtsCapabilitiesXml);
      // WMTS parser returns different structure depending on OL version
      expect(result).not.toBeNull();
      expect(result.version).toBe('1.0.0');
    });

    it('should parse Contents with layers', () => {
      const result = CapabilitiesReader.wmts(wmtsCapabilitiesXml);
      expect(result.Contents).toBeDefined();
      expect(result.Contents.Layer).toBeDefined();
    });

    it('should return null for empty string', () => {
      const result = CapabilitiesReader.wmts('');
      expect(result).toBeNull();
    });

    it('should handle invalid XML gracefully', () => {
      expect(() => {
        CapabilitiesReader.wmts('<invalid>');
      }).not.toThrow();
    });
  });

  describe('static methods', () => {
    it('should have wms as a static method', () => {
      expect(typeof CapabilitiesReader.wms).toBe('function');
    });

    it('should have wmts as a static method', () => {
      expect(typeof CapabilitiesReader.wmts).toBe('function');
    });

    it('should not require instantiation', () => {
      // Methods should be callable without new
      expect(() => {
        CapabilitiesReader.wms(wmsCapabilitiesXml);
        CapabilitiesReader.wmts(wmtsCapabilitiesXml);
      }).not.toThrow();
    });
  });
});
