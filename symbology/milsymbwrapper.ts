import ms, { type Symbol as MilSymbol, type SymbolOptions } from "milsymbol";

// --- Configuration ---
// Khởi tạo màu tùy chỉnh.
// Lưu ý: Milsymbol thường an toàn khi import ở server, 
// nhưng các hàm vẽ (asSVG, asCanvas) chỉ nên gọi ở Client.

const customColorMode = ms.getColorMode("Light");
customColorMode.Friend = "rgb(170, 176, 116)";

const customIconColor = { ...ms.getColorMode("FrameColor") };
customIconColor.Friend = "rgb(65, 70, 22)";

const cm2 = ms.getColorMode("Light");
cm2.Friend = cm2.Hostile;

// --- Helper Functions ---

function replaceAt(text: string, index: number, replace: string): string {
  return text.substring(0, index) + replace + text.substring(index + 1);
}

/**
 * Wrapper để tạo Milsymbol với các chế độ màu tùy chỉnh
 */
export function symbolGenerator(sidc: string, options: SymbolOptions = {}): MilSymbol {
  let opts = options;
  
  // Logic xử lý SIDC đặc biệt (Custom Color logic)
  if (sidc.length > 3 && sidc[3] === "7") {
    sidc = replaceAt(sidc, 3, "3");
    opts = {
      colorMode: { ...customColorMode },
      frameColor: { ...customIconColor },
      iconColor: { ...customIconColor },
      ...options,
    };
  } else if (sidc.length > 3 && sidc[3] === "8") {
    sidc = replaceAt(sidc, 3, "3");
    opts = { colorMode: cm2, ...options };
  }
  
  return new ms.Symbol(sidc, opts);
}

// --- Mappings ---

export const textAmpMap = {
  C: "quantity",
  F: "reinforcedReduced",
  G: "staffComments",
  H: "additionalInformation",
  J: "evaluationRating",
  K: "combatEffectiveness",
  L: "signatureEquipment",
  M: "higherFormation",
  N: "hostile",
  P: "iffSif",
  Q: "direction",
  R: "quantity",
  T: "uniqueDesignation",
  V: "type",
  W: "dtg",
  X: "altitudeDepth",
  Y: "location",
  Z: "speed",
  AA: "specialHeadquarters",
  AC: "country",
  AD: "platformType",
  AE: "equipmentTeardownTime",
  AF: "commonIdentifier",
  AH: "headquartersElement",
  AP: "targetNumber",
  AQ: "guardedUnit",
  AR: "specialDesignator",
  R2: "sigint",
} as const;

export type TextAmpKey = keyof typeof textAmpMap;
export type TextAmpValue = (typeof textAmpMap)[keyof typeof textAmpMap];

// Tạo map ngược (Value -> Key)
export const textAmpMapInv: Record<string, string> = Object.fromEntries(
  Object.entries(textAmpMap).map(([k, v]) => [v, k])
);