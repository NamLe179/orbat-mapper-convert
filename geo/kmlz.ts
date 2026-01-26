import KML from "ol/format/KML";
import type { Options as KMLFormatOptions } from "ol/format/KML";
import type { ReadOptions } from "ol/format/Feature";
import { arrayBufferToString } from "@/importexport/fileHandling";

/**
 * Fetch text content from a blob URL.
 * Note: This only works in the browser environment.
 */
async function getKMLData(objectUrl: string) {
  return fetch(objectUrl).then((response) => response.text());
}

export class KMLZ extends KML {
  constructor(opt_options?: KMLFormatOptions) {
    const options = opt_options || {};
    super(options);
  }

  getType() {
    // Return "arraybuffer" to tell OpenLayers source to load as binary
    return "arraybuffer" as any;
  }

  /**
   * Helper to read features directly from a Blob Object URL
   */
  async readFromObjectUrl(objectUrl: string, options?: ReadOptions) {
    const kmlData = await getKMLData(objectUrl);
    return super.readFeatures(kmlData, options);
  }

  /**
   * Override readFeatures to handle ArrayBuffer input
   * (Standard KML format expects string/XML)
   */
  // @ts-ignore: OpenLayers types override signature match
  readFeatures(source: ArrayBuffer, options?: ReadOptions) {
    const kmlData = arrayBufferToString(source);
    return super.readFeatures(kmlData, options);
  }
}