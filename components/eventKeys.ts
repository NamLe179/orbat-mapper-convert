import type { Unit } from "@/types/scenarioModels";
import type { NUnit } from "@/types/internalModels";
import { type FeatureId } from "@/types/scenarioGeoModels";

// 1. Định nghĩa Payloads
export type UnitClickPayload = Unit | NUnit;

export type ImageLayerActionPayload = {
  action: "zoom" | "startTransform" | "endTransform";
  id: FeatureId;
};

// 2. Định nghĩa Event Map (Dùng cho mitt)
export type AppEventMap = {
  orbatUnitClick: UnitClickPayload;
  mapUnitClick: UnitClickPayload;
  imageLayerAction: ImageLayerActionPayload;
};

// 3. EXPORT CÁC HẰNG SỐ (Để sửa lỗi "no exported member")
// Các file khác sẽ import { imageLayerAction } từ đây để dùng làm key cho emitter
export const orbatUnitClick = "orbatUnitClick";
export const mapUnitClick = "mapUnitClick";
export const imageLayerAction = "imageLayerAction";

// (Tùy chọn) Giữ lại cái này nếu muốn dùng dạng object gom nhóm, 
// nhưng với code hiện tại thì 3 dòng export const ở trên là quan trọng nhất.
export const EVENT_NAMES = {
  ORBAT_UNIT_CLICK: orbatUnitClick,
  MAP_UNIT_CLICK: mapUnitClick,
  IMAGE_LAYER_ACTION: imageLayerAction,
} as const;