/**
 * Chức năng: Các utility functions cho địa lý
 * - Format ngày theo DTG (Date Time Group) quân sự
 * - Format tọa độ: DMS, Decimal Degrees, MGRS
 * - Format độ dài/diện tích theo metric/imperial/nautical
 * - Chuyển đổi UTC sang Military time zones (Z, A, B,...)
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toStringHDMS } from "ol/coordinate";
import { point } from "@turf/helpers";
import { truncate } from "@turf/truncate";
import type { Position } from "geojson";

// Project imports
import { resolveTimeZone } from "@/utils/militaryTimeZones";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { formatDecimalDegrees, formatMGRS, type MGRSPrecision } from "@/utils/geoConvert";
import type { MeasurementUnit } from "@/hooks/geoMeasurement"; 
import { type CoordinateFormatType } from "@/hooks/geoShowLocation"; 

// Đảm bảo plugins được load cho dayjs trước khi sử dụng
dayjs.extend(utc);
dayjs.extend(timezone);

export const UTC2MILITARY: Record<string, string> = {
  "-12": "Y",
  "-11": "X",
  "-10": "W",
  "-9": "V",
  "-8": "U",
  "-7": "T",
  "-6": "S",
  "-5": "R",
  "-4": "Q",
  "-3": "P",
  "-2": "O",
  "-1": "N",
  "0": "Z",
  "1": "A",
  "2": "B",
  "3": "C",
  "4": "D",
  "5": "E",
  "6": "F",
  "7": "G",
  "8": "H",
  "9": "I",
  "10": "K",
  "11": "L",
  "12": "M",
};

// Hàm format DTG theo chuẩn quân sự, với tùy chọn timezone
export function formatDateString(value?: number, timeZone?: string, template?: string) {
  if (value === undefined || value === null) return "";
  if (timeZone) return dayjs(value).tz(resolveTimeZone(timeZone)).format(template);

  return dayjs.utc(value).format(template);
}

// Hàm format DTG theo chuẩn quân sự, với timezone mặc định từ map settings
export function formatDTG(value: number, timeZone: string) {
  if (value === undefined || value === null) return "";
  const date = dayjs(value).tz(resolveTimeZone(timeZone));
  const offset = Math.round(date.utcOffset() / 60).toString();
  const letter = UTC2MILITARY[offset] ?? "Z";
  return date.format(`DDHHmm[${letter}]MMMYY`).toUpperCase();
}

// Hàm format vị trí (tọa độ) theo định dạng đã chọn trong map settings hoặc theo tùy chọn
export function formatPosition(
  value?: number[],
  options: { format?: CoordinateFormatType; mgrsPrecision?: MGRSPrecision } = {},
) {
  if (value) {
    const currentFormat = useMapSettingsStore.getState().coordinateFormat;
    
    const format = options.format ?? currentFormat;
    const mgrsPrecision = options.mgrsPrecision ?? 4;

    if (format === "DegreeMinuteSeconds") return toStringHDMS(value, 0);
    if (format === "MGRS") return formatMGRS(value, mgrsPrecision);
    return formatDecimalDegrees(value, 3);
  }
  return "";
}

// Hàm format độ dài theo đơn vị đã chọn (metric, imperial, nautical)
export function formatLength(length: number, unit: MeasurementUnit = "metric") {
  let output: string = "";
  if (unit === "metric") {
    if (length > 100) {
      output = Math.round((length / 1000) * 100) / 100 + " km";
    } else {
      output = Math.round(length * 100) / 100 + " m";
    }
  } else if (unit === "imperial") {
    const miles = length * 0.000621371192;
    if (miles > 0.1) {
      output = miles.toFixed(2) + " mi";
    } else {
      output = (miles * 5280).toFixed(2) + " ft";
    }
  } else if (unit === "nautical") {
    const nm = length * 0.000539956803;
    if (nm > 0.1) {
      output = nm.toFixed(2) + " nm";
    } else {
      output = nm.toFixed(3) + " nm";
    }
  }
  return output;
}

// Hàm format diện tích theo đơn vị đã chọn (metric, imperial, nautical)
export function formatArea(area: number, unit: MeasurementUnit = "metric"): string {
  let output = "";
  if (unit === "metric") {
    if (area > 10000) {
      output = Math.round((area / 1000000) * 100) / 100 + " km\xB2";
    } else {
      output = Math.round(area * 100) / 100 + " m\xB2";
    }
  } else if (unit === "imperial") {
    const squareMiles = area * 0.0000003861021585424458;
    if (squareMiles > 0.1) {
      output = squareMiles.toFixed(2) + " mi\xB2";
    } else {
      output = (area * 10.7639104167097).toFixed(2) + " ft\xB2";
    }
  } else if (unit === "nautical") {
    const squareNM = area * 0.0000003599999999999999;
    if (squareNM > 0.1) {
      output = squareNM.toFixed(2) + " nm\xB2";
    } else {
      output = (area * 10.7639104167097).toFixed(2) + " ft\xB2";
    }
  }
  return output;
}

// Hàm parse chuỗi tọa độ từ định dạng "latitude,longitude" thành mảng [latitude, longitude]
export function parseCoordinates(coordinateString: string): [number, number] {
  const parts = coordinateString.split(",").map((s) => s.trim());

  if (parts.length !== 2) {
    throw new Error("Invalid coordinate format. Expected format: 'latitude,longitude'");
  }

  const [latStr, lonStr] = parts;
  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lonStr);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Invalid coordinate values. Coordinates must be numbers.");
  }

  return [latitude, longitude];
}

// Hàm cắt bớt độ chính xác của tọa độ để giảm thiểu lỗi làm tròn khi hiển thị hoặc lưu trữ
export function truncatePosition(
  p: Position,
  options?: { precision?: number },
): Position {
  return truncate(point(p), options).geometry.coordinates;
}