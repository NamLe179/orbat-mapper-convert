import type { Unzipped } from "fflate";
import type { FeatureCollection, Feature } from "geojson";

// Project imports
import type { GuessedFormatDialect, GuessedImportFormat } from "@/types/importExport";

export interface ImportedFileInfo {
  dataAsString: string;
  errors: string[];
  format: GuessedImportFormat;
  dialect: GuessedFormatDialect;
  hasMultipleFiles: boolean;
  isInvalid: boolean;
  isJson: boolean;
  isZipped: boolean;
  objectUrl: string;
  fileName: string;
  fileSize: number;
  dataAsArrayBuffer?: ArrayBuffer;
}

// Global cache for image blobs created during import
export const imageCache = new Map<string, string>();

/**
 * Clears the global image cache and revokes object URLs to prevent memory leaks.
 */
export function clearCache() {
  imageCache.forEach((value, key) => {
    URL.revokeObjectURL(value);
  });
  imageCache.clear();
}

/**
 * Main function to guess the format of an imported file.
 * Must be called in a Client environment (Browser).
 */
export async function guessImportFormat(file: File): Promise<ImportedFileInfo> {
  const guess: ImportedFileInfo = {
    format: "unknown",
    dialect: "unknown",
    isZipped: false,
    isJson: false,
    hasMultipleFiles: false,
    dataAsString: "Unknown data",
    isInvalid: false,
    errors: [],
    objectUrl: "",
    fileName: file.name,
    fileSize: file.size,
  };

  // 1. Handle Zipped Files (KMZ, MilX, etc.)
  if (hasZippedFileType(file)) {
    guess.isZipped = true;
    let unzipped: Unzipped;
    try {
      unzipped = await readZippedFile(file);
    } catch (e) {
      console.error(e);
      guess.isInvalid = true;
      guess.errors.push(`Failed to unzip file: ${e}`);
      return guess;
    }

    // is it a milx file?
    const f = Object.entries(unzipped).find(([filename]) => filename.endsWith(".milxly"));
    if (f) {
      guess.format = "milx";
      guess.dataAsString = arrayBufferToString(f[1]);
      return guess;
    }
    
    // is it a kmz file?
    const kmz = Object.entries(unzipped).find(([filename]) => filename.endsWith(".kml"));
    if (kmz) {
      guess.format = "kml";
      guess.dataAsString = arrayBufferToString(kmz[1]);
      guess.objectUrl = URL.createObjectURL(
        new Blob([kmz[1] as BlobPart], { type: "application/vnd.google-earth.kml+xml" }),
      );
      
      // Extract images inside KMZ to cache
      Object.entries(unzipped).forEach(([filename, data]) => {
        if (!filename.endsWith(".kml")) {
          // Normalize path separators if needed or handle nesting
          imageCache.set(filename, URL.createObjectURL(new Blob([data as BlobPart])));
        }
      });
      return guess;
    }
  } 
  
  // 2. Handle Images
  else if (hasImageFileType(file)) {
    guess.format = "image";
    guess.dataAsString = file.name;
    guess.objectUrl = URL.createObjectURL(file);
    return guess;
  } 
  
  // 3. Handle Spreadsheets (XLSX)
  else if (isSpreadsheetFileType(file)) {
    guess.format = "xlsx";
    guess.dataAsArrayBuffer = await file.arrayBuffer();
    return guess;
  }

  // 4. Handle Text-based formats (KML, JSON, etc.)
  let text: string;
  try {
    text = await file.text();
  } catch (e) {
    guess.isInvalid = true;
    guess.errors.push("Could not read file as text");
    console.error(e);
    return guess;
  }

  if (isKMFileType(file)) {
    guess.format = "kml";
    guess.dataAsString = text;
    guess.objectUrl = URL.createObjectURL(file);
    return guess;
  }

  // Check JSON formats
  try {
    const json = JSON.parse(text);
    guess.isJson = true;
    guess.dataAsString = text;
    
    if (isOrbatMapperScenario(json)) {
      guess.format = "orbatmapper";
    } else if (isOrbatMapperEncryptedScenario(json)) {
      guess.format = "orbatmapper-encrypted";
    } else if (isFeatureCollection(json)) {
      guess.format = "geojson";
      const geojsonProps = json.features[0]?.properties ?? {};
      if (
        "uniqueDesignation" in geojsonProps ||
        "datetime" in geojsonProps ||
        "drawable" in geojsonProps
      ) {
        guess.dialect = "geojson-unitgenerator";
      }
    } else if (isGeoJsonFeature(json)) {
      guess.format = "geojson";
    } else if (json.options && json.subOrganizations) {
      guess.format = "unitgenerator";
    } else if (Array.isArray(json) && Array.isArray(json[0]) && json[0].length >= 6) {
      guess.format = "orbatgenerator";
    }
  } catch (e) {
    // Not valid JSON, ignore error as it might be plain text or unknown format
  }

  return guess;
}

// --- TYPE GUARDS & DETECTORS ---

function isGeoJsonFeature(json: any): json is Feature {
  return json.type && json.type === "Feature";
}

function isFeatureCollection(json: any): json is FeatureCollection {
  return json.type && json.type === "FeatureCollection";
}

function isOrbatMapperScenario(json: any): boolean {
  if (json.type && json.type === "ORBAT-mapper") {
    if (Array.isArray(json.sides)) {
      return true;
    }
  }
  return false;
}

function isOrbatMapperEncryptedScenario(json: any): boolean {
  return json.type && json.type === "ORBAT-mapper-encrypted";
}

function hasZippedFileType(file: File): boolean {
  const zippedTypes = ["application/vnd.google-earth.kmz", "application/zip"];
  if (zippedTypes.includes(file.type)) return true;
  if (file.name.endsWith(".kmz")) return true;
  if (file.name.endsWith(".odin")) return true;
  return file.name.endsWith(".milxlyz");
}

function isKMFileType(file: File): boolean {
  const kmlTypes = ["application/vnd.google-earth.kml+xml"];
  if (kmlTypes.includes(file.type)) return true;
  return file.name.endsWith(".kml");
}

function hasImageFileType(file: File): boolean {
  return file.type.startsWith("image/");
}

function isSpreadsheetFileType(file: File): boolean {
  const xlsxTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
  if (xlsxTypes.includes(file.type)) return true;
  return file.name.endsWith(".xlsx");
}

// --- UTILITIES ---

export function arrayBufferToString(
  arrayBuffer: ArrayBuffer | Uint8Array,
  decoderType = "utf-8",
) {
  let decoder = new TextDecoder(decoderType);
  return decoder.decode(arrayBuffer);
}

export async function unzip(file: ArrayBuffer) {
  // Dynamic import to avoid loading heavy library on initial page load
  const fflate = await import("fflate");
  return await new Promise<Unzipped>((resolve, reject) => {
    fflate.unzip(new Uint8Array(file), (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

async function readZippedFile(file: File): Promise<Unzipped> {
  const data = await file.arrayBuffer();
  return unzip(data);
}

// Helper: readFileAsync (similar to file.arrayBuffer/text but using FileReader)
// Kept for legacy support or if specific progress events are needed in future
function readFileAsync(file: File): Promise<ArrayBuffer | null | string> {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}